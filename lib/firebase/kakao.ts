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
    // 카카오 로그인 실행
    const response = await new Promise<any>((resolve, reject) => {
      window.Kakao.Auth.login({
        success: resolve,
        fail: reject,
      })
    })

    // 카카오 액세스 토큰 가져오기
    const accessToken = response.access_token

    if (!accessToken) {
      throw new Error('카카오 액세스 토큰을 받지 못했습니다.')
    }

    // 서버로 토큰 전송하여 Firebase Custom Token 받기
    const customTokenResponse = await fetch('/api/auth/kakao', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accessToken }),
    })

    if (!customTokenResponse.ok) {
      const errorData = await customTokenResponse.json()
      throw new Error(errorData.error || '카카오 로그인에 실패했습니다.')
    }

    const { customToken } = await customTokenResponse.json()

    if (!customToken) {
      throw new Error('Firebase Custom Token을 받지 못했습니다.')
    }

    // Firebase에 Custom Token으로 로그인
    const userCredential = await signInWithCustomToken(auth, customToken)
    const user = userCredential.user

    // 사용자 프로필 확인/생성
    const userRef = doc(db, 'users', user.uid)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
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
      await setDoc(userRef, newUser)
    }

    return user
  } catch (error: any) {
    console.error('카카오 로그인 오류:', error)
    throw error
  }
}

