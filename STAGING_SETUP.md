# 🚀 Staging Environment Setup Guide

## Arsitektur Deployment

```
┌─────────────────────────────────────────────────────────────────┐
│                        GitHub Repository                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────┐     Push/PR      ┌─────────────┐              │
│   │   develop   │ ───────────────► │   Vercel    │  STAGING     │
│   │   staging   │                  │  (Preview)  │              │
│   └─────────────┘                  └─────────────┘              │
│                                           │                      │
│                                    staging-asisya.vercel.app     │
│                                                                  │
│   ┌─────────────┐     Push         ┌─────────────┐              │
│   │    main     │ ───────────────► │  Hostinger  │  PRODUCTION  │
│   │             │                  │     VPS     │              │
│   └─────────────┘                  └─────────────┘              │
│                                           │                      │
│                               kfarma.asisyaconsulting.id         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 Step 1: Setup Vercel Project

### 1.1. Buat Akun & Project di Vercel

1. Buka [vercel.com](https://vercel.com) dan sign up dengan GitHub
2. Click **"Add New Project"**
3. Import repository `asisya-web-pipe`
4. **JANGAN deploy dulu**, kita setup manual via CLI

### 1.2. Install Vercel CLI

```bash
npm install -g vercel
```

### 1.3. Link Project

```bash
cd /path/to/asisya-web-pipe
vercel link
```

Ikuti prompt:
- **Set up and deploy?** → No
- **Which scope?** → Pilih team/personal
- **Link to existing project?** → Yes (jika sudah ada) / No (buat baru)
- **Project name?** → `asisya-staging` (atau nama lain)

### 1.4. Dapatkan Credentials

1. Buka [Vercel Dashboard](https://vercel.com/account/tokens)
2. Click **"Create Token"**
3. Name: `github-actions-deploy`
4. Scope: Full Account
5. **Copy token** → simpan untuk GitHub Secrets

Juga catat:
- **VERCEL_ORG_ID**: Settings → General → "Vercel ID"
- **VERCEL_PROJECT_ID**: Project Settings → General → "Project ID"

---

## 📋 Step 2: Setup Staging Database (PostgreSQL)

### Option A: Vercel Postgres (Recommended - Free tier)

1. Di Vercel Dashboard → Project → **Storage** tab
2. Click **"Create Database"** → **Postgres**
3. Name: `asisya-staging-db`
4. Region: `sin1` (Singapore)
5. Copy connection string

### Option B: Neon.tech (Free tier, more generous)

1. Buka [neon.tech](https://neon.tech)
2. Sign up & create project: `asisya-staging`
3. Region: Singapore (closest)
4. Copy connection string:
   ```
   postgres://user:password@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```

### Option C: Supabase (Free tier)

