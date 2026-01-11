# Sistem Kandidat & Psikolog - Dokumentasi Lengkap

## Overview
Dokumentasi ini berisi semua file dan code yang berhubungan dengan sistem kandidat (peserta ujian) dan psikolog dalam platform Asisya Web.

---

## 1. STRUKTUR FILE

### Frontend Pages - Kandidat
```
src/app/candidate/
├── dashboard/page.tsx        # Dashboard utama kandidat
├── exam/[id]/page.tsx        # Halaman mengerjakan ujian
└── profile-completion/page.tsx # Lengkapi profil kandidat
```

### Frontend Pages - Psikolog
```
src/app/psychologist/
├── dashboard/page.tsx        # Dashboard utama psikolog
├── candidates/page.tsx       # List semua kandidat
├── codes/page.tsx            # Kelola kode akses
└── exams/[id]/
    ├── page.tsx              # Lihat hasil ujian per exam
    └── answers/[attemptId]/page.tsx # Detail jawaban kandidat
```

### Backend API - Kandidat
```
src/app/api/candidate/
├── dashboard/route.ts        # GET dashboard data
├── profile-completion/route.ts # POST/GET profil
└── exam/[id]/
    ├── questions/route.ts    # GET soal ujian
    ├── save/route.ts         # POST simpan jawaban
    └── submit/route.ts       # POST submit ujian
```

### Backend API - Psikolog
```
src/app/api/psychologist/
├── candidates/
│   ├── route.ts              # GET list kandidat
│   └── count/route.ts        # GET jumlah kandidat
├── codes/
│   ├── route.ts              # GET/list kode akses
│   ├── [id]/route.ts         # PUT/DELETE kode
│   └── generate/route.ts     # POST generate kode baru
└── exams/
    ├── route.ts              # GET list ujian
    ├── upload/route.ts       # POST upload soal
    ├── delete/route.ts       # DELETE ujian
    └── send-verification/route.ts # POST kirim verifikasi
```

### Backend API - Admin (terkait kandidat)
```
src/app/api/admin/
├── codes/
│   ├── route.ts              # GET list kode
│   ├── [id]/route.ts         # PUT/DELETE kode
│   ├── generate/route.ts     # POST generate kode
│   └── import/route.ts       # POST bulk import
├── candidates/
│   └── [id]/route.ts         # GET/PUT kandidat detail
├── exams/
│   └── [id]/
│       ├── results/route.ts  # GET hasil ujian
│       └── download/route.ts # GET download Excel
└── grouping/
    ├── candidates/route.ts   # GET kandidat untuk grouping
    ├── exams/route.ts        # GET ujian untuk grouping
    └── save/route.ts         # POST simpan pembagian
```

### Backend API - Superadmin (terkait kode peserta)
```
src/app/api/superadmin/
├── company-codes/
│   ├── route.ts              # GET/POST company codes
│   └── [id]/route.ts         # PUT/DELETE company code
└── grouping/
    ├── [examId]/route.ts     # GET grouping per exam
    └── save/route.ts         # POST simpan grouping
```

---

## 2. DATABASE SCHEMA

### Tabel: users (Kandidat)
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,  -- Kode akses jadi username
    email VARCHAR(255),
    password_hash VARCHAR(255),
    full_name VARCHAR(255),
    role VARCHAR(20) DEFAULT 'candidate',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_username ON users(username);
