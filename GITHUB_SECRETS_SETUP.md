# 🔐 GitHub Secrets yang Perlu Di-Setup

Buka: https://github.com/abyansyah052/asisya-web-pipe/settings/secrets/actions

Klik **"New repository secret"** untuk setiap item berikut:

## 1️⃣ VPS Connection Secrets

| Secret Name | Value |
|-------------|-------|
| `VPS_HOST` | IP Address VPS Hostinger Anda (contoh: `103.123.45.67`) |
| `VPS_USERNAME` | `root` (atau username VPS Anda) |
| `VPS_SSH_KEY` | Private SSH key dari VPS (hasil `cat ~/.ssh/github_deploy` di VPS) |

## 2️⃣ App Environment Secrets

| Secret Name | Value |
|-------------|-------|
| `DATABASE_URL` | `postgres://asisya_user:PASSWORD@localhost:5432/asisya_web` |
| `JWT_SECRET` | Generate baru: `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | `https://yourdomain.com` |
| `EMAIL_USER` | `berkasaby@gmail.com` |
| `EMAIL_PASSWORD` | App password Gmail Anda |
| `UPSTASH_REDIS_REST_URL` | `https://rational-bobcat-7749.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | Token lengkap dari Upstash Console |

## ⚠️ PENTING

1. **Ganti semua password** yang sudah pernah di-share ke public
2. **Generate JWT_SECRET baru** untuk production:
   ```bash
   openssl rand -base64 32
   ```
3. **DATABASE_URL** harus sesuai dengan yang dibuat di VPS

## 📋 Checklist

- [ ] VPS_HOST
- [ ] VPS_USERNAME  
- [ ] VPS_SSH_KEY
- [ ] DATABASE_URL
- [ ] JWT_SECRET
- [ ] NEXT_PUBLIC_APP_URL
- [ ] EMAIL_USER
- [ ] EMAIL_PASSWORD
- [ ] UPSTASH_REDIS_REST_URL
- [ ] UPSTASH_REDIS_REST_TOKEN
