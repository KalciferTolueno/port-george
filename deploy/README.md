# Deploying via EasyPanel

This project ships with a single `Dockerfile` ready for EasyPanel. The
container serves the static bundle with `serve`; EasyPanel handles the
public HTTPS reverse proxy and certificate renewal on its own.

## 1. Create the app in EasyPanel

1. **Add a new app → "App from GitHub"** (or GitLab / Gitea).
2. Point it to this repository.
3. EasyPanel auto-detects the `Dockerfile` and starts building.
4. **Expose port `3000`** in the app settings — this matches the
   `EXPOSE 3000` in the `Dockerfile`. EasyPanel will route public traffic
   to this internal port.
5. **Set the domain** (e.g. `portfolio.yourdomain.com`) and turn on the
   EasyPanel HTTPS toggle. A Let's Encrypt certificate is provisioned
   automatically.

## 2. Trigger a deploy

Every push to the configured branch rebuilds the image and restarts the
container. To deploy manually from the EasyPanel UI:

1. Open the app.
2. Click **"Deploy"** (top-right).
3. EasyPanel runs `docker build`, then `docker run` with the new image.

## 3. Smoke-test checklist

After the first deploy, verify:

- [ ] `https://yourdomain.com/` loads the gallery.
- [ ] DevTools console has no errors.
- [ ] Mobile view (DevTools emulation, ≤720 px) does not render the
      desktop cursor and shows the buffer-zone layout.
- [ ] Clicking a photo opens the focal card and the focus-lens blur
      fade-in works.
- [ ] `curl -I https://yourdomain.com/assets/...` returns
      `Cache-Control: public, max-age=...` for hashed files (served by
      `serve`).

## 4. Logs and monitoring

EasyPanel streams container logs in the UI. For uptime monitoring, point
[UptimeRobot](https://uptimerobot.com/) or [Better Stack](https://betterstack.com/)
at the public domain.

## 5. Backups

The image is reproducible: a fresh `git clone && npm run build` produces
the same `dist/`. No persistent data lives in the container, so backups
of the running app are unnecessary — back up the GitHub repo instead.

## Notes on the runtime

- The image uses `node:22-alpine` + `dumb-init` (PID 1) + a small
  `server.mjs` (Express) that serves the static bundle and exposes a
  dedicated `/health` endpoint.
- EasyPanel terminates TLS in front of the container, so the server only
  speaks plain HTTP on port `3000`.
- The Docker `HEALTHCHECK` pings `http://127.0.0.1:3000/health`. Point
  EasyPanel's own healthcheck at the same path so the container stays in
  the proxy pool.
- `dumb-init` ensures SIGTERM from Docker/EasyPanel reaches Node, so the
  server can close its socket and exit cleanly instead of being killed
  mid-request.
