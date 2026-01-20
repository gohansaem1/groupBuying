import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  User,
  onAuthStateChanged
} from 'firebase/auth'
import { auth } from './config'
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from './config'

export type UserRole = 'user' | 'organizer_pending' | 'organizer' | 'admin'

export interface UserProfile {
  uid: string
  email: string | null
  displayName: string | null
  nickname: string | null // 닉네임 필드 추가
  photoURL: string | null
  role: UserRole
  createdAt: any
  updatedAt: any
}

// 카카오 로그인
export async function signInWithKakao() {
  // 카카오 SDK를 사용한 로그인
  const { signInWithKakaoSDK } = await import('./kakao')
  return await signInWithKakaoSDK()
}

// 테스트용 로그인 (개발 환경에서만)
export async function signInWithTestUser(userId: string): Promise<{ user: User; userInfo: any }> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('테스트 로그인은 개발 환경에서만 사용 가능합니다.')
  }

  const response = await fetch('/api/auth/test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || '테스트 로그인에 실패했습니다.')
  }

  const { customToken, userInfo } = await response.json()

  if (!customToken) {
    throw new Error('Custom Token을 받지 못했습니다.')
  }

  // Firebase에 Custom Token으로 로그인
  const { signInWithCustomToken } = await import('firebase/auth')
  const userCredential = await signInWithCustomToken(auth, customToken)
  
  return {
    user: userCredential.user,
    userInfo: userInfo || {}
  }
}

export async function signOut() {
  await firebaseSignOut(auth)
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const user = auth.currentUser
  if (!user) return null
  
  const userRef = doc(db, 'users', user.uid)
  const userSnap = await getDoc(userRef)
  
  if (userSnap.exists()) {
    return userSnap.data() as UserProfile
  }
  
  return null
}

// 닉네임 설정 (변경 포함)
export async function setNickname(nickname: string, currentNickname?: string | null): Promise<void> {
  const user = auth.currentUser
  if (!user) {
    throw new Error('로그인이 필요합니다.')
  }

  const trimmedNickname = nickname.trim()
  
  // 현재 닉네임과 같으면 중복 검사 생략
  if (currentNickname && trimmedNickname === currentNickname) {
    return // 변경 없음
  }

  // 닉네임 중복 검사 (현재 닉네임 제외)
  const response = await fetch('/api/auth/check-nickname', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ nickname: trimmedNickname, excludeUserId: user.uid }),
  })

  const data = await response.json()

  if (!response.ok || !data.available) {
    throw new Error(data.message || '닉네임 설정에 실패했습니다.')
  }

  // Firestore에 닉네임 저장
  const userRef = doc(db, 'users', user.uid)
  await updateDoc(userRef, {
    nickname: trimmedNickname,
    updatedAt: serverTimestamp(),
  })
}

// 승인 요청 취소 (organizer_pending -> user)
export async function cancelOrganizerApplication(): Promise<void> {
  const user = auth.currentUser
  if (!user) {
    throw new Error('로그인이 필요합니다.')
  }

  const userRef = doc(db, 'users', user.uid)
  const userSnap = await getDoc(userRef)
  
  if (!userSnap.exists()) {
    throw new Error('사용자 정보를 찾을 수 없습니다.')
  }

  const userData = userSnap.data() as UserProfile
  
  if (userData.role !== 'organizer_pending') {
    throw new Error('승인 대기 중인 상태가 아닙니다.')
  }

  await updateDoc(userRef, {
    role: 'user',
    updatedAt: serverTimestamp(),
  })
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback)
}
