# Standalone Deployment Guide

**Version**: 0.9.2
**Last Updated**: February 10, 2026
**Status**: Production Ready

## Overview

Standalone deployment means each nself-chat instance runs with its own dedicated nSelf backend infrastructure. This is the simplest deployment model and recommended for:

- Single teams or organizations
- Simple setup requirements
- Full control over infrastructure
- Independent scaling needs
- Testing and development environments

## Architecture

```
app1.example.com
├── Frontend (Next.js)
│   └── Served at /
├── Backend (nSelf)
│   ├── /api           → Hasura GraphQL
│   ├── /auth          → Nhost Auth
│   ├── /v1/graphql    → GraphQL endpoint
│   └── /storage       → MinIO (optional)
└── Database (PostgreSQL)
    └── Single database instance
```

## Prerequisites

### Required
- Domain name with DNS control
- Hosting platform account (Vercel/Netlify/Docker host)
- SSL certificate (Let's Encrypt or platform-provided)
- Node.js 20+ (for local builds)
- pnpm 9.15.4+

### Recommended
- CDN (Cloudflare, Fastly, etc.)
- Monitoring service (Sentry, DataDog)
- Backup solution
- CI/CD pipeline

## Step-by-Step Deployment

### Step 1: Deploy Backend (nSelf CLI)

**Option A: Docker Compose (Recommended for VPS)**

```bash
# Clone repository
git clone https://github.com/yourusername/nself-chat.git
cd nself-chat

# Install nself CLI
npm install -g @nself/cli@latest

# Initialize backend
cd .backend
nself init --demo

# Configure environment
cp .env.example .env
nano .env  # Edit configuration

# Start services
nself start

# Verify services
nself status
nself urls
```

**Expected Output:**
```
✓ PostgreSQL     http://localhost:5432
✓ Hasura         http://localhost:8080
✓ Auth           http://localhost:4000
✓ Admin          http://localhost:3021
```

**Option B: Kubernetes (Recommended for Production)**

```bash
# Apply configurations
kubectl apply -f deploy/k8s/namespace.yaml
kubectl apply -f deploy/k8s/postgres.yaml
kubectl apply -f deploy/k8s/hasura.yaml
kubectl apply -f deploy/k8s/auth.yaml

# Verify pods
kubectl get pods -n nself-chat

# Check logs
kubectl logs -f deployment/hasura -n nself-chat
```

### Step 2: Configure Environment Variables

Create `.env.local` for frontend:

```bash
# Backend URLs (adjust for your domain)
NEXT_PUBLIC_GRAPHQL_URL=https://app1.example.com/v1/graphql
NEXT_PUBLIC_AUTH_URL=https://app1.example.com/auth
NEXT_PUBLIC_STORAGE_URL=https://app1.example.com/storage

# Environment
NEXT_PUBLIC_ENV=production
NODE_ENV=production

# Application
NEXT_PUBLIC_APP_NAME=nself-chat
NEXT_PUBLIC_PRIMARY_COLOR=#6366f1

# Optional: Sentry monitoring
NEXT_PUBLIC_SENTRY_DSN=https://[key]@[org].ingest.sentry.io/[project]
SENTRY_ORG=your-org
SENTRY_PROJECT=nself-chat
```

Backend `.env` (in `.backend/` directory):

```bash
# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=nself_chat
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password

# Hasura
HASURA_GRAPHQL_ADMIN_SECRET=your_admin_secret
HASURA_GRAPHQL_JWT_SECRET={"type":"HS256","key":"your_jwt_secret"}

# Auth
AUTH_SERVER_URL=http://auth:4000
AUTH_CLIENT_URL=https://app1.example.com/auth

# Optional: Storage
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=your_minio_password
```

### Step 3: Deploy Frontend

**Option A: Vercel (Recommended for Next.js)**

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Configure environment variables in Vercel dashboard
# Project Settings → Environment Variables
```

**Vercel Configuration** (`vercel.json`):

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "env": {
    "NEXT_PUBLIC_GRAPHQL_URL": "https://app1.example.com/v1/graphql",
    "NEXT_PUBLIC_AUTH_URL": "https://app1.example.com/auth"
  }
}
```

**Option B: Netlify**

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build
pnpm build

# Deploy
netlify deploy --prod --dir=.next
```

**Netlify Configuration** (`netlify.toml`) (note: `[[redirects]]` below is TOML array-of-tables syntax, not a wiki link):

```toml
[build]
  command = "pnpm build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "20"
  NPM_FLAGS = "--version"

[[redirects]]
  from = "/api/*"
  to = "https://app1.example.com/api/:splat"
  status = 200

[[redirects]]
  from = "/auth/*"
  to = "https://app1.example.com/auth/:splat"
  status = 200
```

**Option C: Docker (Self-Hosted)**

```bash
# Build image
docker build -t nself-chat:latest .

# Run container
docker run -d \
  --name nself-chat \
  -p 3000:3000 \
  -e NEXT_PUBLIC_GRAPHQL_URL=https://app1.example.com/v1/graphql \
  -e NEXT_PUBLIC_AUTH_URL=https://app1.example.com/auth \
  nself-chat:latest

# Verify
docker logs -f nself-chat
```

**Dockerfile** (already included):

```dockerfile
FROM node:22-alpine AS base

# Dependencies
FROM base AS deps
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Builder
FROM base AS builder
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

### Step 4: Configure Custom Domain

**DNS Configuration:**

```
Type    Name    Value                   TTL
A       @       your.server.ip.address  3600
CNAME   www     app1.example.com        3600
```

**Vercel Domain Setup:**

1. Go to Project Settings → Domains
2. Add `app1.example.com`
3. Configure DNS as shown in Vercel dashboard
4. Wait for SSL certificate provisioning (~5 minutes)

**Nginx Configuration** (if self-hosted):

```nginx
# /etc/nginx/sites-available/nself-chat
server {
    listen 80;
    server_name app1.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app1.example.com;

    ssl_certificate /etc/letsencrypt/live/app1.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app1.example.com/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8080/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Auth
    location /auth/ {
        proxy_pass http://localhost:4000/v1/auth/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # GraphQL
    location /v1/graphql {
        proxy_pass http://localhost:8080/v1/graphql;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    # Storage (optional)
    location /storage/ {
        proxy_pass http://localhost:9000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

Enable and restart:

```bash
sudo ln -s /etc/nginx/sites-available/nself-chat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 5: Setup SSL Certificates

**Option A: Let's Encrypt (Free)**

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d app1.example.com

# Auto-renewal (already configured by certbot)
sudo certbot renew --dry-run
```

**Option B: Platform-Managed (Vercel/Netlify)**

SSL certificates are automatically provisioned and renewed. No action required.

**Option C: Custom Certificate**

```bash
# Copy certificate files
sudo cp your-cert.crt /etc/ssl/certs/app1.example.com.crt
sudo cp your-cert.key /etc/ssl/private/app1.example.com.key

# Set permissions
sudo chmod 644 /etc/ssl/certs/app1.example.com.crt
sudo chmod 600 /etc/ssl/private/app1.example.com.key

# Update Nginx config (already shown above)
```

### Step 6: Configure CORS

**Hasura CORS** (`.backend/.env`):

```bash
# Allow your frontend domain
HASURA_GRAPHQL_CORS_DOMAIN=https://app1.example.com
```

**Nhost Auth CORS** (`.backend/.env`):

```bash
# Allowed redirect URIs
AUTH_CLIENT_URL=https://app1.example.com
AUTH_REDIRECT_URL=https://app1.example.com/auth/callback
```

**Frontend CORS** (`next.config.mjs`):

```javascript
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://app1.example.com' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ]
  },
}
```

## Platform-Specific Guides

### Vercel Deployment

**Pros:**
- Zero configuration
- Automatic SSL
- Global CDN
- Serverless functions
- GitHub integration

**Steps:**

1. **Connect Repository**
   ```bash
   # Push to GitHub
   git remote add origin https://github.com/yourusername/nself-chat.git
   git push -u origin main
   ```

2. **Import to Vercel**
   - Go to https://vercel.com/new
   - Select repository
   - Framework preset: Next.js
   - Click "Deploy"

3. **Configure Environment Variables**
   - Project Settings → Environment Variables
   - Add all `NEXT_PUBLIC_*` variables
   - Redeploy

4. **Add Custom Domain**
   - Project Settings → Domains
   - Add `app1.example.com`
   - Configure DNS as instructed

### Netlify Deployment

**Pros:**
- Simple configuration
- Branch previews
- Form handling
- Edge functions

**Steps:**

1. **Build Configuration** (`netlify.toml`):
   ```toml
   [build]
     command = "pnpm build"
     publish = ".next"

   [build.environment]
     NODE_VERSION = "20"
   ```

2. **Deploy**
   ```bash
   netlify deploy --prod --dir=.next
   ```

3. **Configure Domain**
   - Domain settings → Add domain
   - Configure DNS

### Docker Deployment

**Pros:**
- Full control
- Consistent environments
- Easy scaling
- Multi-platform support

**Docker Compose** (`docker-compose.yml`):

```yaml
version: '3.8'

