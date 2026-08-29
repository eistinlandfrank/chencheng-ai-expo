# syntax=docker/dockerfile:1.7

FROM oven/bun:1.3.9-alpine AS dependencies

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile


FROM dependencies AS build

WORKDIR /app
ENV NEXT_PUBLIC_APP_TITLE="智能展会导览" \
    NEXT_PUBLIC_APP_DESCRIPTION="智能展会导览与行程规划"
COPY . .
RUN bun run build


FROM oven/bun:1.3.9-alpine AS runtime

ARG APP_VERSION=unknown

LABEL org.opencontainers.image.title="Expo Service AI Visitor" \
      org.opencontainers.image.revision="${APP_VERSION}"

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

WORKDIR /app

COPY --from=dependencies --chown=bun:bun /app/node_modules ./node_modules
COPY --from=build --chown=bun:bun /app/.next ./.next
COPY --from=build --chown=bun:bun /app/public ./public
COPY --from=build --chown=bun:bun /app/package.json ./package.json
COPY --from=build --chown=bun:bun /app/next.config.ts ./next.config.ts

USER bun

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:'+(process.env.PORT||'3000')+'/').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["sh", "-c", "exec bun run start --hostname \"$HOSTNAME\" --port \"$PORT\""]
