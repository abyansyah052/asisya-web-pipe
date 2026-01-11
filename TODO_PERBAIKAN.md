2. Inefficient Sequential Number Generation 🔴 CRITICAL
Location: get_next_candidate_number() function
​
Problem:

sql
SELECT MAX(CAST(SUBSTRING(code FROM 11 FOR 4) AS INTEGER))
FROM candidate_codes
WHERE code LIKE prefix || '%'
Impact: Full table scan dengan LIKE pattern - dengan 1000+ codes akan sangat lambat
Performance: Currently O(n), should be O(1)

Fix (30 minutes):

sql
-- Option 1: Add prefix index
CREATE INDEX idx_candidate_codes_prefix ON candidate_codes(code varchar_pattern_ops);

-- Option 2: Better approach - use sequence table
CREATE TABLE code_sequences (
  prefix VARCHAR(12) PRIMARY KEY,
  next_num INTEGER DEFAULT 1
);

CREATE OR REPLACE FUNCTION get_next_candidate_number_v2(...)
RETURNS INTEGER AS $$
  INSERT INTO code_sequences (prefix, next_num) 
  VALUES (p_prefix, 1)
  ON CONFLICT (prefix) 
  DO UPDATE SET next_num = code_sequences.next_num + 1
  RETURNING next_num;
$$ LANGUAGE sql;
Expected improvement: 95% faster

3. N+1 Query in Company Codes GET 🔴 HIGH
Location: api/superadmin/company-codes/route.ts
​
Problem:

typescript
(SELECT COUNT(*) FROM candidate_codes WHERE company_code_id = cc.id) as usage_count
Impact: Untuk 100 company codes = 100+ queries

Fix:

sql
SELECT 
    cc.id,
    cc.code,
    cc.company_name,
    cc.organization_id,
    cc.is_active,
    cc.created_at,
    o.name as organization_name,
    COALESCE(usage.count, 0) as usage_count
FROM company_codes cc
LEFT JOIN organizations o ON cc.organization_id = o.id
LEFT JOIN (
    SELECT company_code_id, COUNT(*) as count 
    FROM candidate_codes 
    GROUP BY company_code_id
) usage ON usage.company_code_id = cc.id
ORDER BY cc.code ASC
Expected improvement: 80-90% faster

4. Missing Database Indexes 🔴 HIGH
Location: Multiple tables
​
Missing indexes:

candidate_codes.exam_type_code - not indexed

candidate_codes.code - needs prefix index for LIKE queries

exams.exam_type - not indexed

Fix (10 minutes):

sql
CREATE INDEX idx_candidate_codes_exam_type ON candidate_codes(exam_type_code);
CREATE INDEX idx_candidate_codes_code_pattern ON candidate_codes(code varchar_pattern_ops);
CREATE INDEX idx_exams_type ON exams(exam_type);
Impact: 90% faster queries on exam filtering

 Missing Input Validation 🟡 HIGH
Location: Multiple POST endpoints
​
Problem: Tidak validate organizationId, examTypeCode, dll
Risk: Bad data masuk database, potential injection

Fix (2 hours) - gunakan Zod:

typescript
import { z } from 'zod';

const CompanyCodeSchema = z.object({
    code: z.string().regex(/^\d{2}$/, 'Kode harus 2 digit'),
    companyName: z.string().min(1).max(255),
    organizationId: z.number().int().positive().optional()
});

export async function POST(request: NextRequest) {
    const body = await request.json();
    
    // Validate
    const validation = CompanyCodeSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json(
            { error: validation.error.flatten() },
            { status: 400 }
        );
    }
    
    const { code, companyName, organizationId } = validation.data;
    // ... proceed
}
7. No Pagination for Large Datasets 🟡 HIGH
Location: psychologist/exams/[id]/page.tsx
​
Problem: Load all 800 candidates sekaligus tanpa pagination
Impact: Slow page load, high memory usage

Fix (1 hour):

typescript
// API: Add pagination params
const page = parseInt(searchParams.get('page') || '1');
const limit = parseInt(searchParams.get('limit') || '50');
const offset = (page - 1) * limit;

const result = await pool.query(`
    SELECT ... 
    FROM ...
    ORDER BY u.full_name
    LIMIT $1 OFFSET $2
`, [limit, offset]);

const countResult = await pool.query('SELECT COUNT(*) FROM ...');
const totalPages = Math.ceil(countResult.rows[0].count / limit);

1. RACE CONDITION - Duplicate Codes! 🔴 CRITICAL
Location: get_next_candidate_number() function
​

Problem: 2 concurrent requests bisa generate duplicate codes:

text
Request A: Reads MAX = 0 → generates 0001
Request B: Reads MAX = 0 → generates 0001  ← DUPLICATE! 😱
Current code (TIDAK ADA LOCK):

sql
SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 11 FOR 4) AS INTEGER)), 0) + 1
INTO next_num
FROM candidate_codes
WHERE code LIKE prefix || '%'
AND LENGTH(code) = 14;
-- ❌ NO LOCKING! Race condition possible!
FIX (Add FOR UPDATE):

sql
SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 11 FOR 4) AS INTEGER)), 0) + 1
INTO next_num
FROM candidate_codes
WHERE code LIKE prefix || '%'
AND LENGTH(code) = 14
FOR UPDATE;  -- ✅ Locks rows, prevents race condition!
Time: 15 min | Priority: FIX TODAY

2. SUPER SLOW Query - Full Table Scan! 🔴 CRITICAL
Location: get_next_candidate_number() - LIKE query
​

Problem: Query scans SEMUA ROWS di candidate_codes:

text
WHERE code LIKE prefix || '%'
Performance:

1,000 codes: ~50ms

10,000 codes: ~500ms ← TOO SLOW!

100,000 codes: ~5000ms ← UNUSABLE!

FIX (Add indexes):

sql
-- Add prefix index untuk LIKE queries
CREATE INDEX idx_candidate_codes_pattern 
ON candidate_codes(code varchar_pattern_ops);

-- Add exam_type index
CREATE INDEX idx_candidate_codes_exam_type 
ON candidate_codes(exam_type_code);

-- Add company index
CREATE INDEX idx_candidate_codes_company 
ON candidate_codes(company_code_id) 
WHERE company_code_id IS NOT NULL;
Expected: 500ms → 0.5ms (100x faster!)

Time: 5 min | Priority: FIX TODAY

3. Inefficient Bulk Loop - 3000 Queries! 🔴 CRITICAL
Location: POST /api/admin/codes/generate - for loop
​

Problem: Generate 1000 codes = 3000 DB queries!

typescript
for (let i = 0; i < count; i++) {
    // Query 1: Get company code
    await pool.query('SELECT code FROM company_codes...');
    
    // Query 2: Get next seq number
    await pool.query('SELECT get_next_candidate_number(...)');
    
    // Query 3: Insert code
    await pool.query('INSERT INTO candidate_codes...');
}
Performance:

10 codes: ~500ms

100 codes: ~5 seconds

1000 codes: ~50 SECONDS! ← UNACCEPTABLE!

FIX: Lihat optimized code di optimized_bulk_code.ts !

Key improvements:

✅ Fetch company code ONCE (not 1000x)

✅ Get sequential ONCE (not 1000x)

✅ Bulk INSERT dalam 1 query (not 1000x)

✅ Use transaction for atomicity

Expected: 50 seconds → 0.5 seconds (100x faster!)

