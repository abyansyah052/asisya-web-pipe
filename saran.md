Oke, saya baca performance testing file. Ada beberapa optimizations yang **sudah dilakukan**, tapi masih ada **bottleneck** untuk 800 concurrent users.[1]

***

## **📊 CURRENT PERFORMANCE STATUS**

### **✅ Sudah Dioptimasi:**

| Component | Before | After | Improvement |
|-----------|--------|-------|-------------|
| Code Login | 500ms | 30ms | **94% faster** ✅ |
| Dashboard | 800ms | 150ms | **81% faster** ⚠️ |
| Exam Submit | 300ms | 80ms | **73% faster** ⚠️ |
| Questions API | 200ms | 50ms | **75% faster** ⚠️ |
| Settings API | 1700ms | 100ms | **94% faster** ✅ |

### **⚠️ MASIH LAMBAT UNTUK 800 USERS:**

- **Dashboard: 150ms** - Target: <50ms
- **Exam Submit: 80ms** - Target: <30ms  
- **Questions API: 50ms** - Target: <20ms

***

## **🔥 CRITICAL OPTIMIZATIONS YANG MASIH KURANG**

### **1. Database Connection Pool Undersized**

**Current config:**
```typescript
max: 50 connections
min: 10 connections
```

**Problem untuk 800 users:**
- 800 concurrent users / 50 connections = **16 users per connection**
- Kalau semua user hit API bersamaan = **connection queue buildup**

**Solution:**

```typescript
// src/lib/db.ts
const DB_CONFIG: PoolConfig = {
    connectionString: process.env.DATABASE_URL,
    
    // ✅ INCREASE untuk 800 users
    max: parseInt(process.env.DB_MAX_CONN || '100'),  // NAIKKAN dari 50
    min: parseInt(process.env.DB_MIN_CONN || '20'),   // NAIKKAN dari 10
    
    // ✅ REDUCE timeouts untuk faster failover
    idleTimeoutMillis: 20000,           // TURUNKAN dari 30000
    connectionTimeoutMillis: 3000,      // TURUNKAN dari 5000
    statement_timeout: 20000,           // TURUNKAN dari 30000
    query_timeout: 20000,               // TURUNKAN dari 30000
    
    keepAlive: true,
    keepAliveInitialDelayMillis: 5000,  // TURUNKAN dari 10000
    allowExitOnIdle: false,
};
```

***

### **2. Dashboard Query Masih Slow (150ms)**

**Current implementation** tidak pakai **query caching** untuk dashboard stats.

**Solution: Add Redis Caching**

```typescript
// src/lib/cache.ts (NEW FILE)
import { Redis } from '@upstash/redis';

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    : null;

export async function getCached<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 60
): Promise<T> {
    if (!redis) {
        return await fetcher();
    }

    try {
        // Try get from cache
        const cached = await redis.get<T>(key);
        if (cached) {
            return cached;
        }

        // Cache miss - fetch fresh data
        const data = await fetcher();
        
        // Store in cache (fire and forget)
        redis.setex(key, ttlSeconds, JSON.stringify(data)).catch(console.error);
        
        return data;
    } catch (error) {
        console.error('Cache error:', error);
        return await fetcher();
    }
}

export async function invalidateCache(pattern: string): Promise<void> {
    if (!redis) return;
    
    try {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
            await redis.del(...keys);
        }
    } catch (error) {
        console.error('Cache invalidation error:', error);
    }
}
```

**Update Dashboard API:**

```typescript
// src/app/api/candidate/dashboard/route.ts
import { getCached, invalidateCache } from '@/lib/cache';

export async function GET(req: Request) {
    try {
        const cookieStore = await cookies();
        const user = await getSession(cookieStore.get('user_session')?.value);
        
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // ✅ Cache dashboard data per user for 60 seconds
        const dashboardData = await getCached(
            `dashboard:${user.id}`,
            async () => {
                // Original query logic here
                const todo = await query(/* ... */);
                const completed = await query(/* ... */);
                const inProgress = await query(/* ... */);
                
                return { todo, completed, inProgress, user };
            },
            60 // TTL 60 seconds
        );

        return NextResponse.json(dashboardData);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}

// Invalidate cache on exam submit
// src/app/api/candidate/exam/[id]/submit/route.ts
export async function POST(/* ... */) {
    // ... after successful submit ...
    
    await invalidateCache(`dashboard:${user.id}`);
    
    return NextResponse.json({ success: true, score: finalScore });
}
```

**Expected improvement:** Dashboard 150ms → **<30ms** (80% faster)

***

### **3. Questions API Masih Load Semua Options**

**Current problem:**
- Load semua options meskipun tidak perlu (termasuk `is_correct` field)
- 180 questions × 4 options = **720 rows** di-transfer

