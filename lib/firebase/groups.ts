import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
  increment,
  writeBatch,
  orderBy
} from 'firebase/firestore'
import { db } from './config'
import { Product } from './products'

// 주문자별 최소 주문 금액 (10,000원)
const MIN_USER_ORDER_AMOUNT = 10000

export interface GroupMenuItem {
  productId: string
  productName: string
  productPrice: number // 실제 판매가격 (정가 * (1 - 할인율))
  listPrice: number // 정가
  discountRate: number // 할인율
  description: string
  capacity?: string // 용량 정보 (예: "500ml", "1kg")
  imageUrl?: string // 상품 대표 이미지 URL
  detailImages?: string[] // 상세보기 이미지 URL 배열
  detailDescription?: string // 상세보기 설명 (텍스트)
}

export interface Group {
  id: string
  title: string // 공동구매 건 제목 (구분용)
  organizerId: string
  organizerName: string
  menuItems: GroupMenuItem[] // 메뉴판 (여러 상품)
  minimumTotal: number // 최소 그룹 총액 (40,000원)
  currentTotal: number // 현재 총액
  status: '진행중' | '달성' | '확정' | '배송중' | '완료'
  imageUrl?: string // 공동구매 건 대표 이미지 URL
  createdAt: Timestamp
  updatedAt: Timestamp
  // 날짜 관련 필드
  startDate?: Timestamp // 공동구매 시작일
  endDate?: Timestamp // 공동구매 종료일 (주문 마감일)
  deliveryMethod?: string // 수령방법 (예: "직접 수령", "배송", "픽업")
  deliveryDescription?: string // 수령방법 상세 설명
  deliveryLocation?: string // 수령 장소 (선택사항)
  // 배송정보 필드
  deliveryAddress?: string // 배송지 주소 (도로명 주소)
  deliveryAddressDetail?: string // 배송지 상세주소
  deliveryPostcode?: string // 우편번호
  deliveryBuildingPassword?: string // 공동출입문 비밀번호 (빌라/아파트용)
  deliveryName?: string // 배송지 수령인 이름
  deliveryPhone?: string // 배송지 수령인 전화번호
  deliveryDetailStatus?: '입금안내' | '입금확인' | '생산입력' | '배송입력' | '배송완료' // 배송 세부 상태
  shippingStartedAt?: Timestamp // 배송중 상태로 변경된 시점
  // 하위 호환성을 위한 필드 (deprecated)
  productId?: string
  productName?: string
  productPrice?: number
}

export interface Order {
  id: string
  groupId: string
  userId: string
  userName: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  status: '주문완료' | '확정' | '배송중' | '완료'
  createdAt: Timestamp
  updatedAt: Timestamp
}

// 그룹 생성 (메뉴판 방식 - 여러 상품 선택 가능)
export async function createGroup(
  title: string,
  organizerId: string,
  organizerName: string,
  menuItems: GroupMenuItem[], // 여러 상품을 메뉴로 구성
  imageUrl?: string, // 공동구매 건 대표 이미지 URL
  startDate?: Date, // 공동구매 시작일
  endDate?: Date, // 공동구매 종료일 (주문 마감일)
  deliveryMethod?: string, // 수령방법
  deliveryDescription?: string, // 수령방법 상세 설명
  deliveryLocation?: string, // 수령 장소
  deliveryAddress?: string, // 배송지 주소
  deliveryAddressDetail?: string, // 배송지 상세주소
  deliveryPostcode?: string, // 우편번호
  deliveryBuildingPassword?: string, // 공동출입문 비밀번호
  deliveryName?: string, // 배송지 수령인 이름
  deliveryPhone?: string // 배송지 수령인 전화번호
): Promise<string> {
  if (menuItems.length === 0) {
    throw new Error('최소 1개 이상의 상품을 선택해주세요.')
  }
  
  // 날짜 유효성 검증 강화
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  if (startDate) {
    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    if (start < today) {
      throw new Error('시작일은 오늘 이후여야 합니다.')
    }
  }
  
  if (startDate && endDate) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    start.setHours(0, 0, 0, 0)
    end.setHours(0, 0, 0, 0)
    
    if (start >= end) {
      throw new Error('시작일은 주문 마감일보다 이전이어야 합니다.')
    }
    
    // 최소 기간 검증 (시작일과 종료일 사이 최소 1일)
    const daysBetween = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    if (daysBetween < 1) {
      throw new Error('시작일과 주문 마감일 사이에는 최소 1일 이상이 필요합니다.')
    }
  }
  
  
  const groupsRef = collection(db, 'groups')
  const newGroupRef = doc(groupsRef)
  
  // menuItems에서 undefined 값 제거
  const cleanedMenuItems = menuItems.map(item => {
    const cleaned: any = {
      productId: item.productId,
      productName: item.productName,
      productPrice: item.productPrice,
      listPrice: item.listPrice,
      discountRate: item.discountRate,
      description: item.description || '',
    }
    
    // 선택적 필드는 값이 있을 때만 추가
    if (item.imageUrl !== undefined && item.imageUrl !== null && item.imageUrl !== '') {
      cleaned.imageUrl = item.imageUrl
    }
    if (item.detailImages !== undefined && item.detailImages !== null && item.detailImages.length > 0) {
      cleaned.detailImages = item.detailImages
    }
    if (item.detailDescription !== undefined && item.detailDescription !== null && item.detailDescription !== '') {
      cleaned.detailDescription = item.detailDescription
    }
    
    return cleaned
  })
  
  // undefined 값을 제거하고 필요한 필드만 포함
  const group: any = {
    title: title.trim() || '공동구매', // 제목이 없으면 기본값 사용
    organizerId,
    organizerName,
    menuItems: cleanedMenuItems,
    minimumTotal: 40000,
    currentTotal: 0,
    status: '진행중',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    // 하위 호환성 (첫 번째 메뉴 아이템을 기본값으로)
    productId: cleanedMenuItems[0].productId,
    productName: cleanedMenuItems[0].productName,
    productPrice: cleanedMenuItems[0].productPrice,
  }
  
  // 선택적 필드는 값이 있을 때만 추가 (undefined 제거)
  if (imageUrl !== undefined && imageUrl !== null && imageUrl !== '') {
    group.imageUrl = imageUrl
  }
  
  if (startDate !== undefined && startDate !== null) {
    group.startDate = Timestamp.fromDate(startDate)
  }
  
  if (endDate !== undefined && endDate !== null) {
    group.endDate = Timestamp.fromDate(endDate)
  }
  
  if (deliveryMethod !== undefined && deliveryMethod !== null && deliveryMethod !== '') {
    group.deliveryMethod = deliveryMethod
  }
  
  if (deliveryDescription !== undefined && deliveryDescription !== null && deliveryDescription !== '') {
    group.deliveryDescription = deliveryDescription
  }
  
  if (deliveryLocation !== undefined && deliveryLocation !== null && deliveryLocation !== '') {
    group.deliveryLocation = deliveryLocation
  }
  
  // 배송정보 필드 추가
  if (deliveryAddress !== undefined && deliveryAddress !== null && deliveryAddress !== '') {
    group.deliveryAddress = deliveryAddress
  }
  
  if (deliveryAddressDetail !== undefined && deliveryAddressDetail !== null && deliveryAddressDetail !== '') {
    group.deliveryAddressDetail = deliveryAddressDetail
  }
  
  if (deliveryPostcode !== undefined && deliveryPostcode !== null && deliveryPostcode !== '') {
    group.deliveryPostcode = deliveryPostcode
  }
  
  if (deliveryBuildingPassword !== undefined && deliveryBuildingPassword !== null && deliveryBuildingPassword !== '') {
    group.deliveryBuildingPassword = deliveryBuildingPassword
  }
  
  if (deliveryName !== undefined && deliveryName !== null && deliveryName !== '') {
    group.deliveryName = deliveryName
  }
  
  if (deliveryPhone !== undefined && deliveryPhone !== null && deliveryPhone !== '') {
    group.deliveryPhone = deliveryPhone
  }
  
  await setDoc(newGroupRef, group)
  
  // 감사 로그 기록 (오류 발생 시 무시 - 클라이언트에서 직접 작성 불가)
  try {
    const { logGroupCreated } = await import('./auditLogs')
    await logGroupCreated(
      organizerId,
      organizerName,
      newGroupRef.id,
      title.trim() || '공동구매',
      {
        title: title.trim() || '공동구매',
        organizerId,
        organizerName,
        menuItems: cleanedMenuItems,
        minimumTotal: 40000,
        status: '진행중',
        startDate: startDate ? Timestamp.fromDate(startDate) : undefined,
        endDate: endDate ? Timestamp.fromDate(endDate) : undefined,
      }
    )
  } catch (error: any) {
    // 감사 로그 기록 실패는 무시 (클라이언트에서 직접 작성 불가)
    // 공동구매 건 생성은 성공했으므로 오류를 조용히 무시
    // 콘솔에 오류를 표시하지 않음 (권한 오류는 예상된 동작)
  }
  
  return newGroupRef.id
}

