#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Build the static site locally and rsync it to your VPS.
#
# Configure (one of these — pick what's easier):
#   1. Set environment variables:
#        VPS_HOST=user@1.2.3.4  VPS_PATH=/var/www/portfolio  ./deploy/deploy.sh
#   2. Edit the defaults below.
# ─────────────────────────────────────────────────────────────────────────────

VPS_HOST="${VPS_HOST:-user@your-vps.example.com}"
VPS_PATH="${VPS_PATH:-/var/www/portfolio}"
SSH_PORT="${SSH_PORT:-22}"
LOCAL_DIST="dist"

echo "▶ Building production bundle..."
npm ci --omit=dev   # no — use full devDeps for the build
npm install --no-audit --no-fund
npm run build

if [[ ! -d "$LOCAL_DIST" ]]; then
  echo "✗ Build directory '$LOCAL_DIST' missing." >&2
  exit 1
fi

echo "▶ Uploading to ${VPS_HOST}:${VPS_PATH} ..."
ssh -p "$SSH_PORT" "$VPS_HOST" "mkdir -p ${VPS_PATH}"

# -a: archive, --delete: remove stale files, --info=progress2: progress bar
rsync -a --delete --info=progress2 \
  -e "ssh -p ${SSH_PORT} -o StrictHostKeyChecking=accept-new" \
  "$LOCAL_DIST/" "${VPS_HOST}:${VPS_PATH}/"

echo "▶ Reloading nginx on the server..."
ssh -p "$SSH_PORT" "$VPS_HOST" "sudo nginx -t && sudo systemctl reload nginx"

echo "✓ Deploy complete: https://${VPS_HOST#*@}/"
