/**
 * 관리자 세션 로그인 API
 * 
 * Firebase ID 토큰을 받아서 세션 쿠키를 생성합니다.
 */

import { NextRequest, NextResponse } from 'next/server'
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
    console.error('[관리자 세션] Firebase Admin 환경 변수가 설정되지 않았습니다.')
    return
  }

  // Private Key 처리
  privateKey = privateKey.replace(/^["']|["']$/g, '')
  privateKey = privateKey.replace(/\\n/g, '\n')

  if (!privateKey.includes('BEGIN PRIVATE KEY')) {
    console.error('[관리자 세션] FIREBASE_PRIVATE_KEY 형식이 올바르지 않습니다.')
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
    console.error('[관리자 세션] Firebase Admin 초기화 오류:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    initFirebaseAdmin()

    if (!adminAuth) {
      return NextResponse.json(
        { error: '서버 설정 오류입니다.' },
        { status: 500 }
      )
    }

    const { idToken } = await request.json()

    if (!idToken) {
      return NextResponse.json(
        { error: 'ID 토큰이 필요합니다.' },
        { status: 400 }
      )
    }

    // ID 토큰 검증
    let decodedToken
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken)
    } catch (error: any) {
      console.error('[관리자 세션] ID 토큰 검증 실패:', error.message)
      return NextResponse.json(
        { error: '유효하지 않은 토큰입니다.' },
        { status: 401 }
      )
    }

    const uid = decodedToken.uid

    // 오너 계정 확인
    const ADMIN_OWNER_UID = process.env.ADMIN_OWNER_UID
    if (!ADMIN_OWNER_UID) {
      console.error('[관리자 세션] ADMIN_OWNER_UID 환경변수가 설정되지 않았습니다.')
      return NextResponse.json(
        { error: '서버 설정 오류입니다.' },
        { status: 500 }
      )
    }

    // UID 비교 (공백 제거)
    const allowedUids = ADMIN_OWNER_UID.split(',').map(u => u.trim()).filter(Boolean)
    if (!allowedUids.includes(uid)) {
      console.warn('[관리자 세션] 허용되지 않은 UID:', {
        uid,
        uidPrefix: uid.substring(0, 4),
        allowedUids: allowedUids.map(u => u.substring(0, 4)),
      })
      return NextResponse.json(
        { error: '관리자 권한이 없습니다.' },
        { status: 403 }
      )
    }

    // 세션 쿠키 만료 시간 설정 (기본 7일)
    const expiresIn = parseInt(process.env.ADMIN_SESSION_EXPIRES_DAYS || '7') * 24 * 60 * 60 * 1000 // 밀리초

    // 세션 쿠키 생성
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn,
    })

    // 쿠키 설정
    const isProduction = process.env.NODE_ENV === 'production'
    const cookieOptions = [
      `admin_session=${sessionCookie}`,
      'HttpOnly',
      'Path=/',
      'SameSite=Lax',
      ...(isProduction ? ['Secure'] : []),
      `Max-Age=${expiresIn / 1000}`, // 초 단위
    ]

    const response = NextResponse.json({ ok: true })
    response.headers.set('Set-Cookie', cookieOptions.join('; '))

    return response
  } catch (error: any) {
    console.error('[관리자 세션] 오류:', error)
    return NextResponse.json(
      { error: '로그인 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
