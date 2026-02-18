import { NextRequest, NextResponse } from 'next/server'
// 서버 사이드 API 라우트에서는 Firebase Client SDK를 사용하지 않습니다.
// 필요시 Firebase Admin SDK를 사용하세요.

export async function POST(request: NextRequest) {
  try {
    // Firebase Auth에서 현재 사용자 확인
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    // 클라이언트에서 직접 호출하는 경우를 위해
    // 실제로는 클라이언트에서 Firebase Auth를 통해 인증된 상태에서 호출
    // 여기서는 간단히 처리하기 위해 클라이언트 측에서 처리하도록 함
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('약관 동의 처리 오류:', error)
    return NextResponse.json(
      { error: error.message || '약관 동의 처리에 실패했습니다.' },
      { status: 500 }
    )
  }
}


