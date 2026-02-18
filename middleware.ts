/**
 * Next.js Middleware
 * 
 * /admin/* 경로를 보호합니다.
 * Edge Runtime에서는 Firebase Admin을 사용할 수 없으므로,
 * 쿠키 존재 여부만 확인하고 실제 검증은 서버 컴포넌트에서 수행합니다.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // /admin/login은 제외
  if (pathname === '/admin/login') {
    return NextResponse.next()
  }

  // /admin/* 경로만 보호
  if (pathname.startsWith('/admin')) {
    const sessionCookie = request.cookies.get('admin_session')?.value

    if (!sessionCookie) {
      // 세션 쿠키가 없으면 로그인 페이지로 리다이렉트
      const loginUrl = new URL('/admin/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // 쿠키가 있으면 통과 (실제 검증은 서버 컴포넌트에서 수행)
    return NextResponse.next()
  }

  // 다른 경로는 그대로 통과
  return NextResponse.next()
}

export const config = {
  matcher: '/admin/:path*',
}
