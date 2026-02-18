import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getAuth, Auth } from 'firebase/auth'
import { getFirestore, Firestore } from 'firebase/firestore'

// 환경 변수 검증
const requiredEnvVars = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// 개발 환경에서만 환경 변수 누락 경고
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const missingVars = Object.entries(requiredEnvVars)
    .filter(([key, value]) => !value)
    .map(([key]) => `NEXT_PUBLIC_FIREBASE_${key.toUpperCase().replace(/([A-Z])/g, '_$1').replace(/^_/, '')}`)
  
  if (missingVars.length > 0) {
    console.warn('[Firebase Config] 누락된 환경 변수:', missingVars.join(', '))
    console.warn('[Firebase Config] .env.local 파일을 확인하세요.')
  }
}

const firebaseConfig = {
  apiKey: requiredEnvVars.apiKey,
  authDomain: requiredEnvVars.authDomain,
  projectId: requiredEnvVars.projectId,
  storageBucket: requiredEnvVars.storageBucket,
  messagingSenderId: requiredEnvVars.messagingSenderId,
  appId: requiredEnvVars.appId,
}

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null
let initError: Error | null = null

if (typeof window !== 'undefined') {
  try {
    // 필수 환경 변수 확인
    const missingVars: string[] = []
    if (!firebaseConfig.apiKey) missingVars.push('NEXT_PUBLIC_FIREBASE_API_KEY')
    if (!firebaseConfig.projectId) missingVars.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID')
    if (!firebaseConfig.authDomain) missingVars.push('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN')
    
    if (missingVars.length > 0) {
      const errorMsg = `Firebase 환경 변수가 누락되었습니다: ${missingVars.join(', ')}\nVercel 대시보드에서 환경 변수를 확인하세요.`
      initError = new Error(errorMsg)
      console.error('[Firebase Config]', errorMsg)
      
      // DOM에 에러 메시지 표시 (개발자 도구 없이도 확인 가능)
      if (typeof document !== 'undefined') {
        const errorDiv = document.createElement('div')
        errorDiv.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#dc2626;color:white;padding:1rem;z-index:9999;font-family:monospace;font-size:12px;'
        errorDiv.textContent = `[Firebase 오류] ${errorMsg}`
        document.body.appendChild(errorDiv)
      }
      
      // 프로덕션에서는 기본값으로 초기화 시도 (에러 방지)
      if (process.env.NODE_ENV === 'production') {
        console.warn('[Firebase Config] 환경 변수 누락으로 인해 Firebase 기능이 제한될 수 있습니다.')
        // 빈 값으로 초기화 시도 (에러 발생 가능)
        try {
          app = initializeApp(firebaseConfig)
          auth = getAuth(app)
          db = getFirestore(app)
        } catch (initErr) {
          console.error('[Firebase Config] 빈 값으로 초기화 실패:', initErr)
        }
      } else {
        throw initError
      }
    } else {
      if (!getApps().length) {
        app = initializeApp(firebaseConfig)
      } else {
        app = getApps()[0]
      }
      auth = getAuth(app)
      db = getFirestore(app)
    }
  } catch (error: any) {
    initError = error
    console.error('[Firebase Config] 초기화 실패:', error)
    
    // DOM에 에러 메시지 표시
    if (typeof document !== 'undefined') {
      const errorDiv = document.createElement('div')
      errorDiv.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#dc2626;color:white;padding:1rem;z-index:9999;font-family:monospace;font-size:12px;'
      errorDiv.textContent = `[Firebase 초기화 실패] ${error.message || '알 수 없는 오류'}`
      document.body.appendChild(errorDiv)
    }
    
    // 프로덕션에서는 에러를 던지지 않고 경고만 표시
    if (process.env.NODE_ENV === 'production') {
      console.error('[Firebase Config] 프로덕션 환경에서 Firebase 초기화 실패')
      // 기본값으로 초기화 시도 (타입 에러 방지)
      try {
        app = initializeApp(firebaseConfig)
        auth = getAuth(app)
        db = getFirestore(app)
      } catch (initErr) {
        console.error('[Firebase Config] 기본값 초기화도 실패:', initErr)
      }
    }
  }
}

// Firebase 초기화 상태 확인 함수
export function isFirebaseInitialized(): boolean {
  return app !== null && auth !== null && db !== null && initError === null
}

// Firebase 초기화 에러 가져오기
export function getFirebaseInitError(): Error | null {
  return initError
}

// 안전한 auth/db export (null 체크)
export { auth, db }



