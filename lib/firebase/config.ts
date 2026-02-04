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

let app: FirebaseApp
let auth: Auth
let db: Firestore

if (typeof window !== 'undefined') {
  try {
    if (!getApps().length) {
      // 필수 환경 변수 확인
      if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        const errorMsg = 'Firebase 환경 변수가 설정되지 않았습니다. Vercel 대시보드에서 환경 변수를 확인하세요.'
        console.error('[Firebase Config]', errorMsg)
        // 프로덕션에서는 기본값으로 초기화 시도 (에러 방지)
        if (process.env.NODE_ENV === 'production') {
          console.warn('[Firebase Config] 환경 변수 누락으로 인해 Firebase 기능이 제한될 수 있습니다.')
        } else {
          throw new Error(errorMsg)
        }
      }
      app = initializeApp(firebaseConfig)
    } else {
      app = getApps()[0]
    }
    auth = getAuth(app)
    db = getFirestore(app)
  } catch (error) {
    console.error('[Firebase Config] 초기화 실패:', error)
    // 프로덕션에서는 에러를 던지지 않고 경고만 표시
    if (process.env.NODE_ENV === 'production') {
      console.error('[Firebase Config] 프로덕션 환경에서 Firebase 초기화 실패')
      // 기본값으로 초기화 (타입 에러 방지)
      app = initializeApp(firebaseConfig)
      auth = getAuth(app)
      db = getFirestore(app)
    } else {
      throw error
    }
  }
}

export { auth, db }



