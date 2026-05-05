#!/bin/bash
# ============================================================================
# nself-chat Self-Hosted Installation Script
# ============================================================================
# One-line installation for nself-chat on your own server
#
# Uses nself CLI — see https://docs.nself.org/cli
# Per nSelf-First doctrine: all backend operations go through `nself <cmd>`,
# never raw `docker compose`. The CLI generates and manages the underlying
# compose stack internally.
#
# Usage:
#   Interactive:
#     curl -fsSL https://raw.githubusercontent.com/yourusername/nself-chat/main/scripts/self-hosted-install.sh | bash
#
#   Non-interactive:
#     curl -fsSL https://raw.githubusercontent.com/yourusername/nself-chat/main/scripts/self-hosted-install.sh | \
#       DOMAIN=chat.example.com \
#       SSL_EMAIL=admin@example.com \
#       ADMIN_EMAIL=admin@example.com \
#       COMPANY_NAME="Acme Inc" \
#       ENABLE_MONITORING=true \
#       bash -s -- --non-interactive
# ============================================================================

set -e  # Exit on error
set -o pipefail  # Exit on pipe failure

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
INSTALL_DIR="${INSTALL_DIR:-/opt/nself-chat}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/nself-chat}"
REPO_URL="${REPO_URL:-https://github.com/yourusername/nself-chat.git}"
VERSION="${VERSION:-latest}"

# Flags
NON_INTERACTIVE=false
SKIP_DOCKER_INSTALL=false
SKIP_CERTBOT_INSTALL=false
ENABLE_MONITORING="${ENABLE_MONITORING:-false}"

# ============================================================================
# Helper Functions
# ============================================================================

log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

header() {
    echo ""
    echo -e "${BLUE}===================================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}===================================================================${NC}"
    echo ""
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should NOT be run as root. Please run as a regular user with sudo privileges."
    fi

    # Check if user has sudo privileges
    if ! sudo -n true 2>/dev/null; then
        warn "This script requires sudo privileges. You may be prompted for your password."
    fi
}

# Detect operating system
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        OS_VERSION=$VERSION_ID
    else
        error "Unsupported operating system. This script supports Ubuntu, Debian, CentOS, RHEL, and Fedora."
    fi

    log "Detected OS: $OS $OS_VERSION"
}

# Check system requirements
check_requirements() {
    header "Checking System Requirements"

    # Check CPU cores
    CPU_CORES=$(nproc)
    if [ "$CPU_CORES" -lt 2 ]; then
        warn "Your system has only $CPU_CORES CPU core(s). Recommended: 2+ cores"
    else
        log "CPU cores: $CPU_CORES ✓"
    fi

    # Check RAM
    TOTAL_RAM=$(free -m | awk '/^Mem:/{print $2}')
    if [ "$TOTAL_RAM" -lt 4096 ]; then
        warn "Your system has only ${TOTAL_RAM}MB RAM. Recommended: 4096MB (4GB) or more"
    else
        log "RAM: ${TOTAL_RAM}MB ✓"
    fi

    # Check disk space
    AVAILABLE_DISK=$(df -BG / | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "$AVAILABLE_DISK" -lt 20 ]; then
        warn "Available disk space: ${AVAILABLE_DISK}GB. Recommended: 20GB or more"
    else
        log "Disk space: ${AVAILABLE_DISK}GB ✓"
    fi
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --non-interactive)
                NON_INTERACTIVE=true
                shift
                ;;
            --skip-docker)
                SKIP_DOCKER_INSTALL=true
                shift
                ;;
            --skip-certbot)
                SKIP_CERTBOT_INSTALL=true
                shift
                ;;
            --enable-monitoring)
                ENABLE_MONITORING=true
                shift
                ;;
            --install-dir)
                INSTALL_DIR="$2"
                shift 2
                ;;
            --version)
                VERSION="$2"
                shift 2
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                ;;
        esac
    done
}

show_help() {
    cat << EOF
nself-chat Self-Hosted Installation Script

Usage: $0 [OPTIONS]

OPTIONS:
    --non-interactive       Run without prompts (requires env vars)
    --skip-docker          Skip Docker installation
    --skip-certbot         Skip Certbot installation
    --enable-monitoring    Enable Grafana/Prometheus monitoring
    --install-dir DIR      Installation directory (default: /opt/nself-chat)
    --version VERSION      Install specific version (default: latest)
    --help                 Show this help message

ENVIRONMENT VARIABLES (for non-interactive mode):
    DOMAIN                 Domain name (e.g., chat.example.com)
    SSL_EMAIL              Email for Let's Encrypt SSL
    ADMIN_EMAIL            Admin account email
    COMPANY_NAME           Company/Organization name
    ENABLE_MONITORING      Enable monitoring (true/false)

EXAMPLES:
    # Interactive installation
    bash $0

    # Non-interactive installation
    DOMAIN=chat.example.com \\
    SSL_EMAIL=admin@example.com \\
    ADMIN_EMAIL=admin@example.com \\
    COMPANY_NAME="Acme Inc" \\
    bash $0 --non-interactive

EOF
}

