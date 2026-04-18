# nself CLI - Installation Guide

**Version**: v0.4.2
**Last Updated**: February 1, 2026
**Prerequisites**: Docker, 16GB RAM minimum

---

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Platform-Specific Installation](#platform-specific-installation)
3. [Verification](#verification)
4. [Post-Installation Setup](#post-installation-setup)
5. [Updating nself CLI](#updating-nself-cli)
6. [Uninstallation](#uninstallation)
7. [Troubleshooting](#troubleshooting)
8. [Next Steps](#next-steps)

---

## System Requirements

### Minimum Requirements

| Component            | Requirement                                  |
| -------------------- | -------------------------------------------- |
| **Operating System** | macOS 11+, Ubuntu 20.04+, Windows 10+ (WSL2) |
| **CPU**              | 2 cores (4+ recommended)                     |
| **RAM**              | 8GB minimum (16GB+ recommended)              |
| **Disk Space**       | 10GB free (SSD recommended)                  |
| **Docker**           | 20.10.0+                                     |
| **Docker Compose**   | v2.0.0+                                      |
| **Internet**         | Required for initial setup                   |

### Recommended Requirements

For production-like development:

| Component  | Recommended   |
| ---------- | ------------- |
| **CPU**    | 8 cores       |
| **RAM**    | 32GB          |
| **Disk**   | 100GB SSD     |
| **Docker** | Latest stable |

### Software Prerequisites

#### 1. **Docker Desktop** (macOS/Windows)

**macOS:**

```bash
# Install via Homebrew
brew install --cask docker

# Or download from Docker website
# https://www.docker.com/products/docker-desktop
```

**Windows (WSL2):**

```powershell
# Install WSL2 first
wsl --install

# Install Docker Desktop for Windows
# https://www.docker.com/products/docker-desktop

# Enable WSL2 backend in Docker Desktop settings
```

**Verify Docker:**

```bash
docker --version
# Expected: Docker version 24.0.0 or higher

docker compose version
# Expected: Docker Compose version v2.20.0 or higher
```

#### 2. **Docker Engine** (Linux)

**Ubuntu/Debian:**

```bash
# Update package index
sudo apt-get update

# Install dependencies
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add your user to docker group
sudo usermod -aG docker $USER

# Log out and back in for group changes to take effect
```

**Fedora/RHEL:**

```bash
# Install Docker
sudo dnf -y install dnf-plugins-core
sudo dnf config-manager --add-repo \
    https://download.docker.com/linux/fedora/docker-ce.repo
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
sudo usermod -aG docker $USER
```

**Arch Linux:**

```bash
# Install Docker
sudo pacman -S docker docker-compose

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
sudo usermod -aG docker $USER
```

#### 3. **Podman** (Alternative to Docker)

nself CLI also works with Podman:

```bash
# macOS
brew install podman
podman machine init
podman machine start

# Linux (Ubuntu/Debian)
sudo apt-get install -y podman podman-compose

# Fedora
sudo dnf install -y podman podman-compose

# Configure nself to use Podman
export DOCKER_HOST=unix:///run/user/$UID/podman/podman.sock
```

---

## Platform-Specific Installation

### macOS Installation

#### Method 1: Homebrew (Recommended)

```bash
# Add nself tap
brew tap nself/tap

# Install nself CLI
brew install nself

# Verify installation
nself --version
```

#### Method 2: Install Script

```bash
# Download and run install script
curl -fsSL https://nself.org/install.sh | sh

# Or download specific version
curl -fsSL https://nself.org/install.sh | sh -s -- --version v0.4.2

# Verify installation
nself --version
```

#### Method 3: Manual Installation

```bash
# Download binary
curl -LO https://github.com/nself/nself/releases/download/v0.4.2/nself-darwin-amd64

# Make executable
chmod +x nself-darwin-amd64

# Move to PATH
sudo mv nself-darwin-amd64 /usr/local/bin/nself

# Verify
nself --version
```

**Apple Silicon (M1/M2/M3):**

```bash
# Download ARM binary
curl -LO https://github.com/nself/nself/releases/download/v0.4.2/nself-darwin-arm64

# Make executable and install
chmod +x nself-darwin-arm64
sudo mv nself-darwin-arm64 /usr/local/bin/nself
```

### Linux Installation

#### Method 1: Install Script (Recommended)

```bash
# Download and run install script
curl -fsSL https://nself.org/install.sh | sh

# Verify installation
nself --version
```

#### Method 2: Package Manager

**Snap (Ubuntu/Debian):**

```bash
sudo snap install nself --classic
```

**AUR (Arch Linux):**

```bash
yay -S nself-cli
# Or
paru -S nself-cli
```

#### Method 3: Manual Installation

```bash
# Detect architecture
ARCH=$(uname -m)
case $ARCH in
    x86_64)  BINARY="nself-linux-amd64" ;;
    aarch64) BINARY="nself-linux-arm64" ;;
    armv7l)  BINARY="nself-linux-armv7" ;;
esac

# Download binary
curl -LO "https://github.com/nself/nself/releases/download/v0.4.2/$BINARY"

# Make executable
chmod +x "$BINARY"

# Move to PATH
sudo mv "$BINARY" /usr/local/bin/nself

# Verify
nself --version
```

### Windows Installation (WSL2)

**Prerequisites:**

1. Windows 10 version 2004+ or Windows 11
2. WSL2 installed and configured
3. Docker Desktop with WSL2 backend

**Installation Steps:**

```bash
# Open WSL2 terminal (Ubuntu recommended)
wsl

# Install using Linux method
curl -fsSL https://nself.org/install.sh | sh

# Verify
nself --version
```

**Windows Native (PowerShell):**

```powershell
# Download Windows binary
Invoke-WebRequest -Uri "https://github.com/nself/nself/releases/download/v0.4.2/nself-windows-amd64.exe" -OutFile "nself.exe"

# Move to PATH
Move-Item nself.exe $env:USERPROFILE\bin\nself.exe

# Add to PATH if not already
$env:Path += ";$env:USERPROFILE\bin"
[Environment]::SetEnvironmentVariable("Path", $env:Path, "User")

# Verify
nself --version
```

---

## Verification

After installation, verify everything is working:

### 1. Check nself CLI Version

```bash
nself --version
# Expected output:
# nself version v0.4.2
```

### 2. Check Docker

```bash
docker --version
# Expected: Docker version 20.10.0+

docker ps
# Expected: Should list running containers (may be empty)
```

### 3. Check Docker Compose

```bash
docker compose version
# Expected: Docker Compose version v2.0.0+
```

### 4. Check Disk Space

```bash
df -h
# Ensure 10GB+ free space
```

### 5. Check Memory

```bash
# macOS
system_profiler SPHardwareDataType | grep Memory

# Linux
free -h
```

### 6. Test nself CLI

```bash
# Display help
nself --help

# Check available commands
nself

# Expected output should show:
# - init
# - start
# - stop
# - status
# - logs
# - urls
# etc.
```

---

## Post-Installation Setup

### 1. Configure Docker Resources

**Docker Desktop (macOS/Windows):**

1. Open Docker Desktop settings
2. Go to Resources
3. Set:
   - **CPUs**: 4+ (half of your available cores)
   - **Memory**: 8GB minimum, 16GB recommended
   - **Disk**: 50GB+
4. Click "Apply & Restart"

**Docker Engine (Linux):**

Resources are managed by the system, but you can set limits:

```bash
# Edit Docker daemon config
sudo nano /etc/docker/daemon.json

# Add resource limits (optional)
{
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 64000,
      "Soft": 64000
    }
  },
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}

# Restart Docker
sudo systemctl restart docker
```

### 2. Configure nself CLI (Optional)

Create global config file:

```bash
# Create config directory
mkdir -p ~/.config/nself

# Create config file
cat > ~/.config/nself/config.yaml << EOF
# Global nself CLI configuration

# Default project settings
defaults:
  env: development
  domain: localhost

# Service preferences
services:
  postgres_version: "16-alpine"
  hasura_version: "v2.44.0"
  redis_enabled: true
  minio_enabled: true

# Resource limits
resources:
  postgres_memory: 2GB
  hasura_memory: 1GB
  redis_memory: 512MB

# Network settings
network:
  driver: bridge
  subnet: 172.20.0.0/16

# Backup settings
backup:
  enabled: true
  schedule: "0 2 * * *"  # 2 AM daily
  retention: 7  # days
EOF
```

### 3. Set Up Shell Completion (Optional)

**Bash:**

```bash
# Add to ~/.bashrc
echo 'eval "$(nself completion bash)"' >> ~/.bashrc
source ~/.bashrc
```

**Zsh:**

```bash
# Add to ~/.zshrc
echo 'eval "$(nself completion zsh)"' >> ~/.zshrc
source ~/.zshrc
```

**Fish:**

```bash
# Add to ~/.config/fish/config.fish
echo 'nself completion fish | source' >> ~/.config/fish/config.fish
source ~/.config/fish/config.fish
```

### 4. Configure Local DNS (Optional)

For `.localhost` domains to work properly:

**macOS/Linux:**

Already supported! `.localhost` domains resolve to 127.0.0.1 automatically.

**Windows (WSL2):**

Add to Windows hosts file:

```powershell
# Run as Administrator
Add-Content -Path C:\Windows\System32\drivers\etc\hosts -Value "127.0.0.1 api.localhost auth.localhost storage.localhost"
```

### 5. Create First Project

```bash
# Initialize demo project
nself init demo-project

# Navigate to backend
cd demo-project/.backend

# Review generated files
ls -la

# Start services
nself start

# Check status
nself status
```

---

## Updating nself CLI

### Check for Updates

```bash
# Check current version
nself --version

# Check latest version
nself version --check

# Or manually check GitHub
curl -s https://api.github.com/repos/nself/nself/releases/latest | \
  grep '"tag_name":' | \
  sed -E 's/.*"([^"]+)".*/\1/'
```

### Update Methods

#### Homebrew (macOS)

```bash
brew update
brew upgrade nself
```

#### Install Script

```bash
# Update to latest
curl -fsSL https://nself.org/install.sh | sh

# Update to specific version
curl -fsSL https://nself.org/install.sh | sh -s -- --version v0.4.2
```

#### Manual Update

```bash
# Download new version
curl -LO https://github.com/nself/nself/releases/download/v0.4.2/nself-$(uname -s)-$(uname -m)

# Replace existing binary
chmod +x nself-*
sudo mv nself-* /usr/local/bin/nself

# Verify
nself --version
```

### Migrate Existing Projects

After updating nself CLI:

```bash
# Navigate to project
cd myproject/.backend

# Update docker-compose.yml
nself build --update

# Restart services
nself stop
nself start

# Verify
nself status
```

---

## Uninstallation

### Remove nself CLI

#### Homebrew (macOS)

```bash
brew uninstall nself
brew untap nself/tap
```

#### Manual Removal

```bash
# Remove binary
sudo rm /usr/local/bin/nself

# Remove config
rm -rf ~/.config/nself

# Remove cache
rm -rf ~/.cache/nself
```

### Remove Docker Resources

**WARNING**: This will delete all nself projects and data!

```bash
# Stop all nself containers
docker ps -a | grep nself | awk '{print $1}' | xargs docker stop
docker ps -a | grep nself | awk '{print $1}' | xargs docker rm

# Remove volumes
docker volume ls | grep nself | awk '{print $2}' | xargs docker volume rm

# Remove networks
docker network ls | grep nself | awk '{print $2}' | xargs docker network rm

# Remove images (optional)
docker images | grep -E 'postgres|hasura|nhost|minio|redis' | awk '{print $3}' | xargs docker rmi
```

### Clean Docker System (Optional)

```bash
# WARNING: This removes ALL unused Docker resources

# Remove unused containers
docker container prune -f

# Remove unused volumes
docker volume prune -f

# Remove unused networks
docker network prune -f

# Remove unused images
docker image prune -a -f

# Complete cleanup (use with caution!)
docker system prune -a --volumes -f
```

---

## Troubleshooting

### Common Issues

#### 1. Permission Denied (Linux)

**Error:**

```
Got permission denied while trying to connect to the Docker daemon socket
```

**Solution:**

```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Log out and back in
# Or apply changes immediately
newgrp docker

# Verify
docker ps
```

#### 2. Port Already in Use

**Error:**

```
Error: Port 5432 is already in use
```

**Solution:**

```bash
# Find process using port
lsof -i :5432

# Kill the process
kill -9 <PID>

# Or use different port in .backend/.env
POSTGRES_PORT=5433
```

#### 3. Out of Disk Space

**Error:**

```
Error: No space left on device
```

**Solution:**

```bash
# Check disk usage
df -h

# Clean Docker
docker system prune -a --volumes

# Free up space
# Remove old containers
docker container prune -f

# Remove unused volumes
docker volume prune -f
```

#### 4. Docker Not Running

**Error:**

```
Cannot connect to the Docker daemon
```

**Solution:**

```bash
# macOS/Windows: Start Docker Desktop

# Linux: Start Docker service
sudo systemctl start docker

# Verify
docker ps
```

#### 5. Network Issues

**Error:**

```
Error: Could not resolve host
```

**Solution:**

```bash
# Check Docker network
docker network ls

# Recreate network
docker network rm nself_network
docker network create nself_network

# Restart services
nself restart
```

#### 6. Installation Script Fails

**Error:**

```
curl: (7) Failed to connect to nself.org
```

**Solution:**

```bash
# Check internet connection
ping google.com

# Use alternative download method
wget https://nself.org/install.sh -O install.sh
sh install.sh

# Or install manually
curl -LO https://github.com/nself/nself/releases/download/v0.4.2/nself-$(uname -s)-$(uname -m)
```

#### 7. M1/M2 Mac Issues

**Error:**

```
WARNING: The requested image's platform (linux/amd64) does not match the detected host platform
```

**Solution:**

```bash
# Use ARM builds
export DOCKER_DEFAULT_PLATFORM=linux/arm64

# Add to ~/.zshrc or ~/.bashrc
echo 'export DOCKER_DEFAULT_PLATFORM=linux/arm64' >> ~/.zshrc

# Restart Docker Desktop with Rosetta 2 support enabled
# Docker Desktop > Settings > General > Enable "Use Rosetta for x86/amd64 emulation"
```

### Getting Help

If you encounter issues:

1. **Check Documentation**
   - [Troubleshooting Guide](./Troubleshooting.md)
   - [Common Issues](../../COMMON-ISSUES.md)

2. **Search GitHub Issues**
   - https://github.com/nself/nself/issues

3. **Ask Community**
   - Discord: https://discord.gg/nself
   - GitHub Discussions: https://github.com/nself/nself/discussions

4. **File a Bug Report**
   - https://github.com/nself/nself/issues/new

---

## Next Steps

Now that you have nself CLI installed:

1. **Read the Quick Start** → [Quick-Start.md](./Quick-Start.md)
2. **Learn the Commands** → [Commands.md](./Commands.md)
3. **Explore Services** → [Services.md](./Services.md)
4. **Configure Your Stack** → [Configuration.md](../configuration/Configuration.md)

---

**Successfully installed?** Head to the [Quick Start Guide](./Quick-Start.md) to create your first project!
