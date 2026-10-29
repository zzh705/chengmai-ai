#!/usr/bin/env bash
# ============================================================
# 承脉 AI · 本地一键更新脚本（只在你的 Mac 本地终端运行）
#
# 用法：
#   bash deployment/update.sh
#   bash deployment/update.sh "本次改动的说明"
#
# 流程：检查大文件 → 暂存并提交所有改动 → 推送 GitHub
#       → SSH 登录服务器执行部署（拉代码→装依赖→构建→重启→自检）
#       → 公网自检 www 是否正常
#
# 前置条件：你已在阿里云 Workbench 终端安装过本机公钥
# （ssh-ed25519 chengmai-deploy，密钥位于 ~/.local/share/chengmai-deploy/）
# ============================================================
set -euo pipefail

cd "$(dirname "$0")/.."

KEY="$HOME/.local/share/chengmai-deploy/id_ed25519"
SERVER="root@123.56.18.7"
MSG="${1:-更新于 $(date '+%Y-%m-%d %H:%M')}"
LIMIT_KB=90000 # 单文件超 90MB 直接中止（GitHub 上限 100MB）

log() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
die() { printf '\033[1;31m[中止] %s\033[0m\n' "$*" >&2; exit 1; }

[[ -f "$KEY" ]] || die "找不到部署密钥 $KEY（还没配置 SSH 免密，请先安装公钥）"

# ---------- 1. 大文件哨兵：防止超大文件混进提交 ----------
log "检查大文件"
big=""
while IFS= read -r f; do
  sz=$(stat -f%z "$f" 2>/dev/null || echo 0)
  if ((sz > LIMIT_KB * 1024)); then big="$f"; break; fi
done < <(git ls-files -co --exclude-standard)
[[ -z "$big" ]] || die "发现超大文件「$big」，请移出仓库或加入 .gitignore 后再更新"

# ---------- 2. 提交 + 推送 ----------
log "暂存并提交改动"
git add -A
if git diff --cached --quiet; then
  log "没有新改动，跳过提交"
else
  git commit -m "$MSG"
fi
log "推送 GitHub"
git push origin main

# ---------- 3. 服务器部署 ----------
log "部署到 $SERVER（拉代码→装依赖→构建→重启→自检）"
ssh -i "$KEY" -o BatchMode=yes -o ConnectTimeout=10 "$SERVER" \
  'chown -R chengmai:chengmai /opt/chengmai-ai; bash /opt/chengmai-ai/deployment/deploy.sh'

# ---------- 4. 公网自检 ----------
log "公网自检"
sleep 2
if curl -sf --max-time 15 "http://123.56.18.7/" >/dev/null; then
  printf '\n\033[1;32m✔ 部署完成，网站已更新：\033[0m http://123.56.18.7/\n'
  printf '（浏览器若仍显示旧页面，请按 Cmd+Shift+R 强制刷新）\n'
else
  die "公网访问失败，请检查服务器状态"
fi