import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'
import { db } from './config'

// 감사 로그 타입
export type AuditLogType = 
  | 'order_created'      // 주문 생성
  | 'order_updated'      // 주문 수정
  | 'order_cancelled'    // 주문 취소
  | 'group_created'      // 공동구매 생성
  | 'group_status_changed' // 공동구매 상태 변경
  | 'group_deleted'      // 공동구매 삭제
  | 'group_updated'      // 공동구매 수정

export interface AuditLog {
  id: string
  type: AuditLogType
  userId: string // 작업을 수행한 사용자 ID
  userName?: string // 작업을 수행한 사용자 이름
  targetType: 'order' | 'group' // 대상 타입
  targetId: string // 대상 ID (orderId 또는 groupId)
  targetName?: string // 대상 이름 (상품명 또는 공동구매 제목)
  changes?: {
    // 변경 전 값
    before?: any
    // 변경 후 값
    after?: any
    // 변경된 필드
    fields?: string[]
  }
  metadata?: {
    // 추가 메타데이터
    [key: string]: any
  }
  createdAt: Timestamp
}

// 감사 로그 생성
export async function createAuditLog(
  type: AuditLogType,
  userId: string,
  userName: string | undefined,
  targetType: 'order' | 'group',
  targetId: string,
  targetName?: string,
  changes?: {
    before?: any
    after?: any
    fields?: string[]
  },
  metadata?: { [key: string]: any }
): Promise<void> {
  try {
    const auditLogsRef = collection(db, 'auditLogs')
    const newLogRef = doc(auditLogsRef)
    
    // undefined 값을 제거하고 필요한 필드만 포함
    const log: any = {
      type,
      userId,
      targetType,
      targetId,
      createdAt: serverTimestamp()
    }
    
    // 선택적 필드는 값이 있을 때만 추가
    if (userName !== undefined && userName !== null && userName !== '') {
      log.userName = userName
    }
    
    if (targetName !== undefined && targetName !== null && targetName !== '') {
      log.targetName = targetName
    }
    
    if (changes !== undefined && changes !== null) {
      log.changes = changes
    }
    
    if (metadata !== undefined && metadata !== null && Object.keys(metadata).length > 0) {
      log.metadata = metadata
    }
    
    await setDoc(newLogRef, log)
  } catch (error: any) {
    // 감사 로그 생성 실패는 무시 (클라이언트에서 직접 작성 불가)
    // 권한 오류는 예상된 동작이므로 콘솔에 오류를 표시하지 않음
    // 다른 오류만 콘솔에 표시
    if (error?.code !== 'permission-denied' && error?.code !== 'permissions-denied') {
      console.error('감사 로그 생성 실패:', error)
    }
    // 감사 로그 실패는 앱 동작을 막지 않음
  }
}

// 주문 관련 감사 로그 생성 헬퍼 함수들
export async function logOrderCreated(
  userId: string,
  userName: string | undefined,
  orderId: string,
  groupId: string,
  productName: string,
  quantity: number,
  totalPrice: number
): Promise<void> {
  await createAuditLog(
    'order_created',
    userId,
    userName,
    'order',
    orderId,
    productName,
    {
      after: {
        groupId,
        productName,
        quantity,
        totalPrice
      }
    },
    {
      groupId
    }
  )
}

export async function logOrderUpdated(
  userId: string,
  userName: string | undefined,
  orderId: string,
  productName: string,
  beforeQuantity: number,
  afterQuantity: number,
  beforeTotalPrice: number,
  afterTotalPrice: number,
  metadata?: { [key: string]: any }
): Promise<void> {
  await createAuditLog(
    'order_updated',
    userId,
    userName,
    'order',
    orderId,
    productName,
    {
      before: {
        quantity: beforeQuantity,
        totalPrice: beforeTotalPrice
      },
      after: {
        quantity: afterQuantity,
        totalPrice: afterTotalPrice
      },
      fields: ['quantity', 'totalPrice']
    },
    metadata
  )
}

export async function logOrderCancelled(
  userId: string,
  userName: string | undefined,
  orderId: string,
  productName: string,
  quantity: number,
  totalPrice: number,
  metadata?: { [key: string]: any }
): Promise<void> {
  await createAuditLog(
    'order_cancelled',
    userId,
    userName,
    'order',
    orderId,
    productName,
    {
      before: {
        quantity,
        totalPrice
      }
    },
    metadata
  )
}

// 공동구매 관련 감사 로그 생성 헬퍼 함수들
export async function logGroupCreated(
  userId: string,
  userName: string | undefined,
  groupId: string,
  groupTitle: string,
  groupData: any
): Promise<void> {
  await createAuditLog(
    'group_created',
    userId,
    userName,
    'group',
    groupId,
    groupTitle,
    {
      after: groupData
    }
  )
}

export async function logGroupStatusChanged(
  userId: string,
  userName: string | undefined,
  groupId: string,
  groupTitle: string,
  beforeStatus: string,
  afterStatus: string
): Promise<void> {
  await createAuditLog(
    'group_status_changed',
    userId,
    userName,
    'group',
    groupId,
    groupTitle,
    {
      before: {
        status: beforeStatus
      },
      after: {
        status: afterStatus
      },
      fields: ['status']
    }
  )
}

export async function logGroupDeleted(
  userId: string,
  userName: string | undefined,
  groupId: string,
  groupTitle: string,
  groupData: any
): Promise<void> {
  await createAuditLog(
    'group_deleted',
    userId,
    userName,
    'group',
    groupId,
    groupTitle,
    {
      before: groupData
    }
  )
}

export async function logGroupUpdated(
  userId: string,
  userName: string | undefined,
  groupId: string,
  groupTitle: string,
  changes: {
    before?: any
    after?: any
    fields?: string[]
  }
): Promise<void> {
  await createAuditLog(
    'group_updated',
    userId,
    userName,
    'group',
    groupId,
    groupTitle,
    changes
  )
}

// 감사 로그 조회
export async function getAuditLogs(
  targetType?: 'order' | 'group',
  targetId?: string,
  limit: number = 100
): Promise<AuditLog[]> {
  const auditLogsRef = collection(db, 'auditLogs')
  let q = query(auditLogsRef, orderBy('createdAt', 'desc'))
  
  if (targetType) {
    q = query(q, where('targetType', '==', targetType))
  }
  
  if (targetId) {
    q = query(q, where('targetId', '==', targetId))
  }
  
  const snapshot = await getDocs(q)
  const logs = snapshot.docs
    .slice(0, limit)
    .map(doc => ({
      id: doc.id,
      ...doc.data()
    } as AuditLog))
  
  return logs
}

// 특정 주문의 감사 로그 조회
export async function getOrderAuditLogs(orderId: string): Promise<AuditLog[]> {
  return getAuditLogs('order', orderId)
}

// 특정 공동구매의 감사 로그 조회
export async function getGroupAuditLogs(groupId: string): Promise<AuditLog[]> {
  return getAuditLogs('group', groupId)
}

