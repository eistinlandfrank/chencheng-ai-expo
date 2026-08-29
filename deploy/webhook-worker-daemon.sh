#!/bin/sh
set -eu

DEPLOY_ROOT=${DEPLOY_ROOT:-/mnt/nvme0n1-4/apps/chencheng-ai-expo}
while true; do
  PROCESSOR="$DEPLOY_ROOT/source/deploy/process-webhook-queue.sh"
  if [ -x "$DEPLOY_ROOT/current/source/deploy/process-webhook-queue.sh" ]; then
    PROCESSOR="$DEPLOY_ROOT/current/source/deploy/process-webhook-queue.sh"
  fi
  if [ -x "$PROCESSOR" ]; then
    "$PROCESSOR" || true
  fi
  sleep 5
done
