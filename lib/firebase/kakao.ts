/**
 * 카카오 로그인 구현
 * 
 * Firebase에서 카카오 OAuth를 직접 지원하지 않으므로,
 * 카카오 SDK를 사용하여 인증 후 Firebase Custom Token을 생성합니다.
 */

import { signInWithCustomToken } from 'firebase/auth'
import { auth } from './config'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './config'
import { UserProfile } from './auth'

declare global {
  interface Window {
    Kakao: any
  }
}

// 카카오 SDK 초기화
export function initKakao() {
  if (typeof window === 'undefined') return
  
  const KAKAO_JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY
  if (!KAKAO_JS_KEY) {
    console.warn('NEXT_PUBLIC_KAKAO_JS_KEY가 설정되지 않았습니다.')
    return
  }

  // SDK가 이미 로드되어 있으면 초기화
  if (window.Kakao) {
    if (!window.Kakao.isInitialized()) {
      try {
        window.Kakao.init(KAKAO_JS_KEY)
      } catch (error) {
        console.error('카카오 SDK 초기화 오류:', error)
      }
    }
  }
}

// 카카오 SDK 로드 대기
export function waitForKakaoSDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('브라우저 환경이 아닙니다.'))
      return
    }

    const KAKAO_JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY
    if (!KAKAO_JS_KEY) {
      reject(new Error('NEXT_PUBLIC_KAKAO_JS_KEY가 설정되지 않았습니다.'))
      return
    }

    // 이미 로드되어 있고 초기화되어 있으면 즉시 resolve
    if (window.Kakao && window.Kakao.isInitialized()) {
      resolve()
      return
    }

    // SDK 스크립트가 로드되었는지 확인
    const scriptLoaded = document.querySelector('script[src*="kakao.js"]')
    if (!scriptLoaded) {
      // 스크립트가 없으면 동적으로 로드
      const script = document.createElement('script')
      script.src = 'https://developers.kakao.com/sdk/js/kakao.js'
      script.async = true
      script.onload = () => {
        if (window.Kakao && !window.Kakao.isInitialized()) {
          window.Kakao.init(KAKAO_JS_KEY)
        }
        resolve()
      }
      script.onerror = () => {
        reject(new Error('카카오 SDK 스크립트 로드 실패'))
      }
      document.head.appendChild(script)
      return
    }

    // SDK 로드 대기
    let attempts = 0
    const maxAttempts = 100 // 10초 (100ms * 100)
    
    const checkInterval = setInterval(() => {
      attempts++
      
      if (window.Kakao) {
        if (!window.Kakao.isInitialized()) {
          try {
            window.Kakao.init(KAKAO_JS_KEY)
          } catch (error) {
            console.error('카카오 SDK 초기화 오류:', error)
          }
        }
        
        if (window.Kakao.isInitialized()) {
          clearInterval(checkInterval)
          resolve()
          return
        }
      }

      if (attempts >= maxAttempts) {
        clearInterval(checkInterval)
        reject(new Error('카카오 SDK 로드 타임아웃'))
      }
    }, 100)
  })
}

