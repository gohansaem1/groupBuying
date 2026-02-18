/**
 * Next.js Middleware
 * 
 * /admin/* 경로를 보호합니다.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

// Firebase Admin 초기화 (미들웨어에서 사용)
let adminApp: any = null
let adminAuth: any = null

function initFirebaseAdmin() {
  if (adminApp && adminAuth) return

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  let privateKey = process.env.FIREBASE_PRIVATE_KEY

  if (!projectId || !clientEmail || !privateKey) {
    console.error('[Middleware] Firebase Admin 환경 변수가 설정되지 않았습니다.')
    return
  }

  // Private Key 처리
  privateKey = privateKey.replace(/^["']|["']$/g, '')
  privateKey = privateKey.replace(/\\n/g, '\n')

  if (!privateKey.includes('BEGIN PRIVATE KEY')) {
    console.error('[Middleware] FIREBASE_PRIVATE_KEY 형식이 올바르지 않습니다.')
    return
  }

  try {
    const existingApps = getApps()
    if (existingApps.length > 0) {
      adminApp = existingApps[0]
      adminAuth = getAuth(adminApp)
      return
    }

    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    })
    
    adminAuth = getAuth(adminApp)
  } catch (error: any) {
    console.error('[Middleware] Firebase Admin 초기화 오류:', error)
  }
}

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

    // Firebase Admin 초기화
    initFirebaseAdmin()

    if (!adminAuth) {
      console.error('[Middleware] Firebase Admin이 초기화되지 않았습니다.')
      const loginUrl = new URL('/admin/login', request.url)
      return NextResponse.redirect(loginUrl)
    }

    // 세션 쿠키 검증
    return adminAuth
      .verifySessionCookie(sessionCookie, true)
      .then(() => {
        // 검증 성공
        return NextResponse.next()
      })
      .catch((error: any) => {
        // 검증 실패 - 쿠키 삭제 후 로그인 페이지로 리다이렉트
        console.warn('[Middleware] 세션 쿠키 검증 실패:', error.message)
        const loginUrl = new URL('/admin/login', request.url)
        const response = NextResponse.redirect(loginUrl)
        
        // 쿠키 삭제
        const isProduction = process.env.NODE_ENV === 'production'
        const cookieOptions = [
          'admin_session=',
          'HttpOnly',
          'Path=/',
          'SameSite=Lax',
          ...(isProduction ? ['Secure'] : []),
          'Max-Age=0',
        ]
        response.headers.set('Set-Cookie', cookieOptions.join('; '))
        
        return response
      })
  }

  // 다른 경로는 그대로 통과
  return NextResponse.next()
}

export const config = {
  matcher: '/admin/:path*',
}