services:
  frontend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_GRAPHQL_URL=https://app1.example.com/v1/graphql
      - NEXT_PUBLIC_AUTH_URL=https://app1.example.com/auth
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl
    depends_on:
      - frontend
    restart: unless-stopped
```

### Kubernetes Deployment

**Pros:**
- Production-grade orchestration
- Auto-scaling
- High availability
- Rolling updates

**Deployment** (`deploy/k8s/frontend.yaml`):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nself-chat-frontend
  namespace: nself-chat
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nself-chat-frontend
  template:
    metadata:
      labels:
        app: nself-chat-frontend
    spec:
      containers:
      - name: frontend
        image: nself-chat:latest
        ports:
        - containerPort: 3000
        env:
        - name: NEXT_PUBLIC_GRAPHQL_URL
          value: "https://app1.example.com/v1/graphql"
        - name: NEXT_PUBLIC_AUTH_URL
          value: "https://app1.example.com/auth"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: nself-chat-frontend
  namespace: nself-chat
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 3000
  selector:
    app: nself-chat-frontend
```

## Environment Variables

See [Environment-Variables.md](./Environment-Variables.md) for complete list.

**Critical Variables:**

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_GRAPHQL_URL` | Yes | `https://app1.example.com/v1/graphql` | GraphQL endpoint |
| `NEXT_PUBLIC_AUTH_URL` | Yes | `https://app1.example.com/auth` | Auth service URL |
| `NEXT_PUBLIC_ENV` | Yes | `production` | Environment |
| `POSTGRES_PASSWORD` | Yes | `secure_password_123` | Database password |
| `HASURA_GRAPHQL_ADMIN_SECRET` | Yes | `your_admin_secret` | Hasura admin secret |

