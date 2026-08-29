# syntax=docker/dockerfile:1.7

FROM node:22.23.1-bookworm-slim AS dependencies

WORKDIR /app

ENV npm_config_audit=false \
    npm_config_fund=false \
    npm_config_update_notifier=false

COPY package.json package-lock.json ./
RUN npm ci


FROM dependencies AS build

WORKDIR /app
COPY . .
RUN npm run build


FROM dependencies AS production-dependencies

WORKDIR /app
RUN npm prune --omit=dev


FROM node:22.23.1-bookworm-slim AS runtime

ARG APP_VERSION=unknown

LABEL org.opencontainers.image.title="Expo Service AI" \
      org.opencontainers.image.revision="${APP_VERSION}"

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    DATA_DIR=/data \
    DATABASE_PATH=/data/expo-service.sqlite

WORKDIR /app

RUN groupadd --system --gid 10001 expo \
    && useradd --system --uid 10001 --gid expo --home-dir /app --shell /usr/sbin/nologin expo \
    && install -d -m 0750 -o expo -g expo /data

COPY --from=production-dependencies --chown=expo:expo /app/node_modules ./node_modules
COPY --from=build --chown=expo:expo /app/package.json ./package.json
COPY --from=build --chown=expo:expo /app/dist ./dist
COPY --from=build --chown=expo:expo /app/public ./public
COPY --from=build --chown=expo:expo /app/drizzle ./drizzle
COPY --from=build --chown=expo:expo /app/scripts ./scripts

USER 10001:10001

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD node -e "const port=process.env.PORT||'3000';fetch('http://127.0.0.1:'+port+'/').then((response)=>{if(!response.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["sh", "-c", "node scripts/migrate.mjs && exec node dist/standalone/server.js"]
