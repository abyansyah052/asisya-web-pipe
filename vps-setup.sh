#!/bin/bash
# ===========================================
# ASISYA-WEB VPS SETUP SCRIPT
# Jalankan di VPS Hostinger sebagai root
# ===========================================

set -e  # Stop jika ada error

echo "🚀 Starting Asisya-Web VPS Setup..."
echo "===================================="

# 1. Update System
echo ""
echo "📦 [1/7] Updating system..."
apt update -y
apt upgrade -y

# 2. Install Node.js 20
echo ""
echo "📦 [2/7] Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
echo "✅ Node.js version: $(node -v)"
echo "✅ npm version: $(npm -v)"

# 3. Install PM2
echo ""
echo "📦 [3/7] Installing PM2..."
npm install -g pm2
echo "✅ PM2 installed"

# 4. Install Nginx
echo ""
echo "📦 [4/7] Installing Nginx..."
apt install -y nginx
systemctl enable nginx
systemctl start nginx
echo "✅ Nginx installed and running"

# 5. Install PostgreSQL
echo ""
echo "📦 [5/7] Installing PostgreSQL..."
apt install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql
echo "✅ PostgreSQL installed and running"

# 6. Install Certbot for SSL
echo ""
echo "📦 [6/7] Installing Certbot..."
apt install -y certbot python3-certbot-nginx
echo "✅ Certbot installed"

# 7. Install unzip
echo ""
echo "📦 [7/7] Installing unzip..."
apt install -y unzip
echo "✅ Unzip installed"

# Create app directory
echo ""
echo "📁 Creating app directory..."
mkdir -p /var/www/asisya-web
chown -R root:root /var/www/asisya-web

# Generate SSH key for GitHub Actions
echo ""
echo "🔑 Generating SSH key for GitHub Actions..."
ssh-keygen -t ed25519 -C "github-deploy" -f /root/.ssh/github_deploy -N "" -q
cat /root/.ssh/github_deploy.pub >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys

echo ""
echo "===================================="
echo "✅ VPS SETUP COMPLETE!"
echo "===================================="
echo ""
echo "📋 NEXT STEPS:"
echo ""
echo "1. Setup Database - Run this:"
echo "   sudo -u postgres psql -c \"CREATE USER asisya_user WITH PASSWORD 'YourStrongPassword123';\""
echo "   sudo -u postgres psql -c \"CREATE DATABASE asisya_web OWNER asisya_user;\""
echo ""
echo "2. Copy this SSH PRIVATE KEY for GitHub Secrets (VPS_SSH_KEY):"
echo "----------------------------------------"
cat /root/.ssh/github_deploy
echo "----------------------------------------"
echo ""
echo "3. Your VPS_HOST is: $(curl -s ifconfig.me)"
echo "4. Your VPS_USERNAME is: root"
echo ""
echo "🎉 Now setup GitHub Secrets and push your code!"