// 그룹 조회
export async function getGroup(groupId: string): Promise<Group | null> {
  const groupRef = doc(db, 'groups', groupId)
  const groupSnap = await getDoc(groupRef)
  
  if (groupSnap.exists()) {
    return {
      id: groupSnap.id,
      ...groupSnap.data()
    } as Group
  }
  
  return null
}

// 그룹 목록 조회 (진행중인 그룹만)
export async function getGroups(): Promise<Group[]> {
  const groupsRef = collection(db, 'groups')
  const q = query(groupsRef, where('status', '==', '진행중'))
  const snapshot = await getDocs(q)
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Group))
}

// 모든 그룹 조회 (관리자용)
export async function getAllGroups(): Promise<Group[]> {
  const groupsRef = collection(db, 'groups')
  const snapshot = await getDocs(groupsRef)
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Group))
}

// Organizer의 그룹 목록 조회
export async function getOrganizerGroups(organizerId: string): Promise<Group[]> {
  const groupsRef = collection(db, 'groups')
  const q = query(groupsRef, where('organizerId', '==', organizerId))
  const snapshot = await getDocs(q)
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Group))
}

// 상품 ID로 그룹 목록 조회 (진행중인 그룹만) - 메뉴 아이템에서 검색
export async function getGroupsByProduct(productId: string): Promise<Group[]> {
  const groupsRef = collection(db, 'groups')
  const q = query(
    groupsRef,
    where('status', 'in', ['진행중', '달성', '확정', '배송중'])
  )
  const snapshot = await getDocs(q)
  
  // 메뉴 아이템에 해당 상품이 포함된 그룹만 필터링
  return snapshot.docs
    .map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Group))
    .filter(group => {
      // 새로운 구조 (menuItems)
      if (group.menuItems && Array.isArray(group.menuItems)) {
        return group.menuItems.some(item => item.productId === productId)
      }
      // 하위 호환성 (기존 구조)
      return group.productId === productId
    })
}

// 상품이 진행중인 공동구매에 사용되고 있는지 확인
export async function isProductInActiveGroups(productId: string): Promise<boolean> {
  const activeGroups = await getGroupsByProduct(productId)
  return activeGroups.length > 0
}

// 주문 생성
export async function createOrder(
  groupId: string,
  userId: string,
  userName: string,
  productId: string,
  productName: string,
  quantity: number,
  unitPrice: number
): Promise<string> {
  const totalPrice = quantity * unitPrice
  
  // 최소 주문 금액 체크 (10,000원)
  if (totalPrice < MIN_USER_ORDER_AMOUNT) {
    throw new Error(`최소 주문 금액은 ${MIN_USER_ORDER_AMOUNT.toLocaleString()}원입니다.`)
  }
  
  const ordersRef = collection(db, 'orders')
  const newOrderRef = doc(ordersRef)
  
  const order: Omit<Order, 'id'> = {
    groupId,
    userId,
    userName,
    productId,
    productName,
    quantity,
    unitPrice,
    totalPrice,
    status: '주문완료',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  
  await setDoc(newOrderRef, order)
  
  // 그룹 총액 업데이트
  const groupRef = doc(db, 'groups', groupId)
  const groupSnap = await getDoc(groupRef)
  
  if (groupSnap.exists()) {
    const group = groupSnap.data() as Group
    const newTotal = group.currentTotal + totalPrice
    
    await updateDoc(groupRef, {
      currentTotal: newTotal,
      updatedAt: serverTimestamp(),
    })
    
    // 최소 금액 달성 체크
    if (newTotal >= group.minimumTotal && group.status === '진행중') {
      await updateDoc(groupRef, {
        status: '달성',
        updatedAt: serverTimestamp(),
      })
    }
  }
  
  return newOrderRef.id
}

// 그룹의 주문 목록 조회
export async function getGroupOrders(groupId: string): Promise<Order[]> {
  const ordersRef = collection(db, 'orders')
  const q = query(ordersRef, where('groupId', '==', groupId))
  const snapshot = await getDocs(q)
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Order))
}

// 사용자의 주문 목록 조회
export async function getUserOrders(userId: string): Promise<Order[]> {
  const ordersRef = collection(db, 'orders')
  const q = query(ordersRef, where('userId', '==', userId))
  const snapshot = await getDocs(q)
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Order))
}

