# Sistem Kode Peserta - Asisya Web Platform

## Overview
Sistem kode peserta telah diperbarui dari format 16 karakter acak menjadi format terstruktur 12 digit dengan pola: **MMYY-TTCC-NNNN**

### Format Kode Baru
```
MMYY-TTCC-NNNN

MM   = Bulan pembuatan (01-12)
YY   = Tahun pembuatan (2 digit terakhir, misal: 26 untuk 2026)
TT   = Kode tipe ujian (10=MMPI, 20=PSS, 30=SRQ29, 40=General)
CC   = Kode perusahaan (00-99, dari tabel company_codes)
NNNN = Nomor urut (0001-9999)
```

**Contoh:**
- `0126-2010-0001` = Januari 2026, PSS, Perusahaan kode 10, nomor urut 1
- `0126-1005-0123` = Januari 2026, MMPI, Perusahaan kode 05, nomor urut 123

---

## 1. Database Schema

### migrations/010_company_codes.sql

```sql
-- Tabel untuk menyimpan kode perusahaan
CREATE TABLE IF NOT EXISTS company_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(2) NOT NULL UNIQUE,        -- Kode 2 digit (00-99)
    company_name VARCHAR(255) NOT NULL,     -- Nama perusahaan
    organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes untuk performa
CREATE INDEX IF NOT EXISTS idx_company_codes_code ON company_codes(code);
CREATE INDEX IF NOT EXISTS idx_company_codes_org ON company_codes(organization_id);
CREATE INDEX IF NOT EXISTS idx_company_codes_active ON company_codes(is_active);

-- Tambah kolom exam_type di tabel exams
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exams' AND column_name = 'exam_type'
    ) THEN
        ALTER TABLE exams ADD COLUMN exam_type VARCHAR(20) DEFAULT 'general';
    END IF;
END $$;

-- Tambah tracking ke candidate_codes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'candidate_codes' AND column_name = 'company_code_id'
    ) THEN
        ALTER TABLE candidate_codes ADD COLUMN company_code_id INTEGER REFERENCES company_codes(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'candidate_codes' AND column_name = 'exam_type_code'
    ) THEN
        ALTER TABLE candidate_codes ADD COLUMN exam_type_code VARCHAR(2);
    END IF;
END $$;

-- Data default
INSERT INTO company_codes (code, company_name, organization_id, is_active)
SELECT '00', 'Default', NULL, TRUE
WHERE NOT EXISTS (SELECT 1 FROM company_codes WHERE code = '00');

-- Function untuk generate nomor urut otomatis
CREATE OR REPLACE FUNCTION get_next_candidate_number(
    p_month VARCHAR(2),
    p_year VARCHAR(2),
    p_type_code VARCHAR(2),
    p_company_code VARCHAR(2)
) RETURNS INTEGER AS $$
DECLARE
    prefix VARCHAR(12);
    next_num INTEGER;
BEGIN
    prefix := p_month || p_year || '-' || p_type_code || p_company_code || '-';
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 11 FOR 4) AS INTEGER)), 0) + 1
    INTO next_num
    FROM candidate_codes
    WHERE code LIKE prefix || '%'
    AND LENGTH(code) = 14;
    
    RETURN next_num;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE company_codes IS 'Tabel kode perusahaan untuk generate kode peserta format baru';
COMMENT ON FUNCTION get_next_candidate_number IS 'Generate nomor urut untuk kode peserta berdasarkan prefix MMYY-TTCC-';
```

---

## 2. API Superadmin - CRUD Company Codes

### src/app/api/superadmin/company-codes/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessSuperAdminFeatures } from '@/lib/roles';
import { cookies } from 'next/headers';

/**
 * GET - Mengambil semua company codes dengan usage count
 * Response: Array of { id, code, company_name, organization_id, is_active, usage_count }
 */