# Prompt for user input (interactive mode)
prompt_configuration() {
    if [ "$NON_INTERACTIVE" = true ]; then
        # Validate required environment variables
        if [ -z "$DOMAIN" ] || [ -z "$SSL_EMAIL" ] || [ -z "$ADMIN_EMAIL" ] || [ -z "$COMPANY_NAME" ]; then
            error "Non-interactive mode requires DOMAIN, SSL_EMAIL, ADMIN_EMAIL, and COMPANY_NAME environment variables"
        fi
        return
    fi

    header "Configuration"

    # Domain name
    read -p "Enter your domain name (e.g., chat.example.com): " DOMAIN
    while [ -z "$DOMAIN" ]; do
        warn "Domain name is required"
        read -p "Enter your domain name: " DOMAIN
    done

    # SSL email
    read -p "Enter email for Let's Encrypt SSL certificates: " SSL_EMAIL
    while [ -z "$SSL_EMAIL" ]; do
        warn "Email is required"
        read -p "Enter email for SSL: " SSL_EMAIL
    done

    # Admin email
    read -p "Enter admin email for nself-chat: " ADMIN_EMAIL
    while [ -z "$ADMIN_EMAIL" ]; do
        warn "Admin email is required"
        read -p "Enter admin email: " ADMIN_EMAIL
    done

    # Company name
    read -p "Enter company/organization name: " COMPANY_NAME
    while [ -z "$COMPANY_NAME" ]; do
        warn "Company name is required"
        read -p "Enter company name: " COMPANY_NAME
    done

    # Monitoring
    read -p "Enable monitoring (Grafana/Prometheus)? [y/N]: " ENABLE_MONITORING_INPUT
    if [[ "$ENABLE_MONITORING_INPUT" =~ ^[Yy]$ ]]; then
        ENABLE_MONITORING=true
    else
        ENABLE_MONITORING=false
    fi

    # Confirmation
    echo ""
    log "Configuration Summary:"
    echo "  Domain:      $DOMAIN"
    echo "  SSL Email:   $SSL_EMAIL"
    echo "  Admin Email: $ADMIN_EMAIL"
    echo "  Company:     $COMPANY_NAME"
    echo "  Monitoring:  $ENABLE_MONITORING"
    echo "  Install Dir: $INSTALL_DIR"
    echo ""

    read -p "Proceed with installation? [Y/n]: " CONFIRM
    if [[ "$CONFIRM" =~ ^[Nn]$ ]]; then
        error "Installation cancelled"
    fi
}

# Install Docker
install_docker() {
    if [ "$SKIP_DOCKER_INSTALL" = true ]; then
        log "Skipping Docker installation"
        return
    fi

    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version | cut -d ' ' -f3 | cut -d ',' -f1)
        log "Docker is already installed (version $DOCKER_VERSION)"
        return
    fi

    header "Installing Docker"

    case $OS in
        ubuntu|debian)
            # Update package index
            sudo apt-get update

            # Install prerequisites
            sudo apt-get install -y \
                ca-certificates \
                curl \
                gnupg \
                lsb-release

            # Add Docker's official GPG key
            sudo mkdir -p /etc/apt/keyrings
            curl -fsSL https://download.docker.com/linux/$OS/gpg | \
                sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

            # Set up repository
            echo \
              "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$OS \
              $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

            # Install Docker
            sudo apt-get update
            sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
            ;;

        centos|rhel|fedora)
            # Install prerequisites
            sudo yum install -y yum-utils

            # Add Docker repository
            sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

            # Install Docker
            sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
            ;;

        *)
            error "Unsupported OS for automatic Docker installation: $OS"
            ;;
    esac

    # Enable and start Docker
    sudo systemctl enable docker
    sudo systemctl start docker

    # Add current user to docker group
    sudo usermod -aG docker $USER

    success "Docker installed successfully"
    warn "You may need to log out and log back in for Docker group changes to take effect"
}

