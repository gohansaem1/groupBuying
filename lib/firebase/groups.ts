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
  increment
} from 'firebase/firestore'
import { db } from './config'
import { Product } from './products'

export interface Group {
  id: string
  title: string // 공동구매 건 제목 (구분용)
  organizerId: string
  organizerName: string
  productId: string
  productName: string
  productPrice: number // 실제 판매가격 (정가 * (1 - 할인율))
  minimumTotal: number // 최소 그룹 총액 (40,000원)
  currentTotal: number // 현재 총액
  status: '진행중' | '달성' | '확인완료' | '배송중' | '완료'
  createdAt: Timestamp
  updatedAt: Timestamp
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
  status: '주문완료' | '확인완료' | '배송중' | '완료'
  createdAt: Timestamp
  updatedAt: Timestamp
}

// 그룹 생성
export async function createGroup(
  title: string,
  organizerId: string,
  organizerName: string,
  productId: string,
  productName: string,
  productPrice: number
): Promise<string> {
  const groupsRef = collection(db, 'groups')
  const newGroupRef = doc(groupsRef)
  
  const group: Omit<Group, 'id'> = {
    title: title.trim() || `${productName} 공동구매`, // 제목이 없으면 기본값 사용
    organizerId,
    organizerName,
    productId,
    productName,
    productPrice,
    minimumTotal: 40000,
    currentTotal: 0,
    status: '진행중',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  
  await setDoc(newGroupRef, group)
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
  if (totalPrice < 10000) {
    throw new Error('최소 주문 금액은 10,000원입니다.')
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

// Organizer 그룹 확인 (달성 -> 확인완료)
export async function confirmGroup(groupId: string): Promise<void> {
  const groupRef = doc(db, 'groups', groupId)
  const groupSnap = await getDoc(groupRef)
  
  if (!groupSnap.exists()) {
    throw new Error('그룹을 찾을 수 없습니다.')
  }
  
  const group = groupSnap.data() as Group
  
  if (group.status !== '달성') {
    throw new Error('달성된 그룹만 확인할 수 있습니다.')
  }
  
  await updateDoc(groupRef, {
    status: '확인완료',
    updatedAt: serverTimestamp(),
  })
  
  // 주문 상태 업데이트
  const orders = await getGroupOrders(groupId)
  const batch = orders.map(order => {
    const orderRef = doc(db, 'orders', order.id)
    return updateDoc(orderRef, {
      status: '확인완료',
      updatedAt: serverTimestamp(),
    })
  })
  
  await Promise.all(batch)
}

// 관리자 배송 처리 (확인완료 -> 배송중)
export async function markShipping(groupId: string): Promise<void> {
  const groupRef = doc(db, 'groups', groupId)
  const groupSnap = await getDoc(groupRef)
  
  if (!groupSnap.exists()) {
    throw new Error('그룹을 찾을 수 없습니다.')
  }
  
  const group = groupSnap.data() as Group
  
  if (group.status !== '확인완료') {
    throw new Error('확인완료된 그룹만 배송 처리할 수 있습니다.')
  }
  
  await updateDoc(groupRef, {
    status: '배송중',
    updatedAt: serverTimestamp(),
  })
  
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
  const groupRef = doc(db, 'groups', groupId)
  const groupSnap = await getDoc(groupRef)
  
  if (!groupSnap.exists()) {
    throw new Error('그룹을 찾을 수 없습니다.')
  }
  
  const group = groupSnap.data() as Group
  
  if (group.status !== '배송중') {
    throw new Error('배송중인 그룹만 완료 처리할 수 있습니다.')
  }
  
  await updateDoc(groupRef, {
    status: '완료',
    updatedAt: serverTimestamp(),
  })
  
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
  if (newTotalPrice < 10000) {
    throw new Error('최소 주문 금액은 10,000원입니다.')
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

// 주문 취소 (진행자만)
export async function cancelOrder(orderId: string): Promise<void> {
  const orderRef = doc(db, 'orders', orderId)
  const orderSnap = await getDoc(orderRef)
  
  if (!orderSnap.exists()) {
    throw new Error('주문을 찾을 수 없습니다.')
  }
  
  const order = orderSnap.data() as Order
  
  // 주문 삭제
  await deleteDoc(orderRef)
  
  // 그룹 총액 업데이트
  const groupRef = doc(db, 'groups', order.groupId)
  const groupSnap = await getDoc(groupRef)
  
  if (groupSnap.exists()) {
    const group = groupSnap.data() as Group
    const newTotal = group.currentTotal - order.totalPrice
    
    await updateDoc(groupRef, {
      currentTotal: Math.max(0, newTotal), // 음수 방지
      updatedAt: serverTimestamp(),
    })
    
    // 최소 금액 미달성 시 상태 변경
    if (newTotal < group.minimumTotal && group.status === '달성') {
      await updateDoc(groupRef, {
        status: '진행중',
        updatedAt: serverTimestamp(),
      })
    }
  }
}

