# 单入口生产部署、自动发布与回滚

生产目标是同一台 Docker/OpenWrt 主机上的一个公网入口：

| 入口 | Origin | 用途 |
| --- | --- | --- |
| Quick Tunnel 地址 | `127.0.0.1:3100` | 新观展页面、`/exhibitor`、`/operations`、`/webhooks/github` |

只有网关监听对外端口 `3100`。主平台 `3101`、访客端 `3102`、webhook `3103` 只监听
`127.0.0.1`，由网关根据路径分流；两套 `/_next` 静态资源使用哈希文件名和 404 回退分配到正确应用。

Cloudflare 使用目标机上已经运行并验证的 Quick Tunnel。不要在应用发布中停止、重建或
替换该容器，也不要为此项目创建自定义 DNS 记录。实际公网地址从 tunnel 容器日志读取。

## 服务器目录

默认根目录为 `/mnt/nvme0n1-4/apps/chencheng-ai-expo`。服务器需要 Docker、
Docker Compose、Git、curl、tar 和 sha256sum。应用使用 NVMe 上的独立 Docker daemon；
系统 Docker 只运行 Cloudflare tunnel，防止应用镜像占用系统 overlay。创建以下目录：

```sh
install -d -m 0750 /mnt/nvme0n1-4/apps/chencheng-ai-expo/{backups,data,deploy-queue,deploy-state,releases,secrets,source}
chown 10001:10001 /mnt/nvme0n1-4/apps/chencheng-ai-expo/deploy-queue
chown 10001:10001 /mnt/nvme0n1-4/apps/chencheng-ai-expo/data
```

将 `deploy/openwrt/chencheng-dockerd.init` 安装为 `/etc/init.d/chencheng-dockerd` 并启用。
部署环境中的 `APP_DOCKER_HOST` 指向该 daemon 的 socket；worker 不得连接系统 Docker。

将 GitHub 仓库克隆到 `source`，并保持它只跟踪 `origin/main`。复制
`deploy/deploy.env.example` 为根目录下的 `deploy.env`，按目标服务器目录调整。
真实环境变量只能写到 `secrets/*.env`，全部设为 `0600`；字段说明见
`deploy/secrets/README.md`。

## 现有 Cloudflare Quick Tunnel

只读确认运行状态和当前地址，不执行 restart：

```sh
docker ps --filter name=chencheng-tunnel
docker logs chencheng-tunnel 2>&1 | grep -Eo 'https://[-a-z0-9]+\.trycloudflare\.com' | tail -n 1
```

## 首次启动

进入 `source`，加载服务器部署环境，使用当前完整 commit SHA 构建并启动：

```sh
. /mnt/nvme0n1-4/apps/chencheng-ai-expo/deploy.env
export DOCKER_HOST="$APP_DOCKER_HOST"
export APP_VERSION="$(git rev-parse HEAD)"
export DEPLOY_QUEUE_DIR SECRETS_DIR PLATFORM_DATA_DIR
export GATEWAY_HOST_PORT PLATFORM_HOST_PORT VISITOR_HOST_PORT WEBHOOK_HOST_PORT

docker compose -f compose.production.yaml config --quiet
docker compose -f compose.production.yaml build gateway platform visitor webhook
docker compose -f compose.production.yaml up -d gateway platform visitor webhook
```

确认 `chencheng-gateway`、`chencheng-platform`、`chencheng-visitor`、`chencheng-deploy-webhook` 健康，并从公网
分别检查访客首页、`/exhibitor`、`/operations`。首次管理员仍通过服务器端
`scripts/bootstrap-admin.mjs` 激活，不在 Git 或日志中记录激活码。

## GitHub webhook 自动发布

在 GitHub 仓库添加 push webhook：

- Payload URL：当前已验证 Quick Tunnel 地址的 `https://<trycloudflare-host>/webhooks/github`
- Content type：`application/json`
- Secret：与服务器 `webhook.env` 的 `GITHUB_WEBHOOK_SECRET` 完全一致
- Events：只选择 push

接收器使用 `X-Hub-Signature-256` 校验 HMAC，只接受指定仓库的 `main` 分支，并把完整
commit SHA 写入队列；它没有 Docker socket，也不能执行 shell。

在 OpenWrt 上安装队列 worker：

```sh
install -m 0755 source/deploy/openwrt/chencheng-deployer.init /etc/init.d/chencheng-deployer
/etc/init.d/chencheng-deployer enable
/etc/init.d/chencheng-deployer start
```

worker 每次只发布当前 `origin/main`：先跑主平台与访客端检查和生产构建，再构建 SHA
标记镜像，静止备份 SQLite，启动新服务，最后检查三个入口。失败时保留 `.failed` 队列
记录并恢复上一个镜像；成功时更新 `deploy-state/current-version` 和 `current` 软链接。

## 回滚

自动切换或健康检查失败时，worker 会尝试恢复 `deploy-state/current-version` 指向的上一个
镜像。若需要人工切换，先停止 worker，读取 `deploy-state/releases.log` 选定上一条 SHA，
确认三个对应镜像仍存在，再用该 SHA 运行同一份 `compose.production.yaml`：

```sh
/etc/init.d/chencheng-deployer stop
. /mnt/nvme0n1-4/apps/chencheng-ai-expo/deploy.env
export DOCKER_HOST="$APP_DOCKER_HOST"
export APP_VERSION="<previous-40-character-sha>"
export DEPLOY_QUEUE_DIR SECRETS_DIR PLATFORM_DATA_DIR
export GATEWAY_HOST_PORT PLATFORM_HOST_PORT VISITOR_HOST_PORT WEBHOOK_HOST_PORT
docker compose -f "releases/$APP_VERSION/source/compose.production.yaml" up -d --no-build gateway platform visitor webhook
```

如果数据库迁移不向后兼容，不要直接启动旧镜像。先停止平台容器，校验对应
`backups/*/platform-data.tar.sha256`，再由管理员恢复整个 SQLite 数据目录。恢复会覆盖当前
数据，因此不在自动脚本中执行。

验收后至少保留一个已验证旧镜像、对应 Git release worktree、迁移前备份和发布日志。
