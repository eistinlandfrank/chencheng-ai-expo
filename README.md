# Expo Service AI

Expo Service AI 是面向观众、参展商与场馆运营人员的响应式展会服务 MVP，支持桌面端与移动端。观众可匿名浏览展位、服务点、活动和行程；受邀的参展商与场馆人员使用通行密钥进入各自工作台。

当前场馆地图处于复核状态。路线、距离、时间和无障碍导航只有在权威数据、现场检查及双人审核全部通过后才会开放；仓库中的场馆数据不得直接视为已发布的现场事实。

## 运行架构

- Node.js `22.23.x`，生产构建输出为 `dist/standalone/server.js`。
- SQLite 数据库位于容器内 `/data/expo-service.sqlite`，通过宿主机 SSD 目录持久挂载。
- SQLite 使用 WAL、外键检查和版本化迁移；容器启动时先执行 `scripts/migrate.mjs`，迁移成功后才启动网页服务。
- 参展商与运营人员使用 WebAuthn 通行密钥、服务端会话、HttpOnly Cookie 和 CSRF 校验；观众浏览不要求登录。
- Docker 容器以非 root 用户运行，应用根文件系统只读，只有 `/data` 可持久写入。

## 本地开发

安装 Node.js `22.23.x` 与 npm，然后准备本地环境文件。开发环境可将数据库路径改为项目内忽略的 `./data/expo-service.sqlite`。

```bash
npm ci
cp .env.example .env
node --env-file=.env scripts/migrate.mjs
npm run dev
```

提交前运行完整检查和生产构建：

```bash
npm run check
npm run build
```

构建完成后，在运行环境已经注入全部变量时，可用与容器相同的启动顺序运行生产产物：

```bash
npm start
```

## 环境变量

真实环境文件不得提交到 Git。生产服务器上的 `.env` 应限制为仅部署账户可读。

| 变量 | 用途 |
| --- | --- |
| `DATABASE_PATH` | SQLite 文件路径；Docker 生产环境固定为 `/data/expo-service.sqlite`。 |
| `PUBLIC_SITE_URL` | 对外访问的 HTTPS 来源，用于页面元数据和公开链接。 |
| `APP_ORIGIN` | WebAuthn 与写请求来源校验使用的精确 HTTPS origin，不带末尾斜杠。 |
| `WEBAUTHN_RP_ID` | WebAuthn relying party ID，通常为 `APP_ORIGIN` 的主机名。 |
| `WEBAUTHN_RP_NAME` | 设备创建通行密钥时显示的产品名称。 |
| `ANALYTICS_SESSION_SECRET` | 至少 32 个随机字符，用于匿名分析会话签名。 |
| `AUTH_BOOTSTRAP_SECRET` | 至少 32 个随机字符，仅用于首次场馆管理员激活。 |
| `EXPO_INTERNAL_ORIGIN` | 可选；首次管理员命令访问容器内服务的地址，默认使用本机服务端口。 |

生产环境中的 `APP_ORIGIN` 必须使用 HTTPS。`WEBAUTHN_RP_ID` 必须等于该主机名或其可接受的父域，否则通行密钥验证会拒绝启动。

## 账号激活与登录

首次场馆管理员由服务器上的一次性命令创建激活记录。应用必须已经运行，并已从 `.env` 读取 `AUTH_BOOTSTRAP_SECRET`：

```bash
docker exec -it chencheng-web node scripts/bootstrap-admin.mjs \
  --email admin@example.invalid \
  --name "初始管理员"
```

命令只显示一次激活码。管理员打开 `/activate`，输入同一邮箱和激活码，在当前设备创建通行密钥；此后从 `/login` 使用通行密钥登录。首位 `venue_admin` 创建后，首次初始化会自动关闭，后续账号应由运营台邀请。

激活码应通过可信渠道单独发送，不得写入仓库、工单、镜像层或浏览器存储。生产域名变更后，必须同步更新 `APP_ORIGIN` 与 `WEBAUTHN_RP_ID`，已有通行密钥可能需要重新注册。

## Docker 构建与运行

镜像必须使用经过验证的完整 Git commit SHA 标记。`HOST_DATA_DIR` 指向宿主机 SSD 上由容器用户 `10001:10001` 可写的目录。

```bash
export APP_VERSION="<40-character-git-commit-sha>"
export HOST_DATA_DIR="/path/on/ssd/expo-service-data"

docker compose config --quiet
docker compose build --pull web
```

Compose 只管理网页服务，将宿主机回环端口 `3100` 转发到容器端口 `3000`，不会创建、停止或重建外部隧道。不要直接覆盖正在运行的生产容器；首次切换和后续版本升级应先运行版本化候选容器，并按迁移前数据备份、健康检查、切换和回滚顺序操作。完整启动命令见 [自托管发布与回滚](deploy/ROLLBACK.md)。

## 数据备份与回滚

不要在 SQLite 仍被写入时直接复制数据库文件。发布前应短暂停止网页容器，归档整个 `/data` 挂载目录并生成校验值；候选容器只能使用该备份的独立副本。新版本验收完成前，应保留旧镜像、旧容器和迁移前数据备份。

迁移向后兼容时可直接恢复旧容器；不兼容或迁移部分失败时，必须先停止所有网页容器，再校验并恢复完整数据备份。命令与防误删检查见 [自托管发布与回滚](deploy/ROLLBACK.md)。

## 外部访问

现有 Quick Tunnel 仅适合临时验收：公开主机名可能在重启或重建后变化，也没有长期可用性保证。发布网页镜像时应保持当前 tunnel 容器运行。长期使用应改为受账户管理的命名隧道、稳定主机名和明确的访问策略。

## 发布边界

场馆尺寸、入口、出口、服务点及节点坐标属于具体活动的运营数据。发布地图前必须完成数据所有权确认、现场复核、无障碍路线核验和第二位管理员审核。

当前仓库没有附带开源许可证。除非仓库所有者另行添加许可证，否则默认保留全部权利。