// Organizer 그룹 확인 (달성 -> 확정)
export async function confirmGroup(groupId: string): Promise<void> {
  // 진행자 권한 체크를 위해 auth 모듈 import
  const { getCurrentUserProfile } = await import('./auth')
  const userProfile = await getCurrentUserProfile()
  
  if (!userProfile) {
    throw new Error('로그인이 필요합니다.')
  }
  
  // 진행자 또는 관리자(오너 포함)만 확정 처리 가능
  if (userProfile.role !== 'organizer' && userProfile.role !== 'admin' && userProfile.role !== 'owner') {
    throw new Error('확정 처리는 진행자 또는 관리자만 가능합니다.')
  }
  
  const groupRef = doc(db, 'groups', groupId)
  const groupSnap = await getDoc(groupRef)
  
  if (!groupSnap.exists()) {
    throw new Error('그룹을 찾을 수 없습니다.')
  }
  
  const group = groupSnap.data() as Group
  
  // 진행자는 자신이 생성한 그룹만, 관리자(오너 포함)는 모든 그룹 확정 처리 가능
  if (userProfile.role === 'organizer' && group.organizerId !== userProfile.uid) {
    throw new Error('자신이 생성한 공동구매 건만 확정 처리할 수 있습니다.')
  }
  
  if (group.status !== '달성') {
    throw new Error('달성된 그룹만 확인할 수 있습니다.')
  }
  
  const oldStatus = group.status
  
  await updateDoc(groupRef, {
    status: '확정',
    updatedAt: serverTimestamp(),
  })
  
  // 감사 로그 기록
  const { logGroupStatusChanged } = await import('./auditLogs')
  await logGroupStatusChanged(
    userProfile.uid,
    userProfile.nickname || userProfile.displayName || undefined,
    groupId,
    group.title,
    oldStatus,
    '확정'
  )
  
  // 주문 상태 업데이트
  const orders = await getGroupOrders(groupId)
  const batch = orders.map(order => {
    const orderRef = doc(db, 'orders', order.id)
    return updateDoc(orderRef, {
      status: '확정',
      updatedAt: serverTimestamp(),
    })
  })
  
  await Promise.all(batch)
}

// Organizer 그룹 확정 취소 (확정 -> 달성)
export async function cancelConfirmGroup(groupId: string): Promise<void> {
  // 진행자 권한 체크를 위해 auth 모듈 import
  const { getCurrentUserProfile } = await import('./auth')
  const userProfile = await getCurrentUserProfile()
  
  if (!userProfile) {
    throw new Error('로그인이 필요합니다.')
  }
  
  // 진행자 또는 관리자(오너 포함)만 확정 취소 가능
  if (userProfile.role !== 'organizer' && userProfile.role !== 'admin' && userProfile.role !== 'owner') {
    throw new Error('확정 취소는 진행자 또는 관리자만 가능합니다.')
  }
  
  const groupRef = doc(db, 'groups', groupId)
  const groupSnap = await getDoc(groupRef)
  
  if (!groupSnap.exists()) {
    throw new Error('그룹을 찾을 수 없습니다.')
  }
  
  const group = groupSnap.data() as Group
  
  // 진행자는 자신이 생성한 그룹만, 관리자(오너 포함)는 모든 그룹 확정 취소 가능
  if (userProfile.role === 'organizer' && group.organizerId !== userProfile.uid) {
    throw new Error('자신이 생성한 공동구매 건만 확정 취소할 수 있습니다.')
  }
  
  if (group.status !== '확정') {
    throw new Error('확정된 그룹만 취소할 수 있습니다.')
  }
  
  const oldStatus = group.status
  
  await updateDoc(groupRef, {
    status: '달성',
    updatedAt: serverTimestamp(),
  })
  
  // 감사 로그 기록
  const { logGroupStatusChanged } = await import('./auditLogs')
  await logGroupStatusChanged(
    userProfile.uid,
    userProfile.nickname || userProfile.displayName || undefined,
    groupId,
    group.title,
    oldStatus,
    '달성'
  )
  
  // 주문 상태 업데이트
  const orders = await getGroupOrders(groupId)
  const batch = orders.map(order => {
    const orderRef = doc(db, 'orders', order.id)
    return updateDoc(orderRef, {
      status: '주문완료',
      updatedAt: serverTimestamp(),
    })
  })
  
  await Promise.all(batch)
}

// 관리자 배송 처리 (확정 -> 배송중)
export async function markShipping(groupId: string): Promise<void> {
  // 관리자 권한 체크를 위해 auth 모듈 import
  const { getCurrentUserProfile } = await import('./auth')
  const userProfile = await getCurrentUserProfile()
  
  if (!userProfile) {
    throw new Error('로그인이 필요합니다.')
  }
  
  // 관리자만 배송 준비 처리 가능
  if (userProfile.role !== 'admin' && userProfile.role !== 'owner') {
    throw new Error('배송 준비 처리는 관리자만 가능합니다.')
  }
  
  const groupRef = doc(db, 'groups', groupId)
  const groupSnap = await getDoc(groupRef)
  
  if (!groupSnap.exists()) {
    throw new Error('그룹을 찾을 수 없습니다.')
  }
  
  const group = groupSnap.data() as Group
  
  if (group.status !== '확정') {
    throw new Error('확정된 그룹만 배송 처리할 수 있습니다.')
  }
  
  const oldStatus = group.status
  
  await updateDoc(groupRef, {
    status: '배송중',
    deliveryDetailStatus: '입금안내', // 배송중 상태로 변경 시 기본값은 입금안내
    shippingStartedAt: serverTimestamp(), // 배송중 상태로 변경된 시점 기록
    updatedAt: serverTimestamp(),
  })
  
  // 감사 로그 기록
  const { logGroupStatusChanged } = await import('./auditLogs')
  await logGroupStatusChanged(
    userProfile.uid,
    userProfile.nickname || userProfile.displayName || undefined,
    groupId,
    group.title,
    oldStatus,
    '배송중'
  )
  
  // 주문 상태 업데이트
  const orders = await getGroupOrders(groupId)
  const batch = orders.map(order => {
    const orderRef = doc(db, 'orders', order.id)
    return updateDoc(orderRef, {
      status: '배송중',
      updatedAt: serverTimestamp(),
    })
  })
  
  await Promise.all(batch)
}

