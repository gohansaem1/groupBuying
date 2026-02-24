'use client'

import { useState, useEffect } from 'react'
import { onAuthChange, getCurrentUserProfile, setNickname, UserProfile } from '@/lib/firebase/auth'
import { User } from 'firebase/auth'

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  userProfile: UserProfile | null
  onProfileUpdate?: (profile: UserProfile) => void
}

export default function ProfileModal({ isOpen, onClose, userProfile: initialProfile, onProfileUpdate }: ProfileModalProps) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(initialProfile)
  const [nickname, setNicknameValue] = useState('')
  const [checking, setChecking] = useState(false)
  const [available, setAvailable] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen && initialProfile) {
      setUserProfile(initialProfile)
      setNicknameValue(initialProfile.nickname || '')
      setAvailable(null)
      setError(null)
    }
  }, [isOpen, initialProfile])

  useEffect(() => {
    if (!isOpen) return

    const unsubscribe = onAuthChange(async (user) => {
      setUser(user)
      if (user) {
        const profile = await getCurrentUserProfile()
        setUserProfile(profile)
        if (profile) {
          setNicknameValue(profile.nickname || '')
        }
      }
    })

    return () => unsubscribe()
  }, [isOpen])

  const handleClose = () => {
    // 상태 초기화
    setNicknameValue(initialProfile?.nickname || '')
    setAvailable(null)
    setError(null)
    setSubmitting(false)
    
    // 모달 닫기
    onClose()
  }

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

    // 현재 닉네임과 같으면 확인 불필요
    if (userProfile?.nickname === trimmedNickname) {
      setAvailable(true)
      setError(null)
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
        body: JSON.stringify({ nickname: trimmedNickname, excludeUserId: user?.uid }),
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

    const trimmedNickname = nickname.trim()
    
    if (!trimmedNickname) {
      setError('닉네임을 입력해주세요.')
      return
    }

    if (trimmedNickname.length < 2 || trimmedNickname.length > 20) {
      setError('닉네임은 2자 이상 20자 이하여야 합니다.')
      return
    }

    // 현재 닉네임과 같으면 변경 불필요
    if (userProfile?.nickname === trimmedNickname) {
      setError('변경된 내용이 없습니다.')
      return
    }

    // 중복 확인이 안 되어 있으면 자동으로 확인
    if (available === null || available === false) {
      await checkNickname()
      // 중복 확인 후 다시 확인
      if (available === null || available === false) {
        setError('사용 가능한 닉네임을 확인해주세요.')
        return
      }
    }

    setSubmitting(true)
    setError(null)

    try {
      await setNickname(trimmedNickname, userProfile?.nickname)
      const updatedProfile = await getCurrentUserProfile()
      
      if (!updatedProfile) {
        throw new Error('프로필을 가져올 수 없습니다.')
      }
      
      // 프로필 업데이트 콜백 호출 (모달 닫기 전에)
      if (onProfileUpdate) {
        await onProfileUpdate(updatedProfile)
      }
      
      // 상태 초기화
      setUserProfile(updatedProfile)
      setNicknameValue(updatedProfile.nickname || '')
      setAvailable(null)
      setError(null)
      setSubmitting(false)
      
      // 모달 닫기
      handleClose()
    } catch (err: any) {
      setError(err.message || '닉네임 변경에 실패했습니다.')
      setSubmitting(false)
    }
  }

  // isOpen이 false면 모달을 렌더링하지 않음
  if (!isOpen) {
    // 모달이 닫혀야 하는데 아직 열려있다면 강제로 상태 초기화
    if (submitting || available !== null || error !== null) {
      console.log('모달이 닫혔지만 상태가 초기화되지 않았습니다. 강제 초기화')
      setSubmitting(false)
      setAvailable(null)
      setError(null)
      setNicknameValue(initialProfile?.nickname || '')
    }
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 배경 오버레이 */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={handleClose}
      />
      
      {/* 모달 컨텐츠 */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">프로필 설정</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={submitting}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* 현재 정보 */}
          {userProfile && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">이메일:</span>
                  <span className="font-medium text-gray-900">{userProfile.email || '없음'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">역할:</span>
                  <span className="font-medium text-gray-900">
                    {userProfile.role === 'owner' ? '오너' :
                     userProfile.role === 'admin' ? '관리자' :
                     userProfile.role === 'organizer' ? '진행자' :
                     userProfile.role === 'organizer_pending' ? '승인 요청 중' :
                     '일반 사용자'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">현재 닉네임:</span>
                  <span className="font-medium text-gray-900">{userProfile.nickname || '없음'}</span>
                </div>
              </div>
            </div>
          )}

          {/* 폼 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-2">
                새 닉네임
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
                  disabled={checking || !nickname.trim() || submitting || nickname.trim() === userProfile?.nickname}
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

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting || !nickname.trim() || nickname.trim() === userProfile?.nickname}
                className="flex-1 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/50"
              >
                {submitting ? '변경 중...' : '닉네임 변경'}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-xl transition-colors"
                disabled={submitting}
              >
                취소
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