**Solution: Pagination + Lazy Loading**

```typescript
// src/app/api/candidate/exam/[id]/questions/route.ts

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: examId } = await params;
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const perPage = parseInt(url.searchParams.get('perPage') || '20'); // ✅ Default 20 questions per page

    try {
        const cookieStore = await cookies();
        const user = await getSession(cookieStore.get('user_session')?.value);
        
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // ✅ Cache exam metadata
        const exam = await getCached(
            `exam:${examId}:meta`,
            async () => {
                const result = await query(
                    'SELECT id, title, duration_minutes, display_mode FROM exams WHERE id = $1',
                    [examId]
                );
                return result[0];
            },
            300 // 5 minutes TTL
        );

        if (!exam) {
            return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
        }

        // Check/create attempt (unchanged)
        // ...

        // ✅ Paginated questions
        const offset = (page - 1) * perPage;
        
        const [questions, totalCount] = await Promise.all([
            query<any>(
                `SELECT id, text, marks, question_type, scale_min_label, scale_max_label, scale_min, scale_max
                 FROM questions 
                 WHERE exam_id = $1 
                 ORDER BY id ASC
                 LIMIT $2 OFFSET $3`,
                [examId, perPage, offset]
            ),
            query<{ count: string }>(
                'SELECT COUNT(*) as count FROM questions WHERE exam_id = $1',
                [examId]
            )
        ]);

        const total = parseInt(totalCount[0].count);
        const questionIds = questions.map(q => q.id);

        // ✅ Only load options for current page questions
        const options = await query<any>(
            `SELECT id, question_id, text 
             FROM options 
             WHERE question_id = ANY($1::int[]) 
             ORDER BY question_id, id`,
            [questionIds]
        );

        // Build map (unchanged)
        const optionsMap = new Map();
        options.forEach(opt => {
            if (!optionsMap.has(opt.question_id)) {
                optionsMap.set(opt.question_id, []);
            }
            optionsMap.get(opt.question_id).push({
                id: opt.id,
                text: opt.text,
            });
        });

        const questionsWithOptions = questions.map(q => ({
            id: q.id,
            text: q.text,
            marks: q.marks,
            questionType: q.question_type,
            scaleMinLabel: q.scale_min_label,
            scaleMaxLabel: q.scale_max_label,
            scaleMin: q.scale_min,
            scaleMax: q.scale_max,
            options: optionsMap.get(q.id) || [],
        }));

        return NextResponse.json({
            exam: {
                title: exam.title,
                duration: exam.duration_minutes,
                displayMode: exam.display_mode || 'per_page',
            },
            attemptId,
            questions: questionsWithOptions,
            pagination: {
                page,
                perPage,
                total,
                totalPages: Math.ceil(total / perPage),
            },
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
```

**Expected improvement:** Questions API 50ms → **<15ms** (70% faster)

***

### **4. Submit API - Bulk INSERT Bisa Lebih Cepat**

**Current:** Pakai bulk INSERT tapi masih ada multiple queries.

**Solution: Single Transaction dengan Prepared Statement**

```typescript
// src/app/api/candidate/exam/[id]/submit/route.ts

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const cookieStore = await cookies();
        const user = await getSession(cookieStore.get('user_session')?.value);
        
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Rate limiting (unchanged)
        // Input validation (unchanged)

        const body = await req.json();
        const validation = validateSubmitExam(body);
        
        if (!validation.success) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        const { attemptId, answers } = validation.data!;
        const { id: examId } = await params;
        const questionIds = Object.keys(answers).map(Number);

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // ✅ OPTIMIZED: Single query with CTE (Common Table Expression)
            const result = await client.query(`
                WITH question_data AS (
                    SELECT q.id, q.marks, o.id as option_id, o.is_correct
                    FROM questions q
                    LEFT JOIN options o ON o.question_id = q.id
                    WHERE q.id = ANY($1::int[]) AND q.exam_id = $2
                ),
                answer_insert AS (
                    INSERT INTO answers (attempt_id, question_id, selected_option_id)
                    SELECT $3, unnest($1::int[]), unnest($4::int[])
                    ON CONFLICT (attempt_id, question_id) 
                    DO UPDATE SET selected_option_id = EXCLUDED.selected_option_id
                    RETURNING question_id, selected_option_id
                ),
                score_calc AS (
                    SELECT 
                        COALESCE(SUM(CASE WHEN qd.is_correct THEN qd.marks ELSE 0 END), 0) as earned,
                        COALESCE(SUM(qd.marks), 0) as max_marks
                    FROM answer_insert ai
                    JOIN question_data qd ON qd.id = ai.question_id AND qd.option_id = ai.selected_option_id
                )
                SELECT 
                    CASE 
                        WHEN max_marks > 0 THEN ROUND((earned::numeric / max_marks) * 100)
                        ELSE 0 
                    END as final_score
                FROM score_calc
            `, [
                questionIds,
                examId,
                attemptId,
                questionIds.map(qId => answers[qId])
            ]);

            const finalScore = parseInt(result.rows[0]?.final_score || '0');

            // ✅ Update attempt
            await client.query(
                'UPDATE exam_attempts SET score = $1, status = $2, end_time = NOW() WHERE id = $3',
                [finalScore, 'completed', attemptId]
            );

            await client.query('COMMIT');

            // ✅ Invalidate cache
            await invalidateCache(`dashboard:${user.id}`);

            return NextResponse.json({ success: true, score: finalScore });

        } catch (err) {
            await client.query('ROLLBACK');
            console.error(err);
            return NextResponse.json({ error: 'Submission Failed' }, { status: 500 });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
```

