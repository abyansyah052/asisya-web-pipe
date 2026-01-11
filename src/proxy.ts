import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// =============================================
// HIGH-PERFORMANCE MIDDLEWARE FOR 800 CONCURRENT USERS
// =============================================

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'your-super-secret-key-min-32-chars-pls-change-in-production'
);

// Routes that require authentication
const PROTECTED_ROUTES = [
    '/candidate/dashboard',
    '/candidate/exam',
    '/candidate/profile-completion',
    '/psychologist',
    '/admin',
    '/superadmin',
];

// Routes that are always public
const PUBLIC_ROUTES = [
    '/',
    '/adminpsi',
    '/register',
    '/api/auth/login',
    '/api/auth/candidate-login',
    '/api/auth/register',
];

// Static assets - skip middleware entirely
const STATIC_PATHS = [
    '/_next',
    '/favicon.ico',
    '/asisya.png',
    '/images',
    '/fonts',
];

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 1. SKIP STATIC ASSETS - Critical for performance
    if (STATIC_PATHS.some(path => pathname.startsWith(path))) {
        return NextResponse.next();
    }

    // 2. SKIP PUBLIC ROUTES
    if (PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))) {
        // Don't check auth for public routes
        return NextResponse.next();
    }

    // 3. CHECK PROTECTED ROUTES
    const isProtected = PROTECTED_ROUTES.some(route =>
        pathname === route || pathname.startsWith(route + '/')
    );

    if (isProtected) {
        const sessionCookie = request.cookies.get('user_session');

        if (!sessionCookie?.value) {
            // No session - redirect to login
            const loginUrl = pathname.startsWith('/candidate')
                ? new URL('/', request.url)
                : new URL('/adminpsi', request.url);
            return NextResponse.redirect(loginUrl);
        }

        try {
            // Verify JWT - fast operation
            const { payload } = await jwtVerify(sessionCookie.value, JWT_SECRET);
            const role = payload.role as string;

            // Role-based access control
            if (pathname.startsWith('/superadmin') && role !== 'super_admin') {
                return NextResponse.redirect(new URL('/adminpsi', request.url));
            }
            // /admin routes can be accessed by psychologist, admin, and super_admin
            if (pathname.startsWith('/admin') && !['psychologist', 'admin', 'super_admin'].includes(role)) {
                return NextResponse.redirect(new URL('/adminpsi', request.url));
            }
            if (pathname.startsWith('/psychologist') && !['psychologist', 'admin', 'super_admin'].includes(role)) {
                return NextResponse.redirect(new URL('/adminpsi', request.url));
            }
            if (pathname.startsWith('/candidate') && role !== 'candidate') {
                // Redirect non-candidates away from candidate pages
                return NextResponse.redirect(new URL('/psychologist/dashboard', request.url));
            }

            // Add user info to headers for downstream use
            const response = NextResponse.next();
            response.headers.set('x-user-id', String(payload.id));
            response.headers.set('x-user-role', role);
            return response;

        } catch {
            // Invalid JWT - clear cookie and redirect based on route
            // Psychologist/admin routes go to /adminpsi, candidate routes go to /
            const isAdminRoute = pathname.startsWith('/psychologist') ||
                pathname.startsWith('/admin') ||
                pathname.startsWith('/superadmin');
            const loginUrl = isAdminRoute ? '/adminpsi' : '/';
            const response = NextResponse.redirect(new URL(loginUrl, request.url));
            response.cookies.delete('user_session');
            return response;
        }
    }

    return NextResponse.next();
}

// Only run middleware on specific protected paths to save server resources
export const config = {
    matcher: [
        '/candidate/:path*',
        '/psychologist/:path*',
        '/admin/:path*',
        '/superadmin/:path*',
        // API routes that need protection usually handle auth themselves or use session
        // but if you want global protection for specific APIs:
        // '/api/protected/:path*' 
    ],
};