// 관리자 완료 처리 (배송중 -> 완료)
export async function markComplete(groupId: string): Promise<void> {
  // 관리자 권한 체크를 위해 auth 모듈 import
  const { getCurrentUserProfile } = await import('./auth')
  const userProfile = await getCurrentUserProfile()
  
  if (!userProfile) {
    throw new Error('로그인이 필요합니다.')
  }
  
  // 관리자만 배송 완료 처리 가능
  if (userProfile.role !== 'admin' && userProfile.role !== 'owner') {
    throw new Error('배송 완료 처리는 관리자만 가능합니다.')
  }
  
  const groupRef = doc(db, 'groups', groupId)
  const groupSnap = await getDoc(groupRef)
  
  if (!groupSnap.exists()) {
    throw new Error('그룹을 찾을 수 없습니다.')
  }
  
  const group = groupSnap.data() as Group
  
  if (group.status !== '배송중') {
    throw new Error('배송중인 그룹만 완료 처리할 수 있습니다.')
  }
  
  const oldStatus = group.status
  
  await updateDoc(groupRef, {
    status: '완료',
    updatedAt: serverTimestamp(),
  })
  
  // 감사 로그 기록
  const { logGroupStatusChanged } = await import('./auditLogs')
  await logGroupStatusChanged(
    userProfile.uid,
    userProfile.nickname || userProfile.displayName || undefined,
    groupId,
    group.title,
    oldStatus,
    '완료'
  )
  
  // 주문 상태 업데이트
  const orders = await getGroupOrders(groupId)
  const batch = orders.map(order => {
    const orderRef = doc(db, 'orders', order.id)
    return updateDoc(orderRef, {
      status: '완료',
      updatedAt: serverTimestamp(),
    })
  })
  
  await Promise.all(batch)
}

// 배송 세부 상태 업데이트
export async function updateDeliveryDetailStatus(
  groupId: string,
  detailStatus: '입금안내' | '입금확인' | '생산입력' | '배송입력' | '배송완료'
): Promise<void> {
  const { getCurrentUserProfile } = await import('./auth')
  const userProfile = await getCurrentUserProfile()
  
  if (!userProfile) {
    throw new Error('로그인이 필요합니다.')
  }
  
  // 관리자만 배송 세부 상태 변경 가능
  if (userProfile.role !== 'admin' && userProfile.role !== 'owner') {
    throw new Error('배송 세부 상태 변경은 관리자만 가능합니다.')
  }
  
  const groupRef = doc(db, 'groups', groupId)
  const groupSnap = await getDoc(groupRef)
  
  if (!groupSnap.exists()) {
    throw new Error('공동구매 건을 찾을 수 없습니다.')
  }
  
  const group = groupSnap.data() as Group
  
  // 배송중 또는 완료 상태인 그룹만 세부 상태 변경 가능
  if (group.status !== '배송중' && group.status !== '완료') {
    throw new Error('배송중 또는 완료 상태인 공동구매 건만 세부 상태를 변경할 수 있습니다.')
  }
  
  const updates: any = {
    deliveryDetailStatus: detailStatus,
    updatedAt: serverTimestamp(),
  }
  
  // 배송완료로 변경하면 완료 처리
  if (detailStatus === '배송완료') {
    updates.status = '완료'
    
    // 주문 상태도 완료로 변경
    const orders = await getGroupOrders(groupId)
    const batch = orders.map(order => {
      const orderRef = doc(db, 'orders', order.id)
      return updateDoc(orderRef, {
        status: '완료',
        updatedAt: serverTimestamp(),
      })
    })
    await Promise.all(batch)
    
    // 감사 로그 기록
    const { logGroupStatusChanged } = await import('./auditLogs')
    await logGroupStatusChanged(
      userProfile.uid,
      userProfile.nickname || userProfile.displayName || undefined,
      groupId,
      group.title,
      '배송중',
      '완료'
    )
  }
  
  // 배송완료에서 배송입력으로 이전 단계로 변경하면 완료 상태를 배송중으로 변경
  if (group.status === '완료' && detailStatus === '배송입력') {
    updates.status = '배송중'
    
    // 주문 상태도 배송중으로 변경
    const orders = await getGroupOrders(groupId)
    const batch = orders.map(order => {
      const orderRef = doc(db, 'orders', order.id)
      return updateDoc(orderRef, {
        status: '배송중',
        updatedAt: serverTimestamp(),
      })
    })
    await Promise.all(batch)
    
    // 감사 로그 기록
    const { logGroupStatusChanged } = await import('./auditLogs')
    await logGroupStatusChanged(
      userProfile.uid,
      userProfile.nickname || userProfile.displayName || undefined,
      groupId,
      group.title,
      '완료',
      '배송중'
    )
  }
  
  await updateDoc(groupRef, updates)
}

// 주문 수정 (진행자만)
export async function updateOrder(
  orderId: string,
  quantity: number,
  unitPrice: number
): Promise<void> {
  const orderRef = doc(db, 'orders', orderId)
  const orderSnap = await getDoc(orderRef)
  
  if (!orderSnap.exists()) {
    throw new Error('주문을 찾을 수 없습니다.')
  }
  
  const order = orderSnap.data() as Order
  const oldTotalPrice = order.totalPrice
  const newTotalPrice = quantity * unitPrice
  
  // 최소 주문 금액 체크
  if (newTotalPrice < MIN_USER_ORDER_AMOUNT) {
    throw new Error(`최소 주문 금액은 ${MIN_USER_ORDER_AMOUNT.toLocaleString()}원입니다.`)
  }
  
  // 주문 업데이트
  await updateDoc(orderRef, {
    quantity,
    unitPrice,
    totalPrice: newTotalPrice,
    updatedAt: serverTimestamp(),
  })
  
  // 그룹 총액 업데이트
  const groupRef = doc(db, 'groups', order.groupId)
  const groupSnap = await getDoc(groupRef)
  
  if (groupSnap.exists()) {
    const group = groupSnap.data() as Group
    const newTotal = group.currentTotal - oldTotalPrice + newTotalPrice
    
    await updateDoc(groupRef, {
      currentTotal: newTotal,
      updatedAt: serverTimestamp(),
    })
    
    // 최소 금액 달성 체크
    if (newTotal >= group.minimumTotal && group.status === '진행중') {
      await updateDoc(groupRef, {
        status: '달성',
        updatedAt: serverTimestamp(),
      })
    } else if (newTotal < group.minimumTotal && group.status === '달성') {
      await updateDoc(groupRef, {
        status: '진행중',
        updatedAt: serverTimestamp(),
      })
    }
  }
}

