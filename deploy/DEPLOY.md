# CricFlow — Ubuntu Server Deployment

## Requirements
- Ubuntu 22.04 LTS (fresh VPS, minimum 1 GB RAM / 20 GB disk)
- Domain `cricflow.online` pointed at the server's IP (A record)
- SSH access as root or a sudo user

---

## 1. Connect & update the server

```bash
ssh root@YOUR_SERVER_IP
apt update && apt upgrade -y
```

---

## 2. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker
# Test
docker --version
```

Docker Compose v2 is bundled with Docker. Test:
```bash
docker compose version
```

---

## 3. Install Nginx & Certbot

```bash
apt install -y nginx certbot python3-certbot-nginx
systemctl enable nginx
```

---

## 4. Copy the project to the server

**Option A — Git (recommended):**
```bash
cd /opt
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git cricflow
cd cricflow
```

**Option B — rsync from your Windows machine (run on Windows terminal):**
```bash
rsync -avz --exclude '.git' --exclude 'node_modules' \
  /d/tournament/ root@YOUR_SERVER_IP:/opt/cricflow/
```

---

## 5. Create the production `.env` file

```bash
cd /opt/cricflow
cp .env.example .env
nano .env
```

Fill in real values:

| Variable | Value |
|---|---|
| `POSTGRES_PASSWORD` | strong random password, e.g. `openssl rand -hex 24` |
| `DATABASE_URL` | update URL to match new password |
| `SECRET_KEY` | `openssl rand -hex 32` |
| `ALLOWED_ORIGINS` | `https://cricflow.online,https://www.cricflow.online` |
| `CLOUDINARY_*` | your real Cloudinary credentials |
| `RAZORPAY_*` | your Razorpay keys |

Generate strong secrets quickly:
```bash
openssl rand -hex 32   # use for SECRET_KEY
openssl rand -hex 24   # use for POSTGRES_PASSWORD
```

---

## 6. Configure Nginx (HTTP only first, for Certbot)

```bash
cp /opt/cricflow/deploy/nginx-cricflow.conf /etc/nginx/sites-available/cricflow
ln -s /etc/nginx/sites-available/cricflow /etc/nginx/sites-enabled/cricflow
rm -f /etc/nginx/sites-enabled/default

# Temporarily comment out the ssl_certificate lines for the first run
nano /etc/nginx/sites-available/cricflow
# Comment out these 4 lines with # :
#   ssl_certificate ...
#   ssl_certificate_key ...
#   ssl_protocols ...
#   ssl_ciphers ...
# Also change "listen 443 ssl" to "listen 443"

nginx -t && systemctl reload nginx
```

---

## 7. Get the SSL certificate

```bash
certbot --nginx -d cricflow.online -d www.cricflow.online \
  --non-interactive --agree-tos -m your@email.com
```

Now restore the ssl lines you commented out:
```bash
nano /etc/nginx/sites-available/cricflow
# uncomment the ssl_* lines and restore "listen 443 ssl"
```

Or just re-copy the original config:
```bash
cp /opt/cricflow/deploy/nginx-cricflow.conf /etc/nginx/sites-available/cricflow
nginx -t && systemctl reload nginx
```

Certbot auto-renews. Verify:
```bash
certbot renew --dry-run
```

---

## 8. Build and start the application

```bash
cd /opt/cricflow
docker compose -f docker-compose.prod.yml --env-file .env build
docker compose -f docker-compose.prod.yml --env-file .env up -d
```

Check containers are running:
```bash
docker compose -f docker-compose.prod.yml ps
```

Run database migrations:
```bash
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

---

## 9. Verify

```bash
# All 4 containers should be Up
docker compose -f docker-compose.prod.yml ps

# Check backend logs
docker compose -f docker-compose.prod.yml logs backend --tail=20

# Test the API
curl https://cricflow.online/api/v1/teams
```

Open `https://cricflow.online` in your browser — you should see the CricFlow app.

---

## Day-to-day operations

### Redeploy after code changes
```bash
cd /opt/cricflow
git pull                          # if using git
docker compose -f docker-compose.prod.yml --env-file .env build
docker compose -f docker-compose.prod.yml --env-file .env up -d
```

### View logs
```bash
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
```

### Restart a service
```bash
docker compose -f docker-compose.prod.yml restart backend
```

### Stop everything
```bash
docker compose -f docker-compose.prod.yml down
```

### Backup the database
```bash
docker exec cricflow_db pg_dump -U postgres tournament_db | \
  gzip > /opt/backups/cricflow_$(date +%Y%m%d).sql.gz
```

---

## Firewall (optional but recommended)

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
ufw status
```

Port 3000 (Docker) should NOT be publicly accessible — it's bound to `127.0.0.1` only.

---

## Auto-start on server reboot

Docker is already set to `restart: unless-stopped` in the compose file.
Ensure Docker itself starts on boot:
```bash
systemctl enable docker
```
