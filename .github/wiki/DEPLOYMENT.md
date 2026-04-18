# nself-chat Production Deployment Guide

**Version**: 1.0.0
**Last Updated**: January 30, 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Environment Configuration](#environment-configuration)
4. [Docker Deployment](#docker-deployment)
5. [Kubernetes Deployment](#kubernetes-deployment)
6. [Cloud Platform Deployments](#cloud-platform-deployments)
7. [SSL/TLS Setup](#ssltls-setup)
8. [Backend Configuration](#backend-configuration)
9. [Monitoring & Logging](#monitoring--logging)
10. [Backup & Recovery](#backup--recovery)
11. [Scaling Considerations](#scaling-considerations)
12. [Troubleshooting](#troubleshooting)

---

## Overview

nself-chat supports multiple deployment strategies:

| Strategy             | Best For                      | Complexity | Auto-scaling |
| -------------------- | ----------------------------- | ---------- | ------------ |
| **Docker**           | VPS, single server            | Low        | Manual       |
| **Kubernetes**       | Production, high availability | High       | Yes (HPA)    |
| **Vercel**           | Quick deploys, serverless     | Low        | Automatic    |
| **Netlify**          | Static hosting + functions    | Low        | Automatic    |
| **AWS ECS/Fargate**  | AWS ecosystem                 | Medium     | Yes          |
| **Google Cloud Run** | Serverless containers         | Medium     | Automatic    |

### Architecture Overview

```
┌─────────────────┐
│   nself-chat    │  Next.js 15 Frontend (Port 3000)
│   (Frontend)    │
└────────┬────────┘
         │
         ├──────────────────────────────────────┐
         │                                      │
┌────────▼────────┐                  ┌─────────▼────────┐
│   Hasura API    │                  │   Nhost Auth     │
│   (Port 8080)   │                  │   (Port 4000)    │
└────────┬────────┘                  └─────────┬────────┘
         │                                      │
         └──────────────┬───────────────────────┘
                        │
                 ┌──────▼───────┐
                 │  PostgreSQL  │
                 │  (Port 5432) │
                 └──────────────┘
```

---

## Prerequisites

### Required Software

- **Docker**: 24.0+ and Docker Compose 2.20+
- **Node.js**: 20.0+ (for local builds)
- **pnpm**: 9.15.4+
- **Git**: 2.40+

### For Kubernetes Deployments

- **kubectl**: 1.28+
- **Helm**: 3.12+ (optional, for Helm charts)
- **cert-manager**: For SSL/TLS certificates

### Required Accounts

- **GitHub** (for image registry)
- **Cloud provider account** (AWS, GCP, Azure, or other)
- **Domain name** with DNS control
- **Sentry account** (optional, for error tracking)

### Domain Setup

Before deploying, ensure you have:

1. A registered domain (e.g., `chat.example.com`)
2. DNS access to create A/CNAME records
3. (Optional) Wildcard certificate for subdomains

---

## Environment Configuration

### Required Environment Variables

#### Frontend Variables

```bash
# Production mode
NODE_ENV=production
NEXT_PUBLIC_ENV=production
NEXT_PUBLIC_USE_DEV_AUTH=false

# Application branding
NEXT_PUBLIC_APP_NAME=nchat

# Backend service URLs
NEXT_PUBLIC_GRAPHQL_URL=https://api.chat.example.com/v1/graphql
NEXT_PUBLIC_AUTH_URL=https://auth.chat.example.com
NEXT_PUBLIC_STORAGE_URL=https://storage.chat.example.com

# Sentry error tracking (optional)
NEXT_PUBLIC_SENTRY_DSN=https://[key]@[org].ingest.sentry.io/[project]
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
SENTRY_AUTH_TOKEN=your-auth-token
NEXT_PUBLIC_RELEASE_VERSION=1.0.0
```

#### Backend Variables (nself CLI)

These are managed by nself CLI in `.backend/.env`:

```bash
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<strong-password>
POSTGRES_DB=nchat

# Hasura
HASURA_GRAPHQL_ADMIN_SECRET=<strong-admin-secret>
HASURA_GRAPHQL_JWT_SECRET='{"type":"HS256","key":"<32-char-jwt-secret>"}'

# Redis (if enabled)
REDIS_PASSWORD=<strong-password>

# MinIO/S3 (if enabled)
MINIO_ROOT_USER=minio
MINIO_ROOT_PASSWORD=<strong-password>
AWS_ACCESS_KEY_ID=<access-key>
AWS_SECRET_ACCESS_KEY=<secret-key>
S3_BUCKET=nchat-storage

# SMTP
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASSWORD=<smtp-password>
SMTP_SENDER=noreply@example.com
```

### Environment Variable Templates

Create `.env.production` from template:

```bash
cp .env.example .env.production
```

**Security Best Practices**:

- Never commit `.env.production` to git
- Use secrets management (AWS Secrets Manager, Vault, etc.)
- Rotate secrets regularly (every 90 days)
- Use different secrets for staging and production
- Enable audit logging for secret access

---

## Docker Deployment

### Single Server Deployment

#### 1. Build the Docker Image

```bash
# Clone repository
git clone https://github.com/nself/nself-chat.git
cd nself-chat

# Build multi-arch image
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --build-arg NEXT_PUBLIC_GRAPHQL_URL=https://api.chat.example.com/v1/graphql \
  --build-arg NEXT_PUBLIC_AUTH_URL=https://auth.chat.example.com \
  --build-arg NEXT_PUBLIC_STORAGE_URL=https://storage.chat.example.com \
  -t nself-chat:latest \
  -f Dockerfile \
  .
```

#### 2. Create Environment File

```bash
cat > .env.production << 'EOF'
NODE_ENV=production
NEXT_PUBLIC_ENV=production
NEXT_PUBLIC_USE_DEV_AUTH=false
NEXT_PUBLIC_APP_NAME=nchat
NEXT_PUBLIC_GRAPHQL_URL=https://api.chat.example.com/v1/graphql
NEXT_PUBLIC_AUTH_URL=https://auth.chat.example.com
NEXT_PUBLIC_STORAGE_URL=https://storage.chat.example.com
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project
EOF
```

#### 3. Run the Container

```bash
docker run -d \
  --name nself-chat \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env.production \
  --health-cmd="/healthcheck.sh || exit 1" \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  nself-chat:latest
```

#### 4. Verify Deployment

```bash
# Check container status
docker ps | grep nself-chat

# View logs
docker logs -f nself-chat

# Test health endpoint
curl http://localhost:3000/api/health
```

### Docker Compose Deployment

For full stack deployment with all services:

```bash
# Start all services
docker compose -f docker-compose.yml up -d

# View logs
docker compose logs -f nchat

# Stop all services
docker compose down

# Stop and remove volumes (destructive!)
docker compose down -v
```

### Nginx Reverse Proxy

Create `/etc/nginx/sites-available/nself-chat`:

```nginx
upstream nself-chat {
    server localhost:3000;
    keepalive 32;
}

server {
    listen 80;
    listen [::]:80;
    server_name chat.example.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name chat.example.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/chat.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/chat.example.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/xml+rss text/javascript;

    # Proxy settings
    location / {
        proxy_pass http://nself-chat;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://nself-chat;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }

    # Health check endpoint (no auth required)
    location /api/health {
        proxy_pass http://nself-chat;
        access_log off;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://nself-chat;
    }
}
```

Enable and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/nself-chat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Kubernetes Deployment

### Prerequisites

1. **Kubernetes cluster** (1.28+)
2. **kubectl** configured
3. **Ingress controller** (nginx, traefik, or similar)
4. **cert-manager** for SSL certificates

### Quick Deploy

```bash
# Create namespace
kubectl apply -f deploy/k8s/namespace.yaml

# Create secrets (do NOT use template values!)
kubectl create secret generic nself-chat-secrets \
  --namespace=nself-chat \
  --from-literal=POSTGRES_PASSWORD=$(openssl rand -base64 32) \
  --from-literal=HASURA_ADMIN_SECRET=$(openssl rand -base64 32) \
  --from-literal=HASURA_JWT_SECRET='{"type":"HS256","key":"'$(openssl rand -base64 32)'"}' \
  --from-literal=REDIS_PASSWORD=$(openssl rand -base64 32)

# Deploy ConfigMap
kubectl apply -f deploy/k8s/configmap.yaml

# Deploy application
kubectl apply -f deploy/k8s/deployment.yaml

# Deploy service
kubectl apply -f deploy/k8s/service.yaml

# Deploy ingress
kubectl apply -f deploy/k8s/ingress.yaml

# Verify deployment
kubectl get pods -n nself-chat
kubectl get svc -n nself-chat
kubectl get ingress -n nself-chat
```

### Step-by-Step Deployment

#### 1. Create Namespace

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: nself-chat
  labels:
    name: nself-chat
    environment: production
EOF
```

#### 2. Create Secrets

**IMPORTANT**: Never use template values in production!

```bash
# Generate strong secrets
POSTGRES_PASSWORD=$(openssl rand -base64 32)
HASURA_ADMIN_SECRET=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)

# Create secrets
kubectl create secret generic nself-chat-secrets \
  --namespace=nself-chat \
  --from-literal=POSTGRES_USER=postgres \
  --from-literal=POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
  --from-literal=POSTGRES_DB=nchat \
  --from-literal=HASURA_ADMIN_SECRET="$HASURA_ADMIN_SECRET" \
  --from-literal=HASURA_JWT_SECRET="{\"type\":\"HS256\",\"key\":\"$JWT_SECRET\"}" \
  --from-literal=REDIS_PASSWORD="$REDIS_PASSWORD"

# Save secrets securely
echo "POSTGRES_PASSWORD=$POSTGRES_PASSWORD" >> .secrets.production
echo "HASURA_ADMIN_SECRET=$HASURA_ADMIN_SECRET" >> .secrets.production
echo "REDIS_PASSWORD=$REDIS_PASSWORD" >> .secrets.production
chmod 600 .secrets.production
```

#### 3. Create Image Pull Secret (for private registry)

```bash
kubectl create secret docker-registry nself-chat-registry \
  --namespace=nself-chat \
  --docker-server=ghcr.io \
  --docker-username=YOUR_GITHUB_USERNAME \
  --docker-password=YOUR_GITHUB_TOKEN
```

#### 4. Deploy ConfigMap

Edit `deploy/k8s/configmap.yaml` with your URLs, then:

```bash
kubectl apply -f deploy/k8s/configmap.yaml
```

#### 5. Deploy Application

```bash
kubectl apply -f deploy/k8s/deployment.yaml
```

#### 6. Deploy Service

```bash
kubectl apply -f deploy/k8s/service.yaml
```

#### 7. Deploy Ingress

Edit `deploy/k8s/ingress.yaml` to set your domain:

```yaml
spec:
  tls:
    - hosts:
        - chat.example.com
      secretName: nself-chat-tls
  rules:
    - host: chat.example.com
```

Then apply:

```bash
kubectl apply -f deploy/k8s/ingress.yaml
```

#### 8. Verify Deployment

```bash
# Check pods
kubectl get pods -n nself-chat -w

# Check logs
kubectl logs -f deployment/nself-chat -n nself-chat

# Check service
kubectl get svc -n nself-chat

# Check ingress
kubectl get ingress -n nself-chat

# Describe pod for troubleshooting
kubectl describe pod -l app.kubernetes.io/name=nself-chat -n nself-chat
```

### Scaling

#### Horizontal Pod Autoscaler (HPA)

```bash
# Deploy HPA
kubectl apply -f deploy/k8s/hpa.yaml

# Check HPA status
kubectl get hpa -n nself-chat

# Manual scaling
kubectl scale deployment nself-chat --replicas=5 -n nself-chat
```

#### Pod Disruption Budget

```bash
# Ensure minimum availability during updates
kubectl apply -f deploy/k8s/pdb.yaml
```

### Rolling Updates

```bash
# Update image
kubectl set image deployment/nself-chat \
  nself-chat=ghcr.io/nself/nself-chat:v1.1.0 \
  -n nself-chat

# Watch rollout
kubectl rollout status deployment/nself-chat -n nself-chat

# Rollback if needed
kubectl rollout undo deployment/nself-chat -n nself-chat

# Check rollout history
kubectl rollout history deployment/nself-chat -n nself-chat
```

### Helm Deployment

```bash
# Add custom values
helm install nself-chat ./deploy/helm/nself-chat \
  --namespace nself-chat \
  --create-namespace \
  --values deploy/helm/nself-chat/values-production.yaml \
  --set image.tag=v1.0.0 \
  --set ingress.hosts[0].host=chat.example.com

# Upgrade
helm upgrade nself-chat ./deploy/helm/nself-chat \
  --namespace nself-chat \
  --values deploy/helm/nself-chat/values-production.yaml

# Rollback
helm rollback nself-chat -n nself-chat
```

---

## Cloud Platform Deployments

### Vercel

#### Manual Deployment

1. **Install Vercel CLI**:

```bash
npm i -g vercel
```

2. **Login and Link Project**:

```bash
vercel login
vercel link
```

3. **Configure Environment Variables**:

```bash
# Production
vercel env add NEXT_PUBLIC_GRAPHQL_URL production
vercel env add NEXT_PUBLIC_AUTH_URL production
vercel env add NEXT_PUBLIC_STORAGE_URL production
vercel env add NEXT_PUBLIC_SENTRY_DSN production
```

4. **Deploy**:

```bash
# Preview deployment
vercel

# Production deployment
vercel --prod
```

#### GitHub Actions Deployment

The workflow is already configured in `.github/workflows/deploy-vercel.yml`.

Set secrets in GitHub repository:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Deploy via GitHub:

```bash
# Trigger workflow
gh workflow run deploy-vercel.yml -f environment=production
```

### Netlify

#### Manual Deployment

1. **Install Netlify CLI**:

```bash
npm i -g netlify-cli
```

2. **Login and Initialize**:

```bash
netlify login
netlify init
```

3. **Configure Build Settings**:

Create `netlify.toml` (the `plugins` array below uses TOML array-of-tables syntax — double brackets are TOML, not wiki-links):

```toml
[build]
  command = "pnpm build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "20"
  NEXT_PUBLIC_USE_DEV_AUTH = "false"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

4. **Deploy**:

```bash
# Preview
netlify deploy

# Production
netlify deploy --prod
```

### AWS Elastic Container Service (ECS)

#### 1. Create ECR Repository

```bash
aws ecr create-repository \
  --repository-name nself-chat \
  --region us-east-1
```

#### 2. Build and Push Image

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build and tag
docker build -t nself-chat:latest .
docker tag nself-chat:latest \
  <account-id>.dkr.ecr.us-east-1.amazonaws.com/nself-chat:latest

# Push
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/nself-chat:latest
```

#### 3. Create Task Definition

```json
{
  "family": "nself-chat",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "nself-chat",
      "image": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/nself-chat:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "NEXT_PUBLIC_GRAPHQL_URL",
          "valueFrom": "arn:aws:secretsmanager:region:account-id:secret:nself-chat/graphql-url"
        }
      ],
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/api/health || exit 1"],
        "interval": 30,
        "timeout": 10,
        "retries": 3,
        "startPeriod": 40
      }
    }
  ]
}
```

#### 4. Create ECS Service

```bash
aws ecs create-service \
  --cluster nself-chat-cluster \
  --service-name nself-chat \
  --task-definition nself-chat:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-12345],securityGroups=[sg-12345],assignPublicIp=ENABLED}"
```

### Google Cloud Run

#### 1. Build and Push to GCR

```bash
# Configure Docker for GCR
gcloud auth configure-docker

# Build
gcloud builds submit --tag gcr.io/PROJECT_ID/nself-chat:latest

# Or use Docker
docker build -t gcr.io/PROJECT_ID/nself-chat:latest .
docker push gcr.io/PROJECT_ID/nself-chat:latest
```

#### 2. Deploy to Cloud Run

```bash
gcloud run deploy nself-chat \
  --image gcr.io/PROJECT_ID/nself-chat:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 2 \
  --min-instances 1 \
  --max-instances 10 \
  --port 3000 \
  --set-env-vars NODE_ENV=production,NEXT_PUBLIC_USE_DEV_AUTH=false \
  --set-secrets NEXT_PUBLIC_GRAPHQL_URL=graphql-url:latest
```

---

## SSL/TLS Setup

### Let's Encrypt with Certbot

#### Install Certbot

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# CentOS/RHEL
sudo yum install certbot python3-certbot-nginx
```

#### Obtain Certificate

```bash
# Automatic (recommended)
sudo certbot --nginx -d chat.example.com

# Manual
sudo certbot certonly --nginx -d chat.example.com
```

#### Auto-renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Enable auto-renewal (cron)
echo "0 0,12 * * * root certbot renew --quiet" | sudo tee -a /etc/crontab
```

### Kubernetes with cert-manager

#### Install cert-manager

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

#### Create ClusterIssuer

```bash
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
EOF
```

The Ingress in `deploy/k8s/ingress.yaml` already references this ClusterIssuer.

### Wildcard Certificates

For `*.chat.example.com`:

```bash
# DNS challenge (requires DNS API access)
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: wildcard-cert
  namespace: nself-chat
spec:
  secretName: wildcard-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - 'chat.example.com'
    - '*.chat.example.com'
  acme:
    config:
      - dns01:
          provider: cloudflare
        domains:
          - 'chat.example.com'
          - '*.chat.example.com'
EOF
```

---

## Backend Configuration

### nself CLI Setup

The backend runs in the `.backend/` directory using nself CLI.

#### Initial Setup

```bash
# Navigate to backend
cd .backend

# Initialize (if not already done)
nself init --demo

# Configure services
nself config set POSTGRES_PASSWORD <strong-password>
nself config set HASURA_ADMIN_SECRET <strong-admin-secret>

# Build configuration
nself build

# Start all services
nself start

# Verify status
nself status
nself urls
```

#### Production Backend Configuration

Edit `.backend/.env`:

```bash
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<strong-password>
POSTGRES_DB=nchat

# Hasura
HASURA_GRAPHQL_ADMIN_SECRET=<strong-admin-secret>
HASURA_GRAPHQL_JWT_SECRET='{"type":"HS256","key":"<32-char-jwt-secret>"}'
HASURA_GRAPHQL_ENABLE_CONSOLE=false
HASURA_GRAPHQL_DEV_MODE=false
HASURA_GRAPHQL_CORS_DOMAIN=https://chat.example.com

# Auth
AUTH_CLIENT_URL=https://chat.example.com
AUTH_SERVER_URL=https://auth.chat.example.com

# Storage (MinIO or S3)
MINIO_ROOT_USER=minio
MINIO_ROOT_PASSWORD=<strong-password>
# OR
AWS_ACCESS_KEY_ID=<access-key>
AWS_SECRET_ACCESS_KEY=<secret-key>
S3_BUCKET=nchat-storage
S3_REGION=us-east-1

# SMTP
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=<sendgrid-api-key>
SMTP_SENDER=noreply@chat.example.com
```

#### Database Migrations

```bash
# Navigate to backend
cd .backend

# Run migrations
nself exec hasura -- hasura migrate apply --database-name default

# Seed data (optional)
nself exec postgres -- psql -U postgres -d nchat -f /seed.sql
```

### External PostgreSQL

If using managed PostgreSQL (AWS RDS, Google Cloud SQL, etc.):

```bash
# Update .backend/.env
HASURA_GRAPHQL_DATABASE_URL=postgres://user:password@db.example.com:5432/nchat

# Disable local PostgreSQL
# Comment out postgres service in .backend/docker-compose.yml
```

### External Redis

For Redis (AWS ElastiCache, Redis Cloud, etc.):

```bash
# Update .backend/.env
REDIS_URL=redis://:password@redis.example.com:6379
```

### External S3

For AWS S3 or compatible storage:

```bash
# Update .backend/.env
STORAGE_TYPE=s3
AWS_ACCESS_KEY_ID=<access-key>
AWS_SECRET_ACCESS_KEY=<secret-key>
S3_BUCKET=nchat-storage
S3_REGION=us-east-1
S3_ENDPOINT=https://s3.us-east-1.amazonaws.com
```

---

## Monitoring & Logging

### Sentry Integration

#### Setup

1. **Create Sentry Project**: Go to https://sentry.io and create a new project

2. **Configure Environment Variables**:

```bash
# .env.production
NEXT_PUBLIC_SENTRY_DSN=https://[key]@[org].ingest.sentry.io/[project]
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
SENTRY_AUTH_TOKEN=your-auth-token
NEXT_PUBLIC_RELEASE_VERSION=1.0.0
```

3. **Verify Setup**:

```typescript
// The instrumentation is automatic via:
// - src/instrumentation.ts
// - src/sentry.client.config.ts
// - src/instrumentation.node.ts
// - src/instrumentation.edge.ts
```

#### Monitoring Features

- **Error Tracking**: Automatic capture of JavaScript errors
- **Performance Monitoring**: Transaction tracking for API routes
- **Session Replay**: User interaction replay for debugging
- **Breadcrumbs**: User actions, console logs, network requests
- **Release Tracking**: Associate errors with specific versions

### Application Logging

#### Structured Logging

```typescript
// Use Sentry utils for consistent logging
import { captureError, addSentryBreadcrumb } from '@/lib/sentry-utils'

// Log errors with context
try {
  await sendMessage()
} catch (error) {
  captureError(error, {
    tags: { feature: 'chat', action: 'send-message' },
    extra: { channelId, userId },
  })
}

// Add breadcrumbs for debugging
addSentryBreadcrumb('user', 'Message sent', { channelId })
```

#### Docker Logging

```bash
# View logs
docker logs -f nself-chat

# Export logs to file
docker logs nself-chat > nself-chat.log 2>&1

# Use logging driver
docker run -d \
  --log-driver=json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  nself-chat:latest
```

#### Kubernetes Logging

```bash
# View logs
kubectl logs -f deployment/nself-chat -n nself-chat

# All pods
kubectl logs -l app.kubernetes.io/name=nself-chat -n nself-chat

# Export logs
kubectl logs deployment/nself-chat -n nself-chat > logs.txt

# Stern (multi-pod logging)
stern nself-chat -n nself-chat
```

### Health Checks

#### Endpoints

- **Health**: `GET /api/health` - Basic health check
- **Readiness**: `GET /api/ready` - Ready to accept traffic
- **Metrics**: `GET /api/metrics` - Prometheus metrics (if enabled)

#### Docker Health Check

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD /healthcheck.sh || exit 1
```

#### Kubernetes Probes

```yaml
livenessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 30
  timeoutSeconds: 10
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /api/ready
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

startupProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
  failureThreshold: 30
```

### Prometheus & Grafana

Deploy monitoring stack:

```bash
kubectl apply -f deploy/k8s/monitoring/prometheus-config.yaml
kubectl apply -f deploy/k8s/monitoring/grafana-deployment.yaml
```

Access Grafana:

```bash
kubectl port-forward -n nself-chat svc/grafana 3000:80
# Open http://localhost:3000
# Default credentials: admin/admin
```

---

## Backup & Recovery

### Database Backups

#### PostgreSQL Backup

```bash
# Manual backup
docker exec nchat-postgres pg_dump -U postgres nchat > backup-$(date +%Y%m%d).sql

# Kubernetes backup
kubectl exec -n nself-chat postgres-0 -- \
  pg_dump -U postgres nchat > backup-$(date +%Y%m%d).sql

# Automated daily backup (cron)
0 2 * * * docker exec nchat-postgres pg_dump -U postgres nchat | gzip > /backups/nchat-$(date +\%Y\%m\%d).sql.gz
```

#### Restore Database

```bash
# Docker restore
docker exec -i nchat-postgres psql -U postgres nchat < backup-20260130.sql

# Kubernetes restore
kubectl exec -i -n nself-chat postgres-0 -- \
  psql -U postgres nchat < backup-20260130.sql
```

### Storage Backups

#### MinIO Backup

```bash
# Install mc (MinIO Client)
docker exec nchat-storage mc alias set myminio http://localhost:9000 minio minio123

# Backup bucket
docker exec nchat-storage mc mirror myminio/nchat-storage /backups/storage
```

#### S3 Backup

```bash
# Sync to another bucket
aws s3 sync s3://nchat-storage s3://nchat-storage-backup

# Or use AWS Backup service
```

### Full System Backup

```bash
#!/bin/bash
# full-backup.sh

BACKUP_DIR="/backups/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# Database
docker exec nchat-postgres pg_dump -U postgres nchat | \
  gzip > "$BACKUP_DIR/database.sql.gz"

# Storage
docker exec nchat-storage mc mirror myminio/nchat-storage "$BACKUP_DIR/storage"

# Configuration
cp -r .backend/.env "$BACKUP_DIR/backend-env"
cp -r .env.production "$BACKUP_DIR/frontend-env"

# Upload to S3
aws s3 sync "$BACKUP_DIR" "s3://nchat-backups/$(date +%Y%m%d)"

echo "Backup completed: $BACKUP_DIR"
```

### Disaster Recovery

#### Recovery Steps

1. **Restore Database**:

```bash
# Create new database
docker exec nchat-postgres createdb -U postgres nchat

# Restore from backup
gunzip -c backup-20260130.sql.gz | \
  docker exec -i nchat-postgres psql -U postgres nchat
```

2. **Restore Storage**:

```bash
# Restore MinIO data
docker exec nchat-storage mc mirror /backups/storage myminio/nchat-storage
```

3. **Restore Configuration**:

```bash
cp backups/20260130/backend-env .backend/.env
cp backups/20260130/frontend-env .env.production
```

4. **Restart Services**:

```bash
# nSelf-First: use the CLI, not raw compose.
cd backend
nself stop
nself start
```

#### Recovery Time Objective (RTO)

- **Database**: < 30 minutes
- **Storage**: < 1 hour (depends on size)
- **Application**: < 5 minutes

#### Recovery Point Objective (RPO)

- **Database**: Daily backups (24-hour RPO)
- **Storage**: Continuous replication (near-zero RPO with S3)

---

## Scaling Considerations

### Horizontal Scaling

#### Kubernetes HPA

```yaml
# deploy/k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: nself-chat
  namespace: nself-chat
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nself-chat
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

#### Docker Swarm (Alternative)

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.swarm.yml nself-chat

# Scale service
docker service scale nself-chat_nchat=5
```

### Vertical Scaling

#### Increase Resources

```yaml
# Kubernetes
resources:
  requests:
    cpu: '500m'
    memory: '1Gi'
  limits:
    cpu: '2000m'
    memory: '4Gi'
```

#### Docker

```bash
docker run -d \
  --cpus="2" \
  --memory="4g" \
  nself-chat:latest
```

### Database Scaling

#### Read Replicas

```yaml
# PostgreSQL with replication
POSTGRES_REPLICATION_MODE=master
POSTGRES_REPLICATION_USER=replicator
POSTGRES_REPLICATION_PASSWORD=<password>
```

#### Connection Pooling

Use PgBouncer:

```yaml
# docker-compose.yml
pgbouncer:
  image: pgbouncer/pgbouncer:latest
  environment:
    DATABASES: nchat=host=postgres dbname=nchat
    AUTH_TYPE: md5
    POOL_MODE: transaction
    MAX_CLIENT_CONN: 1000
    DEFAULT_POOL_SIZE: 20
```

### Caching Strategy

#### Redis Cache

```typescript
// Use Redis for session storage and caching
import Redis from 'ioredis'

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: 6379,
  password: process.env.REDIS_PASSWORD,
})

// Cache responses
await redis.setex('key', 3600, JSON.stringify(data))
```

#### CDN Integration

Use Cloudflare, CloudFront, or Fastly:

```nginx
# Cache static assets
location /_next/static/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Load Testing

```bash
# Install k6
brew install k6

# Run load test
k6 run - <<EOF
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '5m', target: 200 },
    { duration: '2m', target: 0 },
  ],
};

