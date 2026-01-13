import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCacheStats } from '@/lib/cache';

// =============================================
// HEALTH CHECK ENDPOINT
// Used by load balancers to detect unhealthy servers
// =============================================

export async function GET() {
    const startTime = Date.now();
    const health: {
        status: 'healthy' | 'degraded' | 'unhealthy';
        timestamp: string;
        uptime: number;
        checks: {
            database: { status: string; latency?: number; error?: string };
            cache: { status: string; size?: number };
        };
        version?: string;
    } = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        checks: {
            database: { status: 'unknown' },
            cache: { status: 'unknown' }
        }
    };

    // Check database connection
    try {
        const dbStart = Date.now();
        const client = await pool.connect();
        try {
            await client.query('SELECT 1');
            health.checks.database = {
                status: 'connected',
                latency: Date.now() - dbStart
            };
        } finally {
            client.release();
        }
    } catch (error) {
        health.status = 'unhealthy';
        health.checks.database = {
            status: 'disconnected',
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }

    // Check cache status
    try {
        const cacheStats = getCacheStats();
        health.checks.cache = {
            status: cacheStats.redisConnected ? 'redis' : 'memory',
            size: cacheStats.memoryCacheSize
        };
    } catch {
        health.checks.cache = { status: 'error' };
        health.status = health.status === 'healthy' ? 'degraded' : health.status;
    }

    // Add version info
    health.version = process.env.npm_package_version || '1.0.0';

    // Return appropriate status code
    const statusCode = health.status === 'healthy' ? 200 : 
                       health.status === 'degraded' ? 200 : 503;

    return NextResponse.json(health, { 
        status: statusCode,
        headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
    });
}
