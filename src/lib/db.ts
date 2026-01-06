import { Pool, PoolConfig } from 'pg';

// =============================================
// OPTIMIZED DATABASE POOL FOR 800 CONCURRENT USERS
// =============================================

// Use global to prevent multiple pool instances in dev mode
declare global {
    // eslint-disable-next-line no-var
    var __pgPool: Pool | undefined;
}

const isDev = process.env.NODE_ENV !== 'production';

const DB_CONFIG: PoolConfig = {
    connectionString: process.env.DATABASE_URL,

    // Pool sizing untuk 800 concurrent users (800/16 avg = 50)
    max: parseInt(process.env.DB_MAX_CONN || '50'),
    min: parseInt(process.env.DB_MIN_CONN || '10'),

    // Connection lifecycle
    idleTimeoutMillis: 30000,           // Close idle connection after 30s
    connectionTimeoutMillis: 5000,      // Timeout if can't connect in 5s

    // Query timeout - prevent long-running queries
    statement_timeout: 30000,           // 30s max per query
    query_timeout: 30000,               // 30s max per query

    // Keep connections alive
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,

    // CRITICAL: Keep pool alive in serverless environments
    allowExitOnIdle: false,
};

function createPool(): Pool {
    const pool = new Pool(DB_CONFIG);

    // Error handler - don't crash, just log
    pool.on('error', (err) => {
        console.error('❌ Pool error:', err.message);
    });

    // Only log in development
    if (isDev) {
        pool.on('connect', () => {
            console.log('✅ DB connection established');
        });
    }

    return pool;
}

// Singleton pattern using global for Next.js dev mode compatibility
function getPool(): Pool {
    if (isDev) {
        // In development, use global to persist across hot reloads
        if (!global.__pgPool) {
            global.__pgPool = createPool();
        }
        return global.__pgPool;
    }

    // In production, create once
    return createPool();
}

const pool = getPool();

// =============================================
// HELPER: Execute query with auto-release
// =============================================
export async function query<T>(text: string, params?: unknown[]): Promise<T[]> {
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    // Log slow queries
    if (duration > 100 && isDev) {
        console.warn(`⚠️ Slow query (${duration}ms):`, text.substring(0, 100));
    }

    return result.rows as T[];
}

// Helper untuk single result
export async function queryOne<T>(text: string, params?: unknown[]): Promise<T | null> {
    const rows = await query<T>(text, params);
    return rows[0] || null;
}

export default pool;
