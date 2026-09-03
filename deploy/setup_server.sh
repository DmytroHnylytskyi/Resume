#!/usr/bin/env bash
# ==============================================================================
# Production Server Provisioning Script (Ubuntu 24.04 LTS)
# Configures: 4GB Swap, Docker Engine + Compose, UFW Firewall (SSH/HTTP/HTTPS/QUIC)
# ==============================================================================

set -euo pipefail

echo "===================================================================="
echo " Starting Automated Server Provisioning for Portfolio Ecosystem"
echo "===================================================================="

# Check root privileges
if [ "$(id -u)" -ne 0 ]; then
    echo "[ERROR] This script must be executed as root (or via sudo)." >&2
    exit 1
fi

# 1. Update Base Packages
echo "[1/4] Updating base system packages..."
apt-get update -y
apt-get upgrade -y
apt-get install -y curl git ufw ca-certificates gnupg lsb-release htop

# 2. Configure 4GB Swap File (Protects against OOM during Next.js builds)
echo "[2/4] Verifying and configuring 4GB swapfile..."
if [ ! -f /swapfile ]; then
    echo "Creating 4GB swap file at /swapfile..."
    fallocate -l 4G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=4096
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    sysctl vm.swappiness=20
    echo 'vm.swappiness=20' >> /etc/sysctl.d/99-swap.conf
    echo "Swap configured successfully."
else
    echo "Swapfile already exists. Skipping creation."
fi

# 3. Install Docker and Docker Compose Plugin
echo "[3/4] Installing official Docker Engine & Docker Compose plugin..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm -f get-docker.sh
    systemctl enable docker
    systemctl start docker
    echo "Docker installed successfully: $(docker --version)"
else
    echo "Docker is already installed: $(docker --version)"
fi

# 4. Configure UFW Firewall
echo "[4/4] Configuring UFW Firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP (Let'\''s Encrypt & Redirects)'
ufw allow 443/tcp comment 'HTTPS (TLS)'
ufw allow 443/udp comment 'HTTP/3 (QUIC)'
ufw --force enable

echo "===================================================================="
echo " Server Provisioning Complete!"
echo "===================================================================="
echo ""
echo "Next Steps to deploy your projects:"
echo " 1. Clone your repository:"
echo "    git clone https://github.com/DmytroHnylytskyi/Resume.git /opt/resume"
echo "    cd /opt/resume/deploy"
echo ""
echo " 2. Create and edit your production .env file:"
echo "    cp .env.production.example .env"
echo "    nano .env"
echo ""
echo " 3. Launch the complete ecosystem:"
echo "    docker compose -f docker-compose.prod.yml up -d --build"
echo ""
echo " 4. View real-time logs:"
echo "    docker compose -f docker-compose.prod.yml logs -f"
echo "===================================================================="
