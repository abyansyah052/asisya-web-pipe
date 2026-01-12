# 📋 ASISYA - Essential Files & Business Process Documentation

Dokumentasi file-file penting yang menjalankan proses bisnis aplikasi psikotes ASISYA.

---

## 🏗️ ARSITEKTUR SISTEM

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ASISYA WEB APP                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  Frontend (Next.js 15)                                                       │
│  ├── /src/app/candidate/*    → Dashboard & Exam untuk kandidat              │
│  ├── /src/app/admin/*        → Panel admin untuk kelola ujian               │
│  ├── /src/app/psychologist/* → Panel psikolog untuk review hasil            │
│  └── /src/app/superadmin/*   → Panel superadmin untuk kelola sistem         │
├─────────────────────────────────────────────────────────────────────────────┤
│  Backend (API Routes)                                                        │
│  ├── /src/app/api/auth/*       → Authentication & Session                   │
│  ├── /src/app/api/candidate/*  → API untuk kandidat                         │
│  ├── /src/app/api/admin/*      → API untuk admin                            │
│  ├── /src/app/api/psychologist/* → API untuk psikolog                       │
│  └── /src/app/api/superadmin/* → API untuk superadmin                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  Database (PostgreSQL/Neon)                                                  │
│  └── Tables: users, exams, questions, options, exam_attempts, exam_answers  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📚 1. UJIAN & SOAL

### Core Exam Files

| File | Fungsi | Deskripsi |
|------|--------|-----------|
| [src/app/candidate/exam/[id]/page.tsx](src/app/candidate/exam/%5Bid%5D/page.tsx) | **Halaman Ujian** | UI utama untuk kandidat mengerjakan ujian. Handle timer, auto-save, dan submit. |
| [src/app/candidate/dashboard/page.tsx](src/app/candidate/dashboard/page.tsx) | **Dashboard Kandidat** | Daftar ujian tersedia, popup instruksi sebelum memulai. |
| [src/app/api/candidate/exam/[id]/questions/route.ts](src/app/api/candidate/exam/%5Bid%5D/questions/route.ts) | **API Load Soal** | Load soal ujian, validasi akses, buat attempt baru. |
| [src/app/api/candidate/exam/[id]/save/route.ts](src/app/api/candidate/exam/%5Bid%5D/save/route.ts) | **API Auto-Save** | Simpan jawaban ke DB setiap 1 detik (throttled). |
| [src/app/api/candidate/exam/[id]/submit/route.ts](src/app/api/candidate/exam/%5Bid%5D/submit/route.ts) | **API Submit** | Submit final, hitung skor, simpan hasil PSS/SRQ. |

### Scoring System

| File | Fungsi | Deskripsi |
|------|--------|-----------|
| [src/lib/scoring/pss.ts](src/lib/scoring/pss.ts) | **PSS Scoring** | Hitung skor 0-40, reverse scoring Q4,5,7,8, kategori Ringan/Sedang/Berat. |
| [src/lib/scoring/srq29.ts](src/lib/scoring/srq29.ts) | **SRQ-29 Scoring** | Hitung 4 kategori (Cemas/Depresi, Zat, Psikotik, PTSD), generate 16 output text. |

---

## 📊 2. HASIL UJIAN & REVIEW

### Result Display Files

| File | Fungsi | Deskripsi |
|------|--------|-----------|
| [src/app/admin/exams/[id]/page.tsx](src/app/admin/exams/%5Bid%5D/page.tsx) | **Daftar Hasil (Admin)** | Tabel hasil ujian, filter, export Excel. |
| [src/app/psychologist/exams/[id]/page.tsx](src/app/psychologist/exams/%5Bid%5D/page.tsx) | **Daftar Hasil (Psikolog)** | Sama seperti admin, filter by assigned candidates. |
| [src/app/admin/exams/[id]/answers/[attemptId]/page.tsx](src/app/admin/exams/%5Bid%5D/answers/%5BattemptId%5D/page.tsx) | **Detail Jawaban** | Detail jawaban per kandidat dengan highlight, summary PSS/SRQ. |
| [src/app/api/admin/exams/[id]/results/route.ts](src/app/api/admin/exams/%5Bid%5D/results/route.ts) | **API Hasil** | Return daftar hasil dengan benar/salah count. |
| [src/app/api/admin/exams/answers/[attemptId]/route.ts](src/app/api/admin/exams/answers/%5BattemptId%5D/route.ts) | **API Detail Jawaban** | Return jawaban individual dengan options. |

---

## 👤 3. USER MANAGEMENT

### Authentication

| File | Fungsi | Deskripsi |
|------|--------|-----------|
| [src/lib/auth.ts](src/lib/auth.ts) | **Auth Helper** | JWT session, encrypt/decrypt, getSession(). |
| [src/app/api/auth/login/route.ts](src/app/api/auth/login/route.ts) | **API Login** | Validasi credentials, set session cookie. |
| [src/app/api/auth/logout/route.ts](src/app/api/auth/logout/route.ts) | **API Logout** | Clear session cookie. |

### Role Management

| File | Fungsi | Deskripsi |
|------|--------|-----------|
| [src/lib/roles.ts](src/lib/roles.ts) | **Role Helper** | Check permissions: canAccessAdminFeatures(), canAccessPsychologistFeatures(). |
| [src/app/superadmin/users/page.tsx](src/app/superadmin/users/page.tsx) | **Kelola Users** | CRUD users, assign roles. |

---

## 🗄️ 4. DATABASE

### Core Tables

```sql
-- Users & Auth
users (id, email, password_hash, role, full_name, is_active)
user_profiles (user_id, full_name, jenis_kelamin, tanggal_lahir)
candidate_codes (id, code, candidate_id, exam_id, is_active)

-- Exams
exams (id, title, duration_minutes, exam_type, instructions, status)
questions (id, exam_id, text, marks)
options (id, question_id, text, is_correct)

-- Results
exam_attempts (id, user_id, exam_id, score, status, pss_result, srq_result)
exam_answers (id, attempt_id, question_id, selected_option_id, answered_at)

-- Assignment
candidate_groups (id, candidate_id, exam_id, assessor_id)
```

### Migration Files

| File | Deskripsi |
|------|-----------|
| [migrations/007_exam_answers.sql](migrations/007_exam_answers.sql) | Tabel exam_answers untuk simpan jawaban |
| [migrations/008_pss_srq_exams.sql](migrations/008_pss_srq_exams.sql) | Kolom pss_result, srq_result di exam_attempts |
| [migrations/009_pss_srq_results.sql](migrations/009_pss_srq_results.sql) | Kolom pss_category, srq_conclusion |

---

## 🔒 5. SECURITY

| File | Fungsi | Deskripsi |
|------|--------|-----------|
| [src/lib/validation.ts](src/lib/validation.ts) | **Input Validation** | Validasi input untuk submit exam, login, dll. |
| [src/lib/ratelimit.ts](src/lib/ratelimit.ts) | **Rate Limiting** | Prevent brute force attacks. |
| [src/lib/cache.ts](src/lib/cache.ts) | **Caching** | Redis cache untuk session dan data. |

---

## 📦 6. EXAM TYPES

### PSS (Perceived Stress Scale)

- **Exam ID:** 9
- **Questions:** 10 soal
- **Options:** 0, 1, 2, 3, 4
- **Reverse Scoring:** Q4, Q5, Q7, Q8
- **Categories:**
  - 0-13: Stres Ringan
  - 14-26: Stres Sedang
  - 27-40: Stres Berat

### SRQ-29 (Self-Reporting Questionnaire)

- **Exam ID:** 10
- **Questions:** 29 soal
- **Options:** Ya / Tidak
- **Categories:**
  - Q1-20 ≥5 Ya → Cemas/Depresi
  - Q21 ≥1 Ya → Penggunaan Zat
  - Q22-24 ≥1 Ya → Psikotik
  - Q25-29 ≥1 Ya → PTSD

### MMPI (TES 1)

- **Exam ID:** 5
- **Questions:** 183 soal
- **Options:** Ya / Tidak
- **Scoring:** Persentase benar

---

## 🔄 7. DATA FLOW

### Exam Taking Flow

```
1. Kandidat login → Dashboard
2. Klik "Mulai Ujian" → Popup instruksi
3. Klik "Mulai" → /candidate/exam/[id]
4. Load soal → GET /api/candidate/exam/[id]/questions
5. Auto-save setiap jawaban → POST /api/candidate/exam/[id]/save
6. Submit ujian → POST /api/candidate/exam/[id]/submit
7. Redirect ke Dashboard
```

### Result Review Flow

```
1. Admin/Psikolog login → Dashboard
2. Pilih ujian → /admin/exams/[id] atau /psychologist/exams/[id]
3. Load hasil → GET /api/admin/exams/[id]/results
4. Klik kandidat → /admin/exams/[id]/answers/[attemptId]
5. Load detail → GET /api/admin/exams/answers/[attemptId]
6. Export Excel → Download file
```

---

## 📝 8. CONFIGURATION

| File | Deskripsi |
|------|-----------|
| [next.config.ts](next.config.ts) | Next.js configuration |
| [tailwind.config.ts](tailwind.config.ts) | Tailwind CSS configuration |
| [tsconfig.json](tsconfig.json) | TypeScript configuration |
| [package.json](package.json) | Dependencies & scripts |

### Environment Variables

```env
DATABASE_URL=postgresql://...
JWT_SECRET=...
NEXT_PUBLIC_API_URL=...
REDIS_URL=... (optional)
```

---

## 🚀 9. DEPLOYMENT

| File | Deskripsi |
|------|-----------|
| [vercel.json](vercel.json) | Vercel deployment config |
| [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md) | Panduan deployment |
| [HOSTINGER_VPS_SETUP.md](HOSTINGER_VPS_SETUP.md) | Setup VPS Hostinger |

---

## 📊 10. SCRIPTS

| File | Deskripsi |
|------|-----------|
| [scripts/check-exam-flow.js](scripts/check-exam-flow.js) | Verify exam business flow |
| [scripts/fix-srq-data.js](scripts/fix-srq-data.js) | Fix SRQ data structure |
| [scripts/calculate-pss-srq.js](scripts/calculate-pss-srq.js) | Test scoring calculation |
| [scripts/migrate-db.sh](scripts/migrate-db.sh) | Run database migrations |

---

## 📋 QUICK REFERENCE

### Role Hierarchy

```
superadmin > admin > psychologist > candidate
```

### API Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (not logged in) |
| 403 | Forbidden (no permission) |
| 404 | Not Found |
| 429 | Too Many Requests (rate limited) |
| 500 | Server Error |

### Key Database Queries

```sql
-- Get exam results with scores
SELECT ea.*, u.full_name 
FROM exam_attempts ea 
JOIN users u ON ea.user_id = u.id 
WHERE ea.exam_id = ? AND ea.status = 'completed';

-- Get answers for attempt
SELECT ea.*, q.text, o.text as answer
FROM exam_answers ea
JOIN questions q ON ea.question_id = q.id
JOIN options o ON ea.selected_option_id = o.id
WHERE ea.attempt_id = ?;
```

---

**Last Updated:** January 13, 2026
