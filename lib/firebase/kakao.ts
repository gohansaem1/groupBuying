/**
 * 카카오 로그인 구현
 * 
 * OAuth 2.0 Authorization Code Flow를 사용하여 안전하게 구현합니다.
 * 클라이언트에서는 authorize URL로 리다이렉트만 하고,
 * 토큰 교환은 서버에서만 처리합니다.
 */

// 카카오 로그인 - authorize URL로 리다이렉트
export function signInWithKakaoSDK(forceSelectAccount: boolean = false) {
  if (typeof window === 'undefined') {
    throw new Error('브라우저 환경에서만 사용할 수 있습니다.')
  }

  const KAKAO_JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY
  if (!KAKAO_JS_KEY) {
    throw new Error('NEXT_PUBLIC_KAKAO_JS_KEY가 설정되지 않았습니다.')
  }

  // 현재 URL 기반으로 콜백 URL 생성
  const redirectUri = `${window.location.origin}/api/auth/kakao/callback`
  
  console.log('[카카오 로그인] 웹 로그인 화면으로 이동', { forceSelectAccount })
  console.log('[카카오 로그인] Redirect URI:', redirectUri)
  console.log('[카카오 로그인] ⚠️ 중요: 이 URI가 카카오 개발자 콘솔에 정확히 등록되어 있어야 합니다!')
  
  // 카카오 OAuth 2.0 authorize URL 생성
  const authorizeUrl = new URL('https://kauth.kakao.com/oauth/authorize')
  authorizeUrl.searchParams.set('client_id', KAKAO_JS_KEY)
  authorizeUrl.searchParams.set('redirect_uri', redirectUri)
  authorizeUrl.searchParams.set('response_type', 'code')
  
  // 웹 로그인 화면 표시 (카카오톡 자동 로그인 방지)
  authorizeUrl.searchParams.set('throughTalk', 'false')
  
  console.log('[카카오 로그인] authorize URL:', authorizeUrl.toString())
  
  // 카카오 로그인 페이지로 리다이렉트
  window.location.href = authorizeUrl.toString()
  
  // 이 코드는 실행되지 않지만, 타입 에러 방지를 위해 반환값 추가
  return Promise.resolve(null as any)
}

