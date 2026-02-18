/**
 * 관리자 세션 확인 API
 * 
 * 세션 쿠키가 유효한지 확인합니다.
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

// Firebase Admin 초기화
let adminApp: any = null
let adminAuth: any = null

function initFirebaseAdmin() {
  if (adminApp && adminAuth) return

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  let privateKey = process.env.FIREBASE_PRIVATE_KEY

  if (!projectId || !clientEmail || !privateKey) {
    return
  }

  privateKey = privateKey.replace(/^["']|["']$/g, '')
  privateKey = privateKey.replace(/\\n/g, '\n')

  if (!privateKey.includes('BEGIN PRIVATE KEY')) {
    return
  }

  try {
    const existingApps = getApps()
    if (existingApps.length > 0) {
      adminApp = existingApps[0]
      adminAuth = getAuth(adminApp)
      return
    }

    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    })
    
    adminAuth = getAuth(adminApp)
  } catch (error: any) {
    console.error('[세션 확인] Firebase Admin 초기화 오류:', error)
  }
}

export async function GET(request: NextRequest) {
  try {
    initFirebaseAdmin()

    if (!adminAuth) {
      return NextResponse.json({ valid: false }, { status: 401 })
    }

    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('admin_session')?.value

    if (!sessionCookie) {
      return NextResponse.json({ valid: false }, { status: 401 })
    }

    // 세션 쿠키 검증
    try {
      await adminAuth.verifySessionCookie(sessionCookie, true)
      return NextResponse.json({ valid: true })
    } catch (error: any) {
      return NextResponse.json({ valid: false }, { status: 401 })
    }
  } catch (error: any) {
    return NextResponse.json({ valid: false }, { status: 401 })
  }
}
