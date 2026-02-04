/**
 * 카카오 로그인 API 라우트
 * 
 * 카카오 액세스 토큰을 받아서 Firebase Custom Token을 생성합니다.
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
  // 이미 초기화되어 있으면 반환
  if (adminApp && adminAuth) return

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    console.error('Firebase Admin 환경 변수가 설정되지 않았습니다.')
    console.error('필수 환경 변수:', {
      FIREBASE_PROJECT_ID: projectId ? '설정됨' : '없음',
      FIREBASE_CLIENT_EMAIL: clientEmail ? '설정됨' : '없음',
      FIREBASE_PRIVATE_KEY: privateKey ? '설정됨' : '없음',
    })
    return
  }

  try {
    // 이미 초기화된 앱이 있는지 확인
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
    
    console.log('Firebase Admin 초기화 성공:', projectId)
  } catch (error: any) {
    console.error('Firebase Admin 초기화 오류:', error)
    console.error('오류 상세:', {
      message: error.message,
      code: error.code,
      projectId,
      clientEmail: clientEmail ? `${clientEmail.substring(0, 20)}...` : '없음',
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    initFirebaseAdmin()

    if (!adminAuth) {
      console.error('Firebase Admin 초기화 실패')
      return NextResponse.json(
        { 
          error: 'Firebase Admin이 초기화되지 않았습니다. 환경 변수를 확인하세요.',
          details: {
            hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
            hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
            hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
          }
        },
        { status: 500 }
      )
    }

    console.log('Firebase Admin 준비 완료:', {
      projectId: process.env.FIREBASE_PROJECT_ID,
      hasAuth: !!adminAuth,
      hasDb: !!adminDb,
    })

    const { accessToken } = await request.json()

    if (!accessToken) {
      return NextResponse.json(
        { error: '액세스 토큰이 필요합니다.' },
        { status: 400 }
      )
    }

    // 카카오 API로 사용자 정보 가져오기
    const kakaoUserResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!kakaoUserResponse.ok) {
      const errorText = await kakaoUserResponse.text()
      console.error('카카오 API 오류:', errorText)
      return NextResponse.json(
        { error: '카카오 사용자 정보를 가져올 수 없습니다.' },
        { status: 401 }
      )
    }

    const kakaoUser = await kakaoUserResponse.json()
    const kakaoId = kakaoUser.id.toString()
    const email = kakaoUser.kakao_account?.email || null
    const displayName = kakaoUser.kakao_account?.profile?.nickname || '사용자'
    const photoURL = kakaoUser.kakao_account?.profile?.profile_image_url || null

    // Firebase 사용자 UID 생성 (카카오 ID 기반)
    const uid = `kakao_${kakaoId}`

    console.log('Firebase 사용자 처리 시작:', { uid, kakaoId, email, displayName })

    // Firebase Custom Token 생성
    let customToken: string

    try {
      // 기존 사용자 확인
      let user
      try {
        user = await adminAuth.getUser(uid)
        console.log('기존 사용자 발견:', user.uid)
      } catch (getUserError: any) {
        if (getUserError.code === 'auth/user-not-found') {
          console.log('새 사용자 생성:', uid)
          // 새 사용자 생성 (이메일이 없을 수 있음)
          const createUserData: any = {
            uid,
            displayName: displayName || '사용자',
          }
          
          // 이메일이 있으면 추가
          if (email) {
            createUserData.email = email
          }
          
          // 프로필 사진이 있으면 추가
          if (photoURL) {
            createUserData.photoURL = photoURL
          }
          
          user = await adminAuth.createUser(createUserData)
          console.log('새 사용자 생성 완료:', user.uid)
        } else {
          console.error('getUser 오류:', getUserError)
          throw getUserError
        }
      }

      // Custom Token 생성
      customToken = await adminAuth.createCustomToken(uid)
      console.log('Custom Token 생성 완료')

      // 사용자 정보 업데이트 (기존 사용자인 경우)
      if (user) {
        const updateData: any = {}
        let needsUpdate = false
        
        if (email && user.email !== email) {
          updateData.email = email
          needsUpdate = true
        }
        
        if (displayName && user.displayName !== displayName) {
          updateData.displayName = displayName
          needsUpdate = true
        }
        
        if (photoURL && user.photoURL !== photoURL) {
          updateData.photoURL = photoURL
          needsUpdate = true
        }
        
        if (needsUpdate) {
          await adminAuth.updateUser(uid, updateData)
          console.log('사용자 정보 업데이트 완료')
        }
      }

      // Firestore에 사용자 프로필 생성/업데이트
      if (adminDb) {
        const userRef = adminDb.collection('users').doc(uid)
        const userSnap = await userRef.get()
        
        if (!userSnap.exists) {
          // 새 사용자 프로필 생성 (nickname은 null로 시작, 동의는 false로 시작)
          await userRef.set({
            uid,
            email,
            displayName,
            nickname: null, // 닉네임은 별도 설정 필요
            photoURL,
            role: 'user',
            userAgreedToTerms: false, // 일반 사용자 동의는 아직 하지 않음
            organizerAgreedToTerms: false, // 진행자 동의는 아직 하지 않음
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          console.log('Firestore 사용자 프로필 생성 완료')
        } else {
          // 기존 사용자 프로필 업데이트 (nickname은 유지)
          const updateData: any = {
            email,
            displayName,
            photoURL,
            updatedAt: new Date(),
          }
          // nickname이 없으면 null로 설정하지 않음 (기존 값 유지)
          await userRef.update(updateData)
          console.log('Firestore 사용자 프로필 업데이트 완료')
        }
      }
    } catch (error: any) {
      console.error('Firebase 사용자 처리 오류:', {
        code: error.code,
        message: error.message,
        uid,
        projectId: process.env.FIREBASE_PROJECT_ID,
      })
      throw error
    }

    return NextResponse.json({ customToken })
  } catch (error: any) {
    console.error('카카오 로그인 API 오류:', error)
    return NextResponse.json(
      { error: error.message || '로그인에 실패했습니다.' },
      { status: 500 }
    )
  }
}

