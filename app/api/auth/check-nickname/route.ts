import { NextRequest, NextResponse } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

let adminApp: any = null
let adminDb: any = null

function initFirebaseAdmin() {
  if (adminApp && adminDb) return

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    return
  }

  try {
    const existingApps = getApps()
    if (existingApps.length > 0) {
      adminApp = existingApps[0]
    } else {
      adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      })
    }
    
    adminDb = getFirestore(adminApp)
  } catch (error: any) {
    console.error('Firebase Admin 초기화 오류:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    initFirebaseAdmin()

    if (!adminDb) {
      return NextResponse.json(
        { error: 'Firebase Admin이 초기화되지 않았습니다.' },
        { status: 500 }
      )
    }

    const { nickname, excludeUserId } = await request.json()

    if (!nickname || typeof nickname !== 'string') {
      return NextResponse.json(
        { error: '닉네임이 필요합니다.' },
        { status: 400 }
      )
    }

    // 닉네임 유효성 검사
    const trimmedNickname = nickname.trim()
    if (trimmedNickname.length < 2 || trimmedNickname.length > 20) {
      return NextResponse.json(
        { error: '닉네임은 2자 이상 20자 이하여야 합니다.' },
        { status: 400 }
      )
    }

    // 특수문자 제한 (한글, 영문, 숫자, 언더스코어, 하이픈만 허용)
    const nicknameRegex = /^[가-힣a-zA-Z0-9_-]+$/
    if (!nicknameRegex.test(trimmedNickname)) {
      return NextResponse.json(
        { error: '닉네임은 한글, 영문, 숫자, 언더스코어(_), 하이픈(-)만 사용할 수 있습니다.' },
        { status: 400 }
      )
    }

    // 닉네임 중복 검사 (excludeUserId가 있으면 해당 사용자 제외)
    const usersRef = adminDb.collection('users')
    let snapshot = await usersRef.where('nickname', '==', trimmedNickname).limit(1).get()

    // excludeUserId가 있고 결과가 있으면, 해당 사용자의 닉네임인지 확인
    if (!snapshot.empty && excludeUserId) {
      const foundUser = snapshot.docs[0]
      if (foundUser.id === excludeUserId) {
        // 자신의 현재 닉네임이면 사용 가능
        return NextResponse.json(
          { available: true, message: '사용 가능한 닉네임입니다.' },
          { status: 200 }
        )
      }
    }

    if (!snapshot.empty) {
      return NextResponse.json(
        { available: false, message: '이미 사용 중인 닉네임입니다.' },
        { status: 200 }
      )
    }

    return NextResponse.json(
      { available: true, message: '사용 가능한 닉네임입니다.' },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('닉네임 중복 검사 오류:', error)
    return NextResponse.json(
      { error: error.message || '닉네임 중복 검사에 실패했습니다.' },
      { status: 500 }
    )
  }
}

