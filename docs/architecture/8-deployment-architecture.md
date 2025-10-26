# 8. Deployment Architecture

## 8.1 Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  traefik:
    image: traefik:v2.10
    ports:
      - "80:80"
      - "443:443"
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@yourdomain.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./letsencrypt:/letsencrypt
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.frontend.rule=Host(`yourdomain.com`)"
      - "traefik.http.routers.frontend.entrypoints=websecure"
      - "traefik.http.routers.frontend.tls.certresolver=letsencrypt"
      - "traefik.http.services.frontend.loadbalancer.server.port=80"
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      - DATABASE_URL=postgresql+asyncpg://postgres:password@db:5432/dreamlms
      - REDIS_URL=redis://redis:6379/0
      - MINIO_ENDPOINT=minio.yourdomain.com
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.backend.rule=Host(`yourdomain.com`) && PathPrefix(`/api`, `/docs`, `/redoc`)"
      - "traefik.http.routers.backend.entrypoints=websecure"
      - "traefik.http.routers.backend.tls.certresolver=letsencrypt"
      - "traefik.http.services.backend.loadbalancer.server.port=8000"
    depends_on:
      - db
      - redis
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=dreamlms
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped

volumes:
  postgres_data:
```

## 8.2 Traefik Configuration

**Key Features:**

1. **Automatic SSL/TLS Management**: Traefik automatically obtains and renews Let's Encrypt certificates
2. **Service Discovery**: Docker labels define routing rules, no manual configuration files needed
3. **HTTP to HTTPS Redirect**: Automatic redirect from port 80 to 443
4. **Path-Based Routing**: Frontend serves all routes except `/api/*`, `/docs`, `/redoc` which go to backend

**Additional Traefik Configuration** (optional `traefik.yml`):

```yaml
# docker/traefik/traefik.yml
api:
  dashboard: true
  insecure: true  # Disable in production

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
          permanent: true
  websecure:
    address: ":443"

providers:
  docker:
    exposedByDefault: false
    network: web

certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@yourdomain.com
      storage: /letsencrypt/acme.json
      tlsChallenge: {}

# Rate limiting middleware
http:
  middlewares:
    rate-limit:
      rateLimit:
        average: 100
        period: 1m
        burst: 20
```

**Applying Middleware** (add to backend labels in docker-compose.yml):

```yaml
labels:
  - "traefik.http.routers.backend.middlewares=rate-limit@file"
```

---
