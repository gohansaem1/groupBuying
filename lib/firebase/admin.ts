import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp, collection, getDocs, query, where } from 'firebase/firestore'
import { db } from './config'
import { UserProfile } from './auth'

export interface AdminSettings {
  organizerRecruitmentEnabled: boolean
  defaultCommissionRate?: number // 기본 수수료율 (기본값: 10%)
  updatedAt: any
}

// Organizer 모집 ON/OFF 조회
export async function getOrganizerRecruitmentStatus(): Promise<boolean> {
  const settingsRef = doc(db, 'adminSettings', 'main')
  const settingsSnap = await getDoc(settingsRef)
  
  if (settingsSnap.exists()) {
    return settingsSnap.data().organizerRecruitmentEnabled as boolean
  }
  
  return false // 기본값: OFF
}

// Organizer 모집 ON/OFF 설정 (관리자만)
export async function setOrganizerRecruitmentStatus(enabled: boolean): Promise<void> {
  const settingsRef = doc(db, 'adminSettings', 'main')
  await setDoc(settingsRef, {
    organizerRecruitmentEnabled: enabled,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

// 사용자 역할 변경 (관리자만)
export async function updateUserRole(userId: string, role: 'user' | 'organizer_pending' | 'organizer' | 'admin' | 'owner'): Promise<void> {
  const userRef = doc(db, 'users', userId)
  await updateDoc(userRef, {
    role,
    updatedAt: serverTimestamp(),
  })
}

// 진행자를 관리자로 승격 (오너만)
export async function promoteOrganizerToAdmin(organizerId: string): Promise<void> {
  const userRef = doc(db, 'users', organizerId)
  const userSnap = await getDoc(userRef)
  
  if (!userSnap.exists()) {
    throw new Error('사용자를 찾을 수 없습니다.')
  }
  
  const userData = userSnap.data()
  if (userData.role !== 'organizer') {
    throw new Error('진행자만 관리자로 승격할 수 있습니다.')
  }
  
  await updateDoc(userRef, {
    role: 'admin',
    updatedAt: serverTimestamp(),
  })
}

// 모든 사용자 조회 (관리자만)
export async function getAllUsers(): Promise<UserProfile[]> {
  const usersRef = collection(db, 'users')
  const snapshot = await getDocs(usersRef)
  
  return snapshot.docs.map(doc => ({
    uid: doc.id,
    ...doc.data()
  } as UserProfile))
}

// Organizer 대기 중인 사용자 조회
export async function getPendingOrganizers(): Promise<UserProfile[]> {
  const usersRef = collection(db, 'users')
  const q = query(usersRef, where('role', '==', 'organizer_pending'))
  const snapshot = await getDocs(q)
  
  return snapshot.docs.map(doc => ({
    uid: doc.id,
    ...doc.data()
  } as UserProfile))
}

// 기본 수수료율 조회
export async function getDefaultCommissionRate(): Promise<number> {
  const settingsRef = doc(db, 'adminSettings', 'main')
  const settingsSnap = await getDoc(settingsRef)
  
  if (settingsSnap.exists()) {
    const data = settingsSnap.data()
    return data.defaultCommissionRate || 10 // 기본값 10%
  }
  
  return 10 // 기본값 10%
}

// 기본 수수료율 설정 (관리자만)
export async function setDefaultCommissionRate(rate: number): Promise<void> {
  if (rate < 0 || rate > 100) {
    throw new Error('수수료율은 0%에서 100% 사이여야 합니다.')
  }
  
  const settingsRef = doc(db, 'adminSettings', 'main')
  await setDoc(settingsRef, {
    defaultCommissionRate: rate,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

// 진행자 수수료율 조회 (개별 수수료율이 없으면 기본 수수료율 반환)
export async function getOrganizerCommissionRate(organizerId: string): Promise<number> {
  const commissionRef = doc(db, 'organizerCommissions', organizerId)
  const commissionSnap = await getDoc(commissionRef)
  
  // 개별 수수료율이 있으면 반환
  if (commissionSnap.exists()) {
    const data = commissionSnap.data()
    if (data.rate !== undefined && data.rate !== null) {
      return data.rate
    }
  }
  
  // 개별 수수료율이 없으면 기본 수수료율 반환
  return await getDefaultCommissionRate()
}

// 진행자 수수료율 설정 (관리자만)
export async function setOrganizerCommissionRate(organizerId: string, rate: number): Promise<void> {
  if (rate < 0 || rate > 100) {
    throw new Error('수수료율은 0%에서 100% 사이여야 합니다.')
  }
  
  const commissionRef = doc(db, 'organizerCommissions', organizerId)
  await setDoc(commissionRef, {
    rate,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

// 진행자 개별 수수료율 삭제 (기본 수수료율 사용)
export async function deleteOrganizerCommissionRate(organizerId: string): Promise<void> {
  const commissionRef = doc(db, 'organizerCommissions', organizerId)
  const commissionSnap = await getDoc(commissionRef)
  
  if (commissionSnap.exists()) {
    await deleteDoc(commissionRef)
  }
}