# Install Certbot
install_certbot() {
    if [ "$SKIP_CERTBOT_INSTALL" = true ]; then
        log "Skipping Certbot installation"
        return
    fi

    if command -v certbot &> /dev/null; then
        log "Certbot is already installed"
        return
    fi

    header "Installing Certbot"

    case $OS in
        ubuntu|debian)
            sudo apt-get update
            sudo apt-get install -y certbot
            ;;

        centos|rhel|fedora)
            sudo yum install -y certbot
            ;;

        *)
            error "Unsupported OS for automatic Certbot installation: $OS"
            ;;
    esac

    success "Certbot installed successfully"
}

# Download nself-chat
download_nchat() {
    header "Downloading nself-chat"

    # Create installation directory
    sudo mkdir -p "$INSTALL_DIR"
    sudo chown $USER:$USER "$INSTALL_DIR"

    cd "$INSTALL_DIR"

    # Download based on version
    if [ "$VERSION" = "latest" ]; then
        log "Cloning latest version from GitHub..."
        git clone "$REPO_URL" .
    else
        log "Downloading version $VERSION..."
        git clone --branch "$VERSION" "$REPO_URL" .
    fi

    success "nself-chat downloaded to $INSTALL_DIR"
}

# Configure environment
configure_environment() {
    header "Configuring Environment"

    cd "$INSTALL_DIR"

    # Generate strong passwords
    POSTGRES_PASSWORD=$(openssl rand -base64 32)
    HASURA_ADMIN_SECRET=$(openssl rand -base64 32)
    HASURA_JWT_SECRET=$(openssl rand -base64 32)
    MINIO_ROOT_PASSWORD=$(openssl rand -base64 32)
    ADMIN_PASSWORD=$(openssl rand -base64 16)

    # Create .env.production
    cat > .env.production << EOF
# ============================================================================
# nself-chat Production Configuration
# Generated: $(date)
# ============================================================================

# Domain Configuration
DOMAIN=$DOMAIN
SSL_EMAIL=$SSL_EMAIL

# Application
NEXT_PUBLIC_APP_NAME=nchat
NEXT_PUBLIC_ENV=production
NODE_ENV=production

# URLs
NEXT_PUBLIC_GRAPHQL_URL=https://$DOMAIN/graphql
NEXT_PUBLIC_AUTH_URL=https://$DOMAIN/auth
NEXT_PUBLIC_STORAGE_URL=https://$DOMAIN/storage

# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_DB=nchat
HASURA_GRAPHQL_DATABASE_URL=postgres://postgres:$POSTGRES_PASSWORD@postgres:5432/nchat

# Hasura
HASURA_ADMIN_SECRET=$HASURA_ADMIN_SECRET
HASURA_JWT_SECRET=$HASURA_JWT_SECRET
HASURA_GRAPHQL_ENABLE_CONSOLE=false
HASURA_GRAPHQL_DEV_MODE=false
HASURA_GRAPHQL_ENABLE_TELEMETRY=false

# Auth
AUTH_CLIENT_URL=https://$DOMAIN
AUTH_SERVER_URL=https://$DOMAIN/auth
HASURA_GRAPHQL_JWT_SECRET={"type":"HS256","key":"$HASURA_JWT_SECRET"}

# Storage (MinIO)
MINIO_ROOT_USER=minio
MINIO_ROOT_PASSWORD=$MINIO_ROOT_PASSWORD
STORAGE_BACKEND=minio

# Email (configure your SMTP settings)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@$DOMAIN

# Admin Account
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD=$ADMIN_PASSWORD
COMPANY_NAME=$COMPANY_NAME

# Security
SESSION_SECRET=$(openssl rand -base64 32)

# Monitoring
ENABLE_MONITORING=$ENABLE_MONITORING

EOF

    # Create .env file for Docker Compose
    ln -sf .env.production .env

    # Save credentials securely
    cat > "$INSTALL_DIR/CREDENTIALS.txt" << EOF
nself-chat Installation Credentials
Generated: $(date)

IMPORTANT: Store these credentials securely and delete this file!

Application URL: https://$DOMAIN

Admin Account:
  Email: $ADMIN_EMAIL
  Password: $ADMIN_PASSWORD

Database:
  User: postgres
  Password: $POSTGRES_PASSWORD
  Database: nchat

Hasura Console:
  URL: https://$DOMAIN/console
  Admin Secret: $HASURA_ADMIN_SECRET

MinIO Console:
  URL: https://$DOMAIN/minio
  User: minio
  Password: $MINIO_ROOT_PASSWORD

EOF

    chmod 600 "$INSTALL_DIR/CREDENTIALS.txt"

    success "Environment configured"
    warn "Credentials saved to $INSTALL_DIR/CREDENTIALS.txt - KEEP THIS SECURE!"
}

