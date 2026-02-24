/**
 * 관리자(오너) 로그아웃 API
 * 
 * admin_session 쿠키를 삭제합니다.
 * 오너 계정은 세션 쿠키 기반 인증을 사용하므로, 쿠키만 삭제하면 됩니다.
 */

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // 세션 쿠키 삭제
    const response = NextResponse.json({ ok: true })
    
    // 쿠키 삭제 (maxAge=0)
    const isProduction = process.env.NODE_ENV === 'production'
    const cookieOptions = [
      'admin_session=',
      'HttpOnly',
      'Path=/',
      'SameSite=Lax',
      ...(isProduction ? ['Secure'] : []),
      'Max-Age=0',
    ]

    response.headers.set('Set-Cookie', cookieOptions.join('; '))
    
    console.log('[관리자 로그아웃] 세션 쿠키 삭제 완료')
    return response
  } catch (error: any) {
    console.error('[관리자 로그아웃] 오류:', error)
    return NextResponse.json(
      { error: '로그아웃 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
