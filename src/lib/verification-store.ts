// Store verification codes temporarily
// Using global to persist across hot reloads in development
interface VerificationCode {
    code: string;
    expiresAt: number;
}

// Use global to persist across hot reloads
const globalForVerification = globalThis as unknown as {
    verificationStore: Map<number, VerificationCode> | undefined;
};

const store = globalForVerification.verificationStore ?? new Map<number, VerificationCode>();

if (process.env.NODE_ENV !== 'production') {
    globalForVerification.verificationStore = store;
}

export const verificationCodes = {
    set(examId: number, code: string, ttlMinutes: number = 10) {
        store.set(examId, {
            code,
            expiresAt: Date.now() + (ttlMinutes * 60 * 1000)
        });
        console.log(`🔐 Stored code for exam ${examId}: ${code} (expires in ${ttlMinutes} min)`);
    },
    
    get(examId: number): string | undefined {
        const entry = store.get(examId);
        console.log(`🔍 Looking for code for exam ${examId}:`, entry ? `found (expires in ${Math.round((entry.expiresAt - Date.now()) / 1000)}s)` : 'not found');
        
        if (!entry) return undefined;
        
        // Check if expired
        if (Date.now() > entry.expiresAt) {
            console.log(`⏰ Code for exam ${examId} has expired`);
            store.delete(examId);
            return undefined;
        }
        
        return entry.code;
    },
    
    delete(examId: number) {
        store.delete(examId);
        console.log(`🗑️ Deleted code for exam ${examId}`);
    },
    
    // Debug: show all codes (for development)
    debug() {
        const entries: Record<number, { code: string; expiresIn: string }> = {};
        store.forEach((v, k) => {
            entries[k] = {
                code: v.code,
                expiresIn: `${Math.round((v.expiresAt - Date.now()) / 1000)}s`
            };
        });
        return entries;
    }
};
