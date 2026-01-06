import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { UserRole, ROLES, getLoginRedirect } from './roles';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-key-min-32-chars-pls-change-in-production'
);

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
      profileCompleted: payload.profileCompleted as boolean | undefined
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
