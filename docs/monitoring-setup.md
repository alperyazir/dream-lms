# Monitoring Setup Guide

## Uptime Kuma

Uptime Kuma is included in the Docker Compose stack for service monitoring.

### First-Time Setup

1. Start the stack: `docker compose up -d`
2. Open `http://localhost:3001` in your browser
3. Create an admin account in the setup wizard

### Configure Monitors

Add the following monitors in the Uptime Kuma UI:

| Monitor Name | Type | Target | Interval |
|-------------|------|--------|----------|
| API Health | HTTP | `http://backend:8000/api/v1/health` | 60s |
| Frontend | HTTP | `http://frontend:80` | 60s |
| PostgreSQL | TCP | `db` port `5432` | 60s |
| Redis | TCP | `redis` port `6380` | 60s |
| DCS (External) | HTTP | Your DCS endpoint URL | 120s |

### Notes

- Uptime Kuma runs on the default Docker network and can reach all services by their container hostname
- Redis uses port **6380** (not the default 6379)
- The API health endpoint checks both database and Redis connectivity and returns:
  - `healthy` — all services up
  - `degraded` — database up, Redis down
  - `unhealthy` — database down
- Data persists in the `uptime-kuma-data` Docker volume
- No alert notifications are configured by default — add them in the Uptime Kuma UI if needed
