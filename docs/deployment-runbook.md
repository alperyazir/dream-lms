# Dream LMS Deployment Runbook

Target: Hetzner VPS with Docker, Traefik reverse proxy, Cloudflare DNS.

---

## 1. First-Time Server Setup

### 1.1 Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in, then verify:
docker --version
docker compose version
```

### 1.2 Create Traefik Network

```bash
docker network create traefik-public
```

### 1.3 Deploy Traefik

Create `/opt/traefik/docker-compose.yml`:

```yaml
services:
  traefik:
    image: traefik:v3.1
    restart: unless-stopped
    command:
      - --providers.docker=true
      - --providers.docker.exposedbydefault=false
      - --entrypoints.http.address=:80
      - --entrypoints.https.address=:443
      - --certificatesresolvers.le.acme.httpchallenge.entrypoint=http
      - --certificatesresolvers.le.acme.email=admin@yourdomain.com
      - --certificatesresolvers.le.acme.storage=/letsencrypt/acme.json
      - --entrypoints.http.http.redirections.entrypoint.to=https
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik-certs:/letsencrypt
    networks:
      - traefik-public

volumes:
  traefik-certs:

networks:
  traefik-public:
    external: true
```

```bash
cd /opt/traefik && docker compose up -d
```

### 1.4 DNS Setup (Cloudflare)

Create A records pointing to your server IP:

| Type | Name        | Content        | Proxy |
|------|-------------|----------------|-------|
| A    | api         | <SERVER_IP>    | DNS only (grey cloud) |
| A    | dashboard   | <SERVER_IP>    | DNS only (grey cloud) |

Use "DNS only" initially so Let's Encrypt HTTP challenge works. Enable Cloudflare proxy after certs are issued.

### 1.5 Clone and Configure

```bash
mkdir -p /opt/dream-lms && cd /opt/dream-lms
git clone https://github.com/your-org/dream-lms.git .
cp .env.prod.template .env
# Edit .env with production values
nano .env
```

Create backups directory:

```bash
mkdir -p /opt/dream-lms/backups
```

---

## 2. Standard Deployment

### 2.1 Deploy (first time or update)

```bash
cd /opt/dream-lms
git pull origin main
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

### 2.2 Verify

```bash
# Check all services are running
docker compose -f docker-compose.prod.yml ps

# Check backend health
curl -f https://api.yourdomain.com/api/v1/health

# Check logs
docker compose -f docker-compose.prod.yml logs backend --tail 50
docker compose -f docker-compose.prod.yml logs frontend --tail 20
```

### 2.3 Run Migrations (if needed manually)

Migrations run automatically on backend startup via the prestart script. To run manually:

```bash
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

---

## 3. Rollback Procedure

### 3.1 Quick Rollback (previous image)

```bash
cd /opt/dream-lms

# Find the previous commit
git log --oneline -5

# Check out the previous working commit
git checkout <previous-commit-hash>

# Rebuild and restart
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

### 3.2 Database Migration Rollback

```bash
# See current migration
docker compose -f docker-compose.prod.yml exec backend alembic current

# See migration history
docker compose -f docker-compose.prod.yml exec backend alembic history --verbose

# Downgrade one step
docker compose -f docker-compose.prod.yml exec backend alembic downgrade -1

# Downgrade to specific revision
docker compose -f docker-compose.prod.yml exec backend alembic downgrade <revision_id>
```

**Always back up the database before running downgrade migrations.**

---

## 4. Database Backup and Restore

### 4.1 Manual Backup

```bash
docker compose -f docker-compose.prod.yml exec db \
  pg_dump -U postgres -d app --format=custom \
  -f /backups/dream-lms-$(date +%Y%m%d-%H%M%S).dump
```

### 4.2 Automated Daily Backup (crontab)

Add to root crontab (`crontab -e`):

```
0 3 * * * cd /opt/dream-lms && docker compose -f docker-compose.prod.yml exec -T db pg_dump -U postgres -d app --format=custom -f /backups/dream-lms-$(date +\%Y\%m\%d).dump && find /opt/dream-lms/backups -name "*.dump" -mtime +14 -delete
```

This runs at 03:00 daily and deletes backups older than 14 days.

### 4.3 Restore from Backup