export default function () {
  let res = http.get('https://chat.example.com');
  check(res, { 'status was 200': (r) => r.status == 200 });
  sleep(1);
}
EOF
```

---

## Troubleshooting

### Common Issues

#### 1. Container Won't Start

**Symptom**: Container exits immediately

**Diagnosis**:

```bash
# Check logs
docker logs nself-chat

# Check exit code
docker inspect nself-chat --format='{{.State.ExitCode}}'
```

**Solutions**:

- Verify environment variables are set
- Check port 3000 is not in use
- Ensure `.env.production` exists
- Verify image was built correctly

#### 2. Health Check Failures

**Symptom**: Health check endpoint returns errors

**Diagnosis**:

```bash
# Test health endpoint
curl -v http://localhost:3000/api/health

# Check container health
docker inspect nself-chat --format='{{.State.Health.Status}}'
```

**Solutions**:

- Verify backend services are running
- Check GRAPHQL_URL is accessible
- Increase `initialDelaySeconds` in probe
- Review application logs

#### 3. Database Connection Errors

**Symptom**: `ECONNREFUSED` or timeout errors

**Diagnosis**:

```bash
# Test database connectivity
docker exec nchat-postgres pg_isready -U postgres

# Check network
docker network inspect nchat-network
```

**Solutions**:

- Verify PostgreSQL is running
- Check credentials in secrets
- Ensure network connectivity
- Review firewall rules

#### 4. Out of Memory (OOM)

**Symptom**: Container killed, exit code 137

**Diagnosis**:

```bash
# Check memory usage
docker stats nself-chat

