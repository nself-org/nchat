# ɳChat Frequently Asked Questions

**Version**: 0.3.0
**Last Updated**: 2026-01-29

---

## Table of Contents

- [General](#general)
- [Installation & Setup](#installation--setup)
- [Features & Functionality](#features--functionality)
- [Development](#development)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Security & Privacy](#security--privacy)
- [Performance](#performance)
- [Contributing](#contributing)

---

## General

### What is ɳChat?

ɳChat is a production-ready, white-label team communication platform built with Next.js 15 and React 19. It provides Slack/Discord/Telegram-like functionality with complete customization options.

### What does "white-label" mean?

White-label means you can completely customize the branding, theme, features, and deployment. The 12-step setup wizard lets you configure everything without touching code.

### Is ɳChat free?

Yes! ɳChat is open-source under the MIT License. You can use it freely for commercial or personal projects.

### What's the relationship with ɳSelf?

ɳChat is a demo project showcasing the [ɳSelf CLI](https://nself.org) backend infrastructure. While fully functional, it's designed to demonstrate ɳSelf's capabilities.

### How does ɳChat compare to Slack/Discord?

ɳChat provides feature parity with major platforms:

- **78+ features** across messaging, channels, files, users, and integrations
- **Self-hosted** - full control over your data
- **White-label** - complete branding customization
- **Open source** - modify anything you need

---

## Installation & Setup

### What are the minimum requirements?

- **Node.js**: 20 or higher
- **pnpm**: 9 or higher
- **RAM**: 4GB minimum (8GB recommended)
- **Disk**: 2GB free space
- **OS**: macOS, Linux, or Windows (WSL2)

### How long does setup take?

Initial setup takes **under 5 minutes**:

1. Clone repository (30 seconds)
2. Install dependencies (2-3 minutes)
3. Start dev server (30 seconds)
4. Complete setup wizard (1-2 minutes)

### Do I need Docker?

Docker is **optional** for development. The setup wizard can:

- Use Docker for backend services (recommended)
- Connect to existing services
- Skip backend for frontend-only development

### Can I skip the setup wizard?

Yes! Pre-configure via environment variables and set `SKIP_WIZARD=true`. The wizard auto-detects existing config and skips completed steps.

### How do I reset the setup wizard?

```bash
# Clear configuration
rm -f .env.local
localStorage.removeItem('app-config')  # In browser console

# Or via API
curl -X DELETE http://localhost:3000/api/config
```

---

## Features & Functionality

### What features are included?

**78+ features** including:

- Real-time messaging with threads and reactions
- Voice and video calls (WebRTC)
- File uploads with previews
- Search (messages, files, users)
- Bot SDK with slash commands
- Webhooks and integrations
- Multi-language support (6 languages)
- Offline mode with sync
- Full RBAC (role-based access control)

See [Features-Complete.md](../features/Features-Complete.md) for complete list.

### Are voice/video calls free?

Yes, ɳChat uses WebRTC for peer-to-peer calls. No third-party services required. For group calls with 4+ participants, you may want a TURN server.

### Can I integrate with Slack/Discord?

Yes! Built-in integrations:

- **Slack**: Import channels, messages, and users
- **Discord**: Bot integration and webhooks
- **API**: Custom integrations via webhooks

### Does it support mobile?

Yes! Multiple deployment options:

- **PWA**: Progressive Web App (works on all mobile browsers)
- **Capacitor**: Native iOS and Android apps
- **React Native**: Full native mobile apps

### How many users can it support?

Tested with:

- **100+ concurrent users** (single server)
- **1,000+ total users** (with proper infrastructure)
- Scales horizontally with load balancers

---

## Development

### What tech stack is used?

**Frontend**:

- Next.js 15.1.6 (App Router)
- React 19.0.0
- TypeScript 5.7.3
- Tailwind CSS 3.4.17
- Zustand (state management)
- Apollo Client (GraphQL)

**Backend** (via ɳSelf CLI):

- PostgreSQL 16
- Hasura GraphQL Engine
- Nhost Auth
- MinIO (S3-compatible storage)

### How do I add a new feature?

1. Read [CONTRIBUTING.md](../CONTRIBUTING.md)
2. Create feature branch: `git checkout -b feature/my-feature`
3. Implement with tests
4. Run checks: `pnpm validate`
5. Submit pull request

### Are there test users for development?

Yes! 8 test users with different roles:

- `owner@nself.org` - Full permissions
- `admin@nself.org` - User/channel management
- `moderator@nself.org` - Content moderation
- `member@nself.org` - Standard user
- `guest@nself.org` - Read-only
- Plus: alice, bob, charlie

All use password: `password123`

### How do I run tests?

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# With coverage
pnpm test:coverage

# Watch mode
pnpm test:watch
```

### Can I use Yarn or npm?

The project requires **pnpm** for:

- Faster installs (content-addressable storage)
- Strict dependency resolution
- Monorepo support
- Lock file consistency

Install: `npm install -g pnpm`

---

## Deployment

### What deployment options are available?

- **Vercel** (recommended for frontend)
- **Docker** (containerized deployment)
- **Kubernetes** (scalable clusters)
- **Traditional VPS** (Nginx + PM2)

See [DEPLOYMENT.md](../deployment/DEPLOYMENT.md) for detailed guides.

### How much does hosting cost?

**Estimated monthly costs**:

- **Vercel Free Tier**: $0 (frontend only)
- **Vercel Pro**: $20/month
- **VPS (DigitalOcean)**: $12-50/month
- **AWS/GCP**: $30-100/month (depending on usage)
- **Self-hosted**: Hardware costs only

### Do I need a database?

Yes, PostgreSQL 14+ is required. Options:

- **Managed**: AWS RDS, DigitalOcean, Supabase ($15-50/month)
- **Self-hosted**: On same VPS as app (free)
- **Development**: Docker container (free)

### How do I set up SSL/TLS?

**Free SSL (Let's Encrypt)**:

```bash
sudo certbot --nginx -d chat.yourdomain.com
```

**Vercel**: Automatic SSL for custom domains
**Cloudflare**: Free SSL + CDN

### Can I deploy to multiple regions?

Yes! Use:

- **Vercel Edge Network** (automatic global distribution)
- **Kubernetes** with multi-region clusters
- **CDN** (Cloudflare, Fastly) for static assets
- **Database replication** for read replicas

---

## Troubleshooting

### Build fails with "Module not found"

```bash
# Clear cache and reinstall
rm -rf .next node_modules pnpm-lock.yaml
pnpm install
pnpm build
```

### "Port 3000 already in use"

```bash
# Find and kill process
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 pnpm dev
```

### TypeScript errors after update

```bash
# Regenerate types
pnpm db:types

# Clear TypeScript cache
rm -rf .next tsconfig.tsbuildinfo
pnpm type-check
```

### GraphQL connection fails

Check backend services:

```bash
cd .backend
nself status

# Restart if needed
nself restart
```

### Authentication not working

**Development mode**:

```bash
# Ensure dev auth is enabled
echo "NEXT_PUBLIC_USE_DEV_AUTH=true" >> .env.local
```

**Production mode**:

```bash
# Check auth service
curl https://auth.yourdomain.com/healthz
```

### Images not loading

```bash
# Check Next.js image optimization
# In next.config.js:
images: {
  domains: ['your-storage-domain.com'],
  formats: ['image/avif', 'image/webp'],
}
```

### WebSocket connection drops

Check Nginx configuration for WebSocket upgrade:

```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection 'upgrade';
```

---

## Security & Privacy

### Is ɳChat secure?

Yes! Security features:

- **JWT authentication** with refresh tokens
- **RBAC** (role-based access control)
- **HTTPS** required in production
- **XSS protection** via React escaping
- **SQL injection prevention** via Hasura
- **CSRF protection** on all forms
- **Rate limiting** on API endpoints

### Where is data stored?

You control data storage:

- **Database**: Your PostgreSQL instance
- **Files**: Your S3/MinIO bucket
- **Sessions**: Redis or database
- **Logs**: Your logging service

### Is data encrypted?

- **In transit**: TLS/SSL (HTTPS)
- **At rest**: PostgreSQL encryption (configurable)
- **Passwords**: bcrypt hashing
- **Tokens**: Signed JWT

### Can I enable end-to-end encryption?

E2E encryption is on the roadmap (v0.4.0). Current encryption:

- Transport layer (TLS/SSL)
- Database encryption at rest
- Password hashing

### How do I report a security issue?

See [SECURITY.md](../security/SECURITY.md) for responsible disclosure:

- Email: security@nself.org
- DO NOT open public GitHub issues
- Response within 48 hours

---

## Performance

### How fast is ɳChat?

**Lighthouse scores**:

- Performance: 90+
- Accessibility: 95+
- Best Practices: 90+
- SEO: 90+

**Real-world metrics**:

- First Contentful Paint: <1.5s
- Largest Contentful Paint: <2.5s
- Time to Interactive: <3s

### What's the bundle size?

- **Shared baseline**: 103 KB
- **Largest page**: 570 KB (channel page with all features)
- **Average page**: 200-300 KB

Optimizations:

- Code splitting with dynamic imports
- Tree shaking unused code
- Image optimization (AVIF/WebP)
- Lazy loading components

### How many messages can a channel handle?

- **Per channel**: Millions (virtualized list)
- **Displayed**: 50-100 at a time (pagination)
- **Search**: Full-text search across all messages

### Does it work offline?

Yes! Progressive Web App features:

- Service worker caching
- IndexedDB for message storage
- Queue for offline actions
- Background sync when online

---

## Contributing

### How can I contribute?

Many ways to contribute:

- **Code**: Fix bugs, add features
- **Documentation**: Improve guides, add examples
- **Design**: UI/UX improvements
- **Testing**: Report bugs, test features
- **Translation**: Add language support
- **Community**: Help answer questions

See [CONTRIBUTING.md](../CONTRIBUTING.md) for details.

### Do I need to sign a CLA?

No Contributor License Agreement required. By contributing, you agree to the MIT License terms.

### How do I report a bug?

1. Check [existing issues](https://github.com/nself-org/nchat/issues)
2. Create new issue with template
3. Include:
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if UI-related
   - Environment details

### Can I request features?

Yes! Use GitHub Discussions:

1. Check if already requested
2. Describe use case
3. Explain expected behavior
4. Community votes on priority

### How long until my PR is reviewed?

- **Initial response**: Within 3 business days
- **Review**: Within 7 business days
- **Merge decision**: Based on feedback

---

## Additional Questions?

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and ideas
- **Discord**: Real-time chat with community
- **Email**: support@nself.org
- **Documentation**: https://docs.nself.org

---

_Can't find your question? Ask in [GitHub Discussions](https://github.com/nself-org/nchat/discussions)!_