# Obtain SSL certificate
obtain_ssl_certificate() {
    header "Obtaining SSL Certificate"

    # Check if port 80 is available
    if sudo netstat -tulpn | grep -q ':80 '; then
        warn "Port 80 is already in use. Stopping conflicting services..."
        sudo systemctl stop nginx apache2 2>/dev/null || true
    fi

    # Obtain certificate
    sudo certbot certonly --standalone \
        --preferred-challenges http \
        --email "$SSL_EMAIL" \
        --agree-tos \
        --no-eff-email \
        -d "$DOMAIN" \
        --non-interactive

    # Set up auto-renewal
    sudo systemctl enable certbot.timer 2>/dev/null || true
    sudo systemctl start certbot.timer 2>/dev/null || true

    # Create renewal hook to restart nginx via nself CLI
    sudo mkdir -p /etc/letsencrypt/renewal-hooks/deploy
    sudo tee /etc/letsencrypt/renewal-hooks/deploy/restart-nginx.sh << 'EOF'
#!/bin/bash
cd /opt/nself-chat
nself restart nginx
EOF
    sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/restart-nginx.sh

    success "SSL certificate obtained"
}

# Set up firewall
setup_firewall() {
    header "Configuring Firewall"

    # Detect firewall
    if command -v ufw &> /dev/null; then
        log "Configuring UFW firewall..."
        sudo ufw allow 22/tcp   # SSH
        sudo ufw allow 80/tcp   # HTTP
        sudo ufw allow 443/tcp  # HTTPS
        echo "y" | sudo ufw enable || true
    elif command -v firewall-cmd &> /dev/null; then
        log "Configuring firewalld..."
        sudo firewall-cmd --permanent --add-service=ssh
        sudo firewall-cmd --permanent --add-service=http
        sudo firewall-cmd --permanent --add-service=https
        sudo firewall-cmd --reload
    else
        warn "No supported firewall found. Please configure firewall manually:"
        warn "  - Allow ports: 22 (SSH), 80 (HTTP), 443 (HTTPS)"
    fi

    success "Firewall configured"
}

# Start services
start_services() {
    header "Starting Services"

    cd "$INSTALL_DIR"

    # Build and start services via nself CLI
    # Monitoring bundle is enabled via NSELF_MONITORING_ENABLED env var
    # (see nSelf-First doctrine G-004: monitoring is a first-class CLI feature).
    if [ "$ENABLE_MONITORING" = true ]; then
        log "Starting with monitoring enabled..."
        export NSELF_MONITORING_ENABLED=true
    fi

    nself build
    nself start

    # Wait for services to be healthy
    log "Waiting for services to start..."
    sleep 30

    # Check service health
    nself status

    success "Services started"
}

# Initialize database
initialize_database() {
    header "Initializing Database"

    cd "$INSTALL_DIR"

    # Wait for database to be ready
    log "Waiting for database to be ready..."
    sleep 10

    # Run migrations via nself CLI
    log "Running database migrations..."
    nself exec nchat pnpm db:migrate || warn "Migrations failed - may need to run manually"

    # Seed initial data via nself CLI
    log "Seeding initial data..."
    nself exec nchat pnpm db:seed || warn "Seeding failed - may need to run manually"

    success "Database initialized"
}

