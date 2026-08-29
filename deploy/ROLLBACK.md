# 自托管发布与回滚

本文适用于将已验证的 Git 提交发布到现有 Docker 主机。Cloudflare Tunnel 独立运行并继续指向宿主机 `127.0.0.1:3100`；发布过程不得停止、删除或重建 tunnel 容器。

## 发布约束

- 只发布已经通过类型检查、lint、迁移检查和生产构建的提交。
- 镜像必须使用完整 Git commit SHA 标记，不使用 `latest` 作为发布依据。
- `.env` 只保存在服务器，权限设为 `0600`，不得打包、提交或写入命令行参数。
- 持久数据目录固定挂载到容器 `/data`；数据库路径为 `/data/expo-service.sqlite`。
- 候选容器只能使用生产数据的静止副本，不得直接挂载生产 `/data`。
- 迁移必须可重复执行、事务化，并在部署前明确是否向后兼容。
- 不向任何容器挂载 Docker socket。

以下示例假设项目位于 `/mnt/nvme0n1-4/apps/chencheng-ai-expo`。执行前进入该目录。

## 1. 固定版本并检查环境

```sh
: "${APP_VERSION:?由已验证的发布制品提供完整 Git commit SHA}"
export DEPLOY_PROJECT="chencheng-ai-expo-$APP_VERSION"
export HOST_DATA_DIR="/mnt/nvme0n1-4/apps/chencheng-ai-expo/data"
export RELEASE_ROOT="/mnt/nvme0n1-4/apps/chencheng-ai-expo/releases"
export BACKUP_ROOT="/mnt/nvme0n1-4/apps/chencheng-ai-expo/backups"

case "$APP_VERSION" in
  *[!0-9a-f]*|'') echo "APP_VERSION 必须是 Git commit SHA" >&2; exit 1 ;;
esac
test "${#APP_VERSION}" -eq 40

test -f .env
test "$(stat -c '%a' .env)" = "600"
docker compose -p "$DEPLOY_PROJECT" config --quiet
```

创建目录时应让容器内的非 root 用户 `10001:10001` 拥有数据目录：

```sh
install -d -m 0750 -o 10001 -g 10001 "$HOST_DATA_DIR"
install -d -m 0750 "$RELEASE_ROOT" "$BACKUP_ROOT"
```

## 2. 构建不可变镜像

```sh
docker compose -p "$DEPLOY_PROJECT" build --pull web
docker image inspect "chencheng-ai-expo:$APP_VERSION" \
  --format 'image={{.Id}} revision={{index .Config.Labels "org.opencontainers.image.revision"}}'
```

检查输出中的 revision 必须与 `APP_VERSION` 完全一致。记录镜像 ID、commit SHA 和构建时间到发布记录，不记录环境变量值。

## 3. 制作静止数据备份

复制正在写入的 SQLite 文件可能产生不可恢复的备份。先短暂停止当前网页容器，再归档整个数据目录；不要停止 tunnel。

```sh
export BACKUP_ID="$(date -u +%Y%m%dT%H%M%SZ)-before-$APP_VERSION"
export BACKUP_DIR="$BACKUP_ROOT/$BACKUP_ID"
install -d -m 0750 "$BACKUP_DIR"

docker stop -t 30 chencheng-web
if ! tar -C "$HOST_DATA_DIR" -cpf "$BACKUP_DIR/data.tar" .; then
  docker start chencheng-web
  exit 1
fi
docker start chencheng-web

sha256sum "$BACKUP_DIR/data.tar" > "$BACKUP_DIR/data.tar.sha256"
```

如果停止或重新启动旧容器失败，应立即终止发布并先恢复旧服务。

## 4. 验证版本化候选容器

候选容器在 `127.0.0.1:3101` 上运行，并使用备份的独立副本。启动时会先在副本上执行迁移。

```sh
export CANDIDATE_NAME="chencheng-web-candidate-$APP_VERSION"
export CANDIDATE_DATA="$RELEASE_ROOT/$APP_VERSION/candidate-data"
install -d -m 0750 -o 10001 -g 10001 "$CANDIDATE_DATA"
tar -C "$CANDIDATE_DATA" -xpf "$BACKUP_DIR/data.tar"
chown -R 10001:10001 "$CANDIDATE_DATA"

docker run -d \
  --name "$CANDIDATE_NAME" \
  --restart no \
  --init \
  --read-only \
  --env-file .env \
  --env NODE_ENV=production \
  --env HOST=0.0.0.0 \
  --env HOSTNAME=0.0.0.0 \
  --env PORT=3000 \
  --env DATA_DIR=/data \
  --env DATABASE_PATH=/data/expo-service.sqlite \
  --cap-drop ALL \
  --security-opt no-new-privileges:true \
  --tmpfs /tmp:rw,noexec,nosuid,size=64m,mode=1777 \
  --mount "type=bind,src=$CANDIDATE_DATA,dst=/data" \
  --publish 127.0.0.1:3101:3000 \
  "chencheng-ai-expo:$APP_VERSION"
```

