# 🚀 Panduan Deploy ke Hostinger via GitHub Actions

## Langkah 1: Push ke GitHub

```bash
git add .
git commit -m "Add GitHub Actions workflow"
git push origin main
```

## Langkah 2: Setup GitHub Secrets

Buka repository di GitHub → **Settings** → **Secrets and Variables** → **Actions** → **New repository secret**

Tambahkan secrets berikut (lihat nilai dari `.env.local` Anda):

| Secret Name | Deskripsi |
|-------------|-----------|
| `DATABASE_URL` | URL koneksi database PostgreSQL |
| `JWT_SECRET` | Secret key untuk JWT |
| `NEXT_PUBLIC_APP_URL` | URL aplikasi (misal: https://yourdomain.com) |

Untuk deploy otomatis ke Hostinger (opsional), tambah juga:

| Secret Name | Deskripsi |
|-------------|-----------|
| `HOSTINGER_HOST` | IP atau hostname VPS Hostinger |
| `HOSTINGER_USERNAME` | Username SSH (biasanya sama dengan cPanel) |
| `HOSTINGER_SSH_KEY` | Private SSH key untuk akses |

## Langkah 3: Jalankan Build

### Cara 1: Push code baru
Setiap kali push ke branch `main`, build akan otomatis jalan.

### Cara 2: Manual trigger
1. Buka GitHub → Repository → **Actions** tab
2. Pilih workflow "Build and Deploy to Hostinger"
3. Klik **Run workflow**

## Langkah 4: Download Build Result

1. Setelah workflow selesai (✓ hijau), klik workflow run-nya
2. Scroll ke bawah ke bagian **Artifacts**
3. Download `nextjs-build`
4. Extract `build.zip`
5. Upload ke Hostinger via File Manager atau FTP

## Langkah 5: Setup di Hostinger

### Untuk Hostinger VPS:
```bash
# SSH ke VPS
ssh user@your-hostinger-ip

# Extract files
cd /var/www/html  # atau folder web Anda
unzip build.zip

# Install production dependencies
npm ci --production

# Jalankan dengan PM2
pm2 start npm --name "asisya-web" -- start
pm2 save
```

### Untuk Hostinger Shared Hosting:
⚠️ **Penting**: Next.js butuh Node.js hosting, bukan shared hosting biasa.
Hostinger Shared Hosting tidak support Node.js secara native.

**Alternatif:**
- Upgrade ke Hostinger VPS
- Gunakan Vercel (gratis, optimized untuk Next.js)
- Gunakan Railway, Render, atau DigitalOcean

---

## ✅ Status Check

Setelah push, cek status build di:
`https://github.com/YOUR_USERNAME/YOUR_REPO/actions`

Build biasanya selesai dalam 2-5 menit.

## 🔧 Troubleshooting

### Build gagal?
1. Cek log error di Actions tab
2. Pastikan semua secrets sudah di-set
3. Pastikan code tidak ada TypeScript error major

### Mau test lokal setelah download?
```bash
unzip build.zip -d test-build
cd test-build
npm ci --production
npm start
# Buka http://localhost:3000
```
