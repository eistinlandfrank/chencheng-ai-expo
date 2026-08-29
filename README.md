# Expo Service AI

Expo Service AI 是面向观众、参展商与场馆运营人员的三端展会服务。`visitor-app/` 是唯一对观众发布的新观展页面；主平台的旧观展首页已退役，只保留 `/exhibitor` 展商端和 `/operations` 场馆运营端。受邀的工作人员使用账号密码进入各自工作台，也可使用已登记的通行密钥。

当前场馆地图处于复核状态。路线、距离、时间和无障碍导航只有在权威数据、现场检查及双人审核全部通过后才会开放；仓库中的场馆数据不得直接视为已发布的现场事实。

## 运行架构

- 主平台使用 Node.js `22.23.x`，生产构建输出为 `dist/standalone/server.js`。
- 新访客端位于 `visitor-app/`，使用 Bun 和 Next.js；无需第三方平台账号，观展记录只保存在当前浏览器。
- 主平台 SQLite 数据库位于容器内 `/data/expo-service.sqlite`，通过宿主机 SSD 目录持久挂载。
- SQLite 使用 WAL、外键检查和版本化迁移；容器启动时先执行 `scripts/migrate.mjs`，迁移成功后才启动网页服务。
- 参展商与运营人员使用 scrypt 加盐哈希密码或 WebAuthn 通行密钥登录，并通过服务端会话、HttpOnly Cookie 和 CSRF 校验保护工作台。
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

访客端单独检查：

```bash
cd visitor-app
bun install --frozen-lockfile
bun run lint
bun run build
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
| `VECTRUST_API_KEY` | 可选；仅在服务端调用 AI 助手的密钥，绝不能放入浏览器、Git 或客户端日志。 |
| `AI_BASE_URL` | 可选；OpenAI 兼容网关地址，默认 `https://api.openai-next.com/v1`。 |
| `AI_MODEL` | 可选；默认 `qwen-flash`，用于低成本中文问答。 |

生产环境中的 `APP_ORIGIN` 必须使用 HTTPS。`WEBAUTHN_RP_ID` 必须等于该主机名或其可接受的父域，否则通行密钥验证会拒绝启动。

AI 助手只处理简短的文本提问，并在服务端调用兼容 OpenAI 的接口。它不会接收用户的位置或行程，也不会生成未完成复核的路线、距离、开放状态或现场公告；这些事实继续由运营发布流程控制。

## 账号激活与登录

首次场馆管理员由服务器上的一次性命令创建激活记录。应用必须已经运行，并已从 `.env` 读取 `AUTH_BOOTSTRAP_SECRET`：

```bash
docker exec -it chencheng-platform node scripts/bootstrap-admin.mjs \
  --email admin@example.invalid \
  --name "初始管理员"
```

命令只显示一次激活码。管理员打开 `/activate`，输入同一邮箱和激活码，在当前设备创建通行密钥。首位 `venue_admin` 创建后，首次初始化会自动关闭，后续账号应由运营台邀请。

已激活账号可由服务器管理员生成强随机密码。命令只输出一次明文密码，数据库仅保存 scrypt 加盐哈希：

```bash
DATABASE_PATH=/path/to/expo-service.sqlite npm run admin:set-password -- --email admin@example.com --generate
```

此后可从 `/login` 使用邮箱和密码登录，已登记的通行密钥仍可作为备用方式。

激活码应通过可信渠道单独发送，不得写入仓库、工单、镜像层或浏览器存储。生产域名变更后，必须同步更新 `APP_ORIGIN` 与 `WEBAUTHN_RP_ID`，已有通行密钥可能需要重新注册。

## Docker 构建与运行

`compose.production.yaml` 管理单端口网关、主平台、访客端和安全 webhook 接收器。Cloudflare Quick Tunnel 由宿主机系统 Docker 独立运行，并作为 Pages 边缘入口的回源通道；应用发布和回滚不会重启它。镜像只用经过验证的完整 Git commit SHA 标记，真实密钥和数据目录全部保存在 Git 仓库外。

目标 OpenWrt 主机使用 NVMe 上的独立 Docker daemon 保存应用镜像与容器；所有回源请求只进入网关端口 `3100`。网关按路径分流到仅监听回环地址的主平台、访客端和 webhook，正式公网入口 `https://chencheng-expo.pages.dev` 通过同一 Pages 代理覆盖全部页面。首次配置、GitHub webhook 自动部署和人工回滚见 [三端生产部署、自动发布与回滚](deploy/ROLLBACK.md)。

## 数据备份与回滚

不要在 SQLite 仍被写入时直接复制数据库文件。发布前应短暂停止网页容器，归档整个 `/data` 挂载目录并生成校验值；候选容器只能使用该备份的独立副本。新版本验收完成前，应保留旧镜像、旧容器和迁移前数据备份。

迁移向后兼容时可直接恢复旧容器；不兼容或迁移部分失败时，必须先停止所有网页容器，再校验并恢复完整数据备份。命令与防误删检查见 [自托管发布与回滚](deploy/ROLLBACK.md)。

## 外部访问

正式入口为 `https://chencheng-expo.pages.dev`，对应独立 Cloudflare Pages 项目，不覆盖任何旧 Pages 站点。目标机上已经验证的 `trycloudflare.com` Quick Tunnel 仅作为 Pages 回源通道，不创建自定义 DNS 记录，也不在应用发布时重启 tunnel。若 Quick Tunnel 容器被重建，必须同步更新 Pages 代理中的回源地址并重新做公网验收。

## 发布边界

场馆尺寸、入口、出口、服务点及节点坐标属于具体活动的运营数据。发布地图前必须完成数据所有权确认、现场复核、无障碍路线核验和第二位管理员审核。

当前仓库没有附带开源许可证。除非仓库所有者另行添加许可证，否则默认保留全部权利。