等待 Docker 健康状态为 `healthy`，再检查主页及关键角色入口：

```sh
for attempt in $(seq 1 30); do
  status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$CANDIDATE_NAME")"
  test "$status" = healthy && break
  test "$status" = exited -o "$status" = dead && break
  sleep 2
done

test "$(docker inspect --format '{{.State.Health.Status}}' "$CANDIDATE_NAME")" = healthy
curl --fail --silent --show-error http://127.0.0.1:3101/ >/dev/null
```

候选检查失败时查看其非敏感日志，删除候选容器并终止发布；生产容器保持不变：

```sh
docker logs --tail 200 "$CANDIDATE_NAME"
docker rm -f "$CANDIDATE_NAME"
```

## 5. 切换到新版本

先记录当前容器和镜像，再移除候选容器。旧容器以版本化回滚名称保留，直到新版本验收完成。

```sh
export PREVIOUS_IMAGE="$(docker inspect --format '{{.Config.Image}}' chencheng-web)"
export PREVIOUS_IMAGE_ID="$(docker inspect --format '{{.Image}}' chencheng-web)"
export ROLLBACK_CONTAINER="chencheng-web-rollback-$(date -u +%Y%m%dT%H%M%SZ)"

docker rm -f "$CANDIDATE_NAME"
docker stop -t 30 chencheng-web
docker rename chencheng-web "$ROLLBACK_CONTAINER"
docker compose -p "$DEPLOY_PROJECT" up -d --no-build web
```

新容器会先对生产 `/data` 执行迁移，再启动 `dist/standalone/server.js`。确认健康状态、本机 origin 以及现有 Cloudflare 公网地址：

```sh
test "$(docker inspect --format '{{.State.Health.Status}}' chencheng-web)" = healthy
curl --fail --silent --show-error http://127.0.0.1:3100/ >/dev/null
curl --fail --silent --show-error "$PUBLIC_URL/" >/dev/null
```

`PUBLIC_URL` 应在当前 shell 中临时设置为现有 Cloudflare 公网地址，不要写入仓库。切换期间始终保持 tunnel 容器运行。

## 6. 回滚

### 迁移向后兼容时

如果新迁移明确兼容旧代码，可保留当前数据并恢复旧容器：

```sh
docker compose -p "$DEPLOY_PROJECT" stop -t 30 web
docker compose -p "$DEPLOY_PROJECT" rm -f web
docker rename "$ROLLBACK_CONTAINER" chencheng-web
docker start chencheng-web
curl --fail --silent --show-error http://127.0.0.1:3100/ >/dev/null
```

### 必须恢复迁移前数据时

如果迁移不兼容旧代码或发生部分失败，网页容器必须保持停止，并从已校验的静止备份恢复整个数据目录：

```sh
docker compose -p "$DEPLOY_PROJECT" stop -t 30 web 2>/dev/null || true
docker compose -p "$DEPLOY_PROJECT" rm -f web 2>/dev/null || true
docker stop -t 30 "$ROLLBACK_CONTAINER" 2>/dev/null || true

sha256sum -c "$BACKUP_DIR/data.tar.sha256"
test "$HOST_DATA_DIR" = "/mnt/nvme0n1-4/apps/chencheng-ai-expo/data"
test -d "$HOST_DATA_DIR"
find "$HOST_DATA_DIR" -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +
tar -C "$HOST_DATA_DIR" -xpf "$BACKUP_DIR/data.tar"
chown -R 10001:10001 "$HOST_DATA_DIR"

docker rename "$ROLLBACK_CONTAINER" chencheng-web
docker start chencheng-web
curl --fail --silent --show-error http://127.0.0.1:3100/ >/dev/null
```

恢复命令会删除当前 `/data` 内容，只能在确认目标目录等于上述 `HOST_DATA_DIR`、校验备份成功且所有网页容器均已停止后执行。

## 7. 验收后清理

保留至少一个已验证的旧镜像、对应回滚容器、迁移前数据备份和发布记录。确认业务验收、错误日志与公网健康检查均正常后，才可删除更早的候选数据和无引用镜像。不要自动清理最近一次可回滚版本。
