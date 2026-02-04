'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signInWithKakao, signInWithTestUser, getCurrentUserProfile, agreeToUserTerms } from '@/lib/firebase/auth'
import { initKakao, waitForKakaoSDK } from '@/lib/firebase/kakao'
import TermsAgreementModal from '@/components/TermsAgreementModal'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnUrl = searchParams?.get('returnUrl') || '/'
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sdkReady, setSdkReady] = useState(false)
  const [testMode, setTestMode] = useState(false)
  const [testUserId, setTestUserId] = useState('')
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null)

  useEffect(() => {
    // 카카오 SDK 초기화
    const init = async () => {
      try {
        // 약간의 지연 후 초기화 (스크립트 로드 시간 확보)
        await new Promise(resolve => setTimeout(resolve, 500))
        initKakao()
        await waitForKakaoSDK()
        setSdkReady(true)
      } catch (err: any) {
        console.error('카카오 SDK 초기화 오류:', err)
        // SDK 로드 실패해도 계속 진행 (개발 중에는 Google 로그인 사용 가능)
        setSdkReady(false)
      }
    }
    init()
  }, [])

  const handleKakaoLogin = async () => {
    if (!sdkReady) {
      setError('카카오 SDK가 준비되지 않았습니다. .env.local에 NEXT_PUBLIC_KAKAO_JS_KEY가 설정되어 있는지 확인해 주세요.')
      return
    }

    setLoading(true)
    setError(null)

    const LOGIN_TIMEOUT_MS = 40000 // 40초 (카카오 로그인 + Firebase 인증 + 프로필 처리 시간 고려)

    try {
      console.log('[로그인 페이지] 카카오 로그인 시작')
      await signInWithKakao()
      console.log('[로그인 페이지] 카카오 로그인 완료')
      
      // 로그인 성공 후 즉시 리다이렉트 (프로필은 리다이렉트된 페이지에서 처리)
      // 리다이렉트가 일어나면 이 컴포넌트가 언마운트되므로, 이후 코드는 실행되지 않을 수 있음
      console.log('[로그인 페이지] 리다이렉트 시작')
      
      // returnUrl이 있으면 해당 페이지로, 없으면 홈으로
      router.push(returnUrl)
      
      // 리다이렉트 후에도 약간의 시간을 두고 프로필 확인 시도 (선택사항)
      // 하지만 리다이렉트가 일어나면 이 코드는 실행되지 않을 수 있음
      setTimeout(async () => {
        try {
          const profile = await getCurrentUserProfile()
          console.log('[로그인 페이지] 프로필 확인 완료 (리다이렉트 후)', profile)
          
          // 프로필이 있고 약관 동의가 필요한 경우, 홈 페이지에서 처리하도록 함
          // (홈 페이지의 useEffect에서 처리됨)
        } catch (err) {
          console.warn('[로그인 페이지] 프로필 확인 실패 (리다이렉트 후, 무시 가능)', err)
        }
      }, 100)
      
    } catch (err: any) {
      const message = err.message || '로그인에 실패했습니다.'
      setError(message)
      setLoading(false)
    }
  }

  // handlePostLogin 제거 - 리다이렉트 후 홈 페이지에서 처리

  const handleTermsAgree = async () => {
    try {
      setLoading(true)
      
      // 일반 사용자 약관 동의 처리
      await agreeToUserTerms()

      // 프로필 다시 가져오기
      const profile = await getCurrentUserProfile()
      setShowTermsModal(false)
      
      // 정상 진행
      handlePostLogin(profile)
    } catch (err: any) {
      setError(err.message || '동의 처리에 실패했습니다.')
      setLoading(false)
    }
  }

  const handleTestLogin = async () => {
    if (!testUserId.trim()) {
      setError('사용자 ID를 입력하세요.')
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const { userInfo } = await signInWithTestUser(testUserId.trim())
      
      // 로그인 정보를 콘솔에만 출력 (팝업 제거)
      console.log('로그인 성공!', {
        uid: userInfo.uid,
        nickname: userInfo.nickname || '없음',
        displayName: userInfo.displayName || '없음',
        email: userInfo.email || '없음',
        role: userInfo.role || 'user'
      })
      
      // 닉네임이 없으면 닉네임 설정 페이지로
      if (!userInfo.nickname) {
        router.push('/setup-nickname')
      } else {
        // returnUrl이 있으면 해당 페이지로, 없으면 홈으로
        router.push(returnUrl)
      }
    } catch (err: any) {
      setError(err.message || '테스트 로그인에 실패했습니다.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-white">카</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">제주 공동구매</h1>
            <p className="text-sm sm:text-base text-gray-600">카카오 로그인으로 간편하게 시작하세요</p>
          </div>
          
          {/* 테스트 모드 토글 */}
          {process.env.NODE_ENV !== 'production' && (
            <div className="mb-4">
              <button
                onClick={() => setTestMode(!testMode)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {testMode ? '← 카카오 로그인' : '테스트 로그인 →'}
              </button>
            </div>
          )}

          {testMode ? (
            // 테스트 로그인 모드
            <div>
              <input
                type="text"
                value={testUserId}
                onChange={(e) => setTestUserId(e.target.value)}
                placeholder="사용자 ID 입력 (예: test_user_1)"
                className="w-full border rounded-lg px-4 py-3 mb-4"
                onKeyPress={(e) => e.key === 'Enter' && handleTestLogin()}
              />
              <button
                onClick={handleTestLogin}
                disabled={loading || !testUserId.trim()}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '로그인 중...' : '테스트 로그인'}
              </button>
              <p className="mt-2 text-xs text-gray-500 text-center">
                개발 환경에서만 사용 가능합니다
              </p>
            </div>
          ) : (
            // 카카오 로그인 모드
            <button
              onClick={handleKakaoLogin}
              disabled={loading || !sdkReady}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold py-3 sm:py-4 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-yellow-400/50 text-base sm:text-lg"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  로그인 중...
                </span>
              ) : !sdkReady ? (
                '카카오 SDK 로딩 중...'
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3z"/>
                  </svg>
                  <span>카카오 로그인</span>
                </>
              )}
            </button>
          )}
          
          {error && (
            <div className="mt-4 text-red-500 text-sm text-center">{error}</div>
          )}
        </div>
      </div>

      {showTermsModal && (
        <TermsAgreementModal
          onAgree={handleTermsAgree}
          onClose={() => {
            setShowTermsModal(false)
            setPendingRedirect(null)
            setLoading(false)
          }}
        />
      )}
    </div>
  )
}