# Kubernetes
kubectl top pod -n nself-chat
```

**Solutions**:

- Increase memory limit
- Optimize build (reduce dependencies)
- Enable swap (not recommended for production)
- Scale horizontally instead

#### 5. SSL Certificate Issues

**Symptom**: Certificate errors or HTTPS not working

**Diagnosis**:

```bash
# Check certificate
openssl s_client -connect chat.example.com:443 -servername chat.example.com

# Kubernetes cert-manager
kubectl describe certificate nself-chat-tls -n nself-chat
```

**Solutions**:

- Verify DNS records point to correct IP
- Check cert-manager ClusterIssuer
- Ensure port 80/443 are open
- Review ingress annotations

#### 6. Slow Performance

**Symptom**: High response times

**Diagnosis**:

```bash
# Check resource usage
docker stats nself-chat

# Check database queries
docker exec nchat-postgres psql -U postgres -c "SELECT * FROM pg_stat_activity;"
```

**Solutions**:

- Enable caching (Redis)
- Optimize database queries
- Scale horizontally
- Use CDN for static assets
- Enable gzip compression

### Debugging Tools

#### Docker

```bash
# Shell into container
docker exec -it nself-chat sh

# View real-time logs
docker logs -f --tail 100 nself-chat

# Inspect container
docker inspect nself-chat

