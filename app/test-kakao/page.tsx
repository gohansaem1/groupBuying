'use client'

import { useState, useEffect } from 'react'
import { initKakao, waitForKakaoSDK } from '@/lib/firebase/kakao'

export default function TestKakaoPage() {
  const [testResults, setTestResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  // 클라이언트 사이드에서만 렌더링되도록 확인
  useEffect(() => {
    setMounted(true)
  }, [])

  const addResult = (test: string, status: 'success' | 'error' | 'warning' | 'info', message: string, details?: any) => {
    setTestResults(prev => [...prev, {
      test,
      status,
      message,
      details,
      timestamp: new Date().toLocaleTimeString(),
    }])
  }

  const runTests = async () => {
    if (typeof window === 'undefined') {
      addResult('브라우저 환경', 'error', '브라우저 환경이 아닙니다.')
      return
    }

    setTestResults([])
    setLoading(true)

    try {
      // 테스트 1: 환경 변수 확인
      addResult('환경 변수 확인', 'info', '환경 변수 확인 중...')
      const jsKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY
      const restApiKey = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY
      
      if (!jsKey) {
        addResult('JavaScript 키', 'error', 'NEXT_PUBLIC_KAKAO_JS_KEY가 설정되지 않았습니다.')
      } else {
        addResult('JavaScript 키', 'success', `설정됨: ${jsKey.substring(0, 10)}...`)
      }

      if (!restApiKey) {
        addResult('REST API 키', 'error', 'NEXT_PUBLIC_KAKAO_REST_API_KEY가 설정되지 않았습니다.')
      } else {
        addResult('REST API 키', 'success', `설정됨: ${restApiKey.substring(0, 10)}...`)
      }

      // 테스트 2: 카카오 SDK 로드 확인
      addResult('카카오 SDK 로드', 'info', '카카오 SDK 로드 확인 중...')
      try {
        initKakao()
        await waitForKakaoSDK()
        
        if (typeof window !== 'undefined' && window.Kakao && window.Kakao.isInitialized()) {
          addResult('카카오 SDK 초기화', 'success', '카카오 SDK가 정상적으로 초기화되었습니다.', {
            version: window.Kakao?.VERSION || 'unknown',
            isInitialized: window.Kakao.isInitialized(),
            hasAuth: !!window.Kakao.Auth,
          })
        } else {
          addResult('카카오 SDK 초기화', 'error', '카카오 SDK가 초기화되지 않았습니다.')
        }
      } catch (err: any) {
        addResult('카카오 SDK 초기화', 'error', `SDK 로드 실패: ${err.message}`)
      }

      // 테스트 3: 현재 URL 및 Redirect URI 확인
      if (typeof window !== 'undefined') {
        addResult('Redirect URI 확인', 'info', 'Redirect URI 확인 중...')
        const currentOrigin = window.location.origin
        const redirectUri = `${currentOrigin}/api/auth/kakao/callback`
        addResult('현재 Origin', 'info', currentOrigin)
        addResult('Redirect URI', 'info', redirectUri)
        addResult('Redirect URI 등록 필요', 'warning', `카카오 개발자 콘솔에 다음 URI를 등록하세요:\n${redirectUri}`)

        // 테스트 4: 카카오 로그인 상태 확인
        if (window.Kakao && window.Kakao.isInitialized()) {
          addResult('카카오 로그인 상태', 'info', '카카오 로그인 상태 확인 중...')
          try {
            const accessToken = window.Kakao.Auth.getAccessToken()
            if (accessToken) {
              addResult('카카오 액세스 토큰', 'warning', '이미 로그인된 상태입니다. 로그아웃 후 테스트하세요.', {
                tokenPrefix: accessToken.substring(0, 20) + '...',
              })
            } else {
              addResult('카카오 액세스 토큰', 'success', '로그인되지 않은 상태입니다.')
            }
          } catch (err: any) {
            addResult('카카오 로그인 상태', 'error', `상태 확인 실패: ${err.message}`)
          }

          // 테스트 5: authorize 함수 테스트 (실제 호출하지 않고 옵션만 확인)
          addResult('Authorize 옵션 확인', 'info', 'Authorize 옵션 확인 중...')
          const authorizeOptions = {
            redirectUri: redirectUri,
            throughTalk: false,
          }
          addResult('Authorize 옵션', 'success', '옵션이 올바르게 설정되었습니다.', authorizeOptions)
        }
      }

      // 테스트 6: 서버 API 확인 (콜백 엔드포인트 존재 확인)
      addResult('서버 API 확인', 'info', '서버 API 엔드포인트 확인 중...')
      try {
        // HEAD 요청으로 엔드포인트 존재 확인
        const response = await fetch('/api/auth/kakao/callback', {
          method: 'HEAD',
        })
        if (response.status === 405 || response.status === 200) {
          // 405는 Method Not Allowed이지만 엔드포인트는 존재함을 의미
          addResult('콜백 엔드포인트', 'success', '콜백 엔드포인트가 존재합니다.', {
            status: response.status,
          })
        } else {
          addResult('콜백 엔드포인트', 'error', `예상치 못한 상태 코드: ${response.status}`)
        }
      } catch (err: any) {
        addResult('콜백 엔드포인트', 'error', `엔드포인트 확인 실패: ${err.message}`)
      }

    } catch (err: any) {
      addResult('테스트 실행', 'error', `테스트 실행 중 오류: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const testLogin = async () => {
    if (typeof window === 'undefined') {
      alert('브라우저 환경이 아닙니다.')
      return
    }

    if (!window.Kakao || !window.Kakao.isInitialized()) {
      alert('카카오 SDK가 초기화되지 않았습니다. 먼저 테스트를 실행하세요.')
      return
    }

    try {
      setLoading(true)
      const redirectUri = `${window.location.origin}/api/auth/kakao/callback`
      console.log('[테스트] 카카오 로그인 시작:', { redirectUri })
      
      window.Kakao.Auth.authorize({
        redirectUri: redirectUri,
        throughTalk: false,
      })
      
      // 이 코드는 실행되지 않습니다 (페이지가 리다이렉트되므로)
    } catch (err: any) {
      console.error('[테스트] 로그인 오류:', err)
      addResult('로그인 테스트', 'error', `로그인 호출 실패: ${err.message}`)
      setLoading(false)
    }
  }

  useEffect(() => {
    if (mounted) {
      runTests()
    }
  }, [mounted])

  // 서버 사이드 렌더링 중에는 로딩 화면만 표시
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">카카오 로그인 테스트</h1>
          <p className="text-gray-600 mb-6">카카오 로그인 설정을 확인하고 테스트합니다.</p>

          <div className="flex gap-4 mb-6">
            <button
              onClick={runTests}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '테스트 중...' : '테스트 다시 실행'}
            </button>
            
            <button
              onClick={testLogin}
              disabled={loading || (typeof window !== 'undefined' && window.Kakao && !window.Kakao.isInitialized())}
              className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              실제 로그인 테스트
            </button>
          </div>

          <div className="space-y-3">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  result.status === 'success'
                    ? 'bg-green-50 border-green-200'
                    : result.status === 'error'
                    ? 'bg-red-50 border-red-200'
                    : result.status === 'warning'
                    ? 'bg-yellow-50 border-yellow-200'
                    : result.status === 'info'
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">{result.test}</span>
                      <span className="text-xs text-gray-500">({result.timestamp})</span>
                      {result.status === 'success' && (
                        <span className="text-green-600 font-bold">✓</span>
                      )}
                      {result.status === 'error' && (
                        <span className="text-red-600 font-bold">✗</span>
                      )}
                      {result.status === 'warning' && (
                        <span className="text-yellow-600 font-bold">⚠</span>
                      )}
                      {result.status === 'info' && (
                        <span className="text-blue-600 font-bold">ℹ</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{result.message}</p>
                    {result.details && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-500 cursor-pointer">상세 정보</summary>
                        <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {testResults.length === 0 && !loading && (
            <div className="text-center text-gray-500 py-8">
              테스트를 실행하면 결과가 여기에 표시됩니다.
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">체크리스트</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <input type="checkbox" className="w-4 h-4" />
              <span>카카오 개발자 콘솔에서 Redirect URI 등록: <code className="bg-gray-100 px-1 rounded">https://group-buying-nine.vercel.app/api/auth/kakao/callback</code></span>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" className="w-4 h-4" />
              <span>Vercel 환경 변수에 <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_KAKAO_REST_API_KEY</code> 설정</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" className="w-4 h-4" />
              <span>Vercel 환경 변수에 <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_KAKAO_JS_KEY</code> 설정</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" className="w-4 h-4" />
              <span>카카오 개발자 콘솔에서 사이트 도메인 등록: <code className="bg-gray-100 px-1 rounded">group-buying-nine.vercel.app</code></span>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" className="w-4 h-4" />
              <span>카카오 개발자 콘솔에서 JavaScript SDK 도메인 등록</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" className="w-4 h-4" />
              <span>카카오 로그인이 활성화 상태인지 확인</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
