#!/bin/sh
set -eu

for name in "$VISITOR_HOSTNAME" "$STAFF_HOSTNAME" "$DEPLOY_HOSTNAME"; do
  case "$name" in
    ''|*[!A-Za-z0-9.-]*)
      echo "Invalid gateway hostname" >&2
      exit 1
      ;;
  esac
done

for port in "$GATEWAY_HOST_PORT" "$PLATFORM_HOST_PORT" "$VISITOR_HOST_PORT" "$WEBHOOK_HOST_PORT"; do
  case "$port" in
    ''|*[!0-9]*)
      echo "Invalid gateway port" >&2
      exit 1
      ;;
  esac
done

mkdir -p /tmp/client_body /tmp/proxy /tmp/fastcgi /tmp/uwsgi /tmp/scgi
envsubst '${GATEWAY_HOST_PORT} ${PLATFORM_HOST_PORT} ${VISITOR_HOST_PORT} ${WEBHOOK_HOST_PORT} ${VISITOR_HOSTNAME} ${STAFF_HOSTNAME} ${DEPLOY_HOSTNAME}' \
  < /etc/chencheng/nginx.conf.template > /tmp/nginx.conf
nginx -t -c /tmp/nginx.conf
exec nginx -c /tmp/nginx.conf -g 'daemon off;'
