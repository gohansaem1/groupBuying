import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc,
  query,
  where,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'
import { db } from './config'

export interface Product {
  id: string
  name: string
  description: string
  listPrice: number // 정가
  discountRate: number // 할인율 (%)
  saleStatus: '판매중' | '판매중지'
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
  
  await setDoc(newProductRef, {
    ...product,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  
  return newProductRef.id
}

// 상품 수정 (관리자만)
export async function updateProduct(productId: string, updates: Partial<Product>): Promise<void> {
  const productRef = doc(db, 'products', productId)
  await updateDoc(productRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  })
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

