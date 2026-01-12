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

## 💻 11. CODE EXAMPLES

### Batch 1: Core Exam Submission

#### src/app/api/candidate/exam/[id]/submit/route.ts
```typescript
// Submit exam with PSS/SRQ scoring
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { attemptId, answers } = await req.json();
    const { id: examId } = await params;
    
    // Get exam type
    const examType = attempt.exam_type || 'general';
    
    if (examType === 'pss') {
        // PSS Scoring
        const pssScoreResult = calculatePSSScore(pssAnswers);
        await client.query(
            `UPDATE exam_attempts 
             SET score = $1, status = 'completed', pss_result = $2, pss_category = $3
             WHERE id = $4`,
            [pssScoreResult.totalScore, JSON.stringify(pssScoreResult), pssScoreResult.levelLabel, attemptId]
        );
    } else if (examType === 'srq29') {
        // SRQ-29 Scoring
        const srqScoreResult = calculateSRQ29Score(srqAnswers);
        srqResult = JSON.stringify({
            answers: srqAnswersObj,
            result: {
                anxiety: srqScoreResult.categories.find(c => c.category === 'cemasDepresi')?.positive,
                substance: srqScoreResult.categories.find(c => c.category === 'penggunaanZat')?.positive,
                psychotic: srqScoreResult.categories.find(c => c.category === 'psikotik')?.positive,
                ptsd: srqScoreResult.categories.find(c => c.category === 'ptsd')?.positive,
                conclusion: getSRQConclusion(srqScoreResult),
                resultText: srqScoreResult.outputText
            },
            type: 'srq29'
        });
    }
    
    return NextResponse.json({ success: true, score: finalScore });
}
```

#### src/lib/scoring/pss.ts
```typescript
// PSS Scoring with reverse scoring for Q4,5,7,8
export function calculatePSSScore(answers: number[]): PSSResult {
    const REVERSE_QUESTIONS = [3, 4, 6, 7]; // 0-indexed: Q4,5,7,8
    
    let rawScore = 0;
    answers.forEach((answer, idx) => {
        if (REVERSE_QUESTIONS.includes(idx)) {
            rawScore += (4 - answer); // Reverse: 0→4, 1→3, 2→2, 3→1, 4→0
        } else {
            rawScore += answer;
        }
    });
    
    // Categorize
    let level: 'ringan' | 'sedang' | 'berat';
    let levelLabel: string;
    if (rawScore >= 1 && rawScore <= 13) {
        level = 'ringan';
        levelLabel = 'Stress Ringan';
    } else if (rawScore >= 14 && rawScore <= 26) {
        level = 'sedang';
        levelLabel = 'Stress Sedang';
    } else {
        level = 'berat';
        levelLabel = 'Stress Berat';
    }
    
    return { rawScore, totalScore: rawScore, level, levelLabel };
}
```

#### src/lib/scoring/srq29.ts
```typescript
// SRQ-29 with 16 output templates
export function calculateSRQ29Score(answers: number[]): SRQ29Result {
    // Calculate each category
    const cemasDepresiScore = answers.slice(0, 20).reduce((sum, a) => sum + a, 0);
    const cemasDepresiPositive = cemasDepresiScore >= 5;
    
    const zatScore = answers[20]; // Q21
    const zatPositive = zatScore >= 1;
    
    const psikotikScore = answers.slice(21, 24).reduce((sum, a) => sum + a, 0); // Q22-24
    const psikotikPositive = psikotikScore >= 1;
    
    const ptsdScore = answers.slice(24, 29).reduce((sum, a) => sum + a, 0); // Q25-29
    const ptsdPositive = ptsdScore >= 1;
    
    // Get output text from 16 templates
    const outputText = getOutputText(cemasDepresiPositive, zatPositive, psikotikPositive, ptsdPositive);
    
    return {
        totalScore: answers.reduce((sum, a) => sum + a, 0),
        categories: [
            { category: 'cemasDepresi', score: cemasDepresiScore, threshold: 5, positive: cemasDepresiPositive },
            { category: 'penggunaanZat', score: zatScore, threshold: 1, positive: zatPositive },
            { category: 'psikotik', score: psikotikScore, threshold: 1, positive: psikotikPositive },
            { category: 'ptsd', score: ptsdScore, threshold: 1, positive: ptsdPositive }
        ],
        overallStatus: (cemasDepresiPositive || zatPositive || psikotikPositive || ptsdPositive) ? 'abnormal' : 'normal',
        outputText
    };
}
```

