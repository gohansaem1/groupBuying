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

    // 카카오에서 직접 전달된 에러 처리
    if (error) {
      console.error('[카카오 콜백] 카카오에서 전달된 에러:', {
        error,
        errorDescription,
        url: request.url,
      })
      const errorParam = error ? `error=${encodeURIComponent(error)}` : ''
      const descParam = errorDescription ? `&desc=${encodeURIComponent(errorDescription)}` : ''
      return NextResponse.redirect(new URL(`/login?${errorParam}${descParam}`, request.url))
    }

    // code 파라미터 체크
    if (!code) {
      console.error('[카카오 콜백] 인가 코드가 없습니다:', {
        url: request.url,
        searchParams: Object.fromEntries(searchParams.entries()),
      })
      return NextResponse.redirect(new URL('/login?error=no_code', request.url))
    }

    console.log('[카카오 콜백] 인가 코드 수신:', {
      codePrefix: code.substring(0, 20) + '...',
      codeLength: code.length,
    })

    // 환경변수 체크 및 검증 (서버 시작 시 또는 요청 처리 시)
    let REST_API_KEY = process.env.KAKAO_REST_API_KEY
    let CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET // 선택사항: 카카오 콘솔에서 Client Secret 사용이 ON인 경우만 필요
    
    // REST API 키 존재 확인
    if (!REST_API_KEY) {
      console.error('[카카오 콜백] 환경변수 누락:', {
        missing: 'KAKAO_REST_API_KEY',
        availableKakaoKeys: Object.keys(process.env).filter(key => key.includes('KAKAO')),
      })
      return NextResponse.redirect(new URL('/login?error=missing_env&desc=KAKAO_REST_API_KEY가 설정되지 않았습니다', request.url))
    }

    // REST API 키 공백 제거 및 검증
    const REST_API_KEY_ORIGINAL = REST_API_KEY
    REST_API_KEY = REST_API_KEY.trim()
    if (REST_API_KEY_ORIGINAL !== REST_API_KEY) {
      console.warn('[카카오 콜백] REST API 키에 공백이 포함되어 있어 제거했습니다:', {
        originalLength: REST_API_KEY_ORIGINAL.length,
        trimmedLength: REST_API_KEY.length,
      })
    }
    if (!REST_API_KEY) {
      console.error('[카카오 콜백] REST API 키가 공백만 포함되어 있습니다.')
      return NextResponse.redirect(new URL('/login?error=missing_env&desc=KAKAO_REST_API_KEY가 유효하지 않습니다', request.url))
    }

    // Client Secret 공백 제거 (있는 경우)
    if (CLIENT_SECRET) {
      const CLIENT_SECRET_ORIGINAL = CLIENT_SECRET
      CLIENT_SECRET = CLIENT_SECRET.trim()
      if (CLIENT_SECRET_ORIGINAL !== CLIENT_SECRET) {
        console.warn('[카카오 콜백] Client Secret에 공백이 포함되어 있어 제거했습니다:', {
          originalLength: CLIENT_SECRET_ORIGINAL.length,
          trimmedLength: CLIENT_SECRET.length,
        })
      }
      if (!CLIENT_SECRET) {
        console.warn('[카카오 콜백] Client Secret이 공백만 포함되어 있어 무시합니다.')
        CLIENT_SECRET = undefined
      }
    }

    // Redirect URI 설정 (환경변수 우선, 없으면 동적 생성)
    const REDIRECT_URI = process.env.KAKAO_REDIRECT_URI || `${request.nextUrl.origin}/api/auth/kakao/callback`

    // 디버깅용: 키 전체가 아닌 길이와 앞 4글자만 출력 (보안)
    console.log('[카카오 콜백] 환경변수 확인:', {
      restApiKeyLength: REST_API_KEY.length,
      restApiKeyPrefix: REST_API_KEY.substring(0, 4),
      hasClientSecret: !!CLIENT_SECRET,
      clientSecretLength: CLIENT_SECRET ? CLIENT_SECRET.length : 0,
      clientSecretPrefix: CLIENT_SECRET ? CLIENT_SECRET.substring(0, 4) : '없음',
      redirectUri: REDIRECT_URI,
      redirectUriSource: process.env.KAKAO_REDIRECT_URI ? 'env' : 'dynamic',
      codeLength: code.length,
    })

    // 인가 코드를 액세스 토큰으로 교환
    console.log('[카카오 콜백] 액세스 토큰 교환 시작')
    
    // 요청 body 파라미터 구성
    const tokenParams: Record<string, string> = {
      grant_type: 'authorization_code',
      client_id: REST_API_KEY, // 반드시 REST API 키 사용
      redirect_uri: REDIRECT_URI,
      code: code,
    }
    
    // Client Secret이 설정되어 있으면 포함 (카카오 콘솔에서 Client Secret 사용이 ON인 경우)
    if (CLIENT_SECRET) {
      tokenParams.client_secret = CLIENT_SECRET
      console.log('[카카오 콜백] Client Secret 포함됨')
    } else {
      console.log('[카카오 콜백] Client Secret 없음 (카카오 콘솔에서 Client Secret 사용이 OFF인 경우 정상)')
    }
    
    // 실제 요청 body 생성
    const requestBody = new URLSearchParams(tokenParams)
    
    // 디버깅용: 민감정보 제외하고 파라미터 정보만 출력 (보안)
    console.log('[카카오 콜백] 토큰 요청 준비:', {
      파라미터개수: Object.keys(tokenParams).length,
      파라미터키: Object.keys(tokenParams),
      client_id_길이: REST_API_KEY.length,
      client_id_앞4글자: REST_API_KEY.substring(0, 4),
      hasClientSecret: !!CLIENT_SECRET,
      clientSecret_길이: CLIENT_SECRET ? CLIENT_SECRET.length : 0,
      clientSecret_앞4글자: CLIENT_SECRET ? CLIENT_SECRET.substring(0, 4) : '없음',
      redirectUri: REDIRECT_URI,
      code_앞20글자: code.substring(0, 20) + '...',
    })

    const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
      body: requestBody,
    })

    const responseStatus = tokenResponse.status
    const responseStatusText = tokenResponse.statusText
    const responseOk = tokenResponse.ok

    console.log('[카카오 콜백] 토큰 교환 응답:', {
      status: responseStatus,
      statusText: responseStatusText,
      ok: responseOk,
    })

    if (!responseOk) {
      const errorText = await tokenResponse.text()
      
      // 상세 로깅 (Vercel Functions 로그에서 확인 가능)
      // 디버깅용: 키 전체가 아닌 길이와 앞 4글자만 출력 (보안)
      console.error('[카카오 콜백] 토큰 교환 실패:', {
        status: responseStatus,
        statusText: responseStatusText,
        requestParams: {
          grant_type: 'authorization_code',
          client_id_길이: REST_API_KEY.length,
          client_id_앞4글자: REST_API_KEY.substring(0, 4),
          redirect_uri: REDIRECT_URI,
          code_앞20글자: code.substring(0, 20) + '...',
          hasClientSecret: !!CLIENT_SECRET,
          clientSecret_길이: CLIENT_SECRET ? CLIENT_SECRET.length : 0,
          clientSecret_앞4글자: CLIENT_SECRET ? CLIENT_SECRET.substring(0, 4) : '없음',
        },
        environment: {
          hasRestApiKey: !!REST_API_KEY,
          restApiKeyLength: REST_API_KEY.length,
          restApiKeyPrefix: REST_API_KEY.substring(0, 4),
          hasClientSecret: !!CLIENT_SECRET,
          redirectUriSource: process.env.KAKAO_REDIRECT_URI ? 'env' : 'dynamic',
        },
      })
      
      // 카카오 에러 응답 파싱
      let kakaoError = 'unknown_error'
      let kakaoErrorDescription = '알 수 없는 오류가 발생했습니다.'
      
      try {
        const errorData = JSON.parse(errorText)
        console.error('[카카오 콜백] 카카오 에러 응답:', {
          error: errorData.error,
          error_description: errorData.error_description,
        })
        
        kakaoError = errorData.error || 'unknown_error'
        kakaoErrorDescription = errorData.error_description || kakaoErrorDescription
        
        // invalid_client 에러인 경우 Client Secret 관련 안내 추가
        if (kakaoError === 'invalid_client') {
          const clientSecretGuide = '카카오 개발자 콘솔 > 제품 설정 > 카카오 로그인 > 보안 > Client Secret 사용 여부와 환경변수 KAKAO_CLIENT_SECRET 설정이 일치하는지 확인하세요.'
          kakaoErrorDescription = `${kakaoErrorDescription} (${clientSecretGuide})`
        }
      } catch (parseError) {
        // JSON 파싱 실패 시 원본 텍스트 사용
        console.error('[카카오 콜백] 에러 텍스트 파싱 실패:', {
          parseError: parseError instanceof Error ? parseError.message : String(parseError),
          errorText_앞500글자: errorText.substring(0, 500),
        })
        kakaoErrorDescription = errorText.substring(0, 200)
      }
      
      // 에러와 설명을 쿼리 파라미터로 전달
      const errorParam = `error=${encodeURIComponent(kakaoError)}`
      const descParam = `&desc=${encodeURIComponent(kakaoErrorDescription)}`
      
      return NextResponse.redirect(new URL(`/login?${errorParam}${descParam}`, request.url))
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
