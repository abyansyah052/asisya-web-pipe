# 🖥️ Panduan Setup Hostinger VPS untuk Next.js

## 📋 Yang Akan Kita Setup:
1. ✅ Akses SSH ke VPS
2. ✅ Install Node.js & npm
3. ✅ Install PostgreSQL
4. ✅ Install PM2 (process manager)
5. ✅ Setup Nginx (reverse proxy)
6. ✅ Setup SSL (HTTPS)
7. ✅ Setup Auto-Deploy dari GitHub

---

## 🔐 STEP 1: Akses SSH ke VPS

### 1.1 Dapatkan Info VPS
Login ke Hostinger → VPS → Klik VPS Anda

Catat:
- **IP Address**: `xxx.xxx.xxx.xxx`
- **Username**: biasanya `root`
- **Password**: yang Anda set saat beli VPS

### 1.2 Connect via Terminal (Mac)

```bash
ssh root@YOUR_VPS_IP
# Contoh: ssh root@103.123.45.67
```

Ketik "yes" jika diminta, lalu masukkan password.

---

## 📦 STEP 2: Install Software yang Dibutuhkan

Setelah masuk VPS, jalankan perintah berikut satu per satu:

### 2.1 Update System
```bash
apt update && apt upgrade -y
```

### 2.2 Install Node.js 20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

Verifikasi:
```bash
node -v  # Harus menampilkan v20.x.x
npm -v   # Harus menampilkan 10.x.x
```

### 2.3 Install PM2 (Process Manager)
```bash
npm install -g pm2
```

### 2.4 Install Nginx
```bash
apt install -y nginx
systemctl enable nginx
systemctl start nginx
```

### 2.5 Install PostgreSQL
```bash
apt install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql
```

---

## 🗄️ STEP 3: Setup Database PostgreSQL

### 3.1 Masuk ke PostgreSQL
```bash
sudo -u postgres psql
```

### 3.2 Buat Database dan User
```sql
-- Buat password yang kuat (ganti 'YOUR_STRONG_PASSWORD')
CREATE USER asisya_user WITH PASSWORD 'YOUR_STRONG_PASSWORD';

-- Buat database
CREATE DATABASE asisya_web OWNER asisya_user;

-- Berikan akses penuh
GRANT ALL PRIVILEGES ON DATABASE asisya_web TO asisya_user;

-- Keluar
\q
```

### 3.3 Catat DATABASE_URL Baru
```
DATABASE_URL=postgres://asisya_user:YOUR_STRONG_PASSWORD@localhost:5432/asisya_web
```

---

## 📂 STEP 4: Setup Folder Aplikasi

```bash
# Buat folder untuk aplikasi
mkdir -p /var/www/asisya-web
cd /var/www/asisya-web

# Set permission
chown -R $USER:$USER /var/www/asisya-web
```

---

## 🔑 STEP 5: Setup SSH Key untuk GitHub Actions

### 5.1 Generate SSH Key di VPS
```bash
ssh-keygen -t ed25519 -C "github-deploy" -f ~/.ssh/github_deploy -N ""
```

### 5.2 Tambahkan ke Authorized Keys
```bash
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
```

### 5.3 Copy Private Key (untuk GitHub Secret)
```bash
cat ~/.ssh/github_deploy
```

**COPY SELURUH OUTPUT** (termasuk `-----BEGIN` dan `-----END`).
Simpan ini untuk GitHub Secrets nanti.

---

## 🌐 STEP 6: Setup Nginx Reverse Proxy

### 6.1 Buat Config Nginx
```bash
nano /etc/nginx/sites-available/asisya-web
```

Paste konfigurasi ini (ganti `yourdomain.com` dengan domain Anda):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Tekan `Ctrl+X`, lalu `Y`, lalu `Enter` untuk save.

### 6.2 Aktifkan Config
```bash
ln -s /etc/nginx/sites-available/asisya-web /etc/nginx/sites-enabled/
nginx -t  # Test konfigurasi
systemctl reload nginx
```

---

## 🔒 STEP 7: Setup SSL (HTTPS) dengan Certbot

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Ikuti instruksi di layar (masukkan email, setuju terms, pilih redirect to HTTPS).

---

## 📝 STEP 8: Buat File Environment di VPS

```bash
nano /var/www/asisya-web/.env.local
```

Paste environment variables (dengan nilai production):

```env
# Database (gunakan password baru yang dibuat di Step 3)
DATABASE_URL=postgres://asisya_user:YOUR_STRONG_PASSWORD@localhost:5432/asisya_web

# JWT Secret (GENERATE BARU untuk production!)
JWT_SECRET=GENERATE_NEW_SECRET_HERE

# Node Environment
NODE_ENV=production

# Email
EMAIL_USER=berkasaby@gmail.com
EMAIL_PASSWORD=your_app_password

# Upstash Redis
UPSTASH_REDIS_REST_URL="https://rational-bobcat-7749.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your_token_here"

# App URL (domain Anda)
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

Save dengan `Ctrl+X`, `Y`, `Enter`.

---

## 🔄 STEP 9: Setup Deploy Script

```bash
nano /var/www/asisya-web/deploy.sh
```

Paste script ini:

```bash
#!/bin/bash
cd /var/www/asisya-web

echo "📦 Extracting build..."
unzip -o build.zip
rm build.zip

echo "📥 Installing dependencies..."
npm ci --production

echo "🔄 Restarting application..."
pm2 restart asisya-web || pm2 start npm --name "asisya-web" -- start

echo "✅ Deploy complete!"
```

Save dan buat executable:
```bash
chmod +x /var/www/asisya-web/deploy.sh
```

---

## 🎯 STEP 10: Jalankan Database Migration

Setelah deploy pertama kali, jalankan:
```bash
cd /var/www/asisya-web
# Jalankan migration SQL Anda
psql -U asisya_user -d asisya_web -f migrations/001_initial.sql
# Ulangi untuk semua file migration
```

---

## ✅ Checklist Sebelum Deploy

- [ ] Node.js terinstall (`node -v`)
- [ ] PostgreSQL running (`systemctl status postgresql`)
- [ ] Database & user sudah dibuat
- [ ] Nginx terinstall & running
- [ ] SSL sudah aktif (https works)
- [ ] SSH key sudah di-generate
- [ ] `.env.local` sudah dibuat di VPS
- [ ] `deploy.sh` sudah ada

---

## 📊 Commands Berguna

```bash
# Cek status aplikasi
pm2 status

# Lihat logs
pm2 logs asisya-web

# Restart aplikasi
pm2 restart asisya-web

# Cek Nginx status  
systemctl status nginx

# Cek PostgreSQL status
systemctl status postgresql
```

---

## 🆘 Troubleshooting

### Error: Port 3000 already in use
```bash
pm2 kill
pm2 start npm --name "asisya-web" -- start
```

### Error: Permission denied
```bash
chown -R root:root /var/www/asisya-web
```

### Database connection error
```bash
# Test koneksi
psql -U asisya_user -d asisya_web -h localhost
```
