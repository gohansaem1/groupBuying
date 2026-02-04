/**
 * 카카오 로그인 웹훅 수신 엔드포인트
 * 
 * 카카오에서 사용자 계정 상태 변경 시 전송하는 웹훅을 수신합니다.
 * 
 * 참고: https://developers.kakao.com/docs/latest/ko/kakaologin/callback#ssf
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyKakaoWebhook } from '@/lib/webhooks/kakao-verify'
import { handleKakaoWebhook } from '@/lib/webhooks/kakao-handler'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    
    if (!body) {
      return NextResponse.json(
        { err: 'invalid_request', description: 'Request body is required' },
        { status: 400 }
      )
    }

    // SET(Security Event Token) 검증
    const verificationResult = await verifyKakaoWebhook(body)
    
    if (!verificationResult.valid) {
      return NextResponse.json(
        { 
          err: verificationResult.error || 'invalid_request',
          description: verificationResult.description || 'SET verification failed'
        },
        { status: 400 }
      )
    }

    // 웹훅 이벤트 처리
    await handleKakaoWebhook(verificationResult.payload)

    // 검증 성공 응답 (3초 내 응답 필요)
    return new NextResponse(null, { status: 202 })
  } catch (error: any) {
    console.error('카카오 웹훅 처리 오류:', error)
    return NextResponse.json(
      { 
        err: 'invalid_request',
        description: error.message || 'Webhook processing failed'
      },
      { status: 400 }
    )
  }
}

// GET 요청으로 메타데이터 조회 (선택사항)
export async function GET() {
  return NextResponse.json({
    message: 'Kakao webhook endpoint',
    supported_events: ['account.deleted', 'account.disabled', 'account.enabled', 'identifier.changed', 'identifier.recycled']
  })
}