export async function GET(_request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !canAccessSuperAdminFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const result = await pool.query(`
            SELECT 
                cc.id,
                cc.code,
                cc.company_name,
                cc.organization_id,
                cc.is_active,
                cc.created_at,
                o.name as organization_name,
                (SELECT COUNT(*) FROM candidate_codes WHERE company_code_id = cc.id) as usage_count
            FROM company_codes cc
            LEFT JOIN organizations o ON cc.organization_id = o.id
            ORDER BY cc.code ASC
        `);

        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Error fetching company codes:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * POST - Membuat company code baru
 * Body: { code: string(2 digit), companyName: string, organizationId?: number }
 * Validasi:
 * - code harus 2 digit (00-99)
 * - code harus unique
 * - companyName wajib diisi
 */
export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !canAccessSuperAdminFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const { code, companyName, organizationId } = body;

        // Validasi required fields
        if (!code || !companyName) {
            return NextResponse.json({ 
                error: 'Kode dan nama perusahaan wajib diisi' 
            }, { status: 400 });
        }

        // Validasi format kode (2 digit angka)
        if (!/^\d{2}$/.test(code)) {
            return NextResponse.json({ 
                error: 'Kode harus berupa 2 digit angka (00-99)' 
            }, { status: 400 });
        }

        // Cek duplikasi
        const existingCode = await pool.query(
            'SELECT id FROM company_codes WHERE code = $1',
            [code]
        );

        if (existingCode.rows.length > 0) {
            return NextResponse.json({ 
                error: 'Kode perusahaan sudah digunakan' 
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
    } catch (error: unknown) {
        console.error('Error creating company code:', error);
        if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
            return NextResponse.json({ 
                error: 'Kode perusahaan sudah digunakan' 
            }, { status: 400 });
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
```

### src/app/api/superadmin/company-codes/[id]/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/headers';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessSuperAdminFeatures } from '@/lib/roles';
import { cookies } from 'next/headers';

/**
 * PUT - Update company code
 * Body: { companyName?: string, isActive?: boolean }
 * Catatan: 
 * - Kode tidak bisa diubah (immutable)
 * - Bisa dinonaktifkan meski sudah dipakai
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !canAccessSuperAdminFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { id } = await params;
        const companyCodeId = parseInt(id);
        const body = await request.json();
        const { companyName, isActive } = body;

        // Cek eksistensi
        const existing = await pool.query(
            'SELECT id FROM company_codes WHERE id = $1',
            [companyCodeId]
        );

        if (existing.rows.length === 0) {
            return NextResponse.json({ 
                error: 'Kode perusahaan tidak ditemukan' 
            }, { status: 404 });
        }

        // Check usage (untuk warning log)
        const usageCheck = await pool.query(
            'SELECT COUNT(*) as count FROM candidate_codes WHERE company_code_id = $1',
            [companyCodeId]
        );

        if (parseInt(usageCheck.rows[0].count) > 0 && isActive === false) {
            console.log(`⚠️ Menonaktifkan company code ${companyCodeId} yang memiliki ${usageCheck.rows[0].count} usage`);
        }

        // Update
        await pool.query(
            `UPDATE company_codes 
             SET company_name = COALESCE($1, company_name),
                 is_active = COALESCE($2, is_active),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [companyName, isActive, companyCodeId]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating company code:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * DELETE - Hapus company code
 * Validasi: Tidak bisa dihapus jika sudah digunakan di candidate_codes
 * Saran: Gunakan deactivate (PUT is_active=false) jika sudah terpakai
 */
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !canAccessSuperAdminFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { id } = await params;
        const companyCodeId = parseInt(id);

        // Cek usage - TIDAK BOLEH DIHAPUS jika sudah dipakai
        const usageCheck = await pool.query(
            'SELECT COUNT(*) as count FROM candidate_codes WHERE company_code_id = $1',
            [companyCodeId]
        );

        if (parseInt(usageCheck.rows[0].count) > 0) {
            return NextResponse.json({ 
                error: 'Kode perusahaan tidak dapat dihapus karena sudah digunakan. Nonaktifkan saja.' 
            }, { status: 400 });
        }

        // Delete jika belum dipakai
        await pool.query('DELETE FROM company_codes WHERE id = $1', [companyCodeId]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting company code:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
```

---

## 3. API Admin - Read Company Codes

### src/app/api/admin/company-codes/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessAdminFeatures } from '@/lib/roles';
import { cookies } from 'next/headers';

/**
 * GET - Mengambil company codes aktif untuk dropdown admin
 * Filter berdasarkan organization admin (jika ada)
 * Response: Array of { id, code, company_name, organization_id }
 */
export async function GET(_request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !canAccessAdminFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        let query = `
            SELECT 
                cc.id,
                cc.code,
                cc.company_name,
                cc.organization_id
            FROM company_codes cc
            WHERE cc.is_active = TRUE
        `;

        // Filter berdasarkan organization admin
        // Admin hanya bisa lihat kode milik org mereka + kode global (org_id = NULL)
        if (session.organizationId) {
            query += ` AND (cc.organization_id = $1 OR cc.organization_id IS NULL)`;
            query += ` ORDER BY CASE WHEN cc.organization_id = $1 THEN 0 ELSE 1 END, cc.company_name ASC`;
            
            const result = await pool.query(query, [session.organizationId]);
            return NextResponse.json(result.rows);
        } else {
            // Admin tanpa org bisa lihat semua
            query += ` ORDER BY cc.company_name ASC`;
            const result = await pool.query(query);
            return NextResponse.json(result.rows);
        }
    } catch (error) {
        console.error('Error fetching company codes:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
```

---

## 4. API Generate Codes (Updated)

### src/app/api/admin/codes/generate/route.ts

**Perubahan Utama:**

```typescript
// Konstanta tipe ujian
const EXAM_TYPE_CODES: Record<string, string> = {
    'mmpi': '10',
    'pss': '20',
    'srq29': '30',
    'general': '40'
};

/**
 * Generate kode format baru: MMYY-TTCC-NNNN
 * @param examType - Tipe ujian (mmpi, pss, srq29, general)
 * @param companyCodeId - ID company code dari tabel company_codes
 * @param sequentialNumber - Nomor urut
 */
async function generateNewFormatCode(
    examType: string,
    companyCodeId: number,
    sequentialNumber: number
): Promise<string> {
    // Ambil company code dari database
    const companyResult = await pool.query(
        'SELECT code FROM company_codes WHERE id = $1',
        [companyCodeId]
    );

    if (companyResult.rows.length === 0) {
        throw new Error('Company code not found');
    }

    const companyCode = companyResult.rows[0].code;
    const examTypeCode = EXAM_TYPE_CODES[examType] || '40';

    // Generate prefix
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    const seqNum = String(sequentialNumber).padStart(4, '0');

    return `${month}${year}-${examTypeCode}${companyCode}-${seqNum}`;
}

/**
 * Generate kode format lama (legacy): 16 karakter random
 */
function generateLegacyCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 16; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Dalam POST handler
export async function POST(request: NextRequest) {
    // ... auth checks ...

    const body = await request.json();
    const {
        count,
        examId,
        expiresInDays,
        candidateName,
        // Parameter baru untuk format 12 digit
        examType = 'general',
        companyCodeId,
        useLegacyFormat = false
    } = body;

    // Validasi untuk format baru
    if (!useLegacyFormat) {
        if (!companyCodeId) {
            return NextResponse.json({
                error: 'Company code wajib dipilih untuk format kode baru'
            }, { status: 400 });
        }

        // Validasi company code exists & aktif
        const companyCheck = await pool.query(
            'SELECT id FROM company_codes WHERE id = $1 AND is_active = TRUE',
            [companyCodeId]
        );

        if (companyCheck.rows.length === 0) {
            return NextResponse.json({
                error: 'Company code tidak valid atau tidak aktif'
            }, { status: 400 });
        }
    }

    // Generate codes
    const codes = [];
    const examTypeCode = EXAM_TYPE_CODES[examType] || '40';

    for (let i = 0; i < count; i++) {
        let code: string;

        if (useLegacyFormat) {
            // Format lama: random 16 chars
            code = generateLegacyCode();
        } else {
            // Format baru: MMYY-TTCC-NNNN
            // Get next sequential number
            const now = new Date();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const year = String(now.getFullYear()).slice(-2);
            
            const companyResult = await pool.query(
                'SELECT code FROM company_codes WHERE id = $1',
                [companyCodeId]
            );
            const companyCode = companyResult.rows[0].code;

            // Get next sequential number
            const seqResult = await pool.query(
                'SELECT get_next_candidate_number($1, $2, $3, $4) as next_num',
                [month, year, examTypeCode, companyCode]
            );
            const seqNum = seqResult.rows[0].next_num;

            code = `${month}${year}-${examTypeCode}${companyCode}-${String(seqNum).padStart(4, '0')}`;
        }

        // Insert ke database
        const result = await pool.query(
            `INSERT INTO candidate_codes 
             (code, exam_id, organization_id, expires_at, candidate_name, company_code_id, exam_type_code)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, code`,
            [
                code,
                examId || null,
                session.organizationId || null,
                expiresAt,
                candidateName || null,
                useLegacyFormat ? null : companyCodeId,
                useLegacyFormat ? null : examTypeCode
            ]
        );

        codes.push(result.rows[0]);
    }

    return NextResponse.json({ codes });
}
```

**Request Body Example:**

```json
{
  "count": 10,
  "examId": 5,
  "expiresInDays": 30,
  "examType": "pss",
  "companyCodeId": 3,
  "useLegacyFormat": false
}
```

---

## 5. UI Admin Codes Page

### src/app/admin/codes/page.tsx

**State Management:**

```typescript
// Interface
interface CompanyCode {
    id: number;
    code: string;
    company_name: string;
    organization_id?: number;
}

// Konstanta tipe ujian
const EXAM_TYPE_OPTIONS = [
    { value: 'mmpi', label: 'MMPI', code: '10' },
    { value: 'pss', label: 'PSS', code: '20' },
    { value: 'srq29', label: 'SRQ-29', code: '30' },
    { value: 'general', label: 'Ujian Umum', code: '40' }
];

// State tambahan
const [companyCodes, setCompanyCodes] = useState<CompanyCode[]>([]);
const [selectedCompanyCode, setSelectedCompanyCode] = useState<number | null>(null);
const [selectedExamType, setSelectedExamType] = useState<string>('general');
const [useLegacyFormat, setUseLegacyFormat] = useState(false);
```

**Fetch Company Codes:**

```typescript
const fetchCompanyCodes = async () => {
    try {
        const res = await fetch('/api/admin/company-codes');
        if (res.ok) {
            const data = await res.json();
            setCompanyCodes(data);
            // Auto-select first company code
            if (data.length > 0) {
                setSelectedCompanyCode(data[0].id);
            }
        }
    } catch (err) {
        console.error('Error fetching company codes:', err);
    }
};

// Call on mount
useEffect(() => {
    fetchCodes();
    fetchExams();
    fetchCompanyCodes(); // ← Tambahan
}, []);
```

**Generate Codes Function:**

```typescript
const generateCodes = async () => {
    if (!useLegacyFormat && !selectedCompanyCode) {
        alert('Pilih perusahaan terlebih dahulu');
        return;
    }

    setGenerating(true);
    try {
        const res = await fetch('/api/admin/codes/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                count: generateCount,
                examId: selectedExam,
                expiresInDays: expiresInDays,
                candidateName: generateCount === 1 ? candidateName : null,
                // Parameter baru
                examType: selectedExamType,
                companyCodeId: selectedCompanyCode,
                useLegacyFormat: useLegacyFormat
            })
        });

        if (res.ok) {
            alert('Kode berhasil di-generate!');
            fetchCodes(); // Refresh list
            setShowGenerateModal(false);
            // Reset form
            setGenerateCount(1);
            setSelectedExam(null);
            setCandidateName('');
            setExpiresInDays(7);
            setSelectedExamType('general');
            setUseLegacyFormat(false);
        } else {
            const data = await res.json();
            alert(data.error || 'Gagal generate kode');
        }
    } catch (err) {
        console.error(err);
        alert('Terjadi kesalahan');
    } finally {
        setGenerating(false);
    }
};
```

**UI Form dalam Modal:**

```tsx
{showGenerateModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
                Generate Kode Akses Baru
            </h3>

            <div className="space-y-4">
                {/* Jumlah Kode */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Jumlah Kode
                    </label>
                    <input
                        type="number"
                        min="1"
                        max="100"
                        value={generateCount}
                        onChange={(e) => setGenerateCount(parseInt(e.target.value) || 1)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                </div>

                {/* Untuk Ujian */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Untuk Ujian (Opsional)
                    </label>
                    <select
                        value={selectedExam || ''}
                        onChange={(e) => setSelectedExam(e.target.value ? parseInt(e.target.value) : null)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                        <option value="">Semua Ujian</option>
                        {exams.map(exam => (
                            <option key={exam.id} value={exam.id}>{exam.title}</option>
                        ))}
                    </select>
                </div>

                {/* Masa Berlaku */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Masa Berlaku (Hari)
                    </label>
                    <input
                        type="number"
                        min="1"
                        max="365"
                        value={expiresInDays}
                        onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 7)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                </div>

                {/* TIPE UJIAN - BARU */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipe Ujian
                    </label>
                    <select
                        value={selectedExamType}
                        onChange={(e) => setSelectedExamType(e.target.value)}
                        disabled={useLegacyFormat}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                    >
                        {EXAM_TYPE_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label} (Kode: {option.code})
                            </option>
                        ))}
                    </select>
                </div>

                {/* KODE PERUSAHAAN - BARU */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Kode Perusahaan
                    </label>
                    <select
                        value={selectedCompanyCode || ''}
                        onChange={(e) => setSelectedCompanyCode(e.target.value ? parseInt(e.target.value) : null)}
                        disabled={useLegacyFormat}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                    >
                        <option value="">-- Pilih Perusahaan --</option>
                        {companyCodes.map(cc => (
                            <option key={cc.id} value={cc.id}>
                                {cc.company_name} (Kode: {cc.code})
                            </option>
                        ))}
                    </select>
                    {!useLegacyFormat && companyCodes.length === 0 && (
                        <p className="text-xs text-amber-600 mt-1">
                            Belum ada kode perusahaan. Hubungi superadmin untuk menambahkan.
                        </p>
                    )}
                </div>

                {/* TOGGLE LEGACY FORMAT - BARU */}
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="useLegacyFormat"
                        checked={useLegacyFormat}
                        onChange={(e) => setUseLegacyFormat(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label htmlFor="useLegacyFormat" className="text-sm text-gray-700">
                        Gunakan format lama (16 karakter acak)
                    </label>
                </div>

                {/* PREVIEW FORMAT - BARU */}
                {!useLegacyFormat && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-xs text-blue-800">
                            <strong>Format Kode Baru:</strong> MMYY-TTCC-NNNN<br/>
                            <span className="text-blue-600">
                                Contoh: {new Date().toLocaleDateString('id-ID', {month: '2-digit', year: '2-digit'}).replace('/', '')}-
                                {EXAM_TYPE_OPTIONS.find(o => o.value === selectedExamType)?.code || '40'}
                                {companyCodes.find(c => c.id === selectedCompanyCode)?.code || 'XX'}-0001
                            </span>
                        </p>
                    </div>
                )}

                {/* Nama Kandidat (jika count=1) */}
                {generateCount === 1 && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nama Kandidat (Opsional)
                        </label>
                        <input
                            type="text"
                            value={candidateName}
                            onChange={(e) => setCandidateName(e.target.value)}
                            placeholder="Nama kandidat"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        />
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
                <button
                    onClick={() => setShowGenerateModal(false)}
                    className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                    Batal
                </button>
                <button
                    onClick={generateCodes}
                    disabled={generating || (!useLegacyFormat && !selectedCompanyCode)}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                    {generating ? 'Generating...' : 'Generate'}
                </button>
            </div>
        </div>
    </div>
)}
```

---

## 6. Logika Pembuatan Kode

### Flow Diagram

```
┌─────────────────────────────────────────┐
│   Admin klik "Generate Kode"            │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│   Pilih Mode:                           │
│   ○ Format Baru (MMYY-TTCC-NNNN)       │
│   ○ Format Lama (16 random)            │
└────────────────┬────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
   [FORMAT BARU]     [FORMAT LAMA]
        │                 │
        ▼                 │
┌──────────────┐          │
│ Pilih Tipe   │          │
│ Ujian (TT)   │          │
└──────┬───────┘          │
       ▼                  │
┌──────────────┐          │
│ Pilih Kode   │          │
│ Perusahaan   │          │
│ (CC)         │          │
└──────┬───────┘          │
       ▼                  │
┌──────────────────┐      │
│ Generate MMYY    │      │
│ (dari tanggal)   │      │
└──────┬───────────┘      │
       ▼                  │
┌──────────────────┐      │
│ Get Next NNNN    │      │
│ (sequential)     │      │
└──────┬───────────┘      │
       ▼                  ▼
┌──────────────────────────┐
│ Format: MMYY-TTCC-NNNN   │
│ atau 16 random chars     │
└──────────┬───────────────┘
           ▼
┌──────────────────────────┐
│ Insert ke candidate_codes│
│ + tracking metadata      │
└──────────────────────────┘
```

### Contoh Generasi Kode

**Skenario 1: PSS untuk Perusahaan "PT Kimia Farma"**

Input:
- Tanggal: 11 Januari 2026
- Tipe Ujian: PSS (kode 20)
- Perusahaan: PT Kimia Farma (kode 10)
- Generate: 5 kode

Output:
```
0126-2010-0001
0126-2010-0002
0126-2010-0003
0126-2010-0004
0126-2010-0005
```

**Skenario 2: MMPI bulan berikutnya**

Input:
- Tanggal: 5 Februari 2026
- Tipe Ujian: MMPI (kode 10)
- Perusahaan: PT Kimia Farma (kode 10)
- Generate: 3 kode

Output:
```
0226-1010-0001  ← Prefix berubah karena bulan berbeda
0226-1010-0002
0226-1010-0003
```

**Skenario 3: Format Legacy**

Input:
- useLegacyFormat: true
- Generate: 2 kode

Output:
```
A7K9X2M4P8Q1W5E3
B2N6V8C3Z9L4J7H1
```

---

## 7. Query untuk Monitoring

### Cek jumlah kode per perusahaan
```sql
SELECT 
    cc.code,
    cc.company_name,
    COUNT(cdc.id) as total_codes,
    COUNT(CASE WHEN cdc.used_at IS NULL THEN 1 END) as unused_codes,
    COUNT(CASE WHEN cdc.used_at IS NOT NULL THEN 1 END) as used_codes
FROM company_codes cc
LEFT JOIN candidate_codes cdc ON cc.id = cdc.company_code_id
GROUP BY cc.id, cc.code, cc.company_name
ORDER BY total_codes DESC;
```

### Cek distribusi kode per tipe ujian
```sql
SELECT 
    exam_type_code,
    CASE exam_type_code
        WHEN '10' THEN 'MMPI'
        WHEN '20' THEN 'PSS'
        WHEN '30' THEN 'SRQ-29'
        WHEN '40' THEN 'General'
        ELSE 'Legacy/Other'
    END as exam_type,
    COUNT(*) as total_codes
FROM candidate_codes
GROUP BY exam_type_code
ORDER BY exam_type_code;
```

### Cek kode yang dibuat bulan ini
```sql
SELECT 
    code,
    candidate_name,
    created_at,
    exam_type_code,
    company_code_id
FROM candidate_codes
WHERE code LIKE TO_CHAR(CURRENT_DATE, 'MMYY') || '%'
ORDER BY created_at DESC
LIMIT 50;
```

### Validasi format kode
```sql
-- Kode format baru (14 karakter dengan pola MMYY-TTCC-NNNN)
SELECT COUNT(*) as new_format_count
FROM candidate_codes
WHERE LENGTH(code) = 14 
  AND code ~ '^\d{4}-\d{4}-\d{4}$';

-- Kode format lama (16 karakter)
SELECT COUNT(*) as legacy_format_count
FROM candidate_codes
WHERE LENGTH(code) = 16
  AND company_code_id IS NULL;
```

---

## 8. Tips & Best Practices

### Untuk Superadmin:
1. **Perencanaan Kode Perusahaan**: Rencanakan range kode per kategori
   - 00-09: Reserved/Default
   - 10-49: Clients Enterprise
   - 50-79: Clients SME
   - 80-99: Internal/Testing

2. **Naming Convention**: Gunakan nama jelas untuk perusahaan
   - ✅ "PT Kimia Farma"
   - ✅ "RS Siloam Jakarta"
   - ❌ "Client A"
   - ❌ "Test123"

3. **Deactivate vs Delete**: 
   - Jika kode sudah dipakai → Deactivate (set is_active=false)
   - Jika kode belum dipakai → Bisa dihapus

### Untuk Admin:
1. **Pilih Tipe yang Tepat**: Pastikan tipe ujian sesuai dengan exam
   - PSS → examType: 'pss'
   - SRQ-29 → examType: 'srq29'
   - MMPI → examType: 'mmpi'

2. **Batch Generation**: Generate dalam batch untuk efisiensi
   - 1 kode: Include nama kandidat
   - >1 kode: Bulk generation tanpa nama

3. **Legacy Format**: Hanya untuk backward compatibility
   - Default gunakan format baru
   - Format lama hanya jika diperlukan

### Untuk Developer:
1. **Transaction Safety**: Wrap code generation dalam transaction
2. **Collision Prevention**: Gunakan DB function untuk sequential number
3. **Validation**: Always validate company_code_id sebelum generate
4. **Logging**: Log setiap generation untuk audit trail

---

## 9. Troubleshooting

### Error: "Company code tidak valid"
**Penyebab**: Company code ID tidak ada atau tidak aktif
**Solusi**: 
```sql
-- Cek status company code
SELECT id, code, company_name, is_active 
FROM company_codes 
WHERE id = <companyCodeId>;

-- Aktifkan jika perlu
UPDATE company_codes 
SET is_active = TRUE 
WHERE id = <companyCodeId>;
```

### Error: "Kode perusahaan sudah digunakan"
**Penyebab**: Mencoba create dengan kode yang sudah ada
**Solusi**: Gunakan kode yang berbeda (00-99)

### Sequential number tidak increment
**Penyebab**: Prefix berubah (bulan/tahun/tipe/company berbeda)
**Solusi**: Ini normal behavior - setiap kombinasi prefix punya counter sendiri

### Format kode tidak sesuai
**Penyebab**: Legacy format masih aktif
**Solusi**: 
- Pastikan `useLegacyFormat = false` di request
- Pastikan `companyCodeId` terisi

---

## 10. Migration Path

### Dari Format Lama ke Baru

Kode lama (legacy) tidak perlu dikonversi. Sistem support kedua format:

```typescript
// Deteksi format
function detectCodeFormat(code: string): 'new' | 'legacy' {
    if (code.length === 14 && /^\d{4}-\d{4}-\d{4}$/.test(code)) {
        return 'new';
    }
    return 'legacy';
}

// Backward compatibility maintained
// Kode lama tetap valid dan bisa digunakan
// Kode baru otomatis tergenerate dengan format baru
```

---

**Last Updated**: 11 Januari 2026
**Version**: 1.0
**Status**: Production Ready ✅
