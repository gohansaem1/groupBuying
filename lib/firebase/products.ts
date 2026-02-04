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
  Timestamp
} from 'firebase/firestore'
import { db } from './config'
import { isProductInActiveGroups } from './groups'
import { createProductUpdateNotification } from './notifications'

export interface Product {
  id: string
  name: string
  description: string
  listPrice: number // 정가
  discountRate: number // 할인율 (%)
  saleStatus: '판매중' | '판매중지'
  capacity?: string // 용량 정보 (예: "500ml", "1kg")
  imageUrl?: string // 상품 대표 이미지 URL
  detailImages?: string[] // 상세보기 이미지 URL 배열
  detailDescription?: string // 상세보기 설명 (텍스트)
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface OrganizerCommission {
  organizerId: string
  commissionRate: number // 수수료율 (%)
}

// 상품 목록 조회
export async function getProducts(): Promise<Product[]> {
  const productsRef = collection(db, 'products')
  const q = query(productsRef, where('saleStatus', '==', '판매중'))
  const snapshot = await getDocs(q)
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Product))
}

// 모든 상품 조회 (관리자용)
export async function getAllProducts(): Promise<Product[]> {
  const productsRef = collection(db, 'products')
  const snapshot = await getDocs(productsRef)
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Product))
}

// 상품 조회
export async function getProduct(productId: string): Promise<Product | null> {
  const productRef = doc(db, 'products', productId)
  const productSnap = await getDoc(productRef)
  
  if (productSnap.exists()) {
    return {
      id: productSnap.id,
      ...productSnap.data()
    } as Product
  }
  
  return null
}

// 상품 생성 (관리자만)
export async function createProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const productsRef = collection(db, 'products')
  const newProductRef = doc(productsRef)
  
  // undefined 값 제거 및 빈 문자열을 null로 변환 (Firestore는 undefined를 허용하지 않음)
  const cleanProduct: Record<string, any> = {
    name: product.name,
    description: product.description,
    listPrice: product.listPrice,
    discountRate: product.discountRate,
    saleStatus: product.saleStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  
  // 선택적 필드는 undefined가 아닐 때만 추가
  if (product.imageUrl !== undefined) {
    cleanProduct.imageUrl = product.imageUrl || null
  }
  if (product.detailImages !== undefined) {
    cleanProduct.detailImages = product.detailImages || null
  }
  if (product.detailDescription !== undefined) {
    cleanProduct.detailDescription = product.detailDescription || null
  }
  
  await setDoc(newProductRef, cleanProduct)
  
  return newProductRef.id
}

// 상품 수정 (관리자만) - 수정 시 알림 생성
export async function updateProduct(productId: string, updates: Partial<Product>): Promise<void> {
  const productRef = doc(db, 'products', productId)
  const productSnap = await getDoc(productRef)
  
  if (!productSnap.exists()) {
    throw new Error('상품을 찾을 수 없습니다.')
  }
  
  const oldProduct = { id: productSnap.id, ...productSnap.data() } as Product
  
  // 변경사항 추적
  const changes: string[] = []
  if (updates.name && updates.name !== oldProduct.name) {
    changes.push('상품명')
  }
  if (updates.description && updates.description !== oldProduct.description) {
    changes.push('설명')
  }
  if (updates.listPrice && updates.listPrice !== oldProduct.listPrice) {
    changes.push('정가')
  }
  if (updates.discountRate !== undefined && updates.discountRate !== oldProduct.discountRate) {
    changes.push('할인율')
  }
  if (updates.saleStatus && updates.saleStatus !== oldProduct.saleStatus) {
    changes.push('판매 상태')
  }
  
  // undefined 값 제거 (Firestore는 undefined를 허용하지 않음)
  const cleanUpdates: Record<string, any> = {
    updatedAt: serverTimestamp(),
  }
  
  // undefined가 아닌 값만 추가
  if (updates.name !== undefined) cleanUpdates.name = updates.name
  if (updates.description !== undefined) cleanUpdates.description = updates.description
  if (updates.listPrice !== undefined) cleanUpdates.listPrice = updates.listPrice
  if (updates.discountRate !== undefined) cleanUpdates.discountRate = updates.discountRate
  if (updates.saleStatus !== undefined) cleanUpdates.saleStatus = updates.saleStatus
  if (updates.imageUrl !== undefined) {
    // 빈 문자열도 null로 처리 (필드 제거를 원하면 null 사용)
    cleanUpdates.imageUrl = updates.imageUrl || null
  }
  if (updates.detailImages !== undefined) {
    cleanUpdates.detailImages = updates.detailImages || null
  }
  if (updates.detailDescription !== undefined) {
    cleanUpdates.detailDescription = updates.detailDescription || null
  }
  
  // 상품 정보 업데이트
  await updateDoc(productRef, cleanUpdates)
  
  // 진행중인 공동구매가 있고 변경사항이 있으면 알림 생성
  if (changes.length > 0) {
    const hasActiveGroups = await isProductInActiveGroups(productId)
    if (hasActiveGroups) {
      const productName = updates.name || oldProduct.name
      await createProductUpdateNotification(productId, productName, changes)
    }
  }
}

// 상품 삭제 (관리자만) - 진행중인 공동구매가 있으면 삭제 불가
export async function deleteProduct(productId: string): Promise<void> {
  // 진행중인 공동구매 체크
  const hasActiveGroups = await isProductInActiveGroups(productId)
  if (hasActiveGroups) {
    throw new Error('진행중인 공동구매가 있어 상품을 삭제할 수 없습니다.')
  }
  
  const productRef = doc(db, 'products', productId)
  await deleteDoc(productRef)
}

// Organizer별 수수료율 조회
export async function getOrganizerCommission(organizerId: string): Promise<number> {
  const commissionRef = doc(db, 'organizerCommissions', organizerId)
  const commissionSnap = await getDoc(commissionRef)
  
  if (commissionSnap.exists()) {
    return commissionSnap.data().commissionRate as number
  }
  
  return 0 // 기본값
}

// Organizer별 수수료율 설정 (관리자만)
export async function setOrganizerCommission(organizerId: string, commissionRate: number): Promise<void> {
  const commissionRef = doc(db, 'organizerCommissions', organizerId)
  await setDoc(commissionRef, {
    organizerId,
    commissionRate,
    updatedAt: serverTimestamp(),
  })
}