```bash
# Stop backend and worker to prevent writes
docker compose -f docker-compose.prod.yml stop backend arq-worker

# Restore (this replaces the entire database)
docker compose -f docker-compose.prod.yml exec db \
  pg_restore -U postgres -d app --clean --if-exists \
  /backups/dream-lms-20260326.dump

# Restart services
docker compose -f docker-compose.prod.yml up -d backend arq-worker
```

### 4.4 Download Backup Locally

```bash
scp user@server:/opt/dream-lms/backups/dream-lms-20260326.dump ./
```

---

## 5. Troubleshooting

### Service won't start

```bash
# Check logs for the failing service
docker compose -f docker-compose.prod.yml logs <service> --tail 100

# Check resource usage
docker stats --no-stream

# Restart a specific service
docker compose -f docker-compose.prod.yml restart <service>
```

### Database connection errors

```bash
# Check PgBouncer is healthy
docker compose -f docker-compose.prod.yml exec pgbouncer pg_isready -h 127.0.0.1 -p 6432

# Check active connections
docker compose -f docker-compose.prod.yml exec db psql -U postgres -d app -c "SELECT count(*) FROM pg_stat_activity;"

# Check PgBouncer stats
docker compose -f docker-compose.prod.yml exec pgbouncer psql -U postgres -h 127.0.0.1 -p 6432 pgbouncer -c "SHOW POOLS;"
```

### Redis issues

```bash
docker compose -f docker-compose.prod.yml exec redis redis-cli -p 6380 INFO memory
docker compose -f docker-compose.prod.yml exec redis redis-cli -p 6380 INFO clients
```

### Disk space

```bash
# Check disk usage
df -h

# Docker-specific disk usage
docker system df

# Clean unused images/containers
docker system prune -f
docker image prune -a --filter "until=168h"  # remove images older than 7 days
```

### SSL certificate issues

If Let's Encrypt fails, verify:
1. DNS A records point to this server (not proxied through Cloudflare).
2. Ports 80 and 443 are open: `sudo ufw status`
3. Traefik logs: `docker logs traefik 2>&1 | grep -i acme`

After certs are issued, you can enable Cloudflare proxy (orange cloud).

---

## 6. Environment Variable Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DOMAIN` | Yes | Base domain (e.g., `yourdomain.com`) |
| `FRONTEND_HOST` | Yes | Full frontend URL |
| `SECRET_KEY` | Yes | JWT signing key (64+ chars) |
| `FIRST_SUPERUSER` | Yes | Admin email |
| `FIRST_SUPERUSER_PASSWORD` | Yes | Admin password |
| `POSTGRES_USER` | Yes | Database user |
| `POSTGRES_PASSWORD` | Yes | Database password |
| `POSTGRES_DB` | Yes | Database name |
| `DREAM_CENTRAL_STORAGE_URL` | Yes | DCS endpoint |
| `DREAM_CENTRAL_STORAGE_API_KEY` | Yes | DCS API key |
| `DREAM_CENTRAL_STORAGE_WEBHOOK_SECRET` | Yes | DCS webhook secret (16+ chars) |
| `DEEPSEEK_API_KEY` | * | DeepSeek API key (* at least one AI provider) |
| `GEMINI_API_KEY` | * | Gemini API key (* at least one AI provider) |
| `BACKEND_CORS_ORIGINS` | No | Comma-separated allowed origins |
| `SENTRY_DSN` | No | Sentry error tracking DSN |
| `SMTP_HOST` | No | Email server host |
| `AI_MONTHLY_QUOTA` | No | Per-user AI generation quota (default: 100) |

---

## 7. Monitoring

### Health Check

```bash
# Backend health (should return 200)
curl -sf https://api.yourdomain.com/api/v1/health && echo "OK" || echo "FAIL"
```

### Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f --tail 50

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend

# Since a specific time
docker compose -f docker-compose.prod.yml logs --since "2026-03-26T10:00:00" backend
```

### Resource Monitoring

```bash
# Live container stats
docker stats

# Check memory limits are respected
docker compose -f docker-compose.prod.yml ps --format "table {{.Name}}\t{{.Status}}"
```

### Simple Uptime Check (crontab)

Add to crontab for basic alerting:

```
*/5 * * * * curl -sf https://api.yourdomain.com/api/v1/health > /dev/null || echo "Dream LMS backend DOWN at $(date)" | mail -s "ALERT: Dream LMS Down" ops@yourdomain.com
```
