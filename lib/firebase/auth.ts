import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  User,
  onAuthStateChanged
} from 'firebase/auth'
import { auth } from './config'
import { doc, getDoc, setDoc, serverTimestamp, updateDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore'
import { db } from './config'

export type UserRole = 'user' | 'organizer_pending' | 'organizer' | 'admin' | 'owner'

export interface UserProfile {
  uid: string
  email: string | null
  displayName: string | null
  nickname: string | null // 닉네임 필드 추가
  photoURL: string | null
  role: UserRole
  agreedToTerms?: boolean // 서비스 이용 약관 동의 여부 (하위 호환성)
  userAgreedToTerms?: boolean // 일반 사용자 약관 동의 여부
  organizerAgreedToTerms?: boolean // 진행자 약관 동의 여부
  createdAt: any
  updatedAt: any
  // 진행자 신청 정보 (organizer_pending 또는 organizer일 때만 존재)
  organizerApplication?: {
    realName: string // 실명
    phoneNumber: string // 휴대폰 번호
    deliveryPostcode: string // 우편번호
    deliveryAddress: string // 기본주소
    deliveryAddressDetail: string // 상세주소
    buildingPassword?: string // 공동현관 비밀번호 (선택)
    accountNumber: string // 정산 계좌번호
    agreedToPrivacy: boolean // 개인정보 수집·이용 동의 (필수)
    agreedToResponsibility: boolean // 진행자 운영 책임 동의 (필수)
    agreedToPickup: boolean // 주문내역 확인 및 픽업 운영 동의 (필수)
    agreedToMarketing?: boolean // 마케팅 정보 수신 동의 (선택)
    appliedAt: any // 신청 일시
  }
}

// 카카오 로그인
export async function signInWithKakao(forceSelectAccount: boolean = false) {
  // 카카오 SDK를 사용한 로그인
  const { signInWithKakaoSDK } = await import('./kakao')
  return await signInWithKakaoSDK(forceSelectAccount)
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
  // 카카오 로컬 스토리지 정리 (완전한 로그아웃)
  if (typeof window !== 'undefined' && typeof Storage !== 'undefined') {
    try {
      // 카카오 관련 로컬 스토리지 키들 정리
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.includes('kakao') || key.includes('Kakao'))) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key))
      console.log('[로그아웃] 카카오 로컬 스토리지 정리 완료')
    } catch (storageError) {
      console.warn('[로그아웃] 로컬 스토리지 정리 실패 (무시 가능):', storageError)
    }
  }
  
  // Firebase 로그아웃
  if (!auth) {
    console.error('[로그아웃] Firebase가 초기화되지 않았습니다.')
    return
  }
  
  await firebaseSignOut(auth)
  console.log('[로그아웃] Firebase 로그아웃 완료')
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  if (!auth || !db) {
    console.error('[getCurrentUserProfile] Firebase가 초기화되지 않았습니다.')
    return null
  }
  
  const user = auth.currentUser
  if (!user) return null
  
  const userRef = doc(db, 'users', user.uid)
  const userSnap = await getDoc(userRef)
  
  if (userSnap.exists()) {
    return userSnap.data() as UserProfile
  }
  
  return null
}

// 일반 사용자 약관 동의 처리
export async function agreeToUserTerms(): Promise<void> {
  if (!auth || !db) {
    throw new Error('Firebase가 초기화되지 않았습니다.')
  }
  
  const user = auth.currentUser
  if (!user) {
    throw new Error('로그인이 필요합니다.')
  }

  const userRef = doc(db, 'users', user.uid)
  await updateDoc(userRef, {
    userAgreedToTerms: true,
    updatedAt: serverTimestamp(),
  })
}

// 진행자 약관 동의 처리
export async function agreeToOrganizerTerms(): Promise<void> {
  if (!auth || !db) {
    throw new Error('Firebase가 초기화되지 않았습니다.')
  }
  
  const user = auth.currentUser
  if (!user) {
    throw new Error('로그인이 필요합니다.')
  }

  const userRef = doc(db, 'users', user.uid)
  await updateDoc(userRef, {
    organizerAgreedToTerms: true,
    updatedAt: serverTimestamp(),
  })
}

// 닉네임 설정 (변경 포함)
export async function setNickname(nickname: string, currentNickname?: string | null): Promise<void> {
  if (!auth || !db) {
    throw new Error('Firebase가 초기화되지 않았습니다.')
  }
  
  const user = auth.currentUser
  if (!user) {
    throw new Error('로그인이 필요합니다.')
  }

  const trimmedNickname = nickname.trim()
  
  // 현재 닉네임과 같으면 변경 불필요
  if (currentNickname && trimmedNickname === currentNickname) {
    throw new Error('변경된 내용이 없습니다.')
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
  
  // 해당 사용자가 생성한 모든 공동구매 건의 organizerName 업데이트
  const groupsRef = collection(db, 'groups')
  const groupsQuery = query(groupsRef, where('organizerId', '==', user.uid))
  const groupsSnapshot = await getDocs(groupsQuery)
  
  // 해당 사용자의 모든 주문의 userName 업데이트
  const ordersRef = collection(db, 'orders')
  const ordersQuery = query(ordersRef, where('userId', '==', user.uid))
  const ordersSnapshot = await getDocs(ordersQuery)
  
  // 배치 업데이트
  const batch = writeBatch(db)
  
  // 공동구매 건 업데이트
  if (!groupsSnapshot.empty) {
    groupsSnapshot.docs.forEach((groupDoc) => {
      batch.update(groupDoc.ref, {
        organizerName: trimmedNickname,
        updatedAt: serverTimestamp(),
      })
    })
  }
  
  // 주문 업데이트
  if (!ordersSnapshot.empty) {
    ordersSnapshot.docs.forEach((orderDoc) => {
      batch.update(orderDoc.ref, {
        userName: trimmedNickname,
        updatedAt: serverTimestamp(),
      })
    })
  }
  
  // 배치 커밋
  if (!groupsSnapshot.empty || !ordersSnapshot.empty) {
    await batch.commit()
  }
}

// 승인 요청 취소 (organizer_pending -> user)
export async function cancelOrganizerApplication(): Promise<void> {
  if (!auth || !db) {
    throw new Error('Firebase가 초기화되지 않았습니다.')
  }
  
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

  // organizerApplication 정보도 함께 삭제
  await updateDoc(userRef, {
    role: 'user',
    organizerApplication: null,
    updatedAt: serverTimestamp(),
  })
}

export function onAuthChange(callback: (user: User | null) => void) {
  // Firebase 초기화 확인
  if (!auth) {
    console.error('[Firebase Auth] Firebase가 초기화되지 않았습니다. 환경 변수를 확인하세요.')
    // 즉시 null로 콜백 호출하여 무한 로딩 방지
    callback(null)
    // 빈 unsubscribe 함수 반환
    return () => {}
  }
  
  try {
    return onAuthStateChanged(auth, callback)
  } catch (error: any) {
    console.error('[Firebase Auth] onAuthStateChanged 실패:', error)
    // 에러 발생 시 즉시 null로 콜백 호출
    callback(null)
    return () => {}
  }
}