# Check resource usage
docker stats nself-chat
```

#### Kubernetes

```bash
# Get pod status
kubectl get pods -n nself-chat -o wide

# Describe pod
kubectl describe pod -l app.kubernetes.io/name=nself-chat -n nself-chat

# View logs
kubectl logs -f deployment/nself-chat -n nself-chat

# Shell into pod
kubectl exec -it deployment/nself-chat -n nself-chat -- sh

# Port forward for local testing
kubectl port-forward deployment/nself-chat 3000:3000 -n nself-chat

# Check events
kubectl get events -n nself-chat --sort-by='.lastTimestamp'
```

### Emergency Procedures

#### Rollback Deployment

**Docker**:

```bash
# Stop current container
docker stop nself-chat
docker rm nself-chat

# Start previous version
docker run -d --name nself-chat nself-chat:v1.0.0
```

**Kubernetes**:

```bash
# Rollback to previous version
kubectl rollout undo deployment/nself-chat -n nself-chat

# Rollback to specific revision
kubectl rollout undo deployment/nself-chat --to-revision=2 -n nself-chat
```

#### Enable Maintenance Mode

Create `public/maintenance.html`:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Maintenance</title>
  </head>
  <body>
    <h1>We'll be back soon!</h1>
    <p>We're performing maintenance. Please check back shortly.</p>
  </body>
</html>
```

