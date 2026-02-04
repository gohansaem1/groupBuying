'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthChange, getCurrentUserProfile, setNickname } from '@/lib/firebase/auth'
import { User } from 'firebase/auth'

export default function SetupNicknamePage() {
  const router = useRouter()
  const [nickname, setNicknameValue] = useState('')
  const [checking, setChecking] = useState(false)
  const [available, setAvailable] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      setUser(user)
      if (user) {
        const profile = await getCurrentUserProfile()
        setUserProfile(profile)
        // 이미 닉네임이 있으면 홈으로 리다이렉트
        if (profile?.nickname) {
          router.push('/')
        }
      } else {
        router.push('/login')
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  const checkNickname = async () => {
    if (!nickname.trim()) {
      setError('닉네임을 입력해주세요.')
      setAvailable(null)
      return
    }

    const trimmedNickname = nickname.trim()
    if (trimmedNickname.length < 2 || trimmedNickname.length > 20) {
      setError('닉네임은 2자 이상 20자 이하여야 합니다.')
      setAvailable(false)
      return
    }

    setChecking(true)
    setError(null)
    setAvailable(null)

    try {
      const response = await fetch('/api/auth/check-nickname', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nickname: trimmedNickname }),
      })

      const data = await response.json()

      if (data.available) {
        setAvailable(true)
        setError(null)
      } else {
        setAvailable(false)
        setError(data.message || '이미 사용 중인 닉네임입니다.')
      }
    } catch (err: any) {
      setError('닉네임 확인 중 오류가 발생했습니다.')
      setAvailable(false)
    } finally {
      setChecking(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!available || !nickname.trim()) {
      setError('사용 가능한 닉네임을 확인해주세요.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await setNickname(nickname.trim())
      router.push('/')
    } catch (err: any) {
      setError(err.message || '닉네임 설정에 실패했습니다.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-lg text-gray-600">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          {/* 헤더 */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              닉네임 설정
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              다른 사용자들과 구분할 수 있는 닉네임을 설정해주세요
            </p>
          </div>

          {/* 폼 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-2">
                닉네임
              </label>
              <div className="flex gap-2">
                <input
                  id="nickname"
                  type="text"
                  value={nickname}
                  onChange={(e) => {
                    setNicknameValue(e.target.value)
                    setAvailable(null)
                    setError(null)
                  }}
                  placeholder="2-20자, 한글/영문/숫자"
                  maxLength={20}
                  className="flex-1 px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={checkNickname}
                  disabled={checking || !nickname.trim() || submitting}
                  className="px-4 sm:px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {checking ? '확인 중...' : '중복 확인'}
                </button>
              </div>
              
              {/* 닉네임 상태 표시 */}
              {available === true && (
                <div className="mt-2 flex items-center text-sm text-green-600">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  사용 가능한 닉네임입니다
                </div>
              )}
              {available === false && (
                <div className="mt-2 flex items-center text-sm text-red-600">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {error || '이미 사용 중인 닉네임입니다'}
                </div>
              )}
              {error && available === null && (
                <div className="mt-2 text-sm text-red-600">{error}</div>
              )}
              
              <p className="mt-2 text-xs text-gray-500">
                • 2자 이상 20자 이하<br />
                • 한글, 영문, 숫자, 언더스코어(_), 하이픈(-)만 사용 가능
              </p>
            </div>

            <button
              type="submit"
              disabled={!available || submitting}
              className="w-full py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/50"
            >
              {submitting ? '설정 중...' : '닉네임 설정 완료'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}