## Troubleshooting

### Issue: Frontend can't connect to backend

**Symptoms:** GraphQL errors, authentication failures

**Solutions:**

1. Check CORS configuration
   ```bash
   curl -I https://app1.example.com/v1/graphql
   ```

2. Verify environment variables
   ```bash
   # In frontend container
   env | grep NEXT_PUBLIC
   ```

3. Check network connectivity
   ```bash
   # From frontend container
   curl https://app1.example.com/v1/graphql
   ```

### Issue: SSL certificate not working

**Symptoms:** Browser shows "Not Secure", HTTPS errors

**Solutions:**

1. Verify certificate installation
   ```bash
   sudo certbot certificates
   ```

2. Check Nginx configuration
   ```bash
   sudo nginx -t
   ```

3. Renew certificate
   ```bash
   sudo certbot renew
   ```

### Issue: Database connection failed

**Symptoms:** Backend services crash, connection errors

**Solutions:**

1. Check PostgreSQL status
   ```bash
   # Docker
   docker ps | grep postgres

   # System service
   sudo systemctl status postgresql
   ```

2. Verify credentials
   ```bash
   # Test connection
   psql -h localhost -U postgres -d nself_chat
   ```

3. Check firewall
   ```bash
   sudo ufw status
   sudo ufw allow 5432/tcp
   ```

