# Self-Hosted Deployment - Complete Index

Quick reference index for all self-hosted deployment documentation and resources.

## 📚 Documentation

### Getting Started

| Document                                                 | Description                                              | Audience       |
| -------------------------------------------------------- | -------------------------------------------------------- | -------------- |
| [Self-Hosted Guide](./self-hosted.md)                    | Complete deployment guide with step-by-step instructions | Everyone       |
| [Quick Reference](README.md) | Quick commands and common tasks                          | Administrators |
| [Troubleshooting](./self-hosted-troubleshooting.md)      | Problem-solving guide                                    | Support teams  |

### Installation Methods

1. **One-Line Installation** (Recommended)

   ```bash
   curl -fsSL https://raw.githubusercontent.com/yourusername/nself-chat/main/scripts/self-hosted-install.sh | bash
   ```

2. **Manual Installation**
   - See [Self-Hosted Guide](./self-hosted.md#manual-installation)

3. **Custom Deployment**
   - See [Production Deployment](./production-deployment.md)

## 🛠️ Scripts and Tools

### Installation Scripts

| Script                   | Location    | Purpose            |
| ------------------------ | ----------- | ------------------ |
| `self-hosted-install.sh` | `/scripts/` | One-line installer |
| `update-nchat.sh`        | `/scripts/` | Update automation  |

### Management Scripts

Created during installation in `/usr/local/bin/`:

| Script           | Purpose          | Usage                 |
| ---------------- | ---------------- | --------------------- |
| `backup-nchat`   | Create backup    | `sudo backup-nchat`   |
| `update-nchat`   | Update to latest | `sudo update-nchat`   |
| `diagnose-nchat` | Run diagnostics  | `sudo diagnose-nchat` |

## 🐳 Docker Configuration

### Compose Files

| File                            | Purpose          | Usage           |
| ------------------------------- | ---------------- | --------------- |
| `docker-compose.production.yml` | Production stack | Default         |
| `docker-compose.monitoring.yml` | Monitoring stack | Optional add-on |

### Service Configuration

**Nginx (Reverse Proxy + SSL):**

- `/deploy/nginx/nginx.conf` - Main configuration
- `/deploy/nginx/conf.d/nchat.conf` - Virtual host

**PostgreSQL (Database):**

- `/deploy/postgres/postgresql.conf` - Performance tuning
- `/deploy/postgres/init-scripts/01-init.sql` - Initialization

**Monitoring:**

- `/deploy/monitoring/prometheus/prometheus.yml` - Metrics
- `/deploy/monitoring/grafana/` - Dashboards and provisioning

## ⚙️ Configuration

### Environment Files

| File                      | Purpose                | Location                       |
| ------------------------- | ---------------------- | ------------------------------ |
| `.env.production.example` | Configuration template | Project root                   |
| `.env.production`         | Active configuration   | `/opt/nself-chat/` (installed) |

### Required Configuration

Minimum required settings:

```bash
DOMAIN=chat.example.com
SSL_EMAIL=admin@example.com
POSTGRES_PASSWORD=strong_password
HASURA_ADMIN_SECRET=strong_secret
SMTP_HOST=smtp.example.com
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
```

### Optional Configuration

- OAuth providers (Google, GitHub, LinkedIn)
- Storage backends (AWS S3, Cloudflare R2)
- Monitoring and analytics
- Feature flags
- Performance tuning

## 📊 Monitoring

### Access Points

When monitoring is enabled:

| Service    | URL                                 | Default Credentials |
| ---------- | ----------------------------------- | ------------------- |
| Grafana    | https://chat.example.com/grafana    | admin/admin         |
| Prometheus | https://chat.example.com/prometheus | N/A                 |

### Metrics Available

1. **System Metrics**
   - CPU usage
   - Memory usage
   - Disk I/O
   - Network traffic

2. **Application Metrics**
   - Request rate
   - Response times
   - Error rates
   - Active users

3. **Database Metrics**
   - Connection pool
   - Query performance
   - Cache hit rates
   - Table sizes

4. **Container Metrics**
   - Resource usage
   - Health status
   - Restart counts

## 🔒 Security

### Security Checklist

- [ ] Strong passwords configured
- [ ] SSL certificate valid
- [ ] Firewall enabled (ports 22, 80, 443)
- [ ] Fail2ban installed (optional)
- [ ] 2FA enabled for admin accounts
- [ ] Regular updates scheduled
- [ ] Backups configured and tested
- [ ] Access logs monitored

### Security Files

| File                            | Purpose                |
| ------------------------------- | ---------------------- |
| `/etc/letsencrypt/live/DOMAIN/` | SSL certificates       |
| `/etc/fail2ban/jail.d/`         | Fail2ban configuration |
| `/var/log/nginx/`               | Access and error logs  |

## 💾 Backup and Restore

### Backup Locations

| Type              | Location                   | Retention |
| ----------------- | -------------------------- | --------- |
| Automatic backups | `/var/backups/nself-chat/` | 30 days   |
| Database dumps    | Included in backup archive | 30 days   |
| Uploaded files    | Included in backup archive | 30 days   |
| Configuration     | Included in backup archive | 30 days   |

### Backup Commands

```bash
# Create backup
sudo /usr/local/bin/backup-nchat

# List backups
ls -lh /var/backups/nself-chat/

# Test backup integrity
tar tzf /var/backups/nself-chat/nchat-backup-LATEST.tar.gz
```

### Restore Procedure

See [Troubleshooting Guide](./self-hosted-troubleshooting.md#backup-and-restore)

## 🔄 Updates

### Update Process

1. **Automatic backup** created before update
2. **Pre-flight checks** verify system readiness
3. **Code pulled** from repository
4. **Images rebuilt** with latest dependencies
5. **Migrations run** for database schema
6. **Services restarted** with new version
7. **Verification** ensures update succeeded
8. **Automatic rollback** on failure

### Update Commands

```bash
# Update to latest version
sudo /usr/local/bin/update-nchat

# Update to specific version
sudo /usr/local/bin/update-nchat v1.0.1

# Check current version
cd /opt/nself-chat && git describe --tags
```

## 🐛 Troubleshooting

### Quick Diagnostics

```bash
# Run full diagnostic
sudo /usr/local/bin/diagnose-nchat

# Check service status
cd /opt/nself-chat
docker compose -f docker-compose.production.yml ps

# View recent errors
docker compose -f docker-compose.production.yml logs --tail=100 | grep -i error

# Test application health
curl -I https://chat.example.com/api/health
```

### Common Issues

Quick links to solutions:

1. [Services Won't Start](./self-hosted-troubleshooting.md#issue-1-services-wont-start)
2. [502 Bad Gateway](./self-hosted-troubleshooting.md#issue-2-cannot-access-website-502-bad-gateway)
3. [SSL Problems](./self-hosted-troubleshooting.md#issue-3-ssl-certificate-problems)
4. [Database Errors](./self-hosted-troubleshooting.md#issue-4-database-connection-errors)
5. [Disk Space](./self-hosted-troubleshooting.md#issue-5-out-of-disk-space)
6. [High Memory](./self-hosted-troubleshooting.md#issue-6-high-memory-usage)
7. [Slow Performance](./self-hosted-troubleshooting.md#issue-7-application-slowunresponsive)
8. [Email Issues](./self-hosted-troubleshooting.md#issue-8-email-not-sending)

## 📈 Performance Tuning

### Database Optimization

```bash
# Edit PostgreSQL config
nano /opt/nself-chat/deploy/postgres/postgresql.conf

# Key settings for 8GB RAM:
shared_buffers = 2GB
effective_cache_size = 6GB
```

### Application Optimization

```bash
# Increase Node.js memory
echo "NODE_OPTIONS=--max-old-space-size=4096" >> .env.production

# Restart application
docker compose -f docker-compose.production.yml restart nchat
```

### Cache Optimization

```bash
# Configure Redis
docker compose -f docker-compose.production.yml exec redis \
  redis-cli CONFIG SET maxmemory 1gb
```

## 💰 Cost Analysis

### Hosting Costs

| Users   | Server | Storage | Total/Month | Savings vs Slack |
| ------- | ------ | ------- | ----------- | ---------------- |
| 1-25    | $24    | $0      | $24         | $176/month       |
| 25-100  | $48    | $5      | $53         | $347/month       |
| 100-500 | $96    | $20     | $116        | $3,884/month     |

### Provider Recommendations

**Best Value:**

- **Hetzner**: €8.46/month for 4GB VPS
- **DigitalOcean**: $24/month for 4GB droplet
- **Vultr**: $24/month for 4GB instance

**Best Performance:**

- **AWS EC2**: t3.medium with reserved instance
- **Google Cloud**: e2-medium with committed use
- **Azure**: B2s with reserved instance

## 🎯 Quick Start Cheatsheet

### Installation

```bash
# 1. One-line install
curl -fsSL https://raw.githubusercontent.com/yourusername/nself-chat/main/scripts/self-hosted-install.sh | bash

# 2. Follow prompts:
#    - Domain name
#    - Email for SSL
#    - Admin email
#    - Company name
#    - Enable monitoring (optional)

# 3. Complete setup
open https://chat.example.com/setup
```

### Daily Operations

```bash
# Check status
docker compose -f /opt/nself-chat/docker-compose.production.yml ps

# View logs
docker compose -f /opt/nself-chat/docker-compose.production.yml logs -f

# Restart
docker compose -f /opt/nself-chat/docker-compose.production.yml restart
```

### Maintenance

```bash
# Backup (runs daily automatically)
sudo /usr/local/bin/backup-nchat

# Update (when new version available)
sudo /usr/local/bin/update-nchat

# Diagnostics (when issues occur)
sudo /usr/local/bin/diagnose-nchat
```

## 📞 Support Resources

### Documentation

- **Main Guide**: [self-hosted.md](./self-hosted.md)
- **Troubleshooting**: [self-hosted-troubleshooting.md](./self-hosted-troubleshooting.md)
- **Production Guide**: [production-deployment.md](./production-deployment.md)
- **Quick Reference**: [../../../deploy/self-hosted/README.md](README.md)

### Community

- **GitHub Issues**: https://github.com/yourusername/nself-chat/issues
- **Discord Community**: https://discord.gg/nself
- **Forum**: https://community.nself.chat
- **Documentation**: https://docs.nself.chat

### Commercial Support

- **Email**: support@nself.chat
- **Enterprise Support**: Available for commercial deployments
- **Consulting**: Deployment and migration services

## 📋 Deployment Checklist

### Pre-Installation

- [ ] Server provisioned (2+ CPU, 4+ GB RAM, 20+ GB disk)
- [ ] Domain registered and DNS configured
- [ ] Port 80 and 443 accessible
- [ ] SMTP credentials obtained (SendGrid, Mailgun, etc.)
- [ ] Backup solution planned

### Installation

- [ ] Installer script run successfully
- [ ] All services started and healthy
- [ ] SSL certificate obtained
- [ ] Firewall configured
- [ ] Backups scheduled

### Post-Installation

- [ ] Setup wizard completed
- [ ] SMTP configured and tested
- [ ] First backup created and verified
- [ ] Admin account secured with strong password
- [ ] 2FA enabled for admin accounts
- [ ] Documentation reviewed
- [ ] Team members invited

### Ongoing

- [ ] Regular backups verified (weekly)
- [ ] System updates applied (monthly)
- [ ] Application updates applied (as released)
- [ ] Logs reviewed (monthly)
- [ ] Performance monitored (if enabled)
- [ ] Disk space monitored (weekly)

## 🔗 Related Resources

### Internal Documentation

- [Deployment Checklist](./DEPLOYMENT-CHECKLIST.md)
- [Production Deployment](./production-deployment.md)
- [Vercel Deployment](./vercel-deployment.md)
- [Mobile Deployment](./mobile-deployment.md)
- [Desktop Deployment](./desktop-deployment.md)

### External Resources

- **Docker Documentation**: https://docs.docker.com/
- **Let's Encrypt**: https://letsencrypt.org/
- **PostgreSQL**: https://www.postgresql.org/docs/
- **Nginx**: https://nginx.org/en/docs/

## 📝 Changelog

### Version 1.0.0 (January 31, 2026)

Initial release with:

- One-line installation script
- Production Docker Compose configuration
- Automatic SSL/TLS via Let's Encrypt
- Comprehensive monitoring stack
- Automated backups
- Update management
- Complete documentation

---

**Last Updated**: January 31, 2026
**Version**: 1.0.0
**Maintained by**: nself-chat Team