Nginx configuration:

```nginx
location / {
    if (-f /var/www/maintenance.html) {
        return 503;
    }
    proxy_pass http://nself-chat;
}

error_page 503 /maintenance.html;
location = /maintenance.html {
    root /var/www;
    internal;
}
```

### Getting Help

1. **Check Documentation**:
   - `/Users/admin/Sites/nself-chat/docs/`
   - Project documentation in `docs/` directory

2. **Review Logs**:
   - Application logs (Sentry)
   - Container logs (Docker/Kubernetes)
   - Backend logs (nself CLI)

3. **Community Support**:
   - GitHub Issues
   - Discord community
   - Stack Overflow (`#nself-chat`)

4. **Professional Support**:
   - Contact: support@nself.org
   - Enterprise support available

---

## Appendix

### Deployment Checklist

- [ ] Domain registered and DNS configured
- [ ] SSL certificates obtained
- [ ] Environment variables configured
- [ ] Secrets generated (strong passwords)
- [ ] Backend services running (nself CLI)
- [ ] Database initialized and migrated
- [ ] Application built and tested
- [ ] Health checks passing
- [ ] Monitoring configured (Sentry)
- [ ] Backups scheduled
- [ ] Load testing completed
- [ ] Documentation updated
- [ ] Rollback plan tested

