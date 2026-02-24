/**
 * 오너 계정 프로필 확인/생성 API
 * 
 * 오너 계정이 로그인했을 때 Firestore에 사용자 문서가 없으면 자동 생성합니다.
 */

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

// Firebase Admin 초기화
let adminApp: any = null
let adminAuth: any = null
let adminDb: any = null

function initFirebaseAdmin() {
  if (adminApp && adminAuth && adminDb) return

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  let privateKey = process.env.FIREBASE_PRIVATE_KEY

  if (!projectId || !clientEmail || !privateKey) {
    console.error('[오너 프로필] Firebase Admin 환경 변수가 설정되지 않았습니다.')
    return
  }

  // Private Key 처리
  privateKey = privateKey.replace(/^["']|["']$/g, '')
  privateKey = privateKey.replace(/\\n/g, '\n')

  if (!privateKey.includes('BEGIN PRIVATE KEY')) {
    console.error('[오너 프로필] FIREBASE_PRIVATE_KEY 형식이 올바르지 않습니다.')
    return
  }

  try {
    const existingApps = getApps()
    if (existingApps.length > 0) {
      adminApp = existingApps[0]
      adminAuth = getAuth(adminApp)
      adminDb = getFirestore(adminApp)
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
    adminDb = getFirestore(adminApp)
  } catch (error: any) {
    console.error('[오너 프로필] Firebase Admin 초기화 오류:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    initFirebaseAdmin()

    if (!adminAuth || !adminDb) {
      return NextResponse.json(
        { error: '서버 설정 오류입니다.' },
        { status: 500 }
      )
    }

    // 쿠키에서 세션 읽기
    const cookieStore = await request.cookies
    const sessionCookie = cookieStore.get('admin_session')?.value

    if (!sessionCookie) {
      return NextResponse.json(
        { error: '세션이 없습니다.' },
        { status: 401 }
      )
    }

    // 세션 쿠키 검증
    let decodedToken
    try {
      decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true)
    } catch (error: any) {
      console.error('[오너 프로필] 세션 쿠키 검증 실패:', error.message)
      return NextResponse.json(
        { error: '유효하지 않은 세션입니다.' },
        { status: 401 }
      )
    }

    const uid = decodedToken.uid

    // 오너 계정 확인
    const ADMIN_OWNER_UID = process.env.ADMIN_OWNER_UID?.trim()
    if (!ADMIN_OWNER_UID) {
      return NextResponse.json(
        { error: '서버 설정 오류입니다.' },
        { status: 500 }
      )
    }

    const allowedUids = ADMIN_OWNER_UID.split(',').map(u => u.trim()).filter(Boolean)
    if (!allowedUids.includes(uid)) {
      return NextResponse.json(
        { error: '오너 계정이 아닙니다.' },
        { status: 403 }
      )
    }

    // Firestore에서 사용자 문서 확인
    const userRef = adminDb.collection('users').doc(uid)
    const userSnap = await userRef.get()

    if (userSnap.exists) {
      // 이미 문서가 있으면 그대로 반환
      const userData = userSnap.data()
      return NextResponse.json({
        exists: true,
        profile: {
          uid,
          ...userData
        }
      })
    }

    // 문서가 없으면 생성
    const userRecord = await adminAuth.getUser(uid)
    
    const userProfile = {
      uid,
      email: userRecord.email || null,
      displayName: userRecord.displayName || '오너',
      nickname: null,
      photoURL: userRecord.photoURL || null,
      role: 'owner',
      userAgreedToTerms: false,
      organizerAgreedToTerms: false,
      createdAt: adminDb.Timestamp.now(),
      updatedAt: adminDb.Timestamp.now(),
    }

    await userRef.set(userProfile)

    console.log('[오너 프로필] Firestore 사용자 문서 생성 완료:', uid)

    return NextResponse.json({
      exists: false,
      created: true,
      profile: {
        ...userProfile,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    })

  } catch (error: any) {
    console.error('[오너 프로필] 오류:', error)
    return NextResponse.json(
      { error: '프로필 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
