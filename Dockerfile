# ---- build ----
# Pinned to an exact image so a changed tag can't slip into a build. To update:
#   docker buildx imagetools inspect oven/bun:1.4-slim
FROM oven/bun:1.4-slim@sha256:b780593f3e10918cbdaec3d5a08d52224b9198069a65eb47812085c2ec007643 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# ---- run ----
FROM oven/bun:1.4-slim@sha256:b780593f3e10918cbdaec3d5a08d52224b9198069a65eb47812085c2ec007643
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    TZ=Europe/London \
    DATABASE_PATH=/data/tennis.db \
    PROTOCOL_HEADER=x-forwarded-proto \
    HOST_HEADER=x-forwarded-host \
    CLIENT_IP_HEADER=cf-connecting-ip \
    BODY_SIZE_LIMIT=64K
COPY --from=build /app/build ./build
COPY server.js ./
RUN mkdir -p /data && chown -R bun:bun /data
USER bun
VOLUME ["/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:3000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["bun", "./server.js"]
