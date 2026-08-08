# Build stage: compile the Vite bundle.
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Runtime stage: serve the static bundle with `serve` (SPA fallback + gzip).
# EasyPanel handles the public HTTPS proxy, so we don't need nginx in here.
FROM node:22-alpine

WORKDIR /app

RUN npm install -g serve@14

COPY --from=build /app/dist ./dist

ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/ || exit 1

# `-s` rewrites every request to index.html (SPA fallback),
# `-l $PORT` listens on the port EasyPanel forwards to.
CMD ["serve", "-s", "dist", "-l", "3000", "--no-clipboard"]
