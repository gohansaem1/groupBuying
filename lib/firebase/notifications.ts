import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore'
import { db } from './config'

export interface Notification {
  id: string
  userId: string // 알림을 받을 사용자 ID
  type: 'product_updated' | 'group_progress' | 'group_status_changed' | 'order_updated' | 'deadline_approaching' | 'delivery_approaching'
  title: string
  message: string
  relatedId?: string // 관련 상품 ID 또는 그룹 ID
  relatedType?: 'product' | 'group' | 'order'
  read: boolean
  createdAt: Timestamp
}

// 알림 생성
export async function createNotification(notification: Omit<Notification, 'id' | 'read' | 'createdAt'>): Promise<string> {
  const notificationsRef = collection(db, 'notifications')
  const newNotificationRef = doc(notificationsRef)
  
  await setDoc(newNotificationRef, {
    ...notification,
    read: false,
    createdAt: serverTimestamp(),
  })
  
  return newNotificationRef.id
}

// 여러 사용자에게 알림 생성 (배치)
export async function createNotificationsForUsers(
  userIds: string[],
  notification: Omit<Notification, 'id' | 'userId' | 'read' | 'createdAt'>
): Promise<void> {
  const batch = writeBatch(db)
  
  userIds.forEach(userId => {
    const notificationsRef = collection(db, 'notifications')
    const newNotificationRef = doc(notificationsRef)
    batch.set(newNotificationRef, {
      ...notification,
      userId,
      read: false,
      createdAt: serverTimestamp(),
    })
  })
  
  await batch.commit()
}

// 사용자의 알림 목록 조회
export async function getUserNotifications(userId: string, limitCount: number = 50): Promise<Notification[]> {
  const notificationsRef = collection(db, 'notifications')
  const q = query(
    notificationsRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  )
  const snapshot = await getDocs(q)
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Notification))
}

// 읽지 않은 알림 개수 조회
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const notificationsRef = collection(db, 'notifications')
  const q = query(
    notificationsRef,
    where('userId', '==', userId),
    where('read', '==', false)
  )
  const snapshot = await getDocs(q)
  
  return snapshot.size
}

// 알림 읽음 처리
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const notificationRef = doc(db, 'notifications', notificationId)
  await updateDoc(notificationRef, {
    read: true,
  })
}

// 모든 알림 읽음 처리
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const notificationsRef = collection(db, 'notifications')
  const q = query(
    notificationsRef,
    where('userId', '==', userId),
    where('read', '==', false)
  )
  const snapshot = await getDocs(q)
  
  const batch = writeBatch(db)
  snapshot.docs.forEach(doc => {
    batch.update(doc.ref, { read: true })
  })
  
  await batch.commit()
}

// 상품 변경 알림 생성 (해당 상품을 사용하는 모든 공동구매 건 참여자에게)
export async function createProductUpdateNotification(
  productId: string,
  productName: string,
  changes: string[]
): Promise<void> {
  // 해당 상품을 사용하는 모든 공동구매 건 조회
  const groupsRef = collection(db, 'groups')
  const q = query(groupsRef, where('productId', '==', productId))
  const groupsSnapshot = await getDocs(q)
  
  if (groupsSnapshot.empty) {
    return // 해당 상품을 사용하는 공동구매 건이 없음
  }
  
  // 각 공동구매 건의 주문자들 수집
  const userIds = new Set<string>()
  
  for (const groupDoc of groupsSnapshot.docs) {
    const groupId = groupDoc.id
    const ordersRef = collection(db, 'orders')
    const ordersQuery = query(ordersRef, where('groupId', '==', groupId))
    const ordersSnapshot = await getDocs(ordersQuery)
    
    ordersSnapshot.docs.forEach(orderDoc => {
      const orderData = orderDoc.data()
      userIds.add(orderData.userId)
    })
  }
  
  if (userIds.size === 0) {
    return // 주문자가 없음
  }
  
  // 모든 주문자에게 알림 생성
  await createNotificationsForUsers(
    Array.from(userIds),
    {
      type: 'product_updated',
      title: '상품 정보가 변경되었습니다',
      message: `"${productName}" 상품의 ${changes.join(', ')} 정보가 변경되었습니다.`,
      relatedId: productId,
      relatedType: 'product',
    }
  )
}

// 공동구매 건 상태 변경 알림 생성
export async function createGroupStatusChangeNotification(
  groupId: string,
  groupTitle: string,
  oldStatus: string,
  newStatus: string
): Promise<void> {
  // 해당 공동구매 건의 모든 주문자 조회
  const ordersRef = collection(db, 'orders')
  const q = query(ordersRef, where('groupId', '==', groupId))
  const snapshot = await getDocs(q)
  
  if (snapshot.empty) {
    return
  }
  
  const userIds = snapshot.docs.map(doc => doc.data().userId)
  
  await createNotificationsForUsers(
    userIds,
    {
      type: 'group_status_changed',
      title: '공동구매 건 상태가 변경되었습니다',
      message: `"${groupTitle}" 공동구매 건의 상태가 ${oldStatus}에서 ${newStatus}로 변경되었습니다.`,
      relatedId: groupId,
      relatedType: 'group',
    }
  )
}

// 주문 마감일 임박 알림 생성
export async function createDeadlineApproachingNotification(
  groupId: string,
  groupTitle: string,
  endDate: Timestamp,
  daysRemaining: number
): Promise<void> {
  // 해당 공동구매 건의 모든 주문자 조회
  const ordersRef = collection(db, 'orders')
  const q = query(ordersRef, where('groupId', '==', groupId))
  const snapshot = await getDocs(q)
  
  if (snapshot.empty) {
    return
  }
  
  const userIds = snapshot.docs.map(doc => doc.data().userId)
  
  const message = daysRemaining === 1 
    ? `"${groupTitle}" 공동구매 건의 주문 마감일이 내일입니다! 서둘러 주문해주세요.`
    : `"${groupTitle}" 공동구매 건의 주문 마감일이 ${daysRemaining}일 남았습니다.`
  
  await createNotificationsForUsers(
    userIds,
    {
      type: 'deadline_approaching',
      title: '주문 마감일이 임박했습니다',
      message,
      relatedId: groupId,
      relatedType: 'group',
    }
  )
}

// 수령일 임박 알림 생성
export async function createDeliveryApproachingNotification(
  groupId: string,
  groupTitle: string,
  deliveryDate: Timestamp,
  daysRemaining: number
): Promise<void> {
  // 해당 공동구매 건의 모든 주문자 조회
  const ordersRef = collection(db, 'orders')
  const q = query(ordersRef, where('groupId', '==', groupId))
  const snapshot = await getDocs(q)
  
  if (snapshot.empty) {
    return
  }
  
  const userIds = snapshot.docs.map(doc => doc.data().userId)
  
  const message = daysRemaining === 1
    ? `"${groupTitle}" 공동구매 건의 수령일이 내일입니다! 수령 방법을 확인해주세요.`
    : `"${groupTitle}" 공동구매 건의 수령일이 ${daysRemaining}일 남았습니다. 수령 방법을 확인해주세요.`
  
  await createNotificationsForUsers(
    userIds,
    {
      type: 'delivery_approaching',
      title: '수령일이 임박했습니다',
      message,
      relatedId: groupId,
      relatedType: 'group',
    }
  )
}