// 주문 취소 (진행자만 또는 사용자가 자신의 주문완료 상태 주문 취소)
export async function cancelOrder(orderId: string, userId?: string): Promise<void> {
  const orderRef = doc(db, 'orders', orderId)
  const orderSnap = await getDoc(orderRef)
  
  if (!orderSnap.exists()) {
    throw new Error('주문을 찾을 수 없습니다.')
  }
  
  const order = orderSnap.data() as Order
  
  // 사용자가 자신의 주문을 취소하는 경우, 주문완료 상태만 가능
  if (userId && order.userId === userId) {
    if (order.status !== '주문완료') {
      throw new Error('주문완료 상태의 주문만 취소할 수 있습니다.')
    }
    
    // 그룹 정보 가져오기
    const groupRef = doc(db, 'groups', order.groupId)
    const groupSnap = await getDoc(groupRef)
    
    if (groupSnap.exists()) {
      const group = groupSnap.data() as Group
      
      // 해당 사용자의 모든 주문 조회 (주문완료 상태만)
      const ordersRef = collection(db, 'orders')
      const userOrdersQuery = query(
        ordersRef,
        where('groupId', '==', order.groupId),
        where('userId', '==', userId),
        where('status', '==', '주문완료')
      )
      const userOrdersSnap = await getDocs(userOrdersQuery)
      const userOrders = userOrdersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order))
      
      // 삭제 후 사용자의 총 주문 금액 계산 (현재 주문 제외)
      const userTotalAfterDelete = userOrders
        .filter(o => o.id !== orderId)
        .reduce((sum, o) => sum + o.totalPrice, 0)
      
      // 최소 구매 금액 체크 (주문자별 최소 주문 금액)
      if (userTotalAfterDelete < MIN_USER_ORDER_AMOUNT) {
        throw new Error(`최소 주문 금액은 ${MIN_USER_ORDER_AMOUNT.toLocaleString()}원입니다. 삭제 후 주문 금액: ${userTotalAfterDelete.toLocaleString()}원`)
      }
    }
  }
  
  // 감사 로그 기록 (삭제 전)
  const { getCurrentUserProfile } = await import('./auth')
  const userProfile = await getCurrentUserProfile()
  const userName = userProfile?.nickname || userProfile?.displayName
  const { logOrderCancelled } = await import('./auditLogs')
  await logOrderCancelled(
    userId || order.userId,
    userName || order.userName || undefined,
    orderId,
    order.productName,
    order.quantity,
    order.totalPrice
  )
  
  // 같은 주문건(같은 createdAt)의 다른 주문들도 updatedAt 업데이트
  if (order.createdAt) {
    const ordersRef = collection(db, 'orders')
    const sameTransactionQuery = query(
      ordersRef,
      where('groupId', '==', order.groupId),
      where('userId', '==', order.userId),
      where('status', '==', '주문완료')
    )
    const sameTransactionSnap = await getDocs(sameTransactionQuery)
    const sameTransactionOrders = sameTransactionSnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Order))
      .filter(o => {
        // 같은 createdAt인지 확인 (초 단위로 비교)
        if (!o.createdAt || !order.createdAt) return false
        const oDate = o.createdAt instanceof Timestamp ? o.createdAt.toDate() : new Date(o.createdAt)
        const orderDate = order.createdAt instanceof Timestamp ? order.createdAt.toDate() : new Date(order.createdAt)
        return Math.abs(oDate.getTime() - orderDate.getTime()) < 1000 // 1초 이내 차이면 같은 주문건
      })
      .filter(o => o.id !== orderId) // 삭제할 주문 제외
    
    // 같은 주문건의 다른 주문들 updatedAt 업데이트
    if (sameTransactionOrders.length > 0) {
      const batch = writeBatch(db)
      sameTransactionOrders.forEach(o => {
        const oRef = doc(db, 'orders', o.id)
        batch.update(oRef, { updatedAt: serverTimestamp() })
      })
      await batch.commit()
    }
  }
  
  // 주문 삭제
  await deleteDoc(orderRef)
  
  // 그룹 총액 업데이트
  const groupRef = doc(db, 'groups', order.groupId)
  const groupSnap = await getDoc(groupRef)
  
  if (groupSnap.exists()) {
    const group = groupSnap.data() as Group
    const newTotal = Math.max(0, group.currentTotal - order.totalPrice)
    const oldStatus = group.status
    
    // 상태 업데이트: 확정 상태 이후에는 상태 변경 불가
    const statusUpdates: Partial<Group> = {
      currentTotal: newTotal,
      updatedAt: serverTimestamp(),
    }
    
    // 최소 금액 미달성 시 상태 변경 (확정 상태 이전만 가능)
    if (newTotal < group.minimumTotal && (group.status === '달성' || group.status === '진행중')) {
      statusUpdates.status = '진행중'
    }
    
    await updateDoc(groupRef, statusUpdates)
    
    // 상태 변경 감사 로그
    if (statusUpdates.status && statusUpdates.status !== oldStatus) {
      const { logGroupStatusChanged } = await import('./auditLogs')
      await logGroupStatusChanged(
        userId || order.userId,
        userName || order.userName || undefined,
        order.groupId,
        group.title,
        oldStatus,
        statusUpdates.status
      )
    }
  }
}

// 사용자의 그룹 내 모든 주문 일괄 취소
export async function cancelUserOrdersInGroup(groupId: string, userId: string): Promise<void> {
  const ordersRef = collection(db, 'orders')
  const q = query(
    ordersRef,
    where('groupId', '==', groupId),
    where('userId', '==', userId),
    where('status', '==', '주문완료')
  )
  const snapshot = await getDocs(q)
  
  if (snapshot.empty) {
    throw new Error('취소할 주문이 없습니다.')
  }
  
  const orders = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Order))
  
  // 배치로 삭제
  const batch = writeBatch(db)
  let totalPriceToDeduct = 0
  
  for (const order of orders) {
    const orderRef = doc(db, 'orders', order.id)
    batch.delete(orderRef)
    totalPriceToDeduct += order.totalPrice
  }
  
  await batch.commit()
  
  // 그룹 총액 업데이트
  const groupRef = doc(db, 'groups', groupId)
  const groupSnap = await getDoc(groupRef)
  
  if (groupSnap.exists()) {
    const group = groupSnap.data() as Group
    const newTotal = Math.max(0, group.currentTotal - totalPriceToDeduct)
    
    // 상태 업데이트: 확정 상태 이후에는 상태 변경 불가
    const statusUpdates: Partial<Group> = {
      currentTotal: newTotal,
      updatedAt: serverTimestamp(),
    }
    
    // 최소 금액 미달성 시 상태 변경 (확정 상태 이전만 가능)
    if (newTotal < group.minimumTotal && (group.status === '달성' || group.status === '진행중')) {
      statusUpdates.status = '진행중'
    }
    
    await updateDoc(groupRef, statusUpdates)
  }
}