// 카카오 로그인
export async function signInWithKakaoSDK() {
  // SDK 로드 대기
  await waitForKakaoSDK()

  if (!window.Kakao) {
    throw new Error('카카오 SDK가 로드되지 않았습니다.')
  }

  try {
    console.log('[카카오 로그인] 1단계: 카카오 로그인 시작')
    
    // SDK 초기화 상태 확인
    if (!window.Kakao.isInitialized()) {
      throw new Error('카카오 SDK가 초기화되지 않았습니다. .env.local에 NEXT_PUBLIC_KAKAO_JS_KEY가 올바르게 설정되어 있는지 확인해 주세요.')
    }
    
    // 카카오 SDK 버전 및 상태 확인
    const sdkVersion = window.Kakao?.VERSION || 'unknown'
    const jsKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY
    console.log('[카카오 로그인] SDK 버전:', sdkVersion)
    console.log('[카카오 로그인] SDK 초기화 상태:', window.Kakao.isInitialized())
    console.log('[카카오 로그인] Auth 객체 존재:', !!window.Kakao.Auth)
    console.log('[카카오 로그인] JS Key 설정 여부:', !!jsKey, jsKey ? `${jsKey.substring(0, 10)}...` : '없음')
    console.log('[카카오 로그인] 현재 URL:', window.location.href)
    
    // 카카오 로그인 실행 (닉네임·이메일 동의 scope)
    const response = await new Promise<any>((resolve, reject) => {
      let callbackCalled = false
      
      // 타임아웃 (30초로 증가 - 팝업에서 로그인 완료 후 Redirect URI로 리다이렉트되는 시간 고려)
      const loginTimeout = setTimeout(() => {
        if (!callbackCalled) {
          callbackCalled = true
          console.error('[카카오 로그인] 타임아웃: 콜백이 호출되지 않았습니다.')
          console.error('[카카오 로그인] 가능한 원인:')
          console.error('  1. 팝업이 차단되었거나 열리지 않음')
          console.error('  2. 팝업에서 로그인 완료했지만 Redirect URI가 현재 페이지와 일치하지 않음')
          console.error('  3. 카카오 개발자 콘솔에서 Redirect URI를 http://localhost:3000/login 으로 설정했는지 확인')
          reject(new Error('카카오 로그인 시간이 초과되었습니다. 다음을 확인해 주세요:\n1. 팝업이 열렸는지 확인\n2. 팝업에서 로그인을 완료했는지 확인\n3. 카카오 개발자 콘솔에서 Redirect URI를 http://localhost:3000/login 으로 설정\n4. 브라우저 주소창 오른쪽의 팝업 차단 아이콘 확인'))
        }
      }, 30000) // 30초로 증가
      
      try {
        console.log('[카카오 로그인] Auth.login() 호출 시작')
        
        // 팝업 차단 감지를 위한 체크
        const checkPopupBlocked = () => {
          // 팝업이 열렸는지 확인하기 어려우므로, 사용자에게 안내
          console.log('[카카오 로그인] 팝업 열림 시도 중...')
          console.log('[카카오 로그인] 팝업이 보이지 않으면 브라우저 주소창 오른쪽의 팝업 차단 아이콘을 확인하세요.')
        }
        
        // 카카오 로그인 실행 (팝업 방식)
        // 참고: 카카오 SDK v1.43.6은 팝업 방식입니다.
        // 팝업에서 로그인 완료 후 카카오가 Redirect URI로 리다이렉트하는데,
        // Redirect URI가 현재 페이지와 일치해야 콜백이 호출됩니다.
        console.log('[카카오 로그인] 중요: 팝업에서 로그인 완료 후 Redirect URI가 현재 페이지(http://localhost:3000/login)와 일치해야 합니다!')
        
        // 카카오 SDK v1.43.6에서는 scope를 명시하지 않으면 기본 권한(닉네임, 프로필 사진)만 요청합니다.
        // 이메일은 카카오 개발자 콘솔에서 동의 항목이 활성화되어 있을 때만 추가로 요청할 수 있습니다.
        const loginOptions: any = {
          success: (res: any) => {
            if (callbackCalled) {
              console.warn('[카카오 로그인] success 콜백이 이미 호출되었습니다. 중복 호출 무시.')
              return
            }
            callbackCalled = true
            clearTimeout(loginTimeout)
            console.log('[카카오 로그인] ✅ 1단계 완료: 카카오 로그인 성공', res)
            if (!res || !res.access_token) {
              console.error('[카카오 로그인] 응답에 access_token이 없습니다:', res)
              reject(new Error('카카오 로그인 응답에 액세스 토큰이 없습니다.'))
              return
            }
            resolve(res)
          },
          fail: (err: any) => {
            if (callbackCalled) return
            callbackCalled = true
            clearTimeout(loginTimeout)
            console.error('[카카오 로그인] 1단계 실패:', err)
            console.error('[카카오 로그인] 에러 상세:', {
              error: err,
              errorType: typeof err,
              errorKeys: err ? Object.keys(err) : [],
              errorString: JSON.stringify(err),
              errorMessage: err?.message,
              errorCode: err?.code,
            })
            
            // 에러 메시지 추출
            let errorMessage = '카카오 로그인에 실패했습니다.'
            if (err) {
              if (typeof err === 'string') {
                errorMessage = err
              } else if (err.error) {
                errorMessage = err.error
              } else if (err.error_description) {
                errorMessage = err.error_description
              } else if (err.message) {
                errorMessage = err.message
              } else if (Object.keys(err).length === 0) {
                errorMessage = '카카오 로그인이 취소되었거나 실패했습니다. 팝업에서 로그인을 완료했는지 확인해 주세요.'
              }
            }
            
            reject(new Error(errorMessage))
          },
          // scope 제거: 카카오 SDK v1.43.6에서는 scope를 명시하지 않으면 기본 권한만 요청합니다.
          // 기본 권한: 닉네임, 프로필 사진
          // 이메일은 카카오 개발자 콘솔에서 동의 항목이 활성화되어 있을 때 자동으로 포함됩니다.
        }
        
        // 카카오 SDK v1.43.6에서는 scope를 통해 권한 요청
        window.Kakao.Auth.login(loginOptions)
        
        // 팝업 차단 체크 (약간의 지연 후)
        setTimeout(checkPopupBlocked, 500)
        
        console.log('[카카오 로그인] Auth.login() 호출 완료 (팝업 열림 대기 중)')
        console.log('[카카오 로그인] 팝업이 열리지 않으면:')
        console.log('  1. 브라우저 주소창 오른쪽의 팝업 차단 아이콘 클릭 → "항상 허용"')
        console.log('  2. 카카오 개발자 콘솔에서 사이트 도메인 설정 확인')
        console.log('  3. 시크릿 모드에서 시도')
      } catch (err: any) {
        if (callbackCalled) return
        callbackCalled = true
        clearTimeout(loginTimeout)
        console.error('[카카오 로그인] SDK 호출 오류:', err)
        reject(new Error(`카카오 로그인 호출 실패: ${err.message || '알 수 없는 오류'}`))
      }
    })

    // 카카오 액세스 토큰 가져오기
    const accessToken = response.access_token

    if (!accessToken) {
      throw new Error('카카오 액세스 토큰을 받지 못했습니다.')
    }

    console.log('[카카오 로그인] 2단계: 서버로 토큰 전송 시작', { accessToken: accessToken ? `${accessToken.substring(0, 20)}...` : '없음' })
    // 서버로 토큰 전송하여 Firebase Custom Token 받기 (15초 타임아웃)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)
    
    let customTokenResponse: Response
    try {
      customTokenResponse = await fetch('/api/auth/kakao', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessToken }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      console.log('[카카오 로그인] 2단계: 서버 응답 받음', { status: customTokenResponse.status, ok: customTokenResponse.ok })
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      console.error('[카카오 로그인] 2단계: 서버 요청 실패', fetchError)
      if (fetchError.name === 'AbortError') {
        throw new Error('서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.')
      }
      throw new Error(`서버 요청 실패: ${fetchError.message || '알 수 없는 오류'}`)
    }

    if (!customTokenResponse.ok) {
      const errorData = await customTokenResponse.json().catch(() => ({}))
      console.error('[카카오 로그인] 2단계: 서버 에러 응답', { status: customTokenResponse.status, errorData })
      throw new Error(errorData.error || `서버 오류 (${customTokenResponse.status}): 카카오 로그인에 실패했습니다.`)
    }

    const responseData = await customTokenResponse.json().catch((err) => {
      console.error('[카카오 로그인] 2단계: 응답 파싱 실패', err)
      throw new Error('서버 응답을 파싱할 수 없습니다.')
    })
    console.log('[카카오 로그인] 2단계 완료: Custom Token 수신', { hasCustomToken: !!responseData.customToken })
    
    const { customToken } = responseData

    if (!customToken) {
      throw new Error('Firebase Custom Token을 받지 못했습니다.')
    }

    console.log('[카카오 로그인] 3단계: Firebase 로그인 시작', { hasCustomToken: !!customToken })
    // Firebase에 Custom Token으로 로그인
    let userCredential: any
    try {
      userCredential = await signInWithCustomToken(auth, customToken)
      console.log('[카카오 로그인] 3단계 완료: Firebase 로그인 성공', { uid: userCredential.user?.uid })
    } catch (firebaseError: any) {
      console.error('[카카오 로그인] 3단계: Firebase 로그인 실패', {
        code: firebaseError.code,
        message: firebaseError.message,
        customToken: customToken ? `${customToken.substring(0, 20)}...` : '없음',
      })
      throw new Error(`Firebase 로그인 실패: ${firebaseError.message || '알 수 없는 오류'}`)
    }
    const user = userCredential.user

    console.log('[카카오 로그인] 4단계: 사용자 프로필 확인/생성', { uid: user.uid })
    // 사용자 프로필 확인/생성
    const userRef = doc(db, 'users', user.uid)
    let userSnap: any
    try {
      userSnap = await getDoc(userRef)
      console.log('[카카오 로그인] 4단계: 프로필 조회 완료', { exists: userSnap.exists() })
    } catch (firestoreError: any) {
      console.error('[카카오 로그인] 4단계: 프로필 조회 실패', firestoreError)
      throw new Error(`프로필 조회 실패: ${firestoreError.message || '알 수 없는 오류'}`)
    }

    if (!userSnap.exists()) {
      console.log('[카카오 로그인] 4단계: 새 사용자 프로필 생성')
      // 새 사용자 생성 (nickname은 null로 시작, 동의는 false로 시작)
      const newUser: UserProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        nickname: null, // 닉네임은 별도 설정 필요
        photoURL: user.photoURL,
        role: 'user',
        userAgreedToTerms: false, // 일반 사용자 동의는 아직 하지 않음
        organizerAgreedToTerms: false, // 진행자 동의는 아직 하지 않음
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
      try {
        await setDoc(userRef, newUser)
        console.log('[카카오 로그인] 4단계 완료: 새 사용자 프로필 생성 완료')
      } catch (setDocError: any) {
        console.error('[카카오 로그인] 4단계: 프로필 생성 실패', setDocError)
        throw new Error(`프로필 생성 실패: ${setDocError.message || '알 수 없는 오류'}`)
      }
    } else {
      console.log('[카카오 로그인] 4단계 완료: 기존 사용자 프로필 확인')
    }

    console.log('[카카오 로그인] 전체 프로세스 완료!')
    return user
  } catch (error: any) {
    console.error('카카오 로그인 오류:', error)
    if (error.name === 'AbortError') {
      throw new Error('서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.')
    }
    throw error
  }
}

