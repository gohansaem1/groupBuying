/**
 * 관리자 레이아웃
 * 
 * 서버 컴포넌트에서 세션 쿠키를 검증합니다.
 * /admin/login은 별도 layout을 사용하므로 여기서는 검증되지 않습니다.
 */

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

// Firebase Admin 초기화
let adminApp: any = null
let adminAuth: any = null

function initFirebaseAdmin() {
  if (adminApp && adminAuth) return

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  let privateKey = process.env.FIREBASE_PRIVATE_KEY

  if (!projectId || !clientEmail || !privateKey) {
    console.error('[Admin Layout] Firebase Admin 환경 변수가 설정되지 않았습니다.')
    return
  }

  // Private Key 처리
  privateKey = privateKey.replace(/^["']|["']$/g, '')
  privateKey = privateKey.replace(/\\n/g, '\n')

  if (!privateKey.includes('BEGIN PRIVATE KEY')) {
    console.error('[Admin Layout] FIREBASE_PRIVATE_KEY 형식이 올바르지 않습니다.')
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
    console.error('[Admin Layout] Firebase Admin 초기화 오류:', error)
  }
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  try {
    // Firebase Admin 초기화
    initFirebaseAdmin()

    if (!adminAuth) {
      console.error('[Admin Layout] Firebase Admin이 초기화되지 않았습니다.')
      redirect('/admin/login')
    }

    // 쿠키에서 세션 읽기
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('admin_session')?.value

    if (!sessionCookie) {
      // 세션 쿠키가 없으면 로그인 페이지로 리다이렉트
      redirect('/admin/login')
    }

    // 세션 쿠키 검증
    try {
      await adminAuth.verifySessionCookie(sessionCookie, true)
      // 검증 성공 - children 렌더링
      return <>{children}</>
    } catch (error: any) {
      // 검증 실패 - 로그인 페이지로 리다이렉트
      console.warn('[Admin Layout] 세션 쿠키 검증 실패:', error.message)
      redirect('/admin/login')
    }
  } catch (error: any) {
    // 예외 발생 시 로그인 페이지로 리다이렉트 (500 에러 방지)
    console.error('[Admin Layout] 오류:', error)
    redirect('/admin/login')
  }
}
