// =============================================
// SIMPLE ERROR LOGGING HELPER
// Provides structured logging for debugging
// =============================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
    userId?: number;
    action?: string;
    route?: string;
    [key: string]: unknown;
}

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Simple logger that outputs structured JSON in production
 * and readable format in development
 */
export const logger = {
    debug(message: string, context?: LogContext) {
        if (!IS_PRODUCTION) {
            console.log(`[DEBUG] ${message}`, context || '');
        }
    },

    info(message: string, context?: LogContext) {
        log('info', message, context);
    },

    warn(message: string, context?: LogContext) {
        log('warn', message, context);
    },

    error(message: string, error?: Error | unknown, context?: LogContext) {
        const errorInfo = error instanceof Error 
            ? { name: error.name, message: error.message, stack: error.stack?.split('\n').slice(0, 3).join('\n') }
            : { raw: String(error) };
        
        log('error', message, { ...context, error: errorInfo });
    },

    // Security-related logs (always logged)
    security(message: string, context: LogContext) {
        log('warn', `[SECURITY] ${message}`, { ...context, type: 'security' });
    }
};

function log(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    
    if (IS_PRODUCTION) {
        // JSON format for log aggregators (CloudWatch, DataDog, etc)
        const logObj = {
            timestamp,
            level,
            message,
            ...context
        };
        
        switch (level) {
            case 'error':
                console.error(JSON.stringify(logObj));
                break;
            case 'warn':
                console.warn(JSON.stringify(logObj));
                break;
            default:
                console.log(JSON.stringify(logObj));
        }
    } else {
        // Readable format for development
        const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
        const contextStr = context ? ` ${JSON.stringify(context, null, 2)}` : '';
        
        switch (level) {
            case 'error':
                console.error(`${prefix} ${message}${contextStr}`);
                break;
            case 'warn':
                console.warn(`${prefix} ${message}${contextStr}`);
                break;
            default:
                console.log(`${prefix} ${message}${contextStr}`);
        }
    }
}

// =============================================
// REQUEST TIMING HELPER
// =============================================

export function measureTime<T>(fn: () => Promise<T>, label: string): Promise<T> {
    const start = Date.now();
    return fn().finally(() => {
        const duration = Date.now() - start;
        if (duration > 1000) {
            logger.warn(`Slow operation: ${label}`, { duration, unit: 'ms' });
        } else {
            logger.debug(`Operation: ${label}`, { duration, unit: 'ms' });
        }
    });
}