---

### Batch 2: Authentication & Session

#### src/lib/auth.ts
```typescript
// JWT Session Management
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export interface SessionData {
  id: number;
  role: UserRole | string;
  username: string;
  profileCompleted?: boolean;
  organizationId?: number;
}

// Encrypt session to JWT (8 hours expiry)
export async function encrypt(payload: SessionData): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(JWT_SECRET);
}

// Decrypt JWT token
export async function decrypt(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      id: payload.id as number,
      role: payload.role as string,
      username: payload.username as string,
      profileCompleted: payload.profileCompleted as boolean | undefined
    };
  } catch {
    return null;
  }
}

// Get session from cookie
export async function getSession(cookieValue?: string): Promise<SessionData | null> {
  if (!cookieValue) return null;
  return await decrypt(cookieValue);
}
```

#### src/app/api/auth/login/route.ts
```typescript
// Login API with bcrypt password verification
export async function POST(req: Request) {
    const { username, password } = await req.json();
    
    // Get user from DB
    const user = await pool.query(
        'SELECT id, username, password_hash, role, full_name FROM users WHERE username = $1',
        [username]
    );
    
    if (user.rows.length === 0) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    
    // Verify password with bcrypt
    const isValid = await bcrypt.compare(password, user.rows[0].password_hash);
    if (!isValid) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    
    // Create JWT session
    const sessionData: SessionData = {
        id: user.rows[0].id,
        role: user.rows[0].role,
        username: user.rows[0].username
    };
    
    const token = await encrypt(sessionData);
    
    // Set secure cookie
    const cookieStore = await cookies();
    cookieStore.set('user_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 8 // 8 hours
    });
    
    return NextResponse.json({ 
        success: true, 
        redirect: getLoginRedirect(user.rows[0].role) 
    });
}
```

#### src/lib/roles.ts
```typescript
// Role-based access control
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  PSYCHOLOGIST: 'psychologist',
  CANDIDATE: 'candidate'
} as const;

export function canAccessAdminFeatures(role: string): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;
}

export function canAccessPsychologistFeatures(role: string): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN || role === ROLES.PSYCHOLOGIST;
}

export function getLoginRedirect(role: string): string {
  switch (role) {
    case ROLES.SUPER_ADMIN: return '/superadmin/dashboard';
    case ROLES.ADMIN: return '/admin/dashboard';
    case ROLES.PSYCHOLOGIST: return '/psychologist/dashboard';
    case ROLES.CANDIDATE: return '/candidate/dashboard';
    default: return '/';
  }
}
```

---

### Batch 3: Exam Taking Flow

#### src/app/candidate/exam/[id]/page.tsx
```typescript
// Auto-save with 1 second throttle
const saveAnswersToServer = useCallback(async (currentAnswers: { [key: number]: number }) => {
    if (!examId || !attemptId || isSavingRef.current) return;
    
    isSavingRef.current = true;
    try {
        const res = await fetch(`/api/candidate/exam/${examId}/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ attemptId, answers: currentAnswers })
        });
        if (res.ok) {
            lastSavedRef.current = JSON.stringify(currentAnswers);
            console.log('Answers saved to server');
        }
    } catch (e) {
        console.error('Failed to save answers:', e);
    } finally {
        isSavingRef.current = false;
    }
    // Backup to localStorage
    localStorage.setItem(`exam_${examId}_${attemptId}`, JSON.stringify(currentAnswers));
}, [examId, attemptId]);

// Save after 1 second delay (throttle)
useEffect(() => {
    if (!examId || !attemptId) return;
    
    const timer = setTimeout(() => {
        saveAnswersToServer(answers);
    }, 1000);
    
    return () => clearTimeout(timer);
}, [answers, examId, attemptId, saveAnswersToServer]);

