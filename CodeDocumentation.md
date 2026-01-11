# ASISYA WEB - COMPLETE CODE DOCUMENTATION
## Kimia Farma Assessment Platform - For Audit
**Last Updated:** 2026-01-11

---

## � TABLE OF CONTENTS

1. [Project Structure](#-project-structure)
2. [Configuration Files](#-configuration-files)
3. [Core Libraries](#-core-libraries-srclib)
4. [Authentication APIs](#-authentication-api-routes)
5. [Candidate APIs](#-candidate-api-routes)
6. [Settings API](#-settings-api)
7. [Admin APIs](#-admin-api-routes)
8. [Psychologist APIs](#-psychologist-api-routes)
9. [Super Admin APIs](#-super-admin-api-routes)
10. [Frontend Pages](#-frontend-dashboard-pages)
11. [Color Scheme](#-color-scheme-kimia-farma-branding)
12. [CI/CD Configuration](#-cicd-configuration)
13. [Performance Testing](#-performance-testing)

---

## �📁 PROJECT STRUCTURE

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Candidate Login
│   ├── layout.tsx         # Root Layout
│   ├── globals.css        # Global Styles
│   ├── adminpsi/          # Admin/Psychologist Login
│   ├── register/          # Psychologist Registration
│   ├── admin/             # Admin Dashboard & Pages
│   ├── superadmin/        # Super Admin Pages
│   ├── psychologist/      # Psychologist Pages
│   ├── candidate/         # Candidate Pages
│   └── api/               # API Routes
├── lib/                   # Core Libraries
│   ├── db.ts             # Database Pool
│   ├── auth.ts           # JWT Authentication
│   ├── cache.ts          # Caching Layer
│   ├── ratelimit.ts      # Rate Limiting
│   ├── roles.ts          # Role Management
│   └── validation.ts     # Input Validation
└── proxy.ts              # Middleware/Route Protection
```

---

## 🔧 CONFIGURATION FILES

### next.config.ts
```typescript
import type { NextConfig } from "next";

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  headers: async () => [
    {
      source: '/:all*(svg|jpg|png|webp|avif)',
      locale: false,
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
    {
      source: '/_next/static/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
  ],
  experimental: {
    optimizeCss: true,
  },
};

export default withBundleAnalyzer(nextConfig);
```

### package.json
```json
{
  "name": "asisya-web",
  "version": "0.1.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint . --ext .ts,.tsx",
    "lint:strict": "eslint . --ext .ts,.tsx --max-warnings 0",
    "typecheck": "tsc --noEmit",
    "analyze": "ANALYZE=true next build",
    "lighthouse": "lhci autorun",
    "test:perf": "npm run build && npm run lighthouse",
    "ci:check": "npm run lint:strict && npm run typecheck"
  },
  "dependencies": {
    "@upstash/ratelimit": "^2.0.7",
    "@upstash/redis": "^1.36.0",
    "bcryptjs": "^3.0.3",
    "jose": "^6.1.3",
    "lucide-react": "^0.562.0",
    "next": "^16.1.1",
    "pg": "^8.16.3",
    "react": "19.2.3",
    "react-dom": "19.2.3"
  },
  "devDependencies": {
    "@lhci/cli": "^0.14.0",
    "@next/bundle-analyzer": "^15.1.0",
    "typescript": "^5"
  }
}
```

---

## 📚 CORE LIBRARIES (src/lib/)

### src/lib/db.ts - Database Pool
```typescript
import { Pool, PoolConfig } from 'pg';

declare global {
    var __pgPool: Pool | undefined;
}

const isDev = process.env.NODE_ENV !== 'production';

const DB_CONFIG: PoolConfig = {
    connectionString: process.env.DATABASE_URL,
    max: parseInt(process.env.DB_MAX_CONN || '50'),
    min: parseInt(process.env.DB_MIN_CONN || '10'),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    statement_timeout: 30000,
    query_timeout: 30000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    allowExitOnIdle: false,
};

function createPool(): Pool {
    const pool = new Pool(DB_CONFIG);
    pool.on('error', (err) => {
        console.error('❌ Pool error:', err.message);
    });
    if (isDev) {
        pool.on('connect', () => {
            console.log('✅ DB connection established');
        });
    }
    return pool;
}

function getPool(): Pool {
    if (isDev) {
        if (!global.__pgPool) {
            global.__pgPool = createPool();
        }
        return global.__pgPool;
    }
    return createPool();
}

const pool = getPool();

export async function query<T>(text: string, params?: unknown[]): Promise<T[]> {
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 100 && isDev) {
        console.warn(`⚠️ Slow query (${duration}ms):`, text.substring(0, 100));
    }
    return result.rows as T[];
}

export async function queryOne<T>(text: string, params?: unknown[]): Promise<T | null> {
    const rows = await query<T>(text, params);
    return rows[0] || null;
}

export default pool;
```

### src/lib/auth.ts - JWT Authentication
```typescript
import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { UserRole, ROLES, getLoginRedirect } from './roles';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-key-min-32-chars'
);

export interface SessionData {
  id: number;
  role: UserRole | string;
  username: string;
  profileCompleted?: boolean;
  organizationId?: number;
}

export { ROLES, getLoginRedirect };
export type { UserRole };

export async function encrypt(payload: SessionData): Promise<string> {
  return await new SignJWT({ ...payload } as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(JWT_SECRET);
}

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

export async function getSession(cookieValue?: string): Promise<SessionData | null> {
  if (!cookieValue) return null;
  return await decrypt(cookieValue);
}
```

### src/lib/roles.ts - Role Management
```typescript
export const ROLES = {
    CANDIDATE: 'candidate',
    PSYCHOLOGIST: 'psychologist',
    ADMIN: 'admin',
    SUPER_ADMIN: 'super_admin',
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];

export const ROLE_LABELS: Record<UserRole, string> = {
    [ROLES.CANDIDATE]: 'Kandidat',
    [ROLES.PSYCHOLOGIST]: 'Psikolog',
    [ROLES.ADMIN]: 'Admin',
    [ROLES.SUPER_ADMIN]: 'Super Admin',
};

export function canAccessPsychologistFeatures(role: string): boolean {
    return ['psychologist', 'admin', 'super_admin'].includes(role);
}

export function canAccessAdminFeatures(role: string): boolean {
    return ['admin', 'super_admin'].includes(role);
}

export function canAccessSuperAdminFeatures(role: string): boolean {
    return role === ROLES.SUPER_ADMIN;
}

export const ROLE_ROUTES: Record<UserRole, string> = {
    [ROLES.CANDIDATE]: '/candidate/dashboard',
    [ROLES.PSYCHOLOGIST]: '/psychologist/dashboard',
    [ROLES.ADMIN]: '/admin/dashboard',
    [ROLES.SUPER_ADMIN]: '/superadmin/dashboard',
};

export function getLoginRedirect(role: string): string {
    return ROLE_ROUTES[role as UserRole] || '/';
}
```

### src/lib/cache.ts - Caching Layer
```typescript
import { Redis } from '@upstash/redis';

let redis: Redis | null = null;
let redisDisabled = false;
let redisFailCount = 0;
const MAX_REDIS_FAILURES = 3;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
}

const memoryCache = new Map<string, { data: unknown; expires: number }>();

export async function getCached<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 60
): Promise<T> {
    if (redis && !redisDisabled) {
        try {
            const cached = await redis.get<T>(key);
            if (cached) {
                redisFailCount = 0;
                return cached;
            }
            const data = await fetcher();
            redis.setex(key, ttlSeconds, JSON.stringify(data)).catch(() => {});
            redisFailCount = 0;
            return data;
        } catch (error) {
            redisFailCount++;
            if (redisFailCount >= MAX_REDIS_FAILURES) {
                console.warn(`Redis disabled after ${MAX_REDIS_FAILURES} failures.`);
                redisDisabled = true;
            }
        }
    }

    const now = Date.now();
    const cached = memoryCache.get(key);
    if (cached && cached.expires > now) {
        return cached.data as T;
    }

    const data = await fetcher();
    memoryCache.set(key, { data, expires: now + (ttlSeconds * 1000) });
    return data;
}

export async function invalidateCache(pattern: string): Promise<void> {
    if (redis) {
        try {
            if (pattern.includes('*')) {
                const keys = await redis.keys(pattern);
                if (keys.length > 0) await redis.del(...keys);
            } else {
                await redis.del(pattern);
            }
        } catch (error) {
            console.error('Redis invalidation error:', error);
        }
    }
    if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
        for (const key of memoryCache.keys()) {
            if (regex.test(key)) memoryCache.delete(key);
        }
    } else {
        memoryCache.delete(pattern);
    }
}
```

### src/lib/ratelimit.ts - Rate Limiting
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || '';
const IS_STAGING = APP_URL.includes('vercel.app') || APP_URL.includes('localhost');
const IS_PRODUCTION = APP_URL.includes('kfarma.asisyaconsulting.id');

const redis = IS_PRODUCTION && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

function createRateLimiter(windowSize: number, windowUnit: 's' | 'm' | 'h', prefix: string): Ratelimit | null {
  if (IS_STAGING || !redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(windowSize, `${windowSize} ${windowUnit}`),
    analytics: false,
    prefix: `rl:prod:${prefix}`,
    ephemeralCache: new Map(),
  });
}

export const loginRateLimiter = createRateLimiter(10, 'm', 'login');
export const submitRateLimiter = createRateLimiter(5, 'm', 'submit');
export const apiRateLimiter = createRateLimiter(300, 'm', 'api');

export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string,
  timeoutMs: number = 1000
): Promise<{ success: boolean; remaining?: number; reset?: number }> {
  if (IS_STAGING) return { success: true };
  if (!limiter) {
    console.error('🚨 CRITICAL: Rate limiter not configured in production');
    return { success: false };
  }

  try {
    const result = await Promise.race([
      limiter.limit(identifier),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs))
    ]);
    if (result === null) {
      console.error('🚨 Rate limit timeout - blocking request');
      return { success: false };
    }
    return { success: result.success, remaining: result.remaining, reset: result.reset };
  } catch (error) {
    console.error('❌ Rate limit error:', error);
    return { success: false };
  }
}
```

### src/lib/validation.ts - Input Validation
```typescript
export interface ValidationResult<T> {
    success: boolean;
    data?: T;
    error?: string;
}

function isNumber(val: unknown): val is number {
    return typeof val === 'number' && !isNaN(val);
}

function isString(val: unknown): val is string {
    return typeof val === 'string';
}

function isPositiveInt(val: unknown): boolean {
    return isNumber(val) && Number.isInteger(val) && val > 0;
}

function isIntInRange(val: unknown, min: number, max: number): boolean {
    return isNumber(val) && Number.isInteger(val) && val >= min && val <= max;
}

export interface SubmitExamInput {
    attemptId: number;
    answers: Record<number, number>;
}

export function validateSubmitExam(data: unknown): ValidationResult<SubmitExamInput> {
    if (!data || typeof data !== 'object') {
        return { success: false, error: 'Invalid request body' };
    }
    const body = data as Record<string, unknown>;

    if (!isPositiveInt(body.attemptId)) {
        return { success: false, error: 'attemptId must be positive integer' };
    }

    if (!body.answers || typeof body.answers !== 'object') {
        return { success: false, error: 'answers must be an object' };
    }

    const answers = body.answers as Record<string, unknown>;
    const validatedAnswers: Record<number, number> = {};

    for (const [key, value] of Object.entries(answers)) {
        const questionId = parseInt(key, 10);
        if (isNaN(questionId) || questionId <= 0) {
            return { success: false, error: `Invalid question ID: ${key}` };
        }
        if (!isPositiveInt(value)) {
            return { success: false, error: `Invalid option ID for question ${questionId}` };
        }
        validatedAnswers[questionId] = value as number;
    }

    if (Object.keys(validatedAnswers).length === 0) {
        return { success: false, error: 'At least one answer is required' };
    }

    return {
        success: true,
        data: { attemptId: body.attemptId as number, answers: validatedAnswers }
    };
}

export interface ProfileInput {
    full_name: string;
    tanggal_lahir: string;
    jenis_kelamin: 'Laki-laki' | 'Perempuan';
    pendidikan_terakhir: string;
    lokasi_test: string;
    alamat_ktp: string;
    nik: string;
}

export function validateProfile(data: unknown): ValidationResult<ProfileInput> {
    if (!data || typeof data !== 'object') {
        return { success: false, error: 'Invalid request body' };
    }
    const body = data as Record<string, unknown>;

    if (!isString(body.full_name) || body.full_name.trim().length < 1) {
        return { success: false, error: 'full_name must be 1-255 characters' };
    }
    if (!isString(body.tanggal_lahir) || !/^\d{4}-\d{2}-\d{2}$/.test(body.tanggal_lahir)) {
        return { success: false, error: 'tanggal_lahir must be YYYY-MM-DD format' };
    }
    if (body.jenis_kelamin !== 'Laki-laki' && body.jenis_kelamin !== 'Perempuan') {
        return { success: false, error: 'jenis_kelamin must be Laki-laki or Perempuan' };
    }
    if (!isString(body.nik) || !/^\d{16}$/.test(body.nik)) {
        return { success: false, error: 'nik must be exactly 16 digits' };
    }

    return {
        success: true,
        data: {
            full_name: (body.full_name as string).trim(),
            tanggal_lahir: body.tanggal_lahir as string,
            jenis_kelamin: body.jenis_kelamin as 'Laki-laki' | 'Perempuan',
            pendidikan_terakhir: (body.pendidikan_terakhir as string).trim(),
            lokasi_test: (body.lokasi_test as string).trim(),
            alamat_ktp: (body.alamat_ktp as string).trim(),
            nik: body.nik as string,
        }
    };
}
```

### src/proxy.ts - Middleware/Route Protection
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'your-super-secret-key-min-32-chars'
);

const PROTECTED_ROUTES = [
    '/candidate/dashboard',
    '/candidate/exam',
    '/candidate/profile-completion',
    '/psychologist',
    '/admin',
    '/superadmin',
];

const PUBLIC_ROUTES = ['/', '/adminpsi', '/register', '/api/auth/login', '/api/auth/candidate-login'];
const STATIC_PATHS = ['/_next', '/favicon.ico', '/asisya.png', '/images', '/fonts'];

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (STATIC_PATHS.some(path => pathname.startsWith(path))) {
        return NextResponse.next();
    }

    if (PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))) {
        return NextResponse.next();
    }

    const isProtected = PROTECTED_ROUTES.some(route =>
        pathname === route || pathname.startsWith(route + '/')
    );

    if (isProtected) {
        const sessionCookie = request.cookies.get('user_session');

        if (!sessionCookie?.value) {
            const loginUrl = pathname.startsWith('/candidate')
                ? new URL('/', request.url)
                : new URL('/adminpsi', request.url);
            return NextResponse.redirect(loginUrl);
        }

        try {
            const { payload } = await jwtVerify(sessionCookie.value, JWT_SECRET);
            const role = payload.role as string;

            // Role-based access control
            if (pathname.startsWith('/superadmin') && role !== 'super_admin') {
                return NextResponse.redirect(new URL('/adminpsi', request.url));
            }
            if (pathname.startsWith('/admin') && !['psychologist', 'admin', 'super_admin'].includes(role)) {
                return NextResponse.redirect(new URL('/adminpsi', request.url));
            }
            if (pathname.startsWith('/candidate') && role !== 'candidate') {
                return NextResponse.redirect(new URL('/psychologist/dashboard', request.url));
            }

            const response = NextResponse.next();
            response.headers.set('x-user-id', String(payload.id));
            response.headers.set('x-user-role', role);
            return response;

        } catch {
            const isAdminRoute = pathname.startsWith('/psychologist') ||
                pathname.startsWith('/admin') || pathname.startsWith('/superadmin');
            const loginUrl = isAdminRoute ? '/adminpsi' : '/';
            const response = NextResponse.redirect(new URL(loginUrl, request.url));
            response.cookies.delete('user_session');
            return response;
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/candidate/:path*', '/psychologist/:path*', '/admin/:path*', '/superadmin/:path*'],
};
```

---

## 🔐 API ROUTES - AUTHENTICATION

### src/app/api/auth/login/route.ts
```typescript
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { encrypt, getLoginRedirect, ROLES } from '@/lib/auth';
import { loginRateLimiter, checkRateLimit } from '@/lib/ratelimit';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { username, password } = body;

        if (!username || !password) {
            return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
        }

        const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
        const identifier = `${username}:${ip}`;

        const rateLimit = await checkRateLimit(loginRateLimiter, identifier, 1000);
        if (!rateLimit.success) {
            return NextResponse.json({ error: 'Terlalu banyak percobaan login.' }, { status: 429 });
        }

        const result = await pool.query(
            'SELECT id, username, password_hash, role, is_active, profile_completed FROM users WHERE username = $1 OR email = $1 LIMIT 1',
            [username]
        );
        const user = result.rows[0];

        if (!user) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        if (user.role === ROLES.PSYCHOLOGIST && !user.is_active) {
            return NextResponse.json({ error: 'Akun Anda belum diaktifkan oleh Admin.' }, { status: 403 });
        }

        if (user.role === ROLES.CANDIDATE) {
            return NextResponse.json({ error: 'Gunakan kode akses di halaman utama.' }, { status: 403 });
        }

        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const sessionData = { id: user.id, role: user.role, username: user.username, profileCompleted: user.profile_completed };
        const token = await encrypt(sessionData);
        const redirectPath = getLoginRedirect(user.role);

        const response = NextResponse.json({ success: true, role: user.role, redirect: redirectPath });
        response.cookies.set({
            name: 'user_session',
            value: token,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 8,
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
```

### src/app/api/auth/candidate-login/route.ts
```typescript
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { encrypt } from '@/lib/auth';
import { ROLES } from '@/lib/roles';

const REUSE_WINDOW_DAYS = 2;

export async function POST(req: NextRequest) {
    try {
        const { code } = await req.json();

        if (!code || typeof code !== 'string') {
            return NextResponse.json({ error: 'Kode akses diperlukan' }, { status: 400 });
        }

        const normalizedCode = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

        const result = await pool.query(
            `SELECT cc.id as code_id, cc.candidate_id, cc.admin_id, cc.exam_id, cc.expires_at,
                    cc.max_uses, cc.current_uses, cc.used_at, cc.metadata,
                    u.id as user_id, u.username, u.profile_completed
             FROM candidate_codes cc
             LEFT JOIN users u ON cc.candidate_id = u.id
             WHERE REPLACE(cc.code, '-', '') = $1 AND cc.is_active = true LIMIT 1`,
            [normalizedCode]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Kode tidak valid atau sudah tidak aktif' }, { status: 401 });
        }

        const codeData = result.rows[0];

        if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
            return NextResponse.json({ error: 'Kode sudah kedaluwarsa' }, { status: 401 });
        }

        // Check max_uses with 2-day reuse window
        if (codeData.max_uses && codeData.current_uses >= codeData.max_uses) {
            if (codeData.used_at) {
                const usedAt = new Date(codeData.used_at);
                const reuseDeadline = new Date(usedAt.getTime() + (REUSE_WINDOW_DAYS * 24 * 60 * 60 * 1000));
                if (new Date() > reuseDeadline) {
                    return NextResponse.json({ error: 'Kode sudah mencapai batas penggunaan' }, { status: 401 });
                }
            } else {
                return NextResponse.json({ error: 'Kode sudah mencapai batas penggunaan' }, { status: 401 });
            }
        }

        let userId: number;
        let profileCompleted = false;
        let username: string;

        if (codeData.candidate_id) {
            userId = codeData.candidate_id;
            profileCompleted = codeData.profile_completed || false;
            username = codeData.username || `candidate_${userId}`;
            await pool.query('UPDATE candidate_codes SET current_uses = current_uses + 1 WHERE id = $1', [codeData.code_id]);
        } else {
            const candidateUsername = `candidate_${normalizedCode.toLowerCase()}`;
            let candidateName: string | null = null;
            if (codeData.metadata && typeof codeData.metadata === 'object') {
                candidateName = codeData.metadata.candidate_name || null;
            }

            const newUser = await pool.query(
                `INSERT INTO users (username, email, password_hash, role, organization_id, profile_completed, registration_type, full_name)
                 VALUES ($1, $2, $3, $4, $5, false, 'candidate_code', $6) RETURNING id, username`,
                [candidateUsername, `${candidateUsername}@candidate.local`, 'CANDIDATE_NO_PASSWORD', ROLES.CANDIDATE, codeData.admin_id, candidateName]
            );

            userId = newUser.rows[0].id;
            username = newUser.rows[0].username;

            await pool.query(
                `UPDATE candidate_codes SET candidate_id = $1, used_at = NOW(), current_uses = current_uses + 1 WHERE id = $2`,
                [userId, codeData.code_id]
            );
        }

        const token = await encrypt({
            id: userId, role: ROLES.CANDIDATE, username, profileCompleted, organizationId: codeData.admin_id
        });

        const response = NextResponse.json({ success: true, role: ROLES.CANDIDATE, profileCompleted, examId: codeData.exam_id });
        response.cookies.set({
            name: 'user_session', value: token, httpOnly: true,
            secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 60 * 60 * 8, path: '/',
        });

        return response;
    } catch (error) {
        console.error('Candidate login error:', error);
        return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
    }
}
```

---

## 📝 API ROUTES - CANDIDATE EXAM

### src/app/api/candidate/dashboard/route.ts
```typescript
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const user = await getSession(sessionCookie?.value);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const client = await pool.connect();
        try {
            const dashboardQuery = `
                WITH user_info AS (
                    SELECT id, username, email, full_name FROM users WHERE id = $1
                ),
                in_progress_exam AS (
                    SELECT ea.id as attempt_id, ea.exam_id, e.title
                    FROM exam_attempts ea JOIN exams e ON ea.exam_id = e.id
                    WHERE ea.user_id = $1 AND ea.status = 'in_progress' LIMIT 1
                ),
                completed_exams AS (
                    SELECT ea.id as attempt_id, e.title, ea.end_time as date, ea.score, ea.status
                    FROM exam_attempts ea JOIN exams e ON ea.exam_id = e.id
                    WHERE ea.user_id = $1 AND ea.status = 'completed' ORDER BY ea.end_time DESC
                ),
                available_exams AS (
                    SELECT e.* FROM exams e WHERE e.status = 'published'
                    AND e.id NOT IN (SELECT exam_id FROM exam_attempts WHERE user_id = $1 AND status = 'completed')
                    ORDER BY e.created_at DESC
                )
                SELECT 
                    (SELECT row_to_json(user_info.*) FROM user_info) as user,
                    (SELECT row_to_json(in_progress_exam.*) FROM in_progress_exam) as in_progress,
                    COALESCE((SELECT json_agg(completed_exams.*) FROM completed_exams), '[]'::json) as completed,
                    COALESCE((SELECT json_agg(available_exams.*) FROM available_exams), '[]'::json) as todo
            `;

            const result = await client.query(dashboardQuery, [user.id]);
            const data = result.rows[0];

            return NextResponse.json({
                user: data.user, inProgress: data.in_progress,
                completed: data.completed, todo: data.todo
            });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
```

### src/app/api/candidate/exam/[id]/questions/route.ts
```typescript
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id: examId } = await params;

    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const user = await getSession(sessionCookie?.value);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const client = await pool.connect();

        try {
            const examRes = await client.query('SELECT * FROM exams WHERE id = $1', [examId]);
            if (examRes.rows.length === 0) return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
            const exam = examRes.rows[0];

            const attemptRes = await client.query(
                'SELECT * FROM exam_attempts WHERE user_id = $1 AND exam_id = $2',
                [user.id, examId]
            );

            let attemptId;
            let startTime: Date;

            if (attemptRes.rows.length > 0) {
                const attempt = attemptRes.rows[0];
                if (attempt.status === 'completed') {
                    return NextResponse.json({ error: 'Exam already completed' }, { status: 403 });
                }
                attemptId = attempt.id;
                startTime = new Date(attempt.start_time);
            } else {
                const newAttempt = await client.query(
                    'INSERT INTO exam_attempts (user_id, exam_id, start_time, status) VALUES ($1, $2, NOW(), $3) RETURNING id, start_time',
                    [user.id, examId, 'in_progress']
                );
                attemptId = newAttempt.rows[0].id;
                startTime = new Date(newAttempt.rows[0].start_time);
            }

            // Calculate remaining time
            const now = new Date();
            const elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
            const totalSeconds = exam.duration_minutes * 60;
            const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);

            // Get questions - OPTIMIZED with Map for O(1) lookup
            const qRes = await client.query('SELECT id, text, marks FROM questions WHERE exam_id = $1 ORDER BY id ASC', [examId]);
            const questions = qRes.rows;
            const questionIds = questions.map(q => q.id);

            const optRes = await client.query(
                `SELECT id, question_id, text FROM options WHERE question_id = ANY($1::int[]) ORDER BY question_id, id`,
                [questionIds]
            );

            const optionsMap = new Map<number, Array<{ id: number; text: string }>>();
            optRes.rows.forEach((opt: any) => {
                if (!optionsMap.has(opt.question_id)) optionsMap.set(opt.question_id, []);
                optionsMap.get(opt.question_id)!.push({ id: opt.id, text: opt.text });
            });

            const questionsDid = questions.map(q => ({ ...q, options: optionsMap.get(q.id) || [] }));

            // Load saved answers
            const savedAnswersRes = await client.query(
                `SELECT question_id, selected_option_id FROM exam_answers WHERE attempt_id = $1`,
                [attemptId]
            );
            const savedAnswers: { [key: number]: number } = {};
            savedAnswersRes.rows.forEach((row: any) => {
                savedAnswers[row.question_id] = row.selected_option_id;
            });

            return NextResponse.json({
                exam: { 
                    title: exam.title, duration: exam.duration_minutes,
                    display_mode: exam.display_mode || 'per_page',
                    require_all_answers: exam.require_all_answers || false
                },
                attemptId, questions: questionsDid, remainingSeconds, savedAnswers
            });

        } finally {
            client.release();
        }
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
```

### src/app/api/candidate/exam/[id]/submit/route.ts
```typescript
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';
import { submitRateLimiter, checkRateLimit } from '@/lib/ratelimit';
import { validateSubmitExam } from '@/lib/validation';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const user = await getSession(sessionCookie?.value);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const rateLimit = await checkRateLimit(submitRateLimiter, `submit:${user.id}`);
        if (!rateLimit.success) {
            return NextResponse.json({ error: 'Terlalu banyak percobaan submit.' }, { status: 429 });
        }

        const body = await req.json();
        const validation = validateSubmitExam(body);
        if (!validation.success) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        const { attemptId, answers } = validation.data!;
        const questionIds = Object.keys(answers).map(Number);

        const client = await pool.connect();

        try {
            await client.query('BEGIN');
            const { id: examId } = await params;

            const questionsData = await client.query(
                `SELECT q.id, q.marks, o.id as option_id, o.is_correct
                 FROM questions q LEFT JOIN options o ON o.question_id = q.id
                 WHERE q.id = ANY($1::int[]) AND q.exam_id = $2`,
                [questionIds, examId]
            );

            const marksMap = new Map<number, number>();
            const correctnessMap = new Map<number, boolean>();
            questionsData.rows.forEach(row => {
                marksMap.set(row.id, row.marks);
                correctnessMap.set(row.option_id, row.is_correct);
            });

            let totalScore = 0;
            const insertValues: string[] = [];
            const insertParams: any[] = [attemptId];

            questionIds.forEach((qId, index) => {
                const selectedOptId = answers[qId];
                const marks = marksMap.get(qId) || 1;
                const isCorrect = correctnessMap.get(selectedOptId) || false;
                if (isCorrect) totalScore += marks;

                const paramOffset = index * 2 + 2;
                insertValues.push(`($1, $${paramOffset}, $${paramOffset + 1})`);
                insertParams.push(qId, selectedOptId);
            });

            if (insertValues.length > 0) {
                const bulkInsertQuery = `
                    INSERT INTO answers (attempt_id, question_id, selected_option_id)
                    VALUES ${insertValues.join(', ')}
                    ON CONFLICT (attempt_id, question_id) DO UPDATE SET selected_option_id = EXCLUDED.selected_option_id
                `;
                await client.query(bulkInsertQuery, insertParams);
            }

            const totalMarksRes = await client.query('SELECT SUM(marks) as total FROM questions WHERE exam_id = $1', [examId]);
            const maxMarks = parseInt(totalMarksRes.rows[0]?.total || '0');
            const finalScore = maxMarks > 0 ? Math.round((totalScore / maxMarks) * 100) : 0;

            await client.query(
                'UPDATE exam_attempts SET score = $1, status = $2, end_time = NOW() WHERE id = $3',
                [finalScore, 'completed', attemptId]
            );

            await client.query('COMMIT');
            return NextResponse.json({ success: true, score: finalScore });

        } catch (err) {
            await client.query('ROLLBACK');
            console.error(err);
            return NextResponse.json({ error: 'Submission Failed' }, { status: 500 });
        } finally {
            client.release();
        }
    } catch (error) {
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
```

## 🎨 FRONTEND PAGES

### src/app/layout.tsx - Root Layout
```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Kimia Farma Assessment",
  description: "Kimia Farma Assessment - Sistem Asesmen Psikologi",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/kimia-farma-logo.jpg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

### src/app/page.tsx - Candidate Login (Key Parts)
```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Users, CheckCircle } from 'lucide-react';

export default function CandidateLoginPage() {
  const router = useRouter();
  const [candidateCode, setCandidateCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCandidateLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/candidate-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: candidateCode.trim().toUpperCase() }),
      });

      const data = await res.json();

      if (res.ok) {
        if (!data.profileCompleted) {
          router.push('/candidate/profile-completion');
        } else {
          router.push('/candidate/dashboard');
        }
      } else {
        setError(data.error || 'Kode tidak valid');
      }
    } catch (err) {
      setError('Internal server error');
    } finally {
      setLoading(false);
    }
  };

  const formatCode = (value: string) => {
    const cleaned = value.replace(/[^A-Z0-9]/g, '').substring(0, 16);
    const parts = cleaned.match(/.{1,4}/g) || [];
    return parts.join('-');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#E6FBFB] via-[#BEE7F0] to-[#0993A9]/20">
      <div className="w-full max-w-[1100px] min-h-[650px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col lg:flex-row">
        {/* Left Side - Hero */}
        <div className="relative hidden lg:flex w-full lg:w-1/2 bg-cover bg-center flex-col justify-between p-10 text-white overflow-hidden"
          style={{ backgroundImage: `linear-gradient(to bottom right, rgba(7, 31, 86, 0.92), rgba(9, 147, 169, 0.85)), url('...')` }}>
          <div className="relative z-10">
            <img src="/kimia-farma-logo.jpg" alt="Kimia Farma" className="h-14 lg:h-16 w-auto rounded-xl shadow-xl shadow-black/30" />
          </div>
          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-[#EF942A]">
              <Users size={18} /> Portal Khusus Kandidat
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold">Selamat Datang di<br />Portal Asesmen</h1>
            <p className="text-white/80 text-base lg:text-lg max-w-md">
              Platform asesmen psikologi profesional untuk mengukur potensi dan kepribadian Anda.
            </p>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full lg:w-1/2 bg-white p-8 lg:p-16 flex flex-col justify-center">
          <div className="mb-8">
            <span className="inline-block py-1.5 px-4 rounded-full bg-[#0993A9]/10 text-[#0993A9] text-xs font-bold">
              Portal Peserta
            </span>
            <h1 className="text-[#071F56] text-3xl font-bold mt-4">Masuk dengan Kode</h1>
          </div>

          <form onSubmit={handleCandidateLogin} className="flex flex-col gap-5 max-w-[400px]">
            <input
              type="text"
              value={candidateCode}
              onChange={(e) => setCandidateCode(formatCode(e.target.value.toUpperCase()))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 h-14 px-4 text-lg text-[#071F56] placeholder-slate-400 focus:border-[#0993A9] font-mono tracking-widest text-center uppercase"
              placeholder="XXXX - XXXX - XXXX"
              maxLength={19}
            />
            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl">{error}</div>}
            <button type="submit" disabled={loading || candidateCode.length < 19}
              className="w-full bg-gradient-to-r from-[#071F56] to-[#0993A9] text-white h-12 rounded-xl font-bold shadow-lg">
              {loading ? 'MEMVERIFIKASI...' : 'MASUK'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
```

## ⚙️ API ROUTES - SETTINGS

### src/app/api/settings/route.ts
```typescript
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

let settingsCache: Record<string, string> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 300000; // 5 minutes

export async function GET() {
    try {
        const now = Date.now();
        if (settingsCache && (now - cacheTimestamp) < CACHE_TTL) {
            return NextResponse.json(settingsCache, {
                headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300' }
            });
        }

        const settings = await query<{ setting_key: string; setting_value: string }>(
            'SELECT setting_key, setting_value FROM site_settings'
        );

        const settingsObj: Record<string, string> = {};
        settings.forEach(s => { settingsObj[s.setting_key] = s.setting_value; });

        settingsCache = settingsObj;
        cacheTimestamp = now;

        return NextResponse.json(settingsObj, {
            headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300' }
        });
    } catch (error) {
        console.error('Fetch site settings error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !['admin', 'super_admin'].includes(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await req.json();
        const { company_name, company_tagline, logo_url, primary_color } = body;

        if (company_name !== undefined) {
            await query('INSERT INTO site_settings (setting_key, setting_value) VALUES ($1, $2) ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2', ['company_name', company_name]);
        }
        // ... similar for other settings

        settingsCache = null;
        cacheTimestamp = 0;

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
```

---

## 🚀 CI/CD WORKFLOW

### .github/workflows/ci-cd.yml (Key Parts)
```yaml
name: CI/CD Pipeline (Staging & Production)

on:
  push:
    branches: [develop]
  pull_request:
    branches: [develop]

jobs:
  # Code Quality Check
  code-quality:
    name: Code Quality Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck

  # Lighthouse Performance Audit
  lighthouse-ci:
    name: Lighthouse Performance Audit
    runs-on: ubuntu-latest
    needs: code-quality
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - run: npm install -g @lhci/cli
      - run: lhci autorun --config=lighthouserc.js || true

  # Bundle Analysis (PR only)
  bundle-analysis:
    name: Bundle Size Analysis
    runs-on: ubuntu-latest
    needs: code-quality
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: ANALYZE=true npm run build

  # Staging Deploy
  deploy-staging:
    name: Staging Setup
    runs-on: ubuntu-latest
    needs: [code-quality, lighthouse-ci]
    steps:
      - uses: actions/checkout@v4
      - run: sudo apt-get install -y postgresql-client
      - name: Run Migrations
        run: |
          for migration in migrations/*.sql; do
            psql "${{ secrets.STAGING_DATABASE_URL }}" -f "$migration" || true
          done

  # Production Deploy (after approval)
  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: request-approval
    environment: production
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USERNAME }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /var/www/asisya-web
            pm2 restart asisya-web
```

## 📊 PERFORMANCE TESTING

### lighthouserc.js
```javascript
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'Ready in',
      url: ['http://localhost:3000/', 'http://localhost:3000/adminpsi'],
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--no-sandbox --disable-gpu --headless',
        formFactor: 'mobile',
        throttling: { rttMs: 150, throughputKbps: 1638, cpuSlowdownMultiplier: 4 },
      },
    },
    assert: {
      assertions: {
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
        'categories:performance': ['warn', { minScore: 0.8 }],
        'categories:accessibility': ['warn', { minScore: 0.9 }],
        'resource-summary:script:size': ['warn', { maxNumericValue: 500000 }],
      },
    },
    upload: { target: 'temporary-public-storage' },
  },
};
```

---

## 🗄️ DATABASE INDEXES

```sql
-- Settings optimization
CREATE INDEX IF NOT EXISTS idx_site_settings_key ON site_settings(setting_key);

-- Login optimization (94% faster)
CREATE INDEX idx_candidate_codes_code ON candidate_codes(code) WHERE is_active = true;
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- Dashboard queries (81% faster)
CREATE INDEX idx_exam_attempts_user_exam ON exam_attempts(user_id, exam_id);
CREATE INDEX idx_exam_attempts_in_progress ON exam_attempts(user_id, exam_id) WHERE status = 'in_progress';
CREATE INDEX idx_exam_attempts_completed ON exam_attempts(user_id, status, end_time DESC) WHERE status = 'completed';

-- Exam loading (75% faster)
CREATE INDEX idx_questions_exam ON questions(exam_id);
CREATE INDEX idx_options_question_correct ON options(question_id, is_correct);

-- Submit validation (73% faster)
CREATE INDEX idx_answers_attempt ON answers(attempt_id);

-- Admin queries
CREATE INDEX idx_users_organization ON users(organization_id);
CREATE INDEX idx_users_role_org ON users(role, organization_id);
CREATE INDEX idx_exam_assessors_admin ON exam_assessors(admin_id);
```

---

## 📈 PERFORMANCE RESULTS

| Query Type      | Before  | After  | Improvement |
|-----------------|---------|--------|-------------|
| Code Login      | 500ms   | 30ms   | 94% faster  |
| Dashboard       | 800ms   | 150ms  | 81% faster  |
| Exam Submit     | 300ms   | 80ms   | 73% faster  |
| Questions API   | 200ms   | 50ms   | 75% faster  |
| Settings API    | 1700ms  | 100ms  | 94% faster  |

---

## 👨‍💼 ADMIN API ROUTES

### src/app/api/admin/codes/route.ts - List Codes
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { getSession, ROLES } from '@/lib/auth';
import { canAccessAdminFeatures } from '@/lib/roles';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !canAccessAdminFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
        }

        const client = await pool.connect();
        try {
            const query = `
                SELECT cc.id, cc.code, cc.created_at, cc.expires_at, cc.used_at,
                       cc.is_active, cc.current_uses, cc.max_uses,
                       COALESCE(cc.metadata->>'candidate_name', cc.metadata->>'name') as candidate_name,
                       e.title as exam_title,
                       u.id as used_by_user_id, u.email as used_by_email
                FROM candidate_codes cc
                LEFT JOIN exams e ON cc.exam_id = e.id
                LEFT JOIN users u ON cc.candidate_id = u.id
                WHERE cc.is_active = true
                ORDER BY cc.created_at DESC
            `;
            const result = await client.query(query);
            return NextResponse.json({ codes: result.rows });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error fetching codes:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
```

### src/app/api/admin/codes/generate/route.ts - Generate Codes
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessAdminFeatures } from '@/lib/roles';

function generateCode(): string {
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
            return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
        }

        const { count = 1, examId, expiresInDays = 7, candidateName } = await req.json();

        if (count < 1 || count > 100) {
            return NextResponse.json({ error: 'Jumlah kode harus antara 1-100' }, { status: 400 });
        }

        const client = await pool.connect();
        try {
            const codes: string[] = [];
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + expiresInDays);

            for (let i = 0; i < count; i++) {
                let code: string;
                let isUnique = false;

                while (!isUnique) {
                    code = generateCode();
                    const existing = await client.query('SELECT id FROM candidate_codes WHERE code = $1', [code]);
                    if (existing.rows.length === 0) {
                        isUnique = true;
                        const metadata = candidateName && count === 1 ? JSON.stringify({ name: candidateName }) : '{}';

                        await client.query(
                            `INSERT INTO candidate_codes (code, created_by, admin_id, exam_id, expires_at, metadata)
                             VALUES ($1, $2, $3, $4, $5, $6)`,
                            [code, session.id, session.organizationId || null, examId || null, expiresAt.toISOString(), metadata]
                        );
                        codes.push(code);
                    }
                }
            }

            return NextResponse.json({ success: true, codes, expiresAt: expiresAt.toISOString() });
        } finally {
            client.release();
        }
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
```

### src/app/api/admin/exams/route.ts - List Exams
```typescript
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';
import { canAccessPsychologistFeatures } from '@/lib/roles';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !canAccessPsychologistFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const client = await pool.connect();
        try {
            const query = `
                SELECT e.*, COUNT(q.id) as question_count 
                FROM exams e
                LEFT JOIN questions q ON e.id = q.exam_id
                GROUP BY e.id
                ORDER BY e.created_at DESC
            `;
            const result = await client.query(query);
            return NextResponse.json(result.rows);
        } finally {
            client.release();
        }
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
```

---

*Continued in next section...*

### src/app/api/admin/stats/route.ts - Admin Statistics
```typescript
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { getSession, ROLES } from '@/lib/auth';
import { canAccessAdminFeatures } from '@/lib/roles';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !canAccessAdminFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const client = await pool.connect();
        try {
            let organization = null;
            let orgId = null;

            try {
                const orgResult = await client.query(
                    `SELECT * FROM organizations WHERE admin_id = $1`,
                    [session.id]
                );
                if (orgResult.rows.length > 0) {
                    organization = orgResult.rows[0];
                    orgId = organization.id;
                }
            } catch (e) {
                console.log('Organizations table query error:', e);
            }

            // Count queries - optimized for performance
            const [psychologists, candidates, exams, sessions] = await Promise.all([
                orgId
                    ? client.query(`SELECT COUNT(*) as count FROM users WHERE role = 'psychologist' AND organization_id = $1`, [orgId])
                    : client.query(`SELECT COUNT(*) as count FROM users WHERE role = 'psychologist'`),
                client.query(`SELECT COUNT(*) as count FROM users WHERE role = 'candidate'`),
                client.query(`SELECT COUNT(*) as count FROM exams`),
                client.query(`SELECT COUNT(*) as count FROM exam_attempts WHERE status = 'in_progress'`)
            ]);

            const stats = {
                totalPsychologists: parseInt(psychologists.rows[0].count),
                totalCandidates: parseInt(candidates.rows[0].count),
                totalExams: parseInt(exams.rows[0].count),
                activeSessions: parseInt(sessions.rows[0].count)
            };

            return NextResponse.json({ stats, organization });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
```

### src/app/api/admin/psychologists/route.ts - Manage Psychologists
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { getSession, ROLES } from '@/lib/auth';
import { canAccessAdminFeatures } from '@/lib/roles';
import bcrypt from 'bcryptjs';

// GET - List all psychologists under this admin
export async function GET() {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !canAccessAdminFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const client = await pool.connect();
        try {
            let query: string;
            let params: (string | number)[] = [];

            if (session.role === ROLES.SUPER_ADMIN) {
                // Super admin sees all psychologists
                query = `
                    SELECT u.id, u.username, u.email, u.full_name, u.is_active, u.created_at,
                           COUNT(DISTINCT cc.id) as exam_count,
                           COUNT(DISTINCT cc.candidate_id) as candidate_count
                    FROM users u
                    LEFT JOIN candidate_codes cc ON cc.created_by = u.id
                    WHERE u.role = 'psychologist'
                    GROUP BY u.id
                    ORDER BY u.created_at DESC
                `;
            } else {
                // Admin sees psychologists in their org
                let orgId = null;
                const orgResult = await client.query(
                    'SELECT id FROM organizations WHERE admin_id = $1',
                    [session.id]
                );
                orgId = orgResult.rows[0]?.id;

                if (orgId) {
                    query = `
                        SELECT u.id, u.username, u.email, u.full_name, u.is_active, u.created_at,
                               COUNT(DISTINCT cc.id) as exam_count,
                               COUNT(DISTINCT cc.candidate_id) as candidate_count
                        FROM users u
                        LEFT JOIN candidate_codes cc ON cc.created_by = u.id
                        WHERE u.role = 'psychologist' AND (u.organization_id = $1 OR u.organization_id IS NULL)
                        GROUP BY u.id
                        ORDER BY u.is_active DESC, u.created_at DESC
                    `;
                    params = [orgId];
                } else {
                    query = `SELECT u.id, u.username, u.email, u.full_name, u.is_active FROM users u WHERE u.role = 'psychologist'`;
                }
            }

            const result = await client.query(query, params);
            return NextResponse.json(result.rows);
        } finally {
            client.release();
        }
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST - Create new psychologist
export async function POST(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !canAccessAdminFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { username, email, password, fullName } = await req.json();

        if (!username || !email || !password) {
            return NextResponse.json({ error: 'Username, email, dan password wajib diisi' }, { status: 400 });
        }

        const client = await pool.connect();
        try {
            // Check if username/email exists
            const existingUser = await client.query(
                'SELECT id FROM users WHERE username = $1 OR email = $2',
                [username, email]
            );
            if (existingUser.rows.length > 0) {
                return NextResponse.json({ error: 'Username atau email sudah digunakan' }, { status: 400 });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create psychologist
            const result = await client.query(
                `INSERT INTO users (username, email, password_hash, full_name, role, is_active, created_at)
                 VALUES ($1, $2, $3, $4, 'psychologist', true, NOW())
                 RETURNING id, username, email, full_name, created_at`,
                [username, email, hashedPassword, fullName || null]
            );

            return NextResponse.json({ success: true, psychologist: result.rows[0] });
        } finally {
            client.release();
        }
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
```

---

## 🧑‍⚕️ PSYCHOLOGIST API ROUTES

### src/app/api/psychologist/exams/route.ts - List Assigned Exams
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

        const client = await pool.connect();
        try {
            const query = `
                SELECT 
                    e.*, 
                    COUNT(DISTINCT q.id) as question_count,
                    COUNT(DISTINCT cg.candidate_id) as assigned_candidates,
                    CASE WHEN COUNT(DISTINCT cg.candidate_id) > 0 THEN true ELSE false END as is_assigned_to_me
                FROM exams e
                LEFT JOIN questions q ON e.id = q.exam_id
                LEFT JOIN candidate_groups cg ON e.id = cg.exam_id AND cg.assessor_id = $1
                GROUP BY e.id
                ORDER BY e.created_at DESC
            `;

            const result = await client.query(query, [session.userId]);
            return NextResponse.json(result.rows);
        } finally {
            client.release();
        }
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
```

### src/app/api/psychologist/candidates/route.ts - List Candidates
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

        const client = await pool.connect();
        try {
            const query = `
                SELECT 
                    u.id, u.full_name, u.email, u.created_at,
                    COUNT(DISTINCT ea.id) as exam_count,
                    COUNT(DISTINCT CASE WHEN ea.status = 'completed' THEN ea.id END) as completed_count,
                    MAX(CASE WHEN ea.status = 'completed' THEN ea.end_time END) as last_exam_date
                FROM users u
                LEFT JOIN exam_attempts ea ON u.id = ea.user_id
                WHERE u.role = $1
                GROUP BY u.id
                ORDER BY u.created_at DESC
            `;
            
            const result = await client.query(query, [ROLES.CANDIDATE]);
            return NextResponse.json(result.rows);
        } finally {
            client.release();
        }
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
```

### src/app/api/psychologist/codes/route.ts - Manage Codes
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { getSession, ROLES } from '@/lib/auth';
import { canAccessPsychologistFeatures } from '@/lib/roles';

// Generate random code like XXXX-XXXX-XXXX
function generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
        if (i > 0 && i % 4 === 0) code += '-';
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// GET - List all codes created by this psychologist
export async function GET() {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !canAccessPsychologistFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const client = await pool.connect();
        try {
            let query: string;
            let params: (string | number)[] = [];

            if (session.role === ROLES.SUPER_ADMIN || session.role === ROLES.ADMIN) {
                // Super admin and admin can see all codes
                query = `
                    SELECT cc.*, e.title as exam_title, cc.metadata->>'name' as candidate_name
                    FROM candidate_codes cc
                    LEFT JOIN exams e ON cc.exam_id = e.id
                    ORDER BY cc.created_at DESC
                `;
            } else {
                // Psychologist sees only their codes
                query = `
                    SELECT cc.*, e.title as exam_title, cc.metadata->>'name' as candidate_name
                    FROM candidate_codes cc
                    LEFT JOIN exams e ON cc.exam_id = e.id
                    WHERE cc.created_by = $1
                    ORDER BY cc.created_at DESC
                `;
                params = [session.id];
            }

            const result = await client.query(query, params);
            return NextResponse.json(result.rows);
        } finally {
            client.release();
        }
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
```

---

## 🔐 SUPER ADMIN API ROUTES

### src/app/api/superadmin/stats/route.ts - Super Admin Statistics
```typescript
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { getSession, ROLES } from '@/lib/auth';
import { canAccessSuperAdminFeatures } from '@/lib/roles';

export async function GET() {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('user_session');
    const session = await getSession(sessionCookie?.value);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canAccessSuperAdminFeatures(session.role)) {
        return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 });
    }

    try {
        // Get all statistics in parallel
        const [adminsResult, psychResult, candidatesResult, examsResult] = await Promise.all([
            pool.query('SELECT COUNT(*) as count FROM users WHERE role = $1', [ROLES.ADMIN]),
            pool.query('SELECT COUNT(*) as count FROM users WHERE role = $1', [ROLES.PSYCHOLOGIST]),
            pool.query('SELECT COUNT(*) as count FROM users WHERE role = $1', [ROLES.CANDIDATE]),
            pool.query('SELECT COUNT(*) as count FROM exams')
        ]);

        let totalOrganizations = 0;
        try {
            const orgsResult = await pool.query('SELECT COUNT(*) as count FROM organizations');
            totalOrganizations = parseInt(orgsResult.rows[0].count);
        } catch { /* Table might not exist */ }

        return NextResponse.json({
            totalAdmins: parseInt(adminsResult.rows[0].count),
            totalPsychologists: parseInt(psychResult.rows[0].count),
            totalCandidates: parseInt(candidatesResult.rows[0].count),
            totalExams: parseInt(examsResult.rows[0].count),
            totalOrganizations
        });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
```

### src/app/api/superadmin/users/route.ts - List All Users
```typescript
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('user_session');
    const session = await getSession(sessionCookie?.value);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role !== 'super_admin') {
        return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 });
    }

    try {
        // Get all users except super_admin
        const result = await pool.query(
            `SELECT id, username, email, full_name, role, profile_completed, is_active, created_at 
             FROM users 
             WHERE role IN ($1, $2, $3)
             ORDER BY role, created_at DESC`,
            ['admin', 'psychologist', 'candidate']
        );

        return NextResponse.json({ users: result.rows });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
```

### src/app/api/superadmin/clients/route.ts - Manage Admin Clients
```typescript
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession, ROLES } from '@/lib/auth';
import { canAccessSuperAdminFeatures } from '@/lib/roles';
import bcrypt from 'bcryptjs';

// GET - List all admin clients
export async function GET(_request: NextRequest) {
    try {
        const session = await getSession();

        if (!session || !canAccessSuperAdminFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const result = await pool.query(`
            SELECT 
                u.id, u.username, u.email, u.full_name,
                o.name as organization_name,
                u.created_at,
                (SELECT COUNT(*) FROM users WHERE organization_id = u.organization_id AND role = $1) as psychologist_count,
                (SELECT COUNT(*) FROM users WHERE organization_id = u.organization_id AND role = $2) as candidate_count,
                (SELECT COUNT(*) FROM exams WHERE created_by IN (
                    SELECT id FROM users WHERE organization_id = u.organization_id
                )) as exam_count
            FROM users u
            LEFT JOIN organizations o ON u.organization_id = o.id
            WHERE u.role = $3
            ORDER BY u.created_at DESC
        `, [ROLES.PSYCHOLOGIST, ROLES.CANDIDATE, ROLES.ADMIN]);

        return NextResponse.json(result.rows);
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Create new admin client with organization
export async function POST(request: NextRequest) {
    try {
        const session = await getSession();

        if (!session || !canAccessSuperAdminFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { username, email, password, fullName, organizationName } = await request.json();

        if (!username || !email || !password || !organizationName) {
            return NextResponse.json({ error: 'Semua field wajib harus diisi' }, { status: 400 });
        }

        // Check if exists
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );
        if (existingUser.rows.length > 0) {
            return NextResponse.json({ error: 'Username atau email sudah digunakan' }, { status: 400 });
        }

        // Transaction: Create org → quota → admin user
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const orgResult = await client.query(
                'INSERT INTO organizations (name) VALUES ($1) RETURNING id',
                [organizationName]
            );
            const organizationId = orgResult.rows[0].id;

            await client.query(
                'INSERT INTO admin_quotas (organization_id, total_exam_slots, used_exam_slots) VALUES ($1, $2, $3)',
                [organizationId, 100, 0]
            );

            const hashedPassword = await bcrypt.hash(password, 10);
            const userResult = await client.query(
                `INSERT INTO users (username, email, password_hash, full_name, role, organization_id)
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                [username, email, hashedPassword, fullName || null, ROLES.ADMIN, organizationId]
            );

            await client.query('COMMIT');
            return NextResponse.json({ success: true, id: userResult.rows[0].id, organizationId }, { status: 201 });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
```

### src/app/api/superadmin/quotas/route.ts - Manage Admin Quotas
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { getSession, ROLES } from '@/lib/auth';
import { canAccessSuperAdminFeatures } from '@/lib/roles';

// GET - List all quotas for all admins
export async function GET() {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !canAccessSuperAdminFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT 
                    u.id as admin_id, u.username as admin_username, u.full_name as admin_name, u.email as admin_email,
                    o.id as organization_id, o.name as organization_name,
                    COALESCE(aq.max_psychologists, 10) as max_psychologists,
                    COALESCE(aq.max_candidates, 100) as max_candidates,
                    COALESCE(aq.max_exams, 50) as max_exams,
                    COALESCE(aq.current_psychologists, 0) as current_psychologists,
                    COALESCE(aq.current_candidates, 0) as current_candidates,
                    COALESCE(aq.current_exams, 0) as current_exams,
                    COALESCE(aq.token_balance, 0) as token_balance,
                    COALESCE(aq.tokens_used, 0) as tokens_used,
                    aq.valid_until,
                    (SELECT COUNT(*) FROM users WHERE organization_id = o.id AND role = 'psychologist') as actual_psychologists,
                    (SELECT COUNT(DISTINCT cc.candidate_id) FROM candidate_codes cc 
                     JOIN users cr ON cc.created_by = cr.id 
                     WHERE cr.organization_id = o.id AND cc.candidate_id IS NOT NULL) as actual_candidates
                FROM users u
                LEFT JOIN organizations o ON o.admin_id = u.id
                LEFT JOIN admin_quotas aq ON aq.admin_id = u.id
                WHERE u.role = 'admin'
                ORDER BY u.username ASC
            `);

            return NextResponse.json(result.rows);
        } finally {
            client.release();
        }
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Create or update quota for an admin (Upsert)
export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !canAccessSuperAdminFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { adminId, maxPsychologists, maxCandidates, maxExams, tokenBalance, validUntil } = await request.json();

        if (!adminId) {
            return NextResponse.json({ error: 'adminId is required' }, { status: 400 });
        }

        const client = await pool.connect();
        try {
            const result = await client.query(`
                INSERT INTO admin_quotas (admin_id, max_psychologists, max_candidates, max_exams, token_balance, valid_until)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (admin_id) DO UPDATE SET
                    max_psychologists = EXCLUDED.max_psychologists,
                    max_candidates = EXCLUDED.max_candidates,
                    max_exams = EXCLUDED.max_exams,
                    token_balance = EXCLUDED.token_balance,
                    valid_until = EXCLUDED.valid_until,
                    updated_at = NOW()
                RETURNING *
            `, [adminId, maxPsychologists || 10, maxCandidates || 100, maxExams || 50, tokenBalance || 0, validUntil || null]);

            return NextResponse.json({ success: true, quota: result.rows[0] });
        } finally {
            client.release();
        }
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
```

---

## 🖥️ FRONTEND DASHBOARD PAGES

### src/app/admin/dashboard/page.tsx - Admin Dashboard
```tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, UserCog, LogOut, ClipboardList, Building2, BarChart3, Settings, KeyRound } from 'lucide-react';

interface DashboardStats {
    totalPsychologists: number;
    totalCandidates: number;
    totalExams: number;
    activeSessions: number;
}

interface Quota {
    maxPsychologists: number;
    maxCandidates: number;
    maxExams: number;
    usedPsychologists: number;
    usedCandidates: number;
    usedExams: number;
    validUntil: string | null;
}

export default function AdminOwnerDashboard() {
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats>({ totalPsychologists: 0, totalCandidates: 0, totalExams: 0, activeSessions: 0 });
    const [quota, setQuota] = useState<Quota | null>(null);
    const [loading, setLoading] = useState(true);
    const [orgName, setOrgName] = useState('');

    useEffect(() => {
        fetchStats();
        fetchQuota();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/admin/stats');
            if (res.status === 401 || res.status === 403) {
                router.push('/adminpsi');
                return;
            }
            if (res.ok) {
                const data = await res.json();
                setStats(data.stats);
                setOrgName(data.organization?.name || 'Organisasi');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchQuota = async () => {
        try {
            const res = await fetch('/api/admin/quota');
            if (res.ok) {
                const data = await res.json();
                setQuota(data);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/adminpsi');
    };

    // ... Component JSX renders stats cards, quota usage bars, and navigation menu
}
```

### src/app/psychologist/dashboard/page.tsx - Psychologist Dashboard
```tsx
'use client';

import { useState, useEffect } from 'react';
import { Upload, FileDown, Plus, Pencil, BarChart3, LogOut, Trash2, Users } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useRouter } from 'next/navigation';

interface Exam {
    id: number;
    title: string;
    status: string;
    description: string;
    question_count: number;
    assigned_candidates: number;
    is_assigned_to_me: boolean;
}

export default function PsychologistDashboard() {
    const router = useRouter();
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [totalCandidates, setTotalCandidates] = useState(0);

    useEffect(() => {
        fetchExams();
        fetchTotalCandidates();
    }, []);

    const fetchExams = async () => {
        try {
            const res = await fetch('/api/psychologist/exams');
            if (res.status === 401 || res.status === 403) {
                router.push('/adminpsi');
                return;
            }
            if (res.ok) {
                const data = await res.json();
                setExams(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchTotalCandidates = async () => {
        try {
            const res = await fetch('/api/psychologist/candidates/count');
            if (res.ok) {
                const data = await res.json();
                setTotalCandidates(data.count);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const downloadTemplate = () => {
        const ws = XLSX.utils.json_to_sheet([
            { question: "Contoh soal?", options: "A; B; C; D", correct_answer: "A" }
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "Template_Soal_Asisya.xlsx");
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/adminpsi');
    };

    // ... Component JSX renders exam list, upload form, delete modal
}
```

### src/app/superadmin/dashboard/page.tsx - Super Admin Dashboard
```tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, UserCog, LogOut, ClipboardList, Building2, Settings, BarChart3, Shield } from 'lucide-react';

interface DashboardStats {
    totalAdmins: number;
    totalPsychologists: number;
    totalCandidates: number;
    totalExams: number;
    totalOrganizations: number;
}

export default function SuperAdminDashboard() {
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats>({
        totalAdmins: 0,
        totalPsychologists: 0,
        totalCandidates: 0,
        totalExams: 0,
        totalOrganizations: 0
    });

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/superadmin/stats');
            if (res.status === 401 || res.status === 403) {
                router.push('/adminpsi');
                return;
            }
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/adminpsi');
    };

    // ... Component JSX renders platform-wide stats, client management links, quota management
}
```

### src/app/adminpsi/page.tsx - Admin/Psychologist Login
```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Lock, Eye, EyeOff, Shield } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();

      if (res.ok) {
        // Redirect berdasarkan role dari server
        router.push(data.redirect || '/psychologist/dashboard');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Internal server error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-100 to-slate-200">
      <div className="w-full max-w-[1100px] min-h-[600px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col lg:flex-row">
        {/* Left Side - Hero */}
        <div className="relative hidden lg:flex w-1/2 bg-cover bg-center flex-col justify-end p-12 text-white"
          style={{ backgroundImage: `linear-gradient(to bottom right, rgba(37, 99, 235, 0.9), rgba(15, 23, 42, 0.95)), url('...')` }}>
          <div className="relative z-10 flex flex-col gap-5">
            <img src="/asisya.png" alt="Asisya" className="h-14 w-14" />
            <h1 className="text-4xl font-bold">Professional Assessment Solutions</h1>
            <p className="text-white/80 text-lg">Portal for Admins and Psychologists</p>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full lg:w-1/2 bg-white p-16 flex flex-col justify-center">
          <form onSubmit={handleLogin} className="flex flex-col gap-5 w-full max-w-[400px]">
            <div className="flex flex-col gap-2">
              <label className="text-slate-700 text-sm font-semibold">Username</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-slate-200 h-12 px-4" placeholder="Enter your username" required />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-slate-700 text-sm font-semibold">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 h-12 px-4 pr-12" placeholder="Enter your password" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl">{error}</div>}

            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl font-bold">
              {loading ? 'LOGGING IN...' : 'LOGIN'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
```

---

## 🎨 COLOR SCHEME (Kimia Farma Branding)

| Color    | HEX       | Usage                    |
|----------|-----------|--------------------------|
| Navy     | #071F56   | Primary text, buttons    |
| Teal     | #0993A9   | Accent, highlights       |
| Orange   | #EF942A   | Call-to-action, warnings |
| Light    | #E6FBFB   | Background gradients     |
| BG Teal  | #BEE7F0   | Secondary backgrounds    |

---

## 📝 END OF DOCUMENTATION

**Generated:** 2026-01-11  
**Version:** 1.0.0  
**Platform:** Kimia Farma Assessment (Asisya)

