# ɳChat Deployment Guide

**Version**: 1.0.0
**Last Updated**: 2026-01-29

This guide covers deploying ɳChat to production environments. For a complete production checklist, see [PRODUCTION-CHECKLIST.md](./Production-Deployment-Checklist.md).

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Deployment Methods](#deployment-methods)
  - [Vercel (Recommended for Frontend)](#vercel-recommended-for-frontend)
  - [Docker](#docker)
  - [Kubernetes](#kubernetes)
  - [Traditional Server](#traditional-server)
- [Backend Setup (nself CLI)](#backend-setup-nself-cli)
- [Database Configuration](#database-configuration)
- [SSL/TLS Setup](#ssltls-setup)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, ensure you have:

- [ ] **Domain name** configured with DNS
- [ ] **SSL certificate** (Let's Encrypt recommended)
- [ ] **PostgreSQL database** (version 14+)
- [ ] **Node.js 20+** on deployment server
- [ ] **Docker** (if using containerized deployment)
- [ ] **nself CLI** installed for backend services

---

## Environment Setup

### Required Environment Variables

Create a `.env.production` file:

```bash
# Frontend Configuration
NEXT_PUBLIC_APP_NAME=ɳChat
NEXT_PUBLIC_ENV=production
NEXT_PUBLIC_USE_DEV_AUTH=false

# API Endpoints
NEXT_PUBLIC_GRAPHQL_URL=https://api.yourdomain.com/v1/graphql
NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com/v1/graphql
NEXT_PUBLIC_AUTH_URL=https://auth.yourdomain.com/v1/auth
NEXT_PUBLIC_STORAGE_URL=https://storage.yourdomain.com/v1/storage

# Backend (Optional, if hosting backend separately)
POSTGRES_HOST=db.yourdomain.com
POSTGRES_PORT=5432
POSTGRES_DB=nchat_production
POSTGRES_USER=nchat_user
POSTGRES_PASSWORD=<secure-password>

# Hasura
HASURA_ADMIN_SECRET=<secure-random-string>
HASURA_JWT_SECRET=<jwt-secret-key>

# Auth Service
AUTH_CLIENT_ID=<client-id>
AUTH_CLIENT_SECRET=<client-secret>

# Storage (S3/MinIO)
STORAGE_ACCESS_KEY=<access-key>
STORAGE_SECRET_KEY=<secret-key>
STORAGE_BUCKET=nchat-uploads
STORAGE_REGION=us-east-1

# Monitoring (Optional)
SENTRY_DSN=<sentry-dsn>
SENTRY_ORG=<sentry-org>
SENTRY_PROJECT=<sentry-project>

# Email (Optional)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=<sendgrid-api-key>
FROM_EMAIL=noreply@yourdomain.com
```

### Generating Secrets

```bash
# Generate Hasura admin secret
openssl rand -hex 32

# Generate JWT secret (256-bit for HS256)
openssl rand -base64 32

# Generate session secret
openssl rand -hex 32
```

---

## Deployment Methods

### Vercel (Recommended for Frontend)

Vercel provides zero-config deployment for Next.js applications.

#### 1. Install Vercel CLI

```bash
npm install -g vercel
```

#### 2. Configure Project

```bash
# Login to Vercel
vercel login

# Link project
vercel link
```

#### 3. Set Environment Variables

```bash
# Via CLI
vercel env add NEXT_PUBLIC_GRAPHQL_URL production
vercel env add NEXT_PUBLIC_AUTH_URL production
# ... add all variables

# Or via vercel.json
{
  "env": {
    "NEXT_PUBLIC_GRAPHQL_URL": "@graphql-url",
    "NEXT_PUBLIC_AUTH_URL": "@auth-url"
  }
}
```

#### 4. Deploy

```bash
# Deploy to production
vercel --prod

# Or push to main branch (auto-deploy if connected to GitHub)
git push origin main
```

#### 5. Configure Custom Domain

```bash
vercel domains add yourdomain.com
vercel domains add www.yourdomain.com
```

**Vercel Configuration** (`vercel.json`):

```json
{
  "framework": "nextjs",
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "regions": ["iad1"],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

---

### Docker

#### 1. Build Docker Image

```bash
# Build production image
docker build -t nchat:1.0.0 -t nchat:latest .

# Test locally
docker run -p 3000:3000 --env-file .env.production nchat:latest
```

#### 2. Docker Compose Setup

**`docker-compose.production.yml`**:

```yaml
version: '3.8'

services:
  app:
    image: nchat:latest
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_GRAPHQL_URL=${NEXT_PUBLIC_GRAPHQL_URL}
      - NEXT_PUBLIC_AUTH_URL=${NEXT_PUBLIC_AUTH_URL}
    depends_on:
      - postgres
      - hasura
    restart: unless-stopped
    networks:
      - nchat-network

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=nchat_production
      - POSTGRES_USER=nchat_user
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    restart: unless-stopped
    networks:
      - nchat-network

  hasura:
    image: hasura/graphql-engine:v2.37.0
    ports:
      - '8080:8080'
    environment:
      - HASURA_GRAPHQL_DATABASE_URL=postgres://nchat_user:${POSTGRES_PASSWORD}@postgres:5432/nchat_production
      - HASURA_GRAPHQL_ADMIN_SECRET=${HASURA_ADMIN_SECRET}
      - HASURA_GRAPHQL_JWT_SECRET=${HASURA_JWT_SECRET}
      - HASURA_GRAPHQL_ENABLE_CONSOLE=false
      - HASURA_GRAPHQL_ENABLED_LOG_TYPES=startup,http-log,webhook-log,websocket-log
    depends_on:
      - postgres
    restart: unless-stopped
    networks:
      - nchat-network

  nginx:
    image: nginx:alpine
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./deploy/docker/nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
    depends_on:
      - app
      - hasura
    restart: unless-stopped
    networks:
      - nchat-network

volumes:
  postgres-data:

networks:
  nchat-network:
    driver: bridge
```

#### 3. Deploy

```bash
# Start services
docker-compose -f docker-compose.production.yml up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

---

### Kubernetes

#### 1. Create Kubernetes Manifests

**Namespace** (`k8s/namespace.yaml`):

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: nchat
```

**Deployment** (`k8s/deployment.yaml`):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nchat-app
  namespace: nchat
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nchat
  template:
    metadata:
      labels:
        app: nchat
    spec:
      containers:
        - name: nchat
          image: nchat:1.0.0
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: 'production'
            - name: NEXT_PUBLIC_GRAPHQL_URL
              valueFrom:
                secretKeyRef:
                  name: nchat-secrets
                  key: graphql-url
          resources:
            requests:
              memory: '256Mi'
              cpu: '100m'
            limits:
              memory: '512Mi'
              cpu: '500m'
          livenessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /api/ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
```

**Service** (`k8s/service.yaml`):

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nchat-service
  namespace: nchat
spec:
  type: LoadBalancer
  selector:
    app: nchat
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
```

**Ingress** (`k8s/ingress.yaml`):

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nchat-ingress
  namespace: nchat
  annotations:
    cert-manager.io/cluster-issuer: 'letsencrypt-prod'
spec:
  tls:
    - hosts:
        - chat.yourdomain.com
      secretName: nchat-tls
  rules:
    - host: chat.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: nchat-service
                port:
                  number: 80
```

#### 2. Deploy to Kubernetes

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Create secrets
kubectl create secret generic nchat-secrets \
  --from-literal=graphql-url=https://api.yourdomain.com/v1/graphql \
  --from-literal=auth-url=https://auth.yourdomain.com/v1/auth \
  -n nchat

# Deploy application
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml

# Check status
kubectl get pods -n nchat
kubectl get services -n nchat
kubectl get ingress -n nchat

# View logs
kubectl logs -f deployment/nchat-app -n nchat
```

---

### Traditional Server (VPS/Dedicated)

#### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
sudo npm install -g pnpm

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install Certbot (for SSL)
sudo apt install -y certbot python3-certbot-nginx
```

#### 2. Clone and Build

```bash
# Clone repository
git clone https://github.com/yourusername/nself-chat.git /var/www/nchat
cd /var/www/nchat

# Install dependencies
pnpm install --frozen-lockfile

# Build production bundle
pnpm build

# Test production server
pnpm start
```

#### 3. Configure PM2

**`ecosystem.config.js`**:

```javascript
module.exports = {
  apps: [
    {
      name: 'nchat',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/var/www/nchat',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/nchat/error.log',
      out_file: '/var/log/nchat/access.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
}
```

```bash
# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup

# Monitor
pm2 monit
```

#### 4. Configure Nginx

**`/etc/nginx/sites-available/nchat`**:

```nginx
upstream nchat_upstream {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name chat.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name chat.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/chat.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/chat.yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;

    location / {
        proxy_pass http://nchat_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static assets
    location /_next/static {
        proxy_pass http://nchat_upstream;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Public folder
    location /public {
        alias /var/www/nchat/public;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/nchat /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

#### 5. Obtain SSL Certificate

```bash
# Get SSL certificate
sudo certbot --nginx -d chat.yourdomain.com

# Auto-renewal
sudo systemctl enable certbot.timer
```

---

## Backend Setup (nself CLI)

The backend requires the nself CLI for Hasura, PostgreSQL, Auth, and Storage services.

### 1. Install nself CLI

```bash
npm install -g @nself/cli

# Verify installation
nself --version
```

### 2. Initialize Backend

```bash
# Navigate to backend directory
cd .backend

# Initialize with production config
nself init --production

# Configure environment
cp .env.example .env.production
# Edit .env.production with your settings

# Build Docker configuration
nself build

# Start services
nself start

# Check status
nself status
```

### 3. Run Migrations

```bash
# Apply database migrations
nself db migrate up

# Verify schema
nself db shell
# Then: \dt nchat_*
```

### 4. Configure Hasura

```bash
# Access Hasura console
# Navigate to http://hasura.yourdomain.com:8080

# Apply metadata
nself hasura metadata apply

# Set up permissions
nself hasura permissions apply
```

---

## Database Configuration

### PostgreSQL Optimization

**`postgresql.conf`** settings for production:

```ini
# Connection Settings
max_connections = 200
shared_buffers = 2GB
effective_cache_size = 6GB
maintenance_work_mem = 512MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 10MB
min_wal_size = 1GB
max_wal_size = 4GB
```

### Backup Strategy

```bash
# Daily automated backup
0 2 * * * /usr/bin/pg_dump -U nchat_user nchat_production | gzip > /backups/nchat_$(date +\%Y\%m\%d).sql.gz

# Weekly full backup with 30-day retention
0 3 * * 0 find /backups -type f -name "nchat_*.sql.gz" -mtime +30 -delete
```

### Restore from Backup

```bash
# Restore database
gunzip -c /backups/nchat_20260129.sql.gz | psql -U nchat_user -d nchat_production
```

---

## SSL/TLS Setup

### Let's Encrypt (Free)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d chat.yourdomain.com -d www.chat.yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

### Custom Certificate

```bash
# Generate private key
openssl genrsa -out yourdomain.key 2048

# Generate CSR
openssl req -new -key yourdomain.key -out yourdomain.csr

# After receiving certificate from CA
sudo cp yourdomain.crt /etc/ssl/certs/
sudo cp yourdomain.key /etc/ssl/private/
```

---

## Monitoring

### Health Checks

```bash
# Application health
curl https://chat.yourdomain.com/api/health

# Database health
curl https://api.yourdomain.com/healthz

# Response time monitoring
curl -w "@curl-format.txt" -o /dev/null -s https://chat.yourdomain.com
```

**`curl-format.txt`**:

```
time_namelookup:  %{time_namelookup}\n
time_connect:  %{time_connect}\n
time_appconnect:  %{time_appconnect}\n
time_pretransfer:  %{time_pretransfer}\n
time_redirect:  %{time_redirect}\n
time_starttransfer:  %{time_starttransfer}\n
time_total:  %{time_total}\n
```

### Log Monitoring

```bash
# PM2 logs
pm2 logs nchat --lines 100

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-16-main.log
```

### Metrics Dashboard

Use Grafana + Prometheus for comprehensive monitoring:

```bash
# Install Prometheus
wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz
tar xvfz prometheus-*.tar.gz
cd prometheus-*

# Configure prometheus.yml
./prometheus --config.file=prometheus.yml

# Install Grafana
sudo apt-get install -y grafana

# Start Grafana
sudo systemctl start grafana-server
sudo systemctl enable grafana-server
```

---

## Troubleshooting

### Common Issues

#### 1. Build Fails

```bash
# Clear Next.js cache
rm -rf .next

# Clear node modules
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Rebuild
pnpm build
```

#### 2. Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port
PORT=3001 pnpm start
```

#### 3. Database Connection Issues

```bash
# Test connection
psql -h localhost -U nchat_user -d nchat_production

# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql
```

#### 4. SSL Certificate Issues

```bash
# Test SSL configuration
openssl s_client -connect chat.yourdomain.com:443

# Renew Let's Encrypt certificate
sudo certbot renew

# Check certificate expiry
openssl x509 -in /etc/letsencrypt/live/chat.yourdomain.com/cert.pem -noout -dates
```

### Performance Tuning

```bash
# Enable Next.js telemetry
NEXT_TELEMETRY_DISABLED=0 pnpm start

# Bundle analysis
ANALYZE=true pnpm build

# Profile with Lighthouse
pnpm lighthouse

# Check database performance
EXPLAIN ANALYZE SELECT * FROM nchat_messages WHERE channel_id = 'uuid';
```

---

## Rollback Procedure

If deployment fails, rollback to previous version:

```bash
# Vercel
vercel rollback

# Docker
docker tag nchat:previous nchat:latest
docker-compose up -d

# PM2
pm2 reload ecosystem.config.js --update-env

# Kubernetes
kubectl rollout undo deployment/nchat-app -n nchat
```

---

## Post-Deployment Checklist

- [ ] Verify all services are running
- [ ] Test authentication flow
- [ ] Send test message
- [ ] Check WebSocket connections
- [ ] Verify file uploads work
- [ ] Test search functionality
- [ ] Check real-time updates
- [ ] Verify email notifications
- [ ] Test mobile responsiveness
- [ ] Run Lighthouse audit
- [ ] Set up monitoring alerts
- [ ] Schedule first backup
- [ ] Update DNS records
- [ ] Inform team of new URL

---

## Support

For deployment assistance:

- **Documentation**: https://docs.nself.org
- **GitHub Issues**: https://github.com/nself-org/nchat/issues
- **Discord**: Join our community server
- **Email**: support@nself.org

---

_Last updated: 2026-01-29_
