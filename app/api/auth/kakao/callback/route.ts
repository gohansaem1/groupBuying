/**
 * 카카오 로그인 콜백 API 라우트
 * 
 * 카카오 인가 코드를 받아서 액세스 토큰으로 교환하고 Firebase Custom Token을 생성합니다.
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
  let privateKey = process.env.FIREBASE_PRIVATE_KEY

  if (!projectId || !clientEmail || !privateKey) {
    console.error('Firebase Admin 환경 변수가 설정되지 않았습니다.')
    return
  }

  // Private Key 처리
  privateKey = privateKey.replace(/^["']|["']$/g, '')
  privateKey = privateKey.replace(/\\n/g, '\n')

  if (!privateKey.includes('BEGIN PRIVATE KEY')) {
    console.error('FIREBASE_PRIVATE_KEY 형식이 올바르지 않습니다.')
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
    console.error('Firebase Admin 초기화 오류:', error)
  }
}

export async function GET(request: NextRequest) {
  try {
    initFirebaseAdmin()

    if (!adminAuth) {
      return NextResponse.redirect(new URL('/login?error=firebase_init_failed', request.url))
    }

    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    // 에러가 있으면 로그인 페이지로 리다이렉트
    if (error) {
      console.error('카카오 로그인 에러:', error, errorDescription)
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errorDescription || error)}`, request.url))
    }

    if (!code) {
      return NextResponse.redirect(new URL('/login?error=no_code', request.url))
    }

    console.log('[카카오 콜백] 인가 코드 수신:', code.substring(0, 20) + '...')

    // 카카오 REST API 키 (서버 사이드에서 사용)
    // REST API 키는 카카오 개발자 콘솔 > 내 애플리케이션 > 앱 키에서 확인 가능
    const REST_API_KEY = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY || process.env.NEXT_PUBLIC_KAKAO_JS_KEY
    const REDIRECT_URI = `${request.nextUrl.origin}/api/auth/kakao/callback`

    if (!REST_API_KEY) {
      console.error('카카오 REST API 키가 설정되지 않았습니다.')
      return NextResponse.redirect(new URL('/login?error=no_api_key', request.url))
    }

    // 인가 코드를 액세스 토큰으로 교환
    console.log('[카카오 콜백] 액세스 토큰 교환 시작')
    const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: REST_API_KEY,
        redirect_uri: REDIRECT_URI,
        code: code,
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('카카오 토큰 교환 오류:', errorText)
      return NextResponse.redirect(new URL('/login?error=token_exchange_failed', request.url))
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    if (!accessToken) {
      return NextResponse.redirect(new URL('/login?error=no_access_token', request.url))
    }

    console.log('[카카오 콜백] 액세스 토큰 교환 완료')

    // 카카오 API로 사용자 정보 가져오기
    console.log('[카카오 콜백] 사용자 정보 요청 시작')
    const kakaoUserResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!kakaoUserResponse.ok) {
      const errorText = await kakaoUserResponse.text()
      console.error('카카오 API 오류:', errorText)
      return NextResponse.redirect(new URL('/login?error=user_info_failed', request.url))
    }

    const kakaoUser = await kakaoUserResponse.json()
    const kakaoId = kakaoUser.id.toString()
    const email = kakaoUser.kakao_account?.email || null
    const displayName = kakaoUser.kakao_account?.profile?.nickname || '사용자'
    const photoURL = kakaoUser.kakao_account?.profile?.profile_image_url || null

    console.log('[카카오 콜백] 사용자 정보 수신:', { kakaoId, email, displayName })

    // Firebase 사용자 UID 생성
    const uid = `kakao_${kakaoId}`

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
          const createUserData: any = {
            uid,
            displayName: displayName || '사용자',
          }
          
          if (email) {
            createUserData.email = email
          }
          
          if (photoURL) {
            createUserData.photoURL = photoURL
          }
          
          user = await adminAuth.createUser(createUserData)
          console.log('새 사용자 생성 완료:', user.uid)
        } else {
          throw getUserError
        }
      }

      // Custom Token 생성
      customToken = await adminAuth.createCustomToken(uid)
      console.log('[카카오 콜백] Custom Token 생성 완료')

      // 사용자 정보 업데이트
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
        }
      }

      // Firestore에 사용자 프로필 생성/업데이트
      if (adminDb) {
        const userRef = adminDb.collection('users').doc(uid)
        const userSnap = await userRef.get()
        
        if (!userSnap.exists) {
          await userRef.set({
            uid,
            email,
            displayName,
            nickname: null,
            photoURL,
            role: 'user',
            userAgreedToTerms: false,
            organizerAgreedToTerms: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        } else {
          const updateData: any = {
            email,
            displayName,
            photoURL,
            updatedAt: new Date(),
          }
          await userRef.update(updateData)
        }
      }
    } catch (error: any) {
      console.error('Firebase 사용자 처리 오류:', error)
      return NextResponse.redirect(new URL('/login?error=firebase_error', request.url))
    }

    // Custom Token을 쿼리 파라미터로 전달하여 로그인 페이지로 리다이렉트
    // 클라이언트에서 이 토큰을 받아서 Firebase에 로그인
    return NextResponse.redirect(new URL(`/login?token=${encodeURIComponent(customToken)}`, request.url))
  } catch (error: any) {
    console.error('카카오 콜백 오류:', error)
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message || 'unknown_error')}`, request.url))
  }
}