### Issue: Out of memory

**Symptoms:** Container crashes, build failures

**Solutions:**

1. Increase Docker memory
   ```bash
   # Docker Desktop → Settings → Resources
   # Set memory to 4GB+
   ```

2. Optimize build
   ```bash
   # Use multi-stage builds (already in Dockerfile)
   # Clear build cache
   docker builder prune
   ```

### Issue: Slow performance

**Symptoms:** Pages load slowly, timeouts

**Solutions:**

1. Enable caching
   ```nginx
   # In Nginx config
   location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
       expires 1y;
       add_header Cache-Control "public, immutable";
   }
   ```

2. Use CDN
   - Cloudflare (free tier available)
   - AWS CloudFront
   - Fastly

3. Optimize images
   ```javascript
   // Use Next.js Image component (already used)
   import Image from 'next/image'
   ```

## Cost Estimation

### Low-Traffic (< 10K users/month)

| Service | Provider | Cost |
|---------|----------|------|
| Frontend | Vercel Hobby | $0/mo |
| Backend | DigitalOcean Droplet | $12/mo |
| Database | Included | $0/mo |
| Storage | DigitalOcean Spaces | $5/mo |
| Domain | Namecheap | $12/year |
| SSL | Let's Encrypt | $0/mo |
| **Total** | | **~$18/month** |

### Medium-Traffic (10K-100K users/month)

| Service | Provider | Cost |
|---------|----------|------|
| Frontend | Vercel Pro | $20/mo |
| Backend | DigitalOcean 4GB | $24/mo |
| Database | Managed PostgreSQL | $15/mo |
| Storage | DigitalOcean Spaces | $5/mo |
| CDN | Cloudflare Pro | $20/mo |
| Monitoring | Sentry Team | $26/mo |
| **Total** | | **~$110/month** |

### High-Traffic (100K+ users/month)

| Service | Provider | Cost |
|---------|----------|------|
| Frontend | Vercel Enterprise | $150/mo |
| Backend | Kubernetes (3 nodes) | $150/mo |
| Database | RDS PostgreSQL | $100/mo |
| Storage | S3 + CloudFront | $50/mo |
| Monitoring | DataDog | $150/mo |
| **Total** | | **~$600/month** |

## Security Checklist

- [ ] SSL/TLS enabled (HTTPS only)
- [ ] Strong database password
- [ ] Hasura admin secret set
- [ ] JWT secret configured
- [ ] CORS properly configured
- [ ] Environment variables secured
- [ ] Firewall configured
- [ ] Regular backups enabled
- [ ] Monitoring and alerting setup
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] DDoS protection (Cloudflare)

## Next Steps

1. **Setup Monitoring**: [Monitoring.md](../operations/Monitoring.md)
2. **Configure Backups**: [Backup-Strategy.md](../operations/Backup-Strategy.md)
3. **Performance Tuning**: [Performance-Optimization.md](../operations/Performance-Optimization.md)
4. **Scaling Guide**: [Scaling-Guide.md](../operations/Scaling-Guide.md)

## Resources

- [nSelf CLI Documentation](https://nself.dev/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Netlify Documentation](https://docs.netlify.com)
- [Docker Documentation](https://docs.docker.com)
- [Kubernetes Documentation](https://kubernetes.io/docs)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs)

---

**Need Help?**
- GitHub Issues: https://github.com/yourusername/nself-chat/issues
- Community Discord: https://discord.gg/nself
- Documentation: https://docs.nself.org