### Performance Benchmarks

| Metric               | Target  | Good    | Needs Improvement |
| -------------------- | ------- | ------- | ----------------- |
| Response Time (p95)  | < 200ms | < 500ms | > 500ms           |
| Error Rate           | < 0.1%  | < 1%    | > 1%              |
| Uptime               | > 99.9% | > 99%   | < 99%             |
| CPU Usage            | < 70%   | < 85%   | > 85%             |
| Memory Usage         | < 80%   | < 90%   | > 90%             |
| Database Connections | < 50    | < 100   | > 100             |

### Cost Estimation

#### Small Deployment (< 1000 users)

- **Vercel/Netlify**: $0-20/month (free tier)
- **VPS (DigitalOcean)**: $12-24/month
- **Database (managed)**: $15-30/month
- **Storage (S3)**: $5-10/month
- **Monitoring (Sentry)**: $0-26/month
- **Total**: ~$32-110/month

#### Medium Deployment (< 10,000 users)

- **Kubernetes (GKE/EKS)**: $100-200/month
- **Database (RDS/Cloud SQL)**: $50-100/month
- **Storage (S3)**: $20-50/month
- **CDN (Cloudflare)**: $20-50/month
- **Monitoring**: $50-100/month
- **Total**: ~$240-500/month

#### Large Deployment (> 10,000 users)

- **Kubernetes cluster**: $500-1000/month
- **Database cluster**: $200-500/month
- **Storage + CDN**: $100-300/month
- **Monitoring + Logging**: $100-300/month
- **Total**: ~$900-2100/month

### Security Hardening

1. **Enable firewall** (UFW, iptables)
2. **Disable root SSH** access
3. **Use SSH keys** instead of passwords
4. **Enable automatic security updates**
5. **Use secrets management** (Vault, AWS Secrets Manager)
6. **Enable audit logging**
7. **Implement rate limiting**
8. **Use Web Application Firewall** (Cloudflare, AWS WAF)
9. **Regular security scans** (Snyk, Trivy)
10. **Penetration testing** (quarterly)

### Compliance Considerations

- **GDPR**: Data privacy, right to deletion
- **HIPAA**: PHI encryption, audit logs (if applicable)
- **SOC 2**: Security controls, monitoring
- **PCI DSS**: Payment card data security (if applicable)

---

**Document Version**: 1.0.0
**Last Updated**: January 30, 2026
**Maintained By**: nself-chat team

For questions or support, contact: support@nself.org
