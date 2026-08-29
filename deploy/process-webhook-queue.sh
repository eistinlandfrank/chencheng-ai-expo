#!/bin/sh
set -eu

DEPLOY_ROOT=${DEPLOY_ROOT:-/mnt/nvme0n1-4/apps/chencheng-ai-expo}
DEPLOY_ENV_FILE=${DEPLOY_ENV_FILE:-$DEPLOY_ROOT/deploy.env}

if [ ! -f "$DEPLOY_ENV_FILE" ]; then
  echo "Missing deploy environment: $DEPLOY_ENV_FILE" >&2
  exit 1
fi

# shellcheck disable=SC1090
. "$DEPLOY_ENV_FILE"

: "$APP_DOCKER_HOST"
: "$SOURCE_DIR"
: "$RELEASE_ROOT"
: "$BACKUP_ROOT"
: "$STATE_DIR"
: "$DEPLOY_QUEUE_DIR"
: "$SECRETS_DIR"
: "$PLATFORM_DATA_DIR"
: "$GATEWAY_HOST_PORT"
: "$PLATFORM_HOST_PORT"
: "$VISITOR_HOST_PORT"
: "$WEBHOOK_HOST_PORT"

PUBLIC_PORTAL_SHOWCASE=${PUBLIC_PORTAL_SHOWCASE:-true}

export DOCKER_HOST="$APP_DOCKER_HOST"

LOCK_DIR="$STATE_DIR/deploy.lock"
mkdir -p "$STATE_DIR" "$RELEASE_ROOT" "$BACKUP_ROOT" "$DEPLOY_QUEUE_DIR"
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  exit 0
fi
trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT INT TERM

QUEUE_FILE=$(find "$DEPLOY_QUEUE_DIR" -maxdepth 1 -type f -name '*.json' | sort | head -n 1)
if [ -z "$QUEUE_FILE" ]; then
  exit 0
fi

PROCESSING_FILE="$QUEUE_FILE.processing"
mv "$QUEUE_FILE" "$PROCESSING_FILE"

fail() {
  echo "$1" >&2
  mv "$PROCESSING_FILE" "$PROCESSING_FILE.failed" 2>/dev/null || true
  exit 1
}

COMMIT=$(sed -n 's/.*"commit":"\([0-9a-f]\{40\}\)".*/\1/p' "$PROCESSING_FILE")
case "$COMMIT" in
  ''|*[!0-9a-f]*) fail "Invalid commit in webhook queue" ;;
esac
if [ "${#COMMIT}" -ne 40 ]; then
  fail "Commit must be a full SHA"
fi

if [ ! -e "$SOURCE_DIR/.git" ]; then
  fail "Git checkout is missing: $SOURCE_DIR"
fi

git -C "$SOURCE_DIR" fetch --prune origin main || fail "Git fetch failed"
REMOTE_COMMIT=$(git -C "$SOURCE_DIR" rev-parse refs/remotes/origin/main)
if [ "$COMMIT" != "$REMOTE_COMMIT" ]; then
  if git -C "$SOURCE_DIR" merge-base --is-ancestor "$COMMIT" "$REMOTE_COMMIT"; then
    mv "$PROCESSING_FILE" "$PROCESSING_FILE.stale"
    exit 0
  fi
  fail "Webhook commit is not the current origin/main"
fi

RELEASE_DIR="$RELEASE_ROOT/$COMMIT/source"
if [ ! -d "$RELEASE_DIR" ]; then
  mkdir -p "$RELEASE_ROOT/$COMMIT"
  git -C "$SOURCE_DIR" worktree add --detach "$RELEASE_DIR" "$COMMIT" || fail "Cannot create release worktree"
fi

for file in platform.env visitor.env webhook.env; do
  SECRET_FILE="$SECRETS_DIR/$file"
  if [ ! -f "$SECRET_FILE" ]; then
    fail "Missing server secret file: $SECRET_FILE"
  fi
  MODE=$(stat -c '%a' "$SECRET_FILE")
  if [ "$MODE" != "600" ]; then
    fail "Secret file must use mode 0600: $SECRET_FILE"
  fi
done

export APP_VERSION="$COMMIT"
export DEPLOY_QUEUE_DIR SECRETS_DIR PLATFORM_DATA_DIR
export GATEWAY_HOST_PORT PLATFORM_HOST_PORT VISITOR_HOST_PORT WEBHOOK_HOST_PORT
export PUBLIC_PORTAL_SHOWCASE
COMPOSE_FILE="$RELEASE_DIR/compose.production.yaml"

docker compose -f "$COMPOSE_FILE" config --quiet || fail "Compose configuration is invalid"

docker run --rm --network host \
  -v "$RELEASE_DIR:/app" \
  -w /app \
  node:22.23.1-bookworm-slim \
  sh -lc 'npm ci && npm run check && npm run build' \
  || fail "Platform verification failed"

docker run --rm --network host \
  -e NEXT_PUBLIC_APP_TITLE='智能展会导览' \
  -e NEXT_PUBLIC_APP_DESCRIPTION='智能展会导览与行程规划' \
  -v "$RELEASE_DIR/visitor-app:/app" \
  -w /app \
  oven/bun:1.3.9-alpine \
  sh -lc 'bun install --frozen-lockfile && bun run lint && bun run build' \
  || fail "Visitor verification failed"

docker compose -f "$COMPOSE_FILE" build gateway platform visitor webhook || fail "Image build failed"

BACKUP_ID=$(date -u +%Y%m%dT%H%M%SZ)-before-$COMMIT
BACKUP_DIR="$BACKUP_ROOT/$BACKUP_ID"
mkdir -p "$BACKUP_DIR"

