/**
 * 카카오 웹훅 이벤트 처리
 * 
 * 사용자 계정 상태 변경 시 Firestore 업데이트
 * 
 * 주의: 웹훅은 서버 사이드에서 실행되므로 Firebase Admin SDK를 사용해야 합니다.
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

// Firebase Admin 초기화
let adminDb: any = null

function initFirebaseAdmin() {
  if (adminDb) return adminDb

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('Firebase Admin 환경 변수가 설정되지 않았습니다.')
    return null
  }

  try {
    if (!getApps().length) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      })
    }
    adminDb = getFirestore()
    return adminDb
  } catch (error) {
    console.error('Firebase Admin 초기화 오류:', error)
    return null
  }
}

interface WebhookPayload {
  iss: string
  aud: string
  iat: number
  jti: string
  events: {
    [eventType: string]: {
      subject: string // 카카오 사용자 ID
      [key: string]: any
    }
  }
}

/**
 * 카카오 웹훅 이벤트 처리
 */
export async function handleKakaoWebhook(payload: WebhookPayload) {
  const events = payload.events
  
  for (const [eventType, eventData] of Object.entries(events)) {
    const kakaoId = eventData.subject
    
    switch (eventType) {
      case 'https://schemas.openid.net/secevent/oauth/event-type/account-deleted':
        await handleAccountDeleted(kakaoId)
        break
      
      case 'https://schemas.openid.net/secevent/oauth/event-type/account-disabled':
        await handleAccountDisabled(kakaoId)
        break
      
      case 'https://schemas.openid.net/secevent/oauth/event-type/account-enabled':
        await handleAccountEnabled(kakaoId)
        break
      
      case 'https://schemas.openid.net/secevent/risc/event-type/identifier-changed':
        await handleIdentifierChanged(kakaoId, eventData)
        break
      
      case 'https://schemas.openid.net/secevent/risc/event-type/identifier-recycled':
        await handleIdentifierRecycled(kakaoId, eventData)
        break
      
      default:
        console.log(`알 수 없는 이벤트 타입: ${eventType}`)
    }
  }
}

/**
 * 계정 삭제 처리
 */
async function handleAccountDeleted(kakaoId: string) {
  const db = initFirebaseAdmin()
  if (!db) {
    console.error('Firebase Admin이 초기화되지 않았습니다.')
    return
  }

  try {
    const uid = `kakao_${kakaoId}`
    const userRef = db.collection('users').doc(uid)
    const userSnap = await userRef.get()
    
    if (!userSnap.exists) {
      console.log(`사용자를 찾을 수 없습니다: ${uid}`)
      return
    }
    
    await userRef.update({
      accountStatus: 'deleted',
      accountDeletedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
    
    console.log(`계정 삭제 처리 완료: ${uid}`)
  } catch (error: any) {
    console.error('계정 삭제 처리 오류:', error)
  }
}

/**
 * 계정 비활성화 처리
 */
async function handleAccountDisabled(kakaoId: string) {
  const db = initFirebaseAdmin()
  if (!db) {
    console.error('Firebase Admin이 초기화되지 않았습니다.')
    return
  }

  try {
    const uid = `kakao_${kakaoId}`
    const userRef = db.collection('users').doc(uid)
    const userSnap = await userRef.get()
    
    if (!userSnap.exists) {
      console.log(`사용자를 찾을 수 없습니다: ${uid}`)
      return
    }
    
    await userRef.update({
      accountStatus: 'disabled',
      accountDisabledAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
    
    console.log(`계정 비활성화 처리 완료: ${uid}`)
  } catch (error: any) {
    console.error('계정 비활성화 처리 오류:', error)
  }
}

/**
 * 계정 활성화 처리
 */
async function handleAccountEnabled(kakaoId: string) {
  const db = initFirebaseAdmin()
  if (!db) {
    console.error('Firebase Admin이 초기화되지 않았습니다.')
    return
  }

  try {
    const uid = `kakao_${kakaoId}`
    const userRef = db.collection('users').doc(uid)
    const userSnap = await userRef.get()
    
    if (!userSnap.exists) {
      console.log(`사용자를 찾을 수 없습니다: ${uid}`)
      return
    }
    
    await userRef.update({
      accountStatus: 'enabled',
      accountEnabledAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
    
    console.log(`계정 활성화 처리 완료: ${uid}`)
  } catch (error: any) {
    console.error('계정 활성화 처리 오류:', error)
  }
}

/**
 * 식별자 변경 처리 (이메일, 전화번호 등)
 */
async function handleIdentifierChanged(kakaoId: string, eventData: any) {
  const db = initFirebaseAdmin()
  if (!db) {
    console.error('Firebase Admin이 초기화되지 않았습니다.')
    return
  }

  try {
    const uid = `kakao_${kakaoId}`
    const userRef = db.collection('users').doc(uid)
    const userSnap = await userRef.get()
    
    if (!userSnap.exists) {
      console.log(`사용자를 찾을 수 없습니다: ${uid}`)
      return
    }
    
    const updates: any = {
      identifierChangedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }
    
    // 변경된 식별자 정보 업데이트
    if (eventData.account_email) {
      updates.email = eventData.account_email
    }
    if (eventData.phone_number) {
      updates.phoneNumber = eventData.phone_number
    }
    
    await userRef.update(updates)
    
    console.log(`식별자 변경 처리 완료: ${uid}`, updates)
  } catch (error: any) {
    console.error('식별자 변경 처리 오류:', error)
  }
}

/**
 * 식별자 재사용 처리 (이메일, 전화번호 재사용)
 */
async function handleIdentifierRecycled(kakaoId: string, eventData: any) {
  const db = initFirebaseAdmin()
  if (!db) {
    console.error('Firebase Admin이 초기화되지 않았습니다.')
    return
  }

  try {
    const uid = `kakao_${kakaoId}`
    const userRef = db.collection('users').doc(uid)
    const userSnap = await userRef.get()
    
    if (!userSnap.exists) {
      console.log(`사용자를 찾을 수 없습니다: ${uid}`)
      return
    }
    
    const updates: any = {
      identifierRecycledAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }
    
    // 재사용된 식별자 정보 업데이트
    if (eventData.account_email) {
      updates.email = eventData.account_email
      updates.emailRecycled = true
    }
    if (eventData.phone_number) {
      updates.phoneNumber = eventData.phone_number
      updates.phoneRecycled = true
    }
    
    await userRef.update(updates)
    
    console.log(`식별자 재사용 처리 완료: ${uid}`, updates)
  } catch (error: any) {
    console.error('식별자 재사용 처리 오류:', error)
  }
}

