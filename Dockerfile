# Build stage: compile the Vite bundle.
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Runtime stage: a small Express server with a /health endpoint.
# EasyPanel terminates TLS in front of the container, so plain HTTP is fine.
#
# `dumb-init` runs as PID 1 so SIGTERM (sent by Docker before stop/restart)
# is forwarded to the Node process; the server then closes its socket and
# exits cleanly. Without it, the kernel would kill the Node process and
# in-flight requests would 502.
FROM node:22-alpine

RUN apk add --no-cache dumb-init

WORKDIR /app

# Install only runtime deps (Express). Reuse the lockfile from the build.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY server.mjs ./

ENV PORT=3000
EXPOSE 3000

# Healthcheck against the dedicated endpoint. EasyPanel also probes this
# path; a 200 keeps the container in the proxy pool.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.mjs"]
