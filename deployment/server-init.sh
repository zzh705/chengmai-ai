#!/usr/bin/env bash
# ============================================================
# 承脉 AI 服务器首次初始化脚本（Ubuntu 22.04 / 24.04）
# 在服务器上以 root 执行一次：
#   sudo bash deployment/server-init.sh
# 幂等：重复执行不会出错，可用于补装/修复
# ============================================================
set -euo pipefail

# ---------- 按需修改的变量 ----------
REPO_URL="https://github.com/zzh705/chengmai-ai.git"
BRANCH="main"
APP_USER="chengmai"
APP_DIR="/opt/chengmai-ai"
NODE_MAJOR="20"
# ------------------------------------

log() { echo -e "\n\033[1;36m==> $*\033[0m"; }

if [[ $EUID -ne 0 ]]; then
  echo "请用 root 运行：sudo bash $0" >&2
  exit 1
fi

# ---------- 1. 系统依赖 ----------
log "安装系统依赖（nginx / python / git / 编译工具）"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y nginx python3-venv python3-pip git curl ca-certificates rsync build-essential

# ---------- 2. Node.js 20 ----------
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | sed 's/v\([0-9]*\).*/\1/')" -lt 18 ]]; then
  log "安装 Node.js ${NODE_MAJOR}.x"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi
node -v && npm -v

# ---------- 3. 2GB swap（2G 内存机器构建前端/加载向量库的保险） ----------
if [[ ! -f /swapfile ]]; then
  log "创建 2GB swap"
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# ---------- 4. 专用运行用户 ----------
id "$APP_USER" >/dev/null 2>&1 || useradd -m -s /bin/bash "$APP_USER"

# ---------- 5. 拉取代码 ----------
# 兼容 root 预克隆的目录：系统级 git 信任，避免 chengmai 用户触发 dubious ownership
git config --system --add safe.directory "$APP_DIR" 2>/dev/null || true
if [[ ! -d "$APP_DIR/.git" ]]; then
  log "首次克隆代码到 $APP_DIR"
  git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
else
  log "代码已存在，更新到最新（国内网络抖动时自动跳过）"
  timeout 90 sudo -u "$APP_USER" git -C "$APP_DIR" pull --ff-only origin "$BRANCH" \
    || echo "WARN: 拉取最新代码失败，使用磁盘现有版本继续部署"
fi
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# ---------- 6. 后端虚拟环境 + 依赖 ----------
log "安装后端 Python 依赖"
if [[ ! -d "$APP_DIR/backend/.venv" ]]; then
  sudo -u "$APP_USER" python3 -m venv "$APP_DIR/backend/.venv"
fi
sudo -u "$APP_USER" "$APP_DIR/backend/.venv/bin/pip" install --upgrade pip
sudo -u "$APP_USER" "$APP_DIR/backend/.venv/bin/pip" install -r "$APP_DIR/backend/requirements.txt"

# ---------- 7. 前端依赖 + 构建 ----------
log "安装前端依赖并构建（约 1-3 分钟）"
sudo -u "$APP_USER" npm --prefix "$APP_DIR/frontend" ci
sudo -u "$APP_USER" env NODE_OPTIONS=--max-old-space-size=1024 \
  npm --prefix "$APP_DIR/frontend" run build

# ---------- 8. .env 检查 ----------
if [[ ! -f "$APP_DIR/.env" ]]; then
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"
  chown "$APP_USER:$APP_USER" "$APP_DIR/.env"
  chmod 600 "$APP_DIR/.env"
  echo ""
  echo "================================================================"
  echo "  ⚠️  已生成 $APP_DIR/.env（从模板复制）"
  echo "      AI 功能使用前必须填入真实 LLM_API_KEY："
  echo "      sudo -u $APP_USER nano $APP_DIR/.env"
  echo "      改完执行：sudo systemctl restart chengmai"
  echo "================================================================"
fi

# ---------- 9. systemd 服务 ----------
log "安装 systemd 服务 chengmai"
cp "$APP_DIR/deployment/chengmai.service" /etc/systemd/system/chengmai.service
systemctl daemon-reload
systemctl enable chengmai
systemctl restart chengmai

# ---------- 10. Nginx 站点 ----------
log "安装 Nginx 站点"
cp "$APP_DIR/deployment/nginx-chengmai.conf" /etc/nginx/sites-available/chengmai
ln -sf /etc/nginx/sites-available/chengmai /etc/nginx/sites-enabled/chengmai
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl restart nginx

# ---------- 11. 自检 ----------
log "健康检查"
sleep 2
echo -n "后端 /api/health："
curl -sf http://127.0.0.1:8000/api/health && echo "  ✅" || echo "  ❌（看日志：sudo journalctl -u chengmai -n 50）"
echo -n "Nginx 首页："
curl -sfo /dev/null http://127.0.0.1/ && echo "✅" || echo "❌"

PUB_IP=$(curl -fsS --max-time 3 http://100.100.100.200/latest/meta-data/eipv4 2>/dev/null \
  || curl -fsS --max-time 3 http://100.100.100.200/latest/meta-data/public-ipv4 2>/dev/null \
  || hostname -I | awk '{print $1}')

cat <<EOF

🎉 初始化完成！

访问地址：http://$PUB_IP
（外网打不开时，去阿里云控制台「安全组/防火墙」放行 80 端口入方向）

常用命令：
  sudo systemctl status chengmai       # 后端状态
  sudo journalctl -u chengmai -f       # 实时日志
  sudo bash $APP_DIR/deployment/deploy.sh   # 以后更新代码

下一步（重要）：
  1) 编辑 $APP_DIR/.env 填入 LLM_API_KEY 后 sudo systemctl restart chengmai
  2) （可选）把本机 70MB 向量缓存传上去，跳过首次对话的漫长建库：
     rsync -avz data/structured/embeddings_cache.npz root@$PUB_IP:$APP_DIR/data/structured/
     ssh root@$PUB_IP "chown $APP_USER:$APP_USER $APP_DIR/data/structured/embeddings_cache.npz"
EOF