// 특정 주문건 삭제 (같은 createdAt을 가진 주문들만 삭제)
export async function cancelOrderGroup(orderIds: string[], userId: string): Promise<void> {
  if (orderIds.length === 0) {
    throw new Error('삭제할 주문이 없습니다.')
  }

  // 첫 번째 주문 정보 가져오기
  const firstOrderRef = doc(db, 'orders', orderIds[0])
  const firstOrderSnap = await getDoc(firstOrderRef)
  
  if (!firstOrderSnap.exists()) {
    throw new Error('주문을 찾을 수 없습니다.')
  }
  
  const firstOrder = firstOrderSnap.data() as Order
  
  // 자신의 주문인지 확인
  if (firstOrder.userId !== userId) {
    throw new Error('자신의 주문만 삭제할 수 있습니다.')
  }
  
  // 주문완료 상태만 삭제 가능
  if (firstOrder.status !== '주문완료') {
    throw new Error('주문완료 상태의 주문만 삭제할 수 있습니다.')
  }
  
  const groupId = firstOrder.groupId
  
  // 그룹 정보 가져오기
  const groupRef = doc(db, 'groups', groupId)
  const groupSnap = await getDoc(groupRef)
  
  if (!groupSnap.exists()) {
    throw new Error('공동구매 건을 찾을 수 없습니다.')
  }
  
  const group = groupSnap.data() as Group
  
  // 해당 사용자의 모든 주문 조회 (주문완료 상태만)
  const ordersRef = collection(db, 'orders')
  const userOrdersQuery = query(
    ordersRef,
    where('groupId', '==', groupId),
    where('userId', '==', userId),
    where('status', '==', '주문완료')
  )
  const userOrdersSnap = await getDocs(userOrdersQuery)
  const allUserOrders = userOrdersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order))
  
  // 삭제할 주문 ID들
  const orderIdsToDelete = new Set(orderIds)
  
  // 삭제 후 남을 주문들의 총액 계산
  const remainingOrdersTotal = allUserOrders
    .filter(o => !orderIdsToDelete.has(o.id))
    .reduce((sum, o) => sum + o.totalPrice, 0)
  
  // 최소 구매 금액 체크 (주문자별 최소 주문 금액)
  if (remainingOrdersTotal < MIN_USER_ORDER_AMOUNT) {
    throw new Error(`최소 주문 금액은 ${MIN_USER_ORDER_AMOUNT.toLocaleString()}원입니다. 삭제 후 주문 금액: ${remainingOrdersTotal.toLocaleString()}원`)
  }
  
  // 삭제할 주문들의 총액 계산 및 감사 로그용 정보 수집
  const ordersToDelete = allUserOrders.filter(o => orderIdsToDelete.has(o.id))
  const totalPriceToDeduct = ordersToDelete.reduce((sum, o) => sum + o.totalPrice, 0)
  
  // 감사 로그 기록 (삭제 전)
  const { getCurrentUserProfile } = await import('./auth')
  const userProfile = await getCurrentUserProfile()
  const userName = userProfile?.nickname || userProfile?.displayName
  const { logOrderCancelled } = await import('./auditLogs')
  
  for (const order of ordersToDelete) {
    await logOrderCancelled(
      userId,
      userName || undefined,
      order.id,
      order.productName,
      order.quantity,
      order.totalPrice,
      { reason: '주문건 삭제', orderGroup: true }
    )
  }
  
  // 배치로 주문 삭제
  const batch = writeBatch(db)
  for (const orderId of orderIds) {
    const orderRef = doc(db, 'orders', orderId)
    batch.delete(orderRef)
  }
  
  await batch.commit()
  
  // 그룹 총액 업데이트
  const newTotal = Math.max(0, group.currentTotal - totalPriceToDeduct)
  
  const statusUpdates: Partial<Group> = {
    currentTotal: newTotal,
    updatedAt: serverTimestamp(),
  }
  
  // 최소 금액 미달성 시 상태 변경 (확정 상태 이전만 가능)
  if (newTotal < group.minimumTotal && (group.status === '달성' || group.status === '진행중')) {
    statusUpdates.status = '진행중'
  }
  
  await updateDoc(groupRef, statusUpdates)
}

// 사용자가 자신의 주문 수정 (주문완료 상태만 가능)
export async function updateUserOrder(
  orderId: string,
  userId: string,
  quantity: number,
  unitPrice: number,
  metadata?: { [key: string]: any }
): Promise<void> {
  const orderRef = doc(db, 'orders', orderId)
  const orderSnap = await getDoc(orderRef)
  
  if (!orderSnap.exists()) {
    throw new Error('주문을 찾을 수 없습니다.')
  }
  
  const order = orderSnap.data() as Order
  
  // 자신의 주문인지 확인
  if (order.userId !== userId) {
    throw new Error('자신의 주문만 수정할 수 있습니다.')
  }
  
  // 주문완료 상태만 수정 가능
  if (order.status !== '주문완료') {
    throw new Error('주문완료 상태의 주문만 수정할 수 있습니다.')
  }
  
  const oldTotalPrice = order.totalPrice
  const newTotalPrice = quantity * unitPrice
  
  // 그룹 정보 가져오기
  const groupRef = doc(db, 'groups', order.groupId)
  const groupSnap = await getDoc(groupRef)
  
  if (!groupSnap.exists()) {
    throw new Error('공동구매 건을 찾을 수 없습니다.')
  }
  
  const group = groupSnap.data() as Group
  
  // 해당 사용자의 모든 주문 조회 (주문완료 상태만)
  const ordersRef = collection(db, 'orders')
  const userOrdersQuery = query(
    ordersRef,
    where('groupId', '==', order.groupId),
    where('userId', '==', userId),
    where('status', '==', '주문완료')
  )
  const userOrdersSnap = await getDocs(userOrdersQuery)
  const userOrders = userOrdersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order))
  
  // 수정 후 사용자의 총 주문 금액 계산 (현재 주문 제외하고 새 금액으로 계산)
  const otherOrdersTotal = userOrders
    .filter(o => o.id !== orderId)
    .reduce((sum, o) => sum + o.totalPrice, 0)
  const userTotalAfterUpdate = otherOrdersTotal + newTotalPrice
  
  // 최소 구매 금액 체크 (주문자별 최소 주문 금액)
  if (userTotalAfterUpdate < MIN_USER_ORDER_AMOUNT) {
    throw new Error(`최소 주문 금액은 ${MIN_USER_ORDER_AMOUNT.toLocaleString()}원입니다. 수정 후 주문 금액: ${userTotalAfterUpdate.toLocaleString()}원`)
  }
  
  // 주문 업데이트
  await updateDoc(orderRef, {
    quantity,
    unitPrice,
    totalPrice: newTotalPrice,
    updatedAt: serverTimestamp(),
  })
  
  // 감사 로그 기록
  const { getCurrentUserProfile } = await import('./auth')
  const userProfile = await getCurrentUserProfile()
  const userName = userProfile?.nickname || userProfile?.displayName
  const { logOrderUpdated } = await import('./auditLogs')
  await logOrderUpdated(
    userId,
    userName || undefined,
    orderId,
    order.productName,
    order.quantity,
    quantity,
    oldTotalPrice,
    newTotalPrice,
    metadata
  )
  
  // 그룹 총액 업데이트 (이미 위에서 가져온 group과 groupRef 사용)
  const newTotal = Math.max(0, group.currentTotal - oldTotalPrice + newTotalPrice)
  const oldStatus = group.status
  
  // 상태 업데이트: 확정 상태 이후에는 상태 변경 불가
  const statusUpdates: Partial<Group> = {
    currentTotal: newTotal,
    updatedAt: serverTimestamp(),
  }
  
  // 최소 금액 달성 체크 (확정 상태 이전만 가능)
  if (group.status === '진행중' || group.status === '달성') {
    if (newTotal >= group.minimumTotal && group.status === '진행중') {
      statusUpdates.status = '달성'
    } else if (newTotal < group.minimumTotal && group.status === '달성') {
      statusUpdates.status = '진행중'
    }
  }
  
  await updateDoc(groupRef, statusUpdates)
  
  // 상태 변경 감사 로그
  if (statusUpdates.status && statusUpdates.status !== oldStatus) {
    const { logGroupStatusChanged } = await import('./auditLogs')
    await logGroupStatusChanged(
      userId,
      userName || undefined,
      order.groupId,
      group.title,
      oldStatus,
      statusUpdates.status
    )
  }
}

