'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth, isFirebaseInitialized, getFirebaseInitError } from '@/lib/firebase/config'

export default function AdminLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [firebaseError, setFirebaseError] = useState<string | null>(null)
  // 로그인 페이지는 가드 로직 없이 항상 폼을 표시

  // Firebase 초기화 상태 확인
  useEffect(() => {
    if (!isFirebaseInitialized()) {
      const initError = getFirebaseInitError()
      if (initError) {
        console.error('[관리자 로그인] Firebase 초기화 실패:', initError.message)
        setFirebaseError(initError.message)
      } else {
        console.warn('[관리자 로그인] Firebase가 초기화되지 않았습니다.')
        setFirebaseError('Firebase가 초기화되지 않았습니다. 환경 변수를 확인하세요.')
      }
    }
  }, [])

  // URL 쿼리에서 에러 파라미터 확인
  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam === 'session_invalid') {
      setError('세션이 만료되었거나 유효하지 않습니다. 다시 로그인해주세요.')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Firebase 초기화 확인
    if (!isFirebaseInitialized() || !auth) {
      const initError = getFirebaseInitError()
      setError(initError?.message || 'Firebase가 초기화되지 않았습니다. 환경 변수를 확인하세요.')
      setLoading(false)
      return
    }

    try {
      // Firebase Client SDK로 이메일/비밀번호 로그인
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const idToken = await userCredential.user.getIdToken()

      // 세션 쿠키 생성 API 호출
      const response = await fetch('/api/admin/sessionLogin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '로그인에 실패했습니다.')
      }

      // 오너 계정의 Firestore 프로필 확인/생성
      try {
        const profileResponse = await fetch('/api/admin/ensureProfile', {
          method: 'POST',
        })
        
        if (profileResponse.ok) {
          const profileData = await profileResponse.json()
          if (profileData.created) {
            console.log('[관리자 로그인] 오너 계정 프로필이 생성되었습니다.')
          }
        } else {
          console.warn('[관리자 로그인] 프로필 확인 실패 (계속 진행):', await profileResponse.text())
        }
      } catch (profileError) {
        console.warn('[관리자 로그인] 프로필 확인 중 오류 (계속 진행):', profileError)
      }

      // 로그인 성공 시 /admin으로 이동 (또는 redirect 파라미터가 있으면 해당 경로로)
      const redirect = new URLSearchParams(window.location.search).get('redirect') || '/admin'
      router.replace(redirect)
    } catch (err: any) {
      console.error('[관리자 로그인] 오류:', err)
      setError(err.message || '로그인에 실패했습니다.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">관리자 로그인</h1>
            <p className="mt-2 text-sm text-gray-600">오너 계정 아이디/비밀번호로 로그인하세요</p>
          </div>

          {firebaseError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-6">
              <h3 className="text-sm font-semibold text-red-800 mb-1">Firebase 초기화 오류</h3>
              <p className="text-xs text-red-700 mb-2">{firebaseError}</p>
              <p className="text-xs text-red-600">
                Vercel 대시보드에서 NEXT_PUBLIC_FIREBASE_* 환경 변수가 설정되어 있는지 확인하세요.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                아이디
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="아이디 (이메일 형식)"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="비밀번호"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
