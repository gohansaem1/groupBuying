/**
 * 테스트용 로그인 API
 * 
 * 개발 환경에서만 사용 가능한 테스트 사용자 로그인
 */

import { NextRequest, NextResponse } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

// Firebase Admin 초기화
let adminApp: any = null
let adminAuth: any = null
let adminDb: any = null

function initFirebaseAdmin() {
  if (adminApp && adminAuth) return

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    return
  }

  try {
    const existingApps = getApps()
    if (existingApps.length > 0) {
      adminApp = existingApps[0]
    } else {
      adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      })
    }
    
    adminAuth = getAuth(adminApp)
    adminDb = getFirestore(adminApp)
  } catch (error: any) {
    console.error('Firebase Admin 초기화 오류:', error)
  }
}

export async function POST(request: NextRequest) {
  // 프로덕션 환경에서는 비활성화
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: '테스트 로그인은 개발 환경에서만 사용 가능합니다.' },
      { status: 403 }
    )
  }

  try {
    initFirebaseAdmin()

    if (!adminAuth) {
      return NextResponse.json(
        { error: 'Firebase Admin이 초기화되지 않았습니다.' },
        { status: 500 }
      )
    }

    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: '사용자 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    // Firestore에서 사용자 확인
    if (adminDb) {
      const userRef = adminDb.collection('users').doc(userId)
      const userSnap = await userRef.get()

      if (!userSnap.exists) {
        return NextResponse.json(
          { error: '사용자를 찾을 수 없습니다.' },
          { status: 404 }
        )
      }
    }

    // 사용자 정보 먼저 가져오기
    let userInfo: any = {}
    if (adminDb) {
      const userRef = adminDb.collection('users').doc(userId)
      const userSnap = await userRef.get()
      if (userSnap.exists) {
        userInfo = userSnap.data()
      }
    }

    // Firebase Authentication에 사용자가 없으면 생성
    let user
    try {
      user = await adminAuth.getUser(userId)
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        // 새 사용자 생성
        const createUserData: any = {
          uid: userId,
          displayName: userInfo?.displayName || '테스트 사용자',
        }
        
        if (userInfo?.email) {
          createUserData.email = userInfo.email
        }
        
        if (userInfo?.photoURL) {
          createUserData.photoURL = userInfo.photoURL
        }
        
        user = await adminAuth.createUser(createUserData)
        console.log('테스트 사용자 생성 완료:', userId)
      } else {
        throw error
      }
    }

    // Custom Token 생성
    const customToken = await adminAuth.createCustomToken(userId)

    return NextResponse.json({ 
      customToken,
      userInfo: {
        uid: userId,
        nickname: userInfo?.nickname || null,
        displayName: userInfo?.displayName || user?.displayName || '테스트 사용자',
        email: userInfo?.email || user?.email || null,
        role: userInfo?.role || 'user',
      }
    })
  } catch (error: any) {
    console.error('테스트 로그인 API 오류:', error)
    return NextResponse.json(
      { error: error.message || '로그인에 실패했습니다.' },
      { status: 500 }
    )
  }
}