# Set up backups
setup_backups() {
    header "Setting Up Automatic Backups"

    # Create backup directory
    sudo mkdir -p "$BACKUP_DIR"

    # Create backup script
    sudo tee /usr/local/bin/backup-nchat << 'BACKUP_EOF'
#!/bin/bash
set -e

BACKUP_DIR="/var/backups/nself-chat"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
INSTALL_DIR="/opt/nself-chat"

cd "$INSTALL_DIR"

# Backup database via nself CLI
nself exec postgres pg_dump -U postgres nchat | gzip > ${BACKUP_DIR}/db-${TIMESTAMP}.sql.gz

# Backup volumes (uploads, etc.)
docker run --rm \
  -v nself-chat-uploads:/data \
  -v ${BACKUP_DIR}:/backup \
  alpine tar czf /backup/uploads-${TIMESTAMP}.tar.gz /data

# Backup configuration
cp .env.production ${BACKUP_DIR}/env-${TIMESTAMP}.backup

# Create combined backup
tar czf ${BACKUP_DIR}/nchat-backup-${TIMESTAMP}.tar.gz \
  ${BACKUP_DIR}/db-${TIMESTAMP}.sql.gz \
  ${BACKUP_DIR}/uploads-${TIMESTAMP}.tar.gz \
  ${BACKUP_DIR}/env-${TIMESTAMP}.backup

# Clean up individual files
rm ${BACKUP_DIR}/db-${TIMESTAMP}.sql.gz
rm ${BACKUP_DIR}/uploads-${TIMESTAMP}.tar.gz
rm ${BACKUP_DIR}/env-${TIMESTAMP}.backup

# Delete backups older than 30 days
find ${BACKUP_DIR} -name "nchat-backup-*.tar.gz" -mtime +30 -delete

echo "Backup completed: nchat-backup-${TIMESTAMP}.tar.gz"
BACKUP_EOF

    sudo chmod +x /usr/local/bin/backup-nchat

    # Schedule daily backups at 2 AM
    echo "0 2 * * * root /usr/local/bin/backup-nchat >> /var/log/nchat-backup.log 2>&1" | \
        sudo tee /etc/cron.d/nchat-backup

    success "Automatic backups configured (daily at 2 AM)"
}

# Create management scripts
create_management_scripts() {
    header "Creating Management Scripts"

    # Diagnostic script
    sudo tee /usr/local/bin/diagnose-nchat << 'DIAG_EOF'
#!/bin/bash
cd /opt/nself-chat
echo "=== nself-chat Diagnostics ==="
echo ""
echo "Services Status:"
nself status
echo ""
echo "Disk Usage:"
df -h /
echo ""
echo "Memory Usage:"
free -h
echo ""
echo "Docker Stats:"
docker stats --no-stream
echo ""
echo "Recent Errors:"
nself logs --tail=50 | grep -i error || echo "No recent errors"
DIAG_EOF

    sudo chmod +x /usr/local/bin/diagnose-nchat

    success "Management scripts created"
    log "  - diagnose-nchat: System diagnostics"
    log "  - backup-nchat: Manual backup"
    log "  - update-nchat: Update to latest version (see update script)"
}

# Display completion message
show_completion() {
    header "Installation Complete!"

    cat << EOF

${GREEN}✓ nself-chat has been successfully installed!${NC}

${BLUE}Access your installation:${NC}
  URL: https://$DOMAIN
  Admin: $ADMIN_EMAIL
  Password: $ADMIN_PASSWORD

${BLUE}Important files:${NC}
  Installation: $INSTALL_DIR
  Credentials: $INSTALL_DIR/CREDENTIALS.txt
  Backups: $BACKUP_DIR

${BLUE}Management commands (via nself CLI):${NC}
  Status:      cd $INSTALL_DIR && nself status
  Logs:        cd $INSTALL_DIR && nself logs -f
  Restart:     cd $INSTALL_DIR && nself restart
  Stop:        cd $INSTALL_DIR && nself stop
  Start:       cd $INSTALL_DIR && nself start
  Update:      cd $INSTALL_DIR && nself update
  Backup:      sudo /usr/local/bin/backup-nchat
  Diagnose:    sudo /usr/local/bin/diagnose-nchat

${BLUE}Next steps:${NC}
  1. Complete the setup wizard: https://$DOMAIN/setup
  2. Configure SMTP settings in: $INSTALL_DIR/.env.production
  3. Test the backup: sudo /usr/local/bin/backup-nchat
  4. Review security: https://$DOMAIN/admin/security

${BLUE}Documentation:${NC}
  https://docs.nself.chat

${YELLOW}⚠ IMPORTANT:${NC}
  - Store credentials from $INSTALL_DIR/CREDENTIALS.txt securely
  - Configure SMTP for email notifications
  - Set up offsite backups
  - Review firewall settings

${GREEN}Thank you for choosing nself-chat!${NC}

EOF
}

# ============================================================================
# Main Installation Flow
# ============================================================================

main() {
    header "nself-chat Self-Hosted Installer"

    # Parse arguments
    parse_args "$@"

    # Preflight checks
    check_root
    detect_os
    check_requirements

    # Get configuration
    prompt_configuration

    # Install dependencies
    install_docker
    install_certbot

    # Download and configure
    download_nchat
    configure_environment

    # Set up SSL
    obtain_ssl_certificate

    # Configure firewall
    setup_firewall

    # Start services
    start_services

    # Initialize
    initialize_database

    # Set up backups
    setup_backups

    # Create management scripts
    create_management_scripts

    # Show completion
    show_completion
}

# Run main function
main "$@"
