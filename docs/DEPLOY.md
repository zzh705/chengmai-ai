# 承脉 AI 服务器部署指南（阿里云 ECS / Ubuntu 22.04）

单机架构：Nginx 80 端口同时托管前端静态页和反代后端 API，后端 uvicorn 跑在本机 8000，不对外暴露。

```
浏览器 ──> Nginx :80
             ├── /          → /opt/chengmai-ai/frontend/dist（含配图）
             └── /api/      → uvicorn 127.0.0.1:8000（SSE 已关缓冲）
```

## 0. 前提

- 一台阿里云 ECS / 轻量服务器，系统 **Ubuntu 22.04 LTS**（24.04 亦可），配置 2核2G 起
- 已重置实例密码或绑定 SSH 密钥
- 安全组（轻量服务器叫「防火墙」）放行入方向 **80/TCP**、**22/TCP**（22 默认已开）

## 1. SSH 登录服务器

在你自己电脑的终端执行（Windows 用 PowerShell，把 IP 换成服务器公网 IP）：

```bash
ssh root@你的服务器IP
# 首次登录输入实例密码（Linux 输入密码时屏幕不显示，正常现象）
```

## 2. 拉代码并执行一键初始化

```bash
git clone https://github.com/zzh705/chengmai-ai.git /opt/chengmai-ai
sudo bash /opt/chengmai-ai/deployment/server-init.sh
```

脚本会自动完成：装 Nginx/Python/Node 20 → 建 2GB swap → 建专用用户 chengmai → 装后端依赖 → 构建前端 → 安装 systemd 服务 → 配置 Nginx → 健康检查。约 3-8 分钟。

脚本幂等，中断后可重复执行。

## 3. 配置大模型 Key（AI 功能必需）

```bash
sudo -u chengmai nano /opt/chengmai-ai/.env
```

把 `LLM_API_KEY=sk-xxxx...` 改成你在[阿里云百炼控制台](https://bailian.console.aliyun.com/)申请的真实 Key，保存（nano：Ctrl+O 回车保存，Ctrl+X 退出），然后：

```bash
sudo systemctl restart chengmai
```

没有 Key 时，知识库、地图、图谱等纯数据页面正常可用；AI 对话、学习路径、活化实验室、测验需要 Key。

## 4.（可选但推荐）上传向量缓存

首次 AI 对话时后端会把 3299 项数据重新向量化（较慢）。在**你自己电脑**的项目根目录执行，可直接上传本地已建好的 70MB 缓存跳过这一步：

```bash
rsync -avz data/structured/embeddings_cache.npz root@你的服务器IP:/opt/chengmai-ai/data/structured/
ssh root@你的服务器IP "chown chengmai:chengmai /opt/chengmai-ai/data/structured/embeddings_cache.npz"
sudo systemctl restart chengmai   # 回到服务器上执行
```

## 5. 验证

浏览器打开 `http://你的服务器IP`：

- 首页、知识库、地图、图谱能正常出数据 → 前后端链路通
- 承脉 AI 页发问能逐字流式出答案 → Key 与 SSE 均正常
- 命令行自检：`curl http://127.0.0.1:8000/api/health`

## 以后更新代码

GitHub 有新提交后，服务器上一条命令：

```bash
sudo bash /opt/chengmai-ai/deployment/deploy.sh
```

自动拉代码、装依赖、构建、重启、自检。`.env`、用户库 `backend/data/users.json`、向量缓存都在更新中保留。

## 常用运维命令

| 操作 | 命令 |
|------|------|
| 后端状态 | `sudo systemctl status chengmai` |
| 实时日志 | `sudo journalctl -u chengmai -f` |
| 重启后端 | `sudo systemctl restart chengmai` |
| 重载 Nginx | `sudo systemctl reload nginx` |
| 内存/swap | `free -h` |
| 磁盘占用 | `df -h /` |

## 常见问题

**外网打不开、本机 curl 127.0.0.1 正常**：阿里云安全组没放行 80。去控制台 → 实例 → 安全组 → 入方向添加 TCP 80，源 0.0.0.0/0。

**页面打开但功能报 502**：后端没起来。`sudo journalctl -u chengmai -n 50` 看日志；常见原因是 `.env` 缺失或依赖未装，重跑一次 `server-init.sh`。

**AI 对话文字一坨坨蹦、不逐字**：Nginx 缓冲未关。确认用的是仓库里的 `nginx-chengmai.conf`（含 `proxy_buffering off`），`sudo nginx -t && sudo systemctl reload nginx`。

**2G 内存构建前端被杀**：脚本已建 2GB swap；仍失败时再跑一次 `deploy.sh`，二次构建有缓存通常能过。

**想要域名和 HTTPS**：先完成备案与域名解析，再把 nginx 配置里 `server_name _` 改成域名，用 certbot 签 Let's Encrypt 证书即可。

## 数据与密钥位置（更新代码不影响）

| 内容 | 路径 |
|------|------|
| 模型 Key 等环境变量 | `/opt/chengmai-ai/.env`（权限 600） |
| 注册用户库 | `/opt/chengmai-ai/backend/data/users.json` |
| HMAC 签名密钥 | `/opt/chengmai-ai/backend/data/auth_secret.key` |
| 向量缓存 | `/opt/chengmai-ai/data/structured/embeddings_cache.npz` |