```

### Tabel: user_profiles (Detail Kandidat)
```sql
CREATE TABLE user_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    nomor_peserta VARCHAR(50),              -- Kode peserta
    jenis_kelamin VARCHAR(20),              -- L/P
    tanggal_lahir DATE,
    usia INTEGER,
    pendidikan_terakhir VARCHAR(100),
    pekerjaan VARCHAR(255),
    lokasi_test VARCHAR(255),               -- Institusi/lokasi
    alamat_ktp TEXT,
    nik VARCHAR(20),
    marital_status VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Index
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
```

### Tabel: candidate_codes (Kode Akses Peserta)
```sql
CREATE TABLE candidate_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,       -- Kode akses (format baru: MMYY-XXXX-NNNN)
    candidate_id INTEGER REFERENCES users(id), -- User yang pakai kode ini
    exam_id INTEGER REFERENCES exams(id),   -- Ujian spesifik (opsional)
    created_by INTEGER REFERENCES users(id), -- Admin yang buat
    admin_id INTEGER,                        -- Organization ID
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    used_at TIMESTAMP,                       -- Kapan dipakai
    metadata JSONB DEFAULT '{}',            -- { candidate_name: string }
    company_code_id INTEGER REFERENCES company_codes(id), -- Referensi kode perusahaan
    exam_type_code VARCHAR(2),              -- Kode tipe ujian (10,20,30,40)
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_candidate_codes_code ON candidate_codes(code);
CREATE INDEX idx_candidate_codes_candidate ON candidate_codes(candidate_id);
CREATE INDEX idx_candidate_codes_exam ON candidate_codes(exam_id);
CREATE INDEX idx_candidate_codes_active ON candidate_codes(is_active);
CREATE INDEX idx_candidate_codes_expires ON candidate_codes(expires_at);
CREATE INDEX idx_candidate_codes_pattern ON candidate_codes(code varchar_pattern_ops);
CREATE INDEX idx_candidate_codes_company ON candidate_codes(company_code_id);
CREATE INDEX idx_candidate_codes_exam_type ON candidate_codes(exam_type_code);
```

### Tabel: company_codes (Kode Perusahaan - Superadmin)
```sql
CREATE TABLE company_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(4) NOT NULL UNIQUE,        -- Kode 4 digit (TTCC) - Type+Company
    company_name VARCHAR(255) NOT NULL,     -- Nama perusahaan
    organization_id INTEGER REFERENCES organizations(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Note: Kode format adalah TTCC dimana:
-- TT = Tipe ujian (ditentukan superadmin)
-- CC = Kode internal perusahaan (ditentukan superadmin)
-- Contoh: "2010" = PSS untuk perusahaan kode 10
```

### Tabel: exam_attempts (Percobaan Ujian)
```sql
CREATE TABLE exam_attempts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
    start_time TIMESTAMP DEFAULT NOW(),
    end_time TIMESTAMP,
    score DECIMAL(5,2),
    status VARCHAR(20) DEFAULT 'in_progress', -- in_progress, completed, abandoned
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, exam_id)
);

