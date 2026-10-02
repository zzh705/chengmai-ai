#!/usr/bin/env bash
# ============================================================
# 承脉 AI 更新脚本：拉最新代码 → 装依赖 → 构建 → 重启 → 自检
# 每次 GitHub 上有新提交后，在服务器执行：
#   sudo bash /opt/chengmai-ai/deployment/deploy.sh
# ============================================================
set -euo pipefail

APP_USER="chengmai"
APP_DIR="/opt/chengmai-ai"
BRANCH="main"

log() { echo -e "\n\033[1;36m==> $*\033[0m"; }

if [[ $EUID -ne 0 ]]; then
  echo "请用 root 运行：sudo bash $0" >&2
  exit 1
fi
[[ -d "$APP_DIR/.git" ]] || { echo "未找到 $APP_DIR，请先运行 server-init.sh" >&2; exit 1; }

# ---------- 1. 拉取最新代码 ----------
log "拉取 $BRANCH 最新代码"
git config --system --add safe.directory "$APP_DIR" 2>/dev/null || true
sudo -u "$APP_USER" git -C "$APP_DIR" fetch origin
sudo -u "$APP_USER" git -C "$APP_DIR" reset --hard "origin/$BRANCH"

# ---------- 2. 后端依赖（有变化时很快，无变化时秒过） ----------
log "同步后端依赖"
sudo -u "$APP_USER" "$APP_DIR/backend/.venv/bin/pip" install -r "$APP_DIR/backend/requirements.txt"

# ---------- 3. 前端构建 ----------
log "构建前端"
sudo -u "$APP_USER" npm --prefix "$APP_DIR/frontend" ci
sudo -u "$APP_USER" env NODE_OPTIONS=--max-old-space-size=1024 \
  npm --prefix "$APP_DIR/frontend" run build

# ---------- 4. 刷新服务与 Nginx 配置 ----------
log "重启服务"
cp "$APP_DIR/deployment/chengmai.service" /etc/systemd/system/chengmai.service
cp "$APP_DIR/deployment/nginx-chengmai.conf" /etc/nginx/sites-available/chengmai
systemctl daemon-reload
systemctl restart chengmai
nginx -t
systemctl reload nginx

# ---------- 5. 自检 ----------
log "健康检查"
sleep 2
curl -sf http://127.0.0.1:8000/api/health >/dev/null && echo "后端 ✅" || { echo "后端 ❌，日志：journalctl -u chengmai -n 50"; exit 1; }
curl -sfo /dev/null http://127.0.0.1/ && echo "前端 ✅" || { echo "前端 ❌"; exit 1; }

log "部署完成 🎉"
