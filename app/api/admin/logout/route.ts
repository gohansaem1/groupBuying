/**
 * 관리자 로그아웃 API
 * 
 * 세션 쿠키를 삭제합니다.
 */

import { NextResponse } from 'next/server'

export async function POST() {
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

  return response
}