-- Indexes
CREATE INDEX idx_exam_attempts_user ON exam_attempts(user_id);
CREATE INDEX idx_exam_attempts_exam ON exam_attempts(exam_id);
CREATE INDEX idx_exam_attempts_status ON exam_attempts(status);
```

### Tabel: answers (Jawaban Kandidat)
```sql
CREATE TABLE answers (
    id SERIAL PRIMARY KEY,
    attempt_id INTEGER REFERENCES exam_attempts(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    selected_option_id INTEGER REFERENCES options(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(attempt_id, question_id)
);

-- Index
CREATE INDEX idx_answers_attempt ON answers(attempt_id);
CREATE INDEX idx_answers_question ON answers(question_id);
```

### Tabel: candidate_groups (Pembagian Psikolog)
```sql
CREATE TABLE candidate_groups (
    id SERIAL PRIMARY KEY,
    exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
    assessor_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- Psikolog
    candidate_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- Kandidat
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(exam_id, assessor_id, candidate_id)
);

-- Indexes
CREATE INDEX idx_candidate_groups_exam ON candidate_groups(exam_id);
CREATE INDEX idx_candidate_groups_assessor ON candidate_groups(assessor_id);
CREATE INDEX idx_candidate_groups_candidate ON candidate_groups(candidate_id);
```

---

## 3. API ENDPOINTS DETAIL

### Kandidat Dashboard
**GET /api/candidate/dashboard**
```typescript
// Response
{
    user: { id, username, email, full_name },
    inProgress: { attempt_id, exam_id, title } | null,
    completed: [{ attempt_id, title, date, score }],
    todo: [{ id, title, description, duration_minutes }]
}
```

### Kandidat Ujian
**GET /api/candidate/exam/[id]/questions**
```typescript
// Response
{
    exam: { id, title, duration_minutes },
    questions: [{ id, text, options: [{ id, text }] }],
    attempt_id: number,
    saved_answers: { [question_id]: option_id }
}
```

**POST /api/candidate/exam/[id]/save**
```typescript
// Request
{ question_id: number, option_id: number }

// Response
{ success: true }
```

**POST /api/candidate/exam/[id]/submit**
```typescript
// Request
{ answers: { [question_id]: option_id } }

// Response
{ success: true, score: number }
```

### Psikolog Candidates
**GET /api/psychologist/candidates**
```typescript
// Response
[{
    id: number,
    full_name: string,
    email: string,
    created_at: string,
    exam_count: number,
    completed_count: number,
    last_exam_date: string
}]
```

### Generate Kode Akses
**POST /api/admin/codes/generate**
```typescript
// Request
{
    count: number,            // 1-100 (generate), 1-3000 (import)
    examId?: number,          // Ujian spesifik (opsional)
    expiresInDays: number,    // Default 7
    candidateName?: string,   // Jika count = 1
    companyCodeId: number,    // ID dari company_codes
    useLegacyFormat?: boolean // Default false
}

// Response
{
    success: true,
    codes: ["0126-2010-0001", "0126-2010-0002", ...],
    expiresAt: "2026-01-18T00:00:00Z",
    format: "new",
    companyCode: "2010"
}
```

### Superadmin Company Codes
**GET /api/superadmin/company-codes**
```typescript
// Response
[{
    id: number,
    code: string,           // "2010" (TTCC)
    company_name: string,
    organization_id: number | null,
    is_active: boolean,
    usage_count: number
}]
```

**POST /api/superadmin/company-codes**
```typescript
// Request
{
    code: string,           // 4 digit TTCC
    companyName: string,
    organizationId?: number
}

// Response
{ success: true, companyCode: { id, code, company_name } }
```

---

## 4. KODE AKSES FORMAT

### Format Baru: MMYY-XXXX-NNNN (14 karakter)
```
MMYY-XXXX-NNNN
│ │   │     │
│ │   │     └── Nomor urut (0001-9999)
│ │   └──────── Kode internal (dari company_codes, diatur superadmin)
│ └──────────── Tahun (2 digit terakhir)
└────────────── Bulan (01-12)

Contoh: 0126-2010-0001
- 01 = Januari
- 26 = 2026
- 2010 = Kode internal perusahaan (ditentukan superadmin)
- 0001 = Nomor urut pertama
```

### Format Legacy: 16 karakter random
```
ABCD1234EFGH5678
```

### Company Codes (Superadmin)
Superadmin menentukan kombinasi 4 digit XXXX:
- Bisa berdasarkan tipe ujian + perusahaan
- Bisa bebas sesuai kebutuhan internal
- Contoh: "2010", "1005", "4020", dll

---

## 5. CODE - GENERATE KODE AKSES

### src/app/api/admin/codes/generate/route.ts
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessAdminFeatures } from '@/lib/roles';

// Generate new 12-digit code format: MMYY-XXXX-NNNN
async function generateNewFormatCode(
    client: any,
    companyCode: string  // 4-digit dari company_codes
): Promise<{ code: string; nextNum: number }> {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    
    const prefix = `${month}${year}-${companyCode}-`;
    
    // Get max number for this prefix dengan FOR UPDATE untuk prevent race condition
    const result = await client.query(`
        SELECT code FROM candidate_codes 
        WHERE code LIKE $1 
        AND LENGTH(code) = 14
        ORDER BY code DESC
        LIMIT 1
        FOR UPDATE
    `, [prefix + '%']);
    
    let nextNum = 1;
    if (result.rows.length > 0) {
        const lastCode = result.rows[0].code;
        const lastNumStr = lastCode.slice(-4);
        nextNum = parseInt(lastNumStr, 10) + 1;
    }
    
    const code = `${prefix}${String(nextNum).padStart(4, '0')}`;
    return { code, nextNum };
}

// Legacy: Generate random code - 16 alphanumeric characters
function generateLegacyCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 16; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

export async function POST(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !canAccessAdminFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            count = 1, 
            examId, 
            expiresInDays = 7, 
            candidateName,
            companyCodeId,
            useLegacyFormat = false
        } = await req.json();

        // Validasi count
        if (count < 1 || count > 100) {
            return NextResponse.json({ error: 'Jumlah kode harus antara 1-100' }, { status: 400 });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            const codes: string[] = [];
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + expiresInDays);

            // Get company code (4-digit XXXX)
            let companyCode = '0000';
            let companyCodeIdToUse = null;
            
            if (!useLegacyFormat && companyCodeId) {
                const companyResult = await client.query(
                    'SELECT id, code FROM company_codes WHERE id = $1 AND is_active = TRUE',
                    [companyCodeId]
                );
                if (companyResult.rows.length > 0) {
                    companyCode = companyResult.rows[0].code;
                    companyCodeIdToUse = companyResult.rows[0].id;
                }
            }

            // Generate codes
            for (let i = 0; i < count; i++) {
                let code: string;
                
                if (useLegacyFormat) {
                    // Legacy format dengan collision check
                    let isUnique = false;
                    while (!isUnique) {
                        code = generateLegacyCode();
                        const existing = await client.query(
                            'SELECT id FROM candidate_codes WHERE code = $1',
                            [code]
                        );
                        isUnique = existing.rows.length === 0;
                    }
                } else {
                    // New format - sequential
                    const generated = await generateNewFormatCode(client, companyCode);
                    code = generated.code;
                }

                // Insert
                const metadata = candidateName && count === 1
                    ? JSON.stringify({ name: candidateName })
                    : '{}';

                await client.query(
                    `INSERT INTO candidate_codes 
                     (code, created_by, admin_id, exam_id, expires_at, metadata, company_code_id)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [
                        code,
                        session.id,
                        session.organizationId || null,
                        examId || null,
                        expiresAt.toISOString(),
                        metadata,
                        companyCodeIdToUse
                    ]
                );

                codes.push(code);
            }

            await client.query('COMMIT');

            return NextResponse.json({
                success: true,
                codes,
                expiresAt: expiresAt.toISOString(),
                format: useLegacyFormat ? 'legacy' : 'new',
                companyCode: useLegacyFormat ? null : companyCode
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error generating codes:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
```

---

## 6. CODE - IMPORT BULK KANDIDAT

### src/app/api/admin/codes/import/route.ts
```typescript
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';
import { canAccessAdminFeatures } from '@/lib/roles';

const MAX_IMPORT = 3000; // Rate limit

// Generate random code - 16 characters
function generateCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 16; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export async function POST(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const user = await getSession(sessionCookie?.value);

        if (!user || !canAccessAdminFeatures(user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { candidates, examId, expiresInDays, companyCodeId } = await req.json();

        // Validasi
        if (!candidates || !Array.isArray(candidates)) {
            return NextResponse.json({ error: 'Data kandidat diperlukan' }, { status: 400 });
        }

        // Rate limiting - max 3000
        if (candidates.length > MAX_IMPORT) {
            return NextResponse.json({ 
                error: `Maksimal ${MAX_IMPORT} kandidat per import` 
            }, { status: 400 });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Get company code if provided
            let companyCode = '0000';
            let companyCodeIdToUse = null;
            
            if (companyCodeId) {
                const companyResult = await client.query(
                    'SELECT id, code FROM company_codes WHERE id = $1 AND is_active = TRUE',
                    [companyCodeId]
                );
                if (companyResult.rows.length > 0) {
                    companyCode = companyResult.rows[0].code;
                    companyCodeIdToUse = companyResult.rows[0].id;
                }
            }

            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + (expiresInDays || 7));

            // Bulk insert dengan VALUES
            const values: any[] = [];
            const placeholders: string[] = [];
            let paramIndex = 1;

            // Get starting sequence number
            const now = new Date();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const year = String(now.getFullYear()).slice(-2);
            const prefix = `${month}${year}-${companyCode}-`;

            const seqResult = await client.query(`
                SELECT code FROM candidate_codes 
                WHERE code LIKE $1 
                AND LENGTH(code) = 14
                ORDER BY code DESC
                LIMIT 1
                FOR UPDATE
            `, [prefix + '%']);

            let nextNum = 1;
            if (seqResult.rows.length > 0) {
                const lastCode = seqResult.rows[0].code;
                nextNum = parseInt(lastCode.slice(-4), 10) + 1;
            }

            for (const candidate of candidates) {
                const name = candidate.name?.trim();
                if (!name) continue;

                // Generate sequential code
                const code = `${prefix}${String(nextNum++).padStart(4, '0')}`;
                const metadata = JSON.stringify({ candidate_name: name });

                placeholders.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
                values.push(code, examId || null, expiresAt, metadata, user.id, companyCodeIdToUse);
            }

            if (placeholders.length > 0) {
                await client.query(`
                    INSERT INTO candidate_codes (code, exam_id, expires_at, metadata, created_by, company_code_id)
                    VALUES ${placeholders.join(', ')}
                `, values);
            }

            await client.query('COMMIT');

            return NextResponse.json({
                success: true,
                message: `Berhasil import ${placeholders.length} kode`,
                count: placeholders.length
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Import error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
```

---

## 7. CODE - PSIKOLOG MELIHAT KANDIDAT

### src/app/api/psychologist/candidates/route.ts
```typescript
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { getSession, ROLES } from '@/lib/auth';
import { canAccessPsychologistFeatures } from '@/lib/roles';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !canAccessPsychologistFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const result = await pool.query(`
            SELECT 
                u.id,
                u.full_name,
                u.email,
                u.created_at,
                COUNT(DISTINCT ea.id) as exam_count,
                COUNT(DISTINCT CASE WHEN ea.status = 'completed' THEN ea.id END) as completed_count,
                MAX(CASE WHEN ea.status = 'completed' THEN ea.end_time END) as last_exam_date
            FROM users u
            LEFT JOIN exam_attempts ea ON u.id = ea.user_id
            WHERE u.role = $1
            GROUP BY u.id
            ORDER BY u.created_at DESC
        `, [ROLES.CANDIDATE]);

        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
```

---

## 8. CODE - SUPERADMIN COMPANY CODES

### src/app/api/superadmin/company-codes/route.ts
```typescript
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessSuperAdminFeatures } from '@/lib/roles';
import { cookies } from 'next/headers';

// GET - List all company codes dengan optimized query
export async function GET(_request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !canAccessSuperAdminFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Optimized: JOIN instead of subquery
        const result = await pool.query(`
            SELECT 
                cc.id,
                cc.code,
                cc.company_name,
                cc.organization_id,
                o.name as organization_name,
                cc.is_active,
                cc.created_at,
                COALESCE(usage.count, 0) as usage_count
            FROM company_codes cc
            LEFT JOIN organizations o ON cc.organization_id = o.id
            LEFT JOIN (
                SELECT company_code_id, COUNT(*) as count 
                FROM candidate_codes 
                WHERE company_code_id IS NOT NULL
                GROUP BY company_code_id
            ) usage ON usage.company_code_id = cc.id
            ORDER BY cc.code ASC
        `);

        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Create new company code
export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !canAccessSuperAdminFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { code, companyName, organizationId } = await request.json();

        // Validasi
        if (!code || !companyName) {
            return NextResponse.json({ 
                error: 'Kode dan nama perusahaan wajib diisi' 
            }, { status: 400 });
        }

        // Validasi format kode (4 digit)
        if (!/^\d{4}$/.test(code)) {
            return NextResponse.json({ 
                error: 'Kode harus 4 digit angka' 
            }, { status: 400 });
        }

        // Insert
        const result = await pool.query(
            `INSERT INTO company_codes (code, company_name, organization_id, is_active)
             VALUES ($1, $2, $3, TRUE)
             RETURNING id, code, company_name`,
            [code, companyName, organizationId || null]
        );

        return NextResponse.json({
            success: true,
            companyCode: result.rows[0]
        }, { status: 201 });
    } catch (error: any) {
        console.error('Error:', error);
        if (error?.code === '23505') {
            return NextResponse.json({ 
                error: 'Kode perusahaan sudah digunakan' 
            }, { status: 400 });
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
```

---

## 9. CODE - SCORING (PSS & SRQ-29)

### src/lib/scoring/pss.ts
```typescript
export const PSS_REVERSE_QUESTIONS = [4, 5, 7, 8];

export interface PSSResult {
    rawScore: number;
    totalScore: number;
    level: 'ringan' | 'sedang' | 'berat';
    levelLabel: string;
    description: string;
}

export function calculatePSSScore(answers: number[]): PSSResult {
    if (answers.length !== 10) {
        throw new Error('PSS requires exactly 10 answers');
    }

    let totalScore = 0;
    let rawScore = 0;

    answers.forEach((answer, index) => {
        const questionNumber = index + 1;
        rawScore += answer;

        // Reverse scoring for questions 4, 5, 7, 8
        if (PSS_REVERSE_QUESTIONS.includes(questionNumber)) {
            totalScore += (4 - answer);
        } else {
            totalScore += answer;
        }
    });

    let level: 'ringan' | 'sedang' | 'berat';
    let levelLabel: string;
    let description: string;

    if (totalScore <= 13) {
        level = 'ringan';
        levelLabel = 'Stress Ringan';
        description = 'Tingkat stress rendah.';
    } else if (totalScore <= 26) {
        level = 'sedang';
        levelLabel = 'Stress Sedang';
        description = 'Tingkat stress moderat.';
    } else {
        level = 'berat';
        levelLabel = 'Stress Berat';
        description = 'Tingkat stress tinggi.';
    }

    return { rawScore, totalScore, level, levelLabel, description };
}
```

### src/lib/scoring/srq29.ts
```typescript
export interface SRQ29Result {
    totalScore: number;
    categories: SRQ29Category[];
    positiveCategories: string[];
    overallStatus: 'normal' | 'perlu_perhatian' | 'perlu_evaluasi';
    overallLabel: string;
}

export interface SRQ29Category {
    name: string;
    questions: number[];
    score: number;
    threshold: number;
    isPositive: boolean;
}

export function calculateSRQ29Score(answers: number[]): SRQ29Result {
    if (answers.length !== 29) {
        throw new Error('SRQ-29 requires exactly 29 answers');
    }

    const categories: SRQ29Category[] = [
        { name: 'Neurosis', questions: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20], threshold: 6 },
        { name: 'Psikotik', questions: [21,22,23,24], threshold: 1 },
        { name: 'Kejang/Epilepsi', questions: [25], threshold: 1 },
        { name: 'Penggunaan Zat', questions: [26,27,28], threshold: 1 },
        { name: 'Risiko Bunuh Diri', questions: [29], threshold: 1 },
    ].map(cat => {
        const score = cat.questions.reduce((sum, q) => sum + (answers[q - 1] || 0), 0);
        return {
            ...cat,
            score,
            isPositive: score >= cat.threshold
        };
    });

    const totalScore = answers.reduce((sum, a) => sum + a, 0);
    const positiveCategories = categories.filter(c => c.isPositive).map(c => c.name);

    let overallStatus: 'normal' | 'perlu_perhatian' | 'perlu_evaluasi';
    let overallLabel: string;

    if (positiveCategories.length === 0) {
        overallStatus = 'normal';
        overallLabel = 'Normal';
    } else if (positiveCategories.includes('Risiko Bunuh Diri') || positiveCategories.includes('Psikotik')) {
        overallStatus = 'perlu_evaluasi';
        overallLabel = 'Perlu Evaluasi Lebih Lanjut';
    } else {
        overallStatus = 'perlu_perhatian';
        overallLabel = 'Perlu Perhatian';
    }

    return { totalScore, categories, positiveCategories, overallStatus, overallLabel };
}
```

---

## 10. MIGRATION YANG DIPERLUKAN

### migrations/011_performance_indexes.sql
```sql
-- Performance indexes for candidate_codes
CREATE INDEX IF NOT EXISTS idx_candidate_codes_pattern 
ON candidate_codes(code varchar_pattern_ops);

CREATE INDEX IF NOT EXISTS idx_candidate_codes_company 
ON candidate_codes(company_code_id) 
WHERE company_code_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_candidate_codes_created 
ON candidate_codes(created_at DESC);

-- Index for exam_attempts
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_status 
ON exam_attempts(user_id, status);

CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam_status 
ON exam_attempts(exam_id, status);

-- Index for answers
CREATE INDEX IF NOT EXISTS idx_answers_attempt 
ON answers(attempt_id);

-- Update company_codes to support 4-digit code
ALTER TABLE company_codes 
ALTER COLUMN code TYPE VARCHAR(4);
```

---

**Versi:** 1.0  
**Tanggal:** 11 Januari 2026  
**Platform:** Asisya Web - Assessment Platform