// 여러 주문 일괄 생성 (장바구니용)
export async function createMultipleOrders(
  orders: Array<{
    groupId: string
    userId: string
    userName: string
    productId: string
    productName: string
    quantity: number
    unitPrice: number
  }>,
  createdAt?: Timestamp // 기존 주문건에 추가할 때 사용
): Promise<string[]> {
  if (orders.length === 0) {
    throw new Error('주문할 상품이 없습니다.')
  }

  const orderIds: string[] = []
  const groupTotals: Map<string, number> = new Map()
  const userGroupTotals: Map<string, Map<string, number>> = new Map() // userId -> groupId -> totalAmount

  // 그룹별 및 사용자별 총액 계산
  for (const order of orders) {
    const totalPrice = order.quantity * order.unitPrice
    const currentTotal = groupTotals.get(order.groupId) || 0
    groupTotals.set(order.groupId, currentTotal + totalPrice)
    
    // 사용자별 그룹별 총액 계산
    if (!userGroupTotals.has(order.userId)) {
      userGroupTotals.set(order.userId, new Map())
    }
    const userGroups = userGroupTotals.get(order.userId)!
    const userGroupTotal = userGroups.get(order.groupId) || 0
    userGroups.set(order.groupId, userGroupTotal + totalPrice)
  }

  // 각 사용자별로 기존 주문 금액 조회 및 최소 주문 금액 체크
  for (const [userId, userGroups] of userGroupTotals.entries()) {
    for (const [groupId, newOrderTotal] of userGroups.entries()) {
      // 해당 사용자의 기존 주문 조회 (주문완료 상태만)
      const ordersRef = collection(db, 'orders')
      const q = query(
        ordersRef,
        where('groupId', '==', groupId),
        where('userId', '==', userId),
        where('status', '==', '주문완료')
      )
      const existingOrdersSnap = await getDocs(q)
      
      // 기존 주문 금액 합계 계산
      let existingOrderTotal = 0
      existingOrdersSnap.forEach((doc) => {
        const order = doc.data() as Order
        existingOrderTotal += order.totalPrice
      })
      
      // 기존 주문 금액 + 새 주문 금액이 최소 주문 금액 이상인지 체크
      const totalOrderAmount = existingOrderTotal + newOrderTotal
      if (totalOrderAmount < MIN_USER_ORDER_AMOUNT) {
        throw new Error(`최소 주문 금액은 ${MIN_USER_ORDER_AMOUNT.toLocaleString()}원입니다. (기존 주문: ${existingOrderTotal.toLocaleString()}원 + 새 주문: ${newOrderTotal.toLocaleString()}원 = ${totalOrderAmount.toLocaleString()}원)`)
      }
    }
  }

  // 주문 생성
  const batch = writeBatch(db)
  const ordersRef = collection(db, 'orders')

  for (const order of orders) {
    const totalPrice = order.quantity * order.unitPrice
    const newOrderRef = doc(ordersRef)
    
    const orderData: Omit<Order, 'id'> = {
      groupId: order.groupId,
      userId: order.userId,
      userName: order.userName,
      productId: order.productId,
      productName: order.productName,
      quantity: order.quantity,
      unitPrice: order.unitPrice,
      totalPrice,
      status: '주문완료',
      createdAt: createdAt || serverTimestamp(), // 기존 주문건에 추가할 때는 같은 createdAt 사용
      updatedAt: serverTimestamp(),
    }
    
    batch.set(newOrderRef, orderData)
    orderIds.push(newOrderRef.id)
  }

  await batch.commit()

  // 감사 로그 기록 (각 주문 생성)
  const { getCurrentUserProfile } = await import('./auth')
  const userProfile = await getCurrentUserProfile()
  const userName = userProfile?.nickname || userProfile?.displayName
  
  for (let i = 0; i < orders.length; i++) {
    const order = orders[i]
    const orderId = orderIds[i]
    const { logOrderCreated } = await import('./auditLogs')
    await logOrderCreated(
      order.userId,
      order.userName,
      orderId,
      order.groupId,
      order.productName,
      order.quantity,
      order.quantity * order.unitPrice
    )
  }

  // 그룹 총액 업데이트
  for (const [groupId, additionalTotal] of groupTotals.entries()) {
    const groupRef = doc(db, 'groups', groupId)
    const groupSnap = await getDoc(groupRef)
    
    if (groupSnap.exists()) {
      const group = groupSnap.data() as Group
      const newTotal = group.currentTotal + additionalTotal
      const oldStatus = group.status
      
      // 상태 업데이트: 확정 상태 이후에는 주문 추가 불가 (이미 체크되어 있음)
      const statusUpdates: Partial<Group> = {
        currentTotal: newTotal,
        updatedAt: serverTimestamp(),
      }
      
      // 최소 금액 달성 체크 (확정 상태 이전만 가능)
      if (group.status === '진행중' || group.status === '달성') {
        if (newTotal >= group.minimumTotal && group.status === '진행중') {
          statusUpdates.status = '달성'
        } else if (newTotal < group.minimumTotal && group.status === '달성') {
          statusUpdates.status = '진행중'
        }
      }
      
      await updateDoc(groupRef, statusUpdates)
      
      // 상태 변경 감사 로그
      if (statusUpdates.status && statusUpdates.status !== oldStatus) {
        const { logGroupStatusChanged } = await import('./auditLogs')
        await logGroupStatusChanged(
          order.userId,
          userName || undefined,
          groupId,
          group.title,
          oldStatus,
          statusUpdates.status
        )
      }
    }
  }

  return orderIds
}

