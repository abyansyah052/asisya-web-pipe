import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { UserRole, ROLES, getLoginRedirect } from './roles';

// ✅ SECURITY FIX: Throw error if JWT_SECRET is missing - no fallback
const JWT_SECRET_RAW = process.env.JWT_SECRET;
if (!JWT_SECRET_RAW || JWT_SECRET_RAW.length < 32) {
  throw new Error('CRITICAL: JWT_SECRET environment variable must be set and at least 32 characters');
}
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_RAW);

export interface SessionData {
  id: number;
  role: UserRole | string;
  username: string;
  profileCompleted?: boolean;
  organizationId?: number;
}

// Re-export for convenience
export { ROLES, getLoginRedirect };
export type { UserRole };

// Encrypt session data to JWT
export async function encrypt(payload: SessionData): Promise<string> {
  return await new SignJWT({ ...payload } as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h') // 8 hours
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
      profileCompleted: payload.profileCompleted as boolean | undefined,
      organizationId: payload.organizationId as number | undefined
    };
  } catch {
    return null;
  }
}

// Get session from cookie value
export async function getSession(cookieValue?: string): Promise<SessionData | null> {
  if (!cookieValue) return null;
  return await decrypt(cookieValue);
}
