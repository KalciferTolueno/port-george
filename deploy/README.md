# Deploying to a VPS

This guide assumes you have a Linux VPS (Ubuntu/Debian recommended) with
a public IP or domain, and root or `sudo` access.

## 1. One-time server setup

### 1.1 Install Nginx

```bash
sudo apt update
sudo apt install -y nginx
sudo systemctl enable nginx
```

### 1.2 Configure the firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 1.3 Create the deploy directory

```bash
sudo mkdir -p /var/www/portfolio
sudo chown -R $USER:$USER /var/www/portfolio
```

### 1.4 Install the Nginx site

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/portfolio.conf
sudo sed -i 's/example.com/yourdomain.com/g' /etc/nginx/sites-available/portfolio.conf
sudo ln -s /etc/nginx/sites-available/portfolio.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 1.5 Add free HTTPS with Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot will patch the nginx config automatically and set up a
cron-renewal timer.

### 1.6 Point your DNS to the VPS

At your domain registrar, create an A record:

```
yourdomain.com     → <VPS-IP>
www.yourdomain.com → <VPS-IP>
```

Wait for DNS to propagate (typically a few minutes, sometimes up to
24 h).

---

## 2. Deploying updates

### Option A — push from your local machine

```bash
VPS_HOST=deploy@yourdomain.com ./deploy/deploy.sh
```

The script will `npm ci`, run `vite build`, rsync `./dist/` to the
VPS, and reload Nginx.

### Option B — build on the VPS

SSH in, pull, build, copy:

```bash
ssh user@yourdomain.com
cd /var/www/portfolio
git pull                 # or: rsync from local
npm ci
npm run build
sudo cp -r dist/* /var/www/portfolio/dist/
sudo systemctl reload nginx
```

---

## 3. Optional: run the dev server behind Nginx

For a staging environment you can have Nginx proxy to Vite's dev
server on port `5173`:

```nginx
location / {
    proxy_pass         http://127.0.0.1:5173;
    proxy_http_version 1.1;
    proxy_set_header   Host               $host;
    proxy_set_header   X-Real-IP          $remote_addr;
    proxy_set_header   X-Forwarded-For    $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto  $scheme;
}
```

Start Vite on the VPS with:

```bash
nohup npm run dev -- --host 0.0.0.0 > vite.log 2>&1 &
```

> ⚠️ Don't run the dev server in production. Build and serve
> static files — Vite's dev mode is unoptimised and slow.

---

## 4. Smoke-test checklist

After deploying, verify:

- [ ] `https://yourdomain.com/` loads the gallery.
- [ ] Console has no errors.
- [ ] All navigation buttons (`‹`, `›`, arrows, drag) work.
- [ ] Hover and click-to-pin both work.
- [ ] No mixed-content warnings (everything is HTTPS).
- [ ] `curl -I https://yourdomain.com/assets/...` returns
      `Cache-Control: public, immutable` for hashed files.

---

## 5. Logs and monitoring

```bash
sudo journalctl -u nginx -f                # live nginx logs
tail -f /var/log/nginx/portfolio.error.log
```

For uptime monitoring, point [UptimeRobot](https://uptimerobot.com/)
or [Better Stack](https://betterstack.com/) at the site.

---

## 6. Backups

Add a daily snapshot of `/var/www/portfolio/dist/` to your backup
pipeline — the source `dist/` is reproducible from a fresh `npm run
build`, so backups are optional but cheap.
