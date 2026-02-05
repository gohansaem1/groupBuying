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

// 카카오 로그인 (Auth.authorize 사용 - 웹 로그인 화면 표시)
export async function signInWithKakaoSDK(forceSelectAccount: boolean = false) {
  // SDK 로드 대기
  await waitForKakaoSDK()

  if (!window.Kakao) {
    throw new Error('카카오 SDK가 로드되지 않았습니다.')
  }

  try {
    console.log('[카카오 로그인] 웹 로그인 화면으로 이동', { forceSelectAccount })
    
    // SDK 초기화 상태 확인
    if (!window.Kakao.isInitialized()) {
      throw new Error('카카오 SDK가 초기화되지 않았습니다. .env.local에 NEXT_PUBLIC_KAKAO_JS_KEY가 올바르게 설정되어 있는지 확인해 주세요.')
    }
    
    // 현재 URL 기반으로 콜백 URL 생성
    const redirectUri = `${window.location.origin}/api/auth/kakao/callback`
    
    // Auth.authorize()를 사용하여 카카오 웹 로그인 페이지로 리다이렉트
    // 이렇게 하면 아이디/비밀번호 입력 UI가 표시됩니다
    const authorizeOptions: any = {
      redirectUri: redirectUri,
      throughTalk: false, // 웹 로그인 화면 표시
    }
    
    // 계정 선택 화면 강제 표시
    if (forceSelectAccount) {
      authorizeOptions.prompt = 'select_account'
      console.log('[카카오 로그인] 계정 선택 화면 강제 표시 (prompt: select_account)')
    }
    
    console.log('[카카오 로그인] Auth.authorize() 호출:', { redirectUri, throughTalk: false, prompt: authorizeOptions.prompt })
    
    // 카카오 웹 로그인 페이지로 리다이렉트
    // 이 함수는 페이지를 이동시키므로 이후 코드는 실행되지 않습니다
    window.Kakao.Auth.authorize(authorizeOptions)
    
    // 이 코드는 실행되지 않지만, 타입 에러 방지를 위해 반환값 추가
    return null as any
  } catch (error: any) {
    console.error('카카오 로그인 오류:', error)
    throw error
  }
}