**Expected improvement:** Submit 80ms → **<20ms** (75% faster)

***

### **5. Add Database Read Replicas (Optional tapi Recommended)**

Untuk 800 concurrent users, pakai **read replica** untuk separate read/write traffic.

```typescript
// src/lib/db.ts

const writePool = new Pool({
    connectionString: process.env.DATABASE_URL, // Primary
    max: 50,
    min: 10,
    // ... config
});

const readPool = new Pool({
    connectionString: process.env.DATABASE_READ_URL || process.env.DATABASE_URL, // Replica
    max: 100, // More connections for reads
    min: 20,
    // ... config
});

export async function queryRead<T>(text: string, params?: unknown[]): Promise<T[]> {
    const result = await readPool.query(text, params);
    return result.rows as T[];
}

export async function queryWrite<T>(text: string, params?: unknown[]): Promise<T[]> {
    const result = await writePool.query(text, params);
    return result.rows as T[];
}
```

**Usage:**
```typescript
// Read operations (dashboard, questions)
const exams = await queryRead('SELECT * FROM exams WHERE ...');

// Write operations (submit, create)
await queryWrite('INSERT INTO answers ...');
```

***

## **📋 IMPLEMENTATION PRIORITY**

### **HARI INI (2 jam):**

**Priority 1 (CRITICAL - 1 jam):**
```
✅ 1. Increase DB pool: max=100, min=20
✅ 2. Add Redis caching for dashboard
✅ 3. Optimize submit query with CTE
```

**Priority 2 (HIGH - 30 menit):**
```
✅ 4. Add questions pagination (20 per page)
✅ 5. Reduce connection timeouts
```

**Priority 3 (MEDIUM - 30 menit):**
```
✅ 6. Add cache invalidation on submit
✅ 7. Test load with 100 concurrent users
```

***




***

## **✅ EXPECTED PERFORMANCE AFTER OPTIMIZATIONS**

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Code Login | 30ms | <20ms | 33% faster |
| Dashboard | 150ms | <30ms | 80% faster ✅ |
| Questions API | 50ms | <15ms | 70% faster ✅ |
| Exam Submit | 80ms | <20ms | 75% faster ✅ |
| **Total Page Load** | ~500ms | **<150ms** | **70% faster** |

**With 800 concurrent users:**
- Database connections: 100 (from 50) = **2x capacity**
- Cache hit rate: 80% = **5x faster for cached queries**
- Reduced query complexity = **50% faster writes**

***

## **🚀 QUICK START - APPLY OPTIMIZATIONS NOW**

### **Step 1: Update DB Pool (5 menit)**

```typescript
// src/lib/db.ts
const DB_CONFIG: PoolConfig = {
    connectionString: process.env.DATABASE_URL,
    max: 100,  // Changed from 50
    min: 20,   // Changed from 10
    idleTimeoutMillis: 20000,
    connectionTimeoutMillis: 3000,
    statement_timeout: 20000,
    query_timeout: 20000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 5000,
    allowExitOnIdle: false,
};
```

***

### **Step 2: Add Cache Library (10 menit)**

Create `src/lib/cache.ts` dengan code di atas.

***

### **Step 3: Update Dashboard API (15 menit)**

Add caching wrapper di `/api/candidate/dashboard/route.ts`.

***

### **Step 4: Optimize Submit API (20 menit)**

Replace bulk INSERT dengan CTE query di `/api/candidate/exam/[id]/submit/route.ts`.

***

### **Step 5: Test Performance (10 menit)**

```bash
# Install load testing tool
npm install -g loadtest

# Test 100 concurrent users
loadtest -c 100 -n 1000 http://localhost:3000/api/candidate/dashboard

# Expected: <100ms average response time
```

***

