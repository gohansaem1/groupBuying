import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject, StorageReference } from 'firebase/storage'
import { getApps } from 'firebase/app'
import { initializeApp } from 'firebase/app'

// Firebase Storage 초기화
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

let storage: ReturnType<typeof getStorage> | null = null

if (typeof window !== 'undefined') {
  if (!getApps().length) {
    initializeApp(firebaseConfig)
  }
  storage = getStorage()
}

// 이미지 파일 검증
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // 파일 크기 제한 (5MB)
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    return { valid: false, error: '이미지 크기는 5MB 이하여야 합니다.' }
  }

  // 파일 형식 검증
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'JPEG, PNG, WebP 형식만 업로드 가능합니다.' }
  }

  return { valid: true }
}

// 이미지 업로드
export async function uploadImage(
  file: File,
  path: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  if (!storage) {
    throw new Error('Storage가 초기화되지 않았습니다.')
  }

  // 파일 검증
  const validation = validateImageFile(file)
  if (!validation.valid) {
    throw new Error(validation.error || '파일 검증에 실패했습니다.')
  }

  const storageRef = ref(storage, path)
  const uploadTask = uploadBytesResumable(storageRef, file)

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        // 진행률 계산 (0-100)
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        if (onProgress) {
          onProgress(progress)
        }
      },
      (error) => {
        reject(error)
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
          resolve(downloadURL)
        } catch (error) {
          reject(error)
        }
      }
    )
  })
}

// 이미지 삭제
export async function deleteImage(path: string): Promise<void> {
  if (!storage) {
    throw new Error('Storage가 초기화되지 않았습니다.')
  }

  const storageRef = ref(storage, path)
  await deleteObject(storageRef)
}

// 그룹 이미지 경로 생성
export function getGroupImagePath(groupId: string, fileName?: string): string {
  const timestamp = Date.now()
  const name = fileName || `group-image-${timestamp}`
  return `groups/${groupId}/${name}`
}

// 상품 이미지 경로 생성
export function getProductImagePath(productId: string, fileName?: string): string {
  const timestamp = Date.now()
  const name = fileName || `product-image-${timestamp}`
  return `products/${productId}/${name}`
}



