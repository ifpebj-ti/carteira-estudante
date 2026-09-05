import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that don't require authentication
const publicRoutes = ['/'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Next.js serves static files and _next folder. We shouldn't intercept those.
  if (
    pathname.startsWith('/_next') ||
    pathname.includes('/favicon.ico') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // The backend (FastAPI) sets an HttpOnly cookie named "access_token" on login.
  // We check for its presence to determine authentication status.
  const token = request.cookies.get('access_token')?.value;

  const isPublicRoute = publicRoutes.includes(pathname);

  // If trying to access a protected route without a token → redirect to login
  if (!token && !isPublicRoute) {
    const loginUrl = new URL('/', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // If already authenticated and trying to access the login page → redirect to dashboard
  if (token && isPublicRoute) {
    // TODO: Decode JWT role claim and route to the correct dashboard
    // For now, default to /aluno
    const dashboardUrl = new URL('/aluno', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