// 공동구매 건 삭제 (관리자 또는 진행자 - 확정 전만 가능)
export async function deleteGroup(groupId: string): Promise<void> {
  // 권한 체크를 위해 auth 모듈 import
  const { getCurrentUserProfile } = await import('./auth')
  const userProfile = await getCurrentUserProfile()
  
  if (!userProfile) {
    throw new Error('로그인이 필요합니다.')
  }
  
  const groupRef = doc(db, 'groups', groupId)
  const groupSnap = await getDoc(groupRef)
  
  if (!groupSnap.exists()) {
    throw new Error('공동구매 건을 찾을 수 없습니다.')
  }
  
  const group = groupSnap.data() as Group
  
  // 관리자가 아니고 진행자도 아닌 경우
  if (userProfile.role !== 'admin' && userProfile.role !== 'owner' && userProfile.role !== 'organizer') {
    throw new Error('공동구매 건 삭제 권한이 없습니다.')
  }
  
  // 확정/배송중/완료 상태는 누구도 삭제 불가
  if (group.status === '확정' || group.status === '배송중' || group.status === '완료') {
    throw new Error('확정 처리된 공동구매 건은 삭제할 수 없습니다.')
  }
  
  // 진행자는 자신의 그룹만 삭제 가능
  if (userProfile.role === 'organizer') {
    if (group.organizerId !== userProfile.uid) {
      throw new Error('자신이 생성한 공동구매 건만 삭제할 수 있습니다.')
    }
  }
  
  // 감사 로그 기록 (삭제 전)
  const { logGroupDeleted } = await import('./auditLogs')
  await logGroupDeleted(
    userProfile.uid,
    userProfile.nickname || userProfile.displayName || undefined,
    groupId,
    group.title,
    {
      ...group,
      id: groupId
    }
  )
  
  // 해당 그룹의 모든 주문 조회 및 삭제
  const ordersRef = collection(db, 'orders')
  const ordersQuery = query(ordersRef, where('groupId', '==', groupId))
  const ordersSnap = await getDocs(ordersQuery)
  
  // 배치로 주문 삭제
  const batch = writeBatch(db)
  ordersSnap.docs.forEach((orderDoc) => {
    batch.delete(orderDoc.ref)
  })
  
  // 그룹 삭제
  batch.delete(groupRef)
  
  // 배치 실행
  await batch.commit()
}

// 공동구매 건 날짜 업데이트
export async function updateGroupDates(
  groupId: string,
  startDate?: Date | Timestamp,
  endDate?: Date | Timestamp
): Promise<void> {
  const { getCurrentUserProfile } = await import('./auth')
  const userProfile = await getCurrentUserProfile()
  
  if (!userProfile) {
    throw new Error('로그인이 필요합니다.')
  }
  
  const groupRef = doc(db, 'groups', groupId)
  const groupSnap = await getDoc(groupRef)
  
  if (!groupSnap.exists()) {
    throw new Error('공동구매 건을 찾을 수 없습니다.')
  }
  
  const group = groupSnap.data() as Group
  
  // 관리자 또는 진행자만 수정 가능
  if (userProfile.role !== 'admin' && userProfile.role !== 'owner' && userProfile.role !== 'organizer') {
    throw new Error('날짜 수정 권한이 없습니다.')
  }
  
  // 진행자는 자신의 그룹만 수정 가능
  if (userProfile.role === 'organizer' && group.organizerId !== userProfile.uid) {
    throw new Error('자신이 생성한 공동구매 건만 수정할 수 있습니다.')
  }
  
  // 날짜 변환 및 검증
  const { Timestamp } = await import('firebase/firestore')
  
  const updates: any = {
    updatedAt: serverTimestamp(),
  }
  
  if (startDate !== undefined) {
    const start = startDate instanceof Timestamp ? startDate : Timestamp.fromDate(new Date(startDate))
    updates.startDate = start
  }
  
  if (endDate !== undefined) {
    const end = endDate instanceof Timestamp ? endDate : Timestamp.fromDate(new Date(endDate))
    updates.endDate = end
  }
  
  await updateDoc(groupRef, updates)
}

// 사용자가 공동구매 건에 접속했을 때 접속 기록 저장
export async function recordGroupVisit(userId: string, groupId: string): Promise<void> {
  const visitRef = doc(db, 'userGroupVisits', `${userId}_${groupId}`)
  
  try {
    const visitSnap = await getDoc(visitRef)
    
    if (!visitSnap.exists()) {
      // 첫 접속이면 기록 생성
      await setDoc(visitRef, {
        userId,
        groupId,
        firstVisitedAt: serverTimestamp(),
        lastVisitedAt: serverTimestamp(),
        visitCount: 1,
      })
    } else {
      // 이미 접속한 적이 있으면 마지막 접속 시간과 접속 횟수 업데이트
      await updateDoc(visitRef, {
        lastVisitedAt: serverTimestamp(),
        visitCount: increment(1),
      })
    }
  } catch (error: any) {
    // 권한 오류인 경우 무시 (규칙이 아직 배포되지 않았을 수 있음)
    if (error.code === 'permission-denied') {
      console.warn('접속 기록 저장 권한 오류 (규칙이 배포되지 않았을 수 있음):', error)
      return
    }
    throw error
  }
}

// 사용자가 접속한 공동구매 건 목록 조회
export async function getUserVisitedGroups(userId: string): Promise<Group[]> {
  const visitsRef = collection(db, 'userGroupVisits')
  // orderBy 없이 먼저 쿼리 (인덱스 문제 방지)
  const q = query(
    visitsRef,
    where('userId', '==', userId)
  )
  const snapshot = await getDocs(q)
  
  if (snapshot.empty) {
    return []
  }
  
  // 접속한 그룹 ID 목록 가져오기 (마지막 접속 시간 기준으로 정렬)
  const visits = snapshot.docs.map(doc => ({
    groupId: doc.data().groupId,
    lastVisitedAt: doc.data().lastVisitedAt
  }))
  
  // 마지막 접속 시간 기준으로 정렬 (클라이언트 측 정렬)
  visits.sort((a, b) => {
    const aTime = a.lastVisitedAt?.toMillis?.() || 0
    const bTime = b.lastVisitedAt?.toMillis?.() || 0
    return bTime - aTime // 내림차순
  })
  
  // 각 그룹 정보 가져오기
  const groups: Group[] = []
  for (const visit of visits) {
    try {
      const group = await getGroup(visit.groupId)
      if (group) {
        groups.push(group)
      }
    } catch (error) {
      console.error(`그룹 정보 로드 실패 (${visit.groupId}):`, error)
    }
  }
  
  return groups
}

