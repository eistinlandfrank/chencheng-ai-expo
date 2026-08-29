# syntax=docker/dockerfile:1.7

FROM nginx:1.27.5-alpine

ARG APP_VERSION=unknown

LABEL org.opencontainers.image.title="Expo Service AI gateway" \
      org.opencontainers.image.revision="${APP_VERSION}"

COPY --chown=101:101 nginx.conf.template /etc/chencheng/nginx.conf.template
COPY --chown=101:101 entrypoint.sh /usr/local/bin/chencheng-gateway

USER 101:101

EXPOSE 3100

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null --header="Host: $VISITOR_HOSTNAME" "http://127.0.0.1:$GATEWAY_HOST_PORT/" || exit 1

ENTRYPOINT ["/usr/local/bin/chencheng-gateway"]
