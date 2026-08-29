# syntax=docker/dockerfile:1.7

FROM node:22.23.1-bookworm-slim

ARG APP_VERSION=unknown

LABEL org.opencontainers.image.title="Expo Service AI deploy webhook" \
      org.opencontainers.image.revision="${APP_VERSION}"

ENV NODE_ENV=production \
    LISTEN_HOST=127.0.0.1 \
    PORT=3000 \
    QUEUE_DIR=/queue

WORKDIR /app

RUN groupadd --system --gid 10001 webhook \
    && useradd --system --uid 10001 --gid webhook --home-dir /app --shell /usr/sbin/nologin webhook

COPY --chown=10001:10001 server.mjs ./server.mjs

USER 10001:10001

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "server.mjs"]