1. Buka [supabase.com](https://supabase.com)
2. Create project: `asisya-staging`
3. Region: Singapore
4. Database → Connection string → Copy URI

### Migrate Schema ke Staging DB

```bash
# Set staging DATABASE_URL
export DATABASE_URL="your-staging-connection-string"

# Run migrations
psql $DATABASE_URL -f migrations/001_role_restructure.sql
psql $DATABASE_URL -f migrations/002_auth_system_update.sql
psql $DATABASE_URL -f migrations/003_question_type.sql
psql $DATABASE_URL -f migrations/004_site_settings.sql
psql $DATABASE_URL -f migrations/005_logo_history.sql
psql $DATABASE_URL -f migrations/006_branding_presets.sql
psql $DATABASE_URL -f migrations/007_exam_answers.sql
```

---

## 📋 Step 3: Setup Staging Redis (Upstash)

1. Buka [upstash.com](https://upstash.com)
2. Create Redis database:
   - Name: `asisya-staging-redis`
   - Region: `ap-southeast-1` (Singapore)
   - Type: Regional
3. Copy credentials:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

---

## 📋 Step 4: Setup GitHub Secrets

Buka repository → **Settings** → **Secrets and variables** → **Actions**

### Secrets untuk Staging (Vercel)

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `VERCEL_TOKEN` | `xxxxxxxxx` | Vercel API Token |
| `VERCEL_ORG_ID` | `team_xxxxxxx` | Vercel Organization ID |
| `VERCEL_PROJECT_ID` | `prj_xxxxxxx` | Vercel Project ID |
| `STAGING_DATABASE_URL` | `postgres://...` | Staging PostgreSQL URL |
| `STAGING_JWT_SECRET` | `your-staging-jwt-secret` | JWT Secret (different from prod!) |
| `STAGING_APP_URL` | `https://asisya-staging.vercel.app` | Staging URL |
| `STAGING_UPSTASH_REDIS_REST_URL` | `https://...upstash.io` | Staging Redis URL |
| `STAGING_UPSTASH_REDIS_REST_TOKEN` | `xxxxxxxxx` | Staging Redis Token |

### Secrets untuk Production (sudah ada)

| Secret Name | Description |
|-------------|-------------|
| `VPS_HOST` | `76.13.17.87` |
| `VPS_USERNAME` | SSH username |
| `VPS_SSH_KEY` | SSH private key |
| `DATABASE_URL` | Production PostgreSQL URL |
| `JWT_SECRET` | Production JWT Secret |
| `NEXT_PUBLIC_APP_URL` | `https://kfarma.asisyaconsulting.id` |
| `EMAIL_USER` | Email untuk nodemailer |
| `EMAIL_PASSWORD` | Email password |
| `UPSTASH_REDIS_REST_URL` | Production Redis URL |
| `UPSTASH_REDIS_REST_TOKEN` | Production Redis Token |

---

## 📋 Step 5: Setup Environment Variables di Vercel

Di Vercel Dashboard → Project → **Settings** → **Environment Variables**

Add semua variable ini untuk **Preview** environment:

```env
DATABASE_URL=postgres://your-staging-db-url
JWT_SECRET=your-staging-jwt-secret-different-from-prod
NEXT_PUBLIC_APP_URL=https://asisya-staging.vercel.app
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
UPSTASH_REDIS_REST_URL=https://your-staging-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-staging-token
```

⚠️ **PENTING**: Pastikan `JWT_SECRET` staging BERBEDA dari production!

---

## 📋 Step 6: Create Staging Branch

```bash
# Dari main branch
git checkout main
git pull origin main

# Buat branch develop/staging
git checkout -b develop
git push -u origin develop

# Atau buat branch staging
git checkout -b staging
git push -u origin staging
```

---

## 📋 Step 7: Workflow Usage

### Automatic Deployment

| Branch | Target | URL |
|--------|--------|-----|
| `main` | Hostinger VPS | https://kfarma.asisyaconsulting.id |
| `develop` | Vercel Preview | https://asisya-staging.vercel.app |
| `staging` | Vercel Preview | https://asisya-staging.vercel.app |

### Manual Deployment

1. Go to **Actions** tab di GitHub
2. Select **"CI/CD Pipeline (Staging & Production)"**
3. Click **"Run workflow"**
4. Choose environment: `staging` atau `production`

### Development Flow

```bash
# 1. Develop feature di branch
git checkout -b feature/new-feature
# ... coding ...

# 2. Push dan buat PR ke develop
git push origin feature/new-feature
# Create PR: feature/new-feature → develop

# 3. Review & Test di staging (auto-deploy ke Vercel)

# 4. Merge ke develop (otomatis deploy ke staging)

# 5. Jika sudah OK, merge develop → main (auto-deploy ke production)
```

---

## 📋 Step 8: Verify Setup

### Test Staging Deployment

```bash
# Push ke develop branch
git checkout develop
echo "# Test" >> TEST.md
git add TEST.md
git commit -m "test: staging deployment"
git push origin develop
```

Check di GitHub Actions → lihat workflow running

### Verify URLs

- **Staging**: https://asisya-staging.vercel.app (atau URL dari Vercel)
- **Production**: https://kfarma.asisyaconsulting.id

---

## 🔧 Troubleshooting

### Vercel Build Error

```bash
# Local test build
vercel build
```

### Database Connection Error

```bash
# Test connection
psql "your-connection-string" -c "SELECT 1"
```

### GitHub Actions Secrets Not Found

1. Double-check secret names (case-sensitive!)
2. Ensure secrets are in **Repository secrets**, bukan Environment secrets
3. Re-create secret jika masih error

---

## 📊 Environment Comparison

| Aspect | Staging (Vercel) | Production (VPS) |
|--------|------------------|------------------|
| **Hosting** | Vercel Serverless | Hostinger VPS |
| **Database** | Neon/Vercel Postgres | PostgreSQL on VPS |
| **Region** | Singapore (sin1) | Singapore |
| **Domain** | *.vercel.app | kfarma.asisyaconsulting.id |
| **SSL** | Auto (Vercel) | Let's Encrypt |
| **Scaling** | Auto | Manual (PM2) |
| **Cost** | Free tier | VPS cost |

---

## 🎯 Best Practices

1. **JANGAN** pernah push langsung ke `main`
2. Selalu test di staging dulu
3. Gunakan PR untuk code review
4. Staging DB harus punya data test, bukan copy production
5. JWT_SECRET harus berbeda antara staging dan production
6. Monitor logs di Vercel Dashboard untuk staging