LEGACY_PLATFORM_CONTAINER=${LEGACY_PLATFORM_CONTAINER:-}
BACKUP_CONTAINER=''
if docker inspect chencheng-platform >/dev/null 2>&1 \
  && [ "$(docker inspect --format '{{.State.Running}}' chencheng-platform)" = true ]; then
  BACKUP_CONTAINER=chencheng-platform
elif [ -n "$LEGACY_PLATFORM_CONTAINER" ] \
  && docker inspect "$LEGACY_PLATFORM_CONTAINER" >/dev/null 2>&1 \
  && [ "$(docker inspect --format '{{.State.Running}}' "$LEGACY_PLATFORM_CONTAINER")" = true ]; then
  BACKUP_CONTAINER=$LEGACY_PLATFORM_CONTAINER
fi

if [ -n "$BACKUP_CONTAINER" ]; then
  BACKUP_WAS_RUNNING=$(docker inspect --format '{{.State.Running}}' "$BACKUP_CONTAINER")
  if [ "$BACKUP_WAS_RUNNING" = true ]; then
    docker stop -t 30 "$BACKUP_CONTAINER" >/dev/null || fail "Cannot stop platform for backup"
  fi
fi

if ! tar -C "$PLATFORM_DATA_DIR" -cpf "$BACKUP_DIR/platform-data.tar" .; then
  if [ -n "$BACKUP_CONTAINER" ] && [ "$BACKUP_WAS_RUNNING" = true ]; then
    docker start "$BACKUP_CONTAINER" >/dev/null 2>&1 || true
  fi
  fail "Platform backup failed"
fi

if [ -n "$BACKUP_CONTAINER" ]; then
  if [ "$BACKUP_WAS_RUNNING" = true ]; then
    docker start "$BACKUP_CONTAINER" >/dev/null || fail "Cannot resume platform after backup"
  fi
fi
sha256sum "$BACKUP_DIR/platform-data.tar" > "$BACKUP_DIR/platform-data.tar.sha256"

LEGACY_PLATFORM_WAS_RUNNING=0
if [ -n "$LEGACY_PLATFORM_CONTAINER" ] && docker inspect "$LEGACY_PLATFORM_CONTAINER" >/dev/null 2>&1; then
  if [ "$(docker inspect --format '{{.State.Running}}' "$LEGACY_PLATFORM_CONTAINER")" = true ]; then
    docker stop -t 30 "$LEGACY_PLATFORM_CONTAINER" >/dev/null || fail "Cannot stop legacy platform container"
    LEGACY_PLATFORM_WAS_RUNNING=1
  fi
fi

PREVIOUS_VERSION=''
if [ -f "$STATE_DIR/current-version" ]; then
  PREVIOUS_VERSION=$(sed -n '1p' "$STATE_DIR/current-version")
fi

restore_previous() {
  if [ -n "$PREVIOUS_VERSION" ] && [ "${#PREVIOUS_VERSION}" -eq 40 ] \
    && [ -f "$RELEASE_ROOT/$PREVIOUS_VERSION/source/compose.production.yaml" ]; then
    APP_VERSION="$PREVIOUS_VERSION" docker compose \
      -f "$RELEASE_ROOT/$PREVIOUS_VERSION/source/compose.production.yaml" \
      up -d --no-build gateway platform visitor webhook || true
    return
  fi

  docker rm -f chencheng-gateway chencheng-platform chencheng-visitor chencheng-deploy-webhook >/dev/null 2>&1 || true
  if [ "$LEGACY_PLATFORM_WAS_RUNNING" -eq 1 ]; then
    docker start "$LEGACY_PLATFORM_CONTAINER" >/dev/null 2>&1 || true
  fi
}

if ! docker compose -f "$COMPOSE_FILE" up -d --no-build gateway platform visitor webhook; then
  restore_previous
  fail "Service switch failed"
fi

wait_healthy() {
  NAME="$1"
  ATTEMPT=0
  while [ "$ATTEMPT" -lt 60 ]; do
    STATUS=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$NAME" 2>/dev/null || true)
    if [ "$STATUS" = healthy ]; then
      return 0
    fi
    if [ "$STATUS" = exited ] || [ "$STATUS" = dead ]; then
      return 1
    fi
    ATTEMPT=$((ATTEMPT + 1))
    sleep 2
  done
  return 1
}

if ! wait_healthy chencheng-gateway \
  || ! wait_healthy chencheng-platform \
  || ! wait_healthy chencheng-visitor \
  || ! wait_healthy chencheng-deploy-webhook; then
  restore_previous
  fail "New release failed health checks"
fi

if ! curl --fail --silent --show-error "http://127.0.0.1:$GATEWAY_HOST_PORT/operations" >/dev/null \
  || ! curl --fail --silent --show-error "http://127.0.0.1:$GATEWAY_HOST_PORT/exhibitor" >/dev/null \
  || ! curl --fail --silent --show-error "http://127.0.0.1:$GATEWAY_HOST_PORT/booths" >/dev/null \
  || ! curl --fail --silent --show-error "http://127.0.0.1:$WEBHOOK_HOST_PORT/healthz" >/dev/null; then
  restore_previous
  fail "Release origin checks failed"
fi

printf '%s\n' "$COMMIT" > "$STATE_DIR/current-version"
printf '%s|%s|%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$COMMIT" "$BACKUP_ID" >> "$STATE_DIR/releases.log"
ln -sfn "$RELEASE_ROOT/$COMMIT" "$DEPLOY_ROOT/current"
mv "$PROCESSING_FILE" "$PROCESSING_FILE.done"