// Save before page unload (refresh/close)
useEffect(() => {
    const handleBeforeUnload = () => {
        if (examId && attemptId && Object.keys(answers).length > 0) {
            // sendBeacon for reliable save
            navigator.sendBeacon(
                `/api/candidate/exam/${examId}/save`, 
                JSON.stringify({ attemptId, answers })
            );
        }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [examId, attemptId, answers]);
```

#### src/app/api/candidate/exam/[id]/save/route.ts
```typescript
// Auto-save API with bulk insert
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { attemptId, answers } = await req.json();
    const { id: examId } = await params;
    
    // Verify attempt ownership and time limit
    const attemptRes = await client.query(
        `SELECT ea.id, ea.start_time, e.duration_minutes 
         FROM exam_attempts ea JOIN exams e ON ea.exam_id = e.id
         WHERE ea.id = $1 AND ea.user_id = $2 AND ea.status = 'in_progress'`,
        [attemptId, user.id]
    );
    
    if (attemptRes.rows.length === 0) {
        return NextResponse.json({ error: 'Invalid attempt' }, { status: 403 });
    }
    
    // Bulk insert/update
    const questionIds = Object.keys(answers).map(Number);
    const insertValues: string[] = [];
    const insertParams: (number | string)[] = [attemptId];
    
    questionIds.forEach((qId, index) => {
        const paramOffset = index * 2 + 2;
        insertValues.push(`($1, $${paramOffset}, $${paramOffset + 1})`);
        insertParams.push(qId, answers[qId]);
    });
    
    if (insertValues.length > 0) {
        await client.query(`
            INSERT INTO exam_answers (attempt_id, question_id, selected_option_id)
            VALUES ${insertValues.join(', ')}
            ON CONFLICT (attempt_id, question_id)
            DO UPDATE SET selected_option_id = EXCLUDED.selected_option_id, answered_at = NOW()
        `, insertParams);
    }
    
    return NextResponse.json({ success: true, savedCount: questionIds.length });
}
```

#### src/app/api/candidate/exam/[id]/questions/route.ts
```typescript
// Load exam questions with access validation
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id: examId } = await params;
    
    // Validate access
    const accessCheck = await client.query(`
        SELECT 1 FROM candidate_codes cc
        WHERE cc.candidate_id = $1 AND (cc.exam_id = $2 OR cc.exam_id IS NULL)
        UNION
        SELECT 1 FROM exam_attempts ea WHERE ea.user_id = $1 AND ea.exam_id = $2
        LIMIT 1
    `, [user.id, examId]);
    
    if (accessCheck.rows.length === 0) {
        return NextResponse.json({ error: 'No access' }, { status: 403 });
    }
    
    // Check existing attempt
    const attemptRes = await client.query(
        'SELECT id, status, start_time FROM exam_attempts WHERE user_id = $1 AND exam_id = $2 ORDER BY created_at DESC LIMIT 1',
        [user.id, examId]
    );
    
    let attemptId: number;
    let startTime: Date;
    
    if (attemptRes.rows.length > 0 && attemptRes.rows[0].status === 'completed') {
        return NextResponse.json({ error: 'Already completed' }, { status: 403 });
    }
    
    if (attemptRes.rows.length > 0) {
        // Continue existing
        attemptId = attemptRes.rows[0].id;
        startTime = new Date(attemptRes.rows[0].start_time);
    } else {
        // Create new attempt
        const newAttempt = await client.query(
            'INSERT INTO exam_attempts (user_id, exam_id, start_time, status) VALUES ($1, $2, NOW(), $3) RETURNING id, start_time',
            [user.id, examId, 'in_progress']
        );
        attemptId = newAttempt.rows[0].id;
        startTime = new Date(newAttempt.rows[0].start_time);
    }
    
    // Calculate remaining time
    const elapsedSeconds = Math.floor((Date.now() - startTime.getTime()) / 1000);
    const remainingSeconds = Math.max(0, (exam.duration_minutes * 60) - elapsedSeconds);
    
    // Load questions with options
    const questions = await client.query(`
        SELECT q.id, q.text, 
               json_agg(json_build_object('id', o.id, 'text', o.text) ORDER BY o.id) as options
        FROM questions q
        LEFT JOIN options o ON o.question_id = q.id
        WHERE q.exam_id = $1
        GROUP BY q.id ORDER BY q.id
    `, [examId]);
    
    // Load saved answers
    const savedAnswers = await client.query(
        'SELECT question_id, selected_option_id FROM exam_answers WHERE attempt_id = $1',
        [attemptId]
    );
    
    return NextResponse.json({
        exam: { title: exam.title, duration: exam.duration_minutes, exam_type: exam.exam_type },
        attemptId,
        questions: questions.rows,
        remainingSeconds,
        savedAnswers: Object.fromEntries(savedAnswers.rows.map(r => [r.question_id, r.selected_option_id]))
    });
}
```

---

### Batch 4: Result Display & Export

#### src/app/admin/exams/[id]/page.tsx
```typescript
// Excel download with filter options
const handleDownload = async (downloadType: 'all' | 'assigned' | 'selected') => {
    setDownloading(true);
    try {
        let url = `/api/admin/exams/${examId}/results/export?downloadType=${downloadType}`;
        
        // Add filter if selected
        if (downloadType === 'selected' && selectedAdminId !== null) {
            url += `&adminId=${selectedAdminId}`;
        }
        
        const response = await fetch(url);
        
        if (response.ok) {
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `hasil_ujian_${exam?.title}_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);
        }
    } catch (error) {
        console.error('Download error:', error);
        alert('Terjadi kesalahan saat mengunduh');
    } finally {
        setDownloading(false);
    }
};

// Display results table with filter
const displayedResults = useMemo(() => {
    let filtered = results;
    
    // Filter by psychologist assignment
    if (isAssignedOnly) {
        filtered = filtered.filter(r => assignedCandidates.includes(r.user_id));
    }
    
    // Filter by selected admin
    if (selectedAdminId !== null) {
        const adminCandidates = adminAssignments[selectedAdminId] || [];
        filtered = filtered.filter(r => adminCandidates.includes(r.user_id));
    }
    
    // Search filter
    if (searchTerm) {
        filtered = filtered.filter(r => 
            r.student.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    
    return filtered;
}, [results, isAssignedOnly, assignedCandidates, selectedAdminId, adminAssignments, searchTerm]);
```

#### src/app/api/admin/exams/[id]/results/route.ts
```typescript
// Aggregate results with candidate_groups assignment
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id: examId } = await params;
    const { searchParams } = new URL(req.url);
    const showAll = searchParams.get('showAll') === 'true';
    const includeInProgress = searchParams.get('includeInProgress') === 'true';
    
    const session = await getSession(sessionCookie?.value);
    
    if (!session || !canAccessPsychologistFeatures(session.role)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check psychologist assignment to candidates
    let assignedCandidates: number[] = [];
    let isAssignedOnly = false;
    
    if (session.role === 'psychologist') {
        const assignmentRes = await pool.query(
            'SELECT ARRAY_AGG(candidate_id) as candidate_ids FROM candidate_groups WHERE exam_id = $1 AND assessor_id = $2',
            [examId, session.id]
        );
        
        if (assignmentRes.rows.length > 0 && assignmentRes.rows[0].candidate_ids) {
            assignedCandidates = assignmentRes.rows[0].candidate_ids || [];
            isAssignedOnly = true;
        }
    }
    
    // Get attempts with full_name from user_profiles
    const statusFilter = includeInProgress ? "AND ea.status IN ('completed', 'in_progress')" : "AND ea.status = 'completed'";
    
    const attemptsQuery = `
        SELECT DISTINCT ON (ea.user_id)
            ea.id, 
            ea.user_id,
            COALESCE(up.full_name, u.full_name, u.username) as student, 
            ea.score, 
            ea.end_time,
            ea.status as attempt_status,
            ea.start_time,
            up.jenis_kelamin as gender,
            ea.pss_category,
            ea.srq_conclusion
        FROM exam_attempts ea
        JOIN users u ON ea.user_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        WHERE ea.exam_id = $1 ${statusFilter}
        ORDER BY ea.user_id, ea.end_time DESC NULLS LAST
    `;
    
    const attemptsRes = await client.query(attemptsQuery, [examId]);
    
    // Batch query for correct/incorrect counts (MMPI only)
    let correctCountMap = new Map<number, { correct: number; incorrect: number }>();
    
    if (exam.exam_type !== 'pss' && exam.exam_type !== 'srq29' && attemptsRes.rows.length > 0) {
        const attemptIds = attemptsRes.rows.map((r: any) => r.id);
        
        const countsRes = await client.query(`
            SELECT ea.id as attempt_id,
                   COUNT(CASE WHEN o.is_correct THEN 1 END) as correct_count,
                   COUNT(CASE WHEN NOT o.is_correct THEN 1 END) as incorrect_count
            FROM exam_answers ea
            JOIN options o ON ea.selected_option_id = o.id
            WHERE ea.attempt_id = ANY($1::int[])
            GROUP BY ea.id
        `, [attemptIds]);
        
        countsRes.rows.forEach((row: any) => {
            correctCountMap.set(row.attempt_id, {
                correct: parseInt(row.correct_count),
                incorrect: parseInt(row.incorrect_count)
            });
        });
    }
    
    return NextResponse.json({
        exam: examRes.rows[0],
        results: attemptsRes.rows.map((r: any) => ({
            ...r,
            ...correctCountMap.get(r.id)
        })),
        isAssignedOnly,
        assignedCandidates
    });
}
```

---

### Batch 5: Database Schema & Validation

#### Database Schema (Key Tables)
```sql
-- Core exam structure
CREATE TABLE exams (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL,
    exam_type VARCHAR(50) DEFAULT 'general',  -- 'general', 'pss', 'srq29'
    passing_score INTEGER,
    created_by INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    question_type VARCHAR(20) DEFAULT 'multiple_choice',  -- 'multiple_choice', 'scale'
    scale_min INTEGER DEFAULT 1,
    scale_max INTEGER DEFAULT 5,
    scale_min_label VARCHAR(100),
    scale_max_label VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE options (
    id SERIAL PRIMARY KEY,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT false,
    score_value INTEGER DEFAULT 0,  -- For PSS/SRQ scoring
    created_at TIMESTAMP DEFAULT NOW()
);

-- Attempt tracking
CREATE TABLE exam_attempts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    score NUMERIC(5,2),
    status VARCHAR(20) DEFAULT 'in_progress',  -- 'in_progress', 'completed'
    pss_category VARCHAR(50),  -- For PSS results
    srq_conclusion TEXT,       -- For SRQ results
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE exam_answers (
    id SERIAL PRIMARY KEY,
    attempt_id INTEGER REFERENCES exam_attempts(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    selected_option_id INTEGER REFERENCES options(id),
    answered_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(attempt_id, question_id)  -- One answer per question
);

-- Candidate grouping and access control
CREATE TABLE candidate_groups (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    assessor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(candidate_id, exam_id)
);

CREATE TABLE candidate_codes (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(50) UNIQUE NOT NULL,
    exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,  -- NULL = all exams
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_exam ON exam_attempts(user_id, exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_status ON exam_attempts(status);
CREATE INDEX IF NOT EXISTS idx_exam_answers_attempt ON exam_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_candidate_groups_assessor ON candidate_groups(assessor_id, exam_id);
```

#### migrations/003_question_type.sql
```sql
-- Add support for scale questions (PSS)
ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_type VARCHAR(20) DEFAULT 'multiple_choice';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS scale_min_label VARCHAR(100);
ALTER TABLE questions ADD COLUMN IF NOT EXISTS scale_max_label VARCHAR(100);
ALTER TABLE questions ADD COLUMN IF NOT EXISTS scale_min INTEGER DEFAULT 1;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS scale_max INTEGER DEFAULT 5;

-- Ensure existing questions have explicit type
UPDATE questions SET question_type = 'multiple_choice' WHERE question_type IS NULL;
```

#### src/lib/validation.ts
```typescript
// Manual validation (no external dependencies)
export interface ValidationResult<T> {
    success: boolean;
    data?: T;
    error?: string;
}

// XSS Prevention
export function sanitizeString(input: string, maxLength: number = 255): string {
    return input
        .trim()
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/[<>'"&]/g, (char) => {
            const entities: Record<string, string> = {
                '<': '&lt;', '>': '&gt;', "'": '&#39;',
                '"': '&quot;', '&': '&amp;'
            };
            return entities[char] || char;
        })
        .slice(0, maxLength);
}

// Positive integer validation
function isPositiveInt(val: unknown): boolean {
    return typeof val === 'number' && Number.isInteger(val) && val > 0;
}

// Exam submission validation
export function validateExamSubmission(data: unknown): ValidationResult<{
    examId: number;
    attemptId: number;
    answers: { [key: number]: number };
}> {
    if (!data || typeof data !== 'object') {
        return { success: false, error: 'Invalid data format' };
    }
    
    const { examId, attemptId, answers } = data as any;
    
    if (!isPositiveInt(examId)) {
        return { success: false, error: 'Invalid exam ID' };
    }
    
    if (!isPositiveInt(attemptId)) {
        return { success: false, error: 'Invalid attempt ID' };
    }
    
    if (!answers || typeof answers !== 'object') {
        return { success: false, error: 'Invalid answers format' };
    }
    
    // Validate answer structure
    for (const [qId, optId] of Object.entries(answers)) {
        if (!isPositiveInt(Number(qId)) || !isPositiveInt(Number(optId))) {
            return { success: false, error: 'Invalid answer data' };
        }
    }
    
    return {
        success: true,
        data: {
            examId: Number(examId),
            attemptId: Number(attemptId),
            answers: Object.fromEntries(
                Object.entries(answers).map(([k, v]) => [Number(k), Number(v)])
            )
        }
    };
}
```

---

**Last Updated:** January 13, 2026



