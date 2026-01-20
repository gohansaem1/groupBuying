'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import { getCurrentUserProfile, cancelOrganizerApplication } from '@/lib/firebase/auth'
import { getOrganizerRecruitmentStatus } from '@/lib/firebase/admin'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import NavigationHeader from '@/components/NavigationHeader'

export default function ApplyOrganizerPage() {
  const router = useRouter()
  const [userProfile, setUserProfile] = useState<any>(null)
  const [recruitmentEnabled, setRecruitmentEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [profile, enabled] = await Promise.all([
        getCurrentUserProfile(),
        getOrganizerRecruitmentStatus()
      ])
      setUserProfile(profile)
      setRecruitmentEnabled(enabled)
    } catch (error) {
      console.error('데이터 로드 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async () => {
    if (!userProfile) return
    
    // 이미 신청한 경우 방지
    if (userProfile.role === 'organizer_pending' || userProfile.role === 'organizer') {
      alert('이미 신청하셨거나 승인되었습니다.')
      router.push('/')
      return
    }
    
    setSubmitting(true)
    try {
      const userRef = doc(db, 'users', userProfile.uid)
      await updateDoc(userRef, {
        role: 'organizer_pending',
        updatedAt: serverTimestamp(),
      })
      
      alert('Organizer 신청이 완료되었습니다. 관리자 승인을 기다려주세요.')
      router.push('/')
    } catch (error) {
      console.error('신청 오류:', error)
      alert('신청에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    )
  }

  if (!recruitmentEnabled) {
    return (
      <AuthGuard allowedRoles={['user']}>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
            <h1 className="text-xl font-bold mb-4">신청 불가</h1>
            <p className="text-gray-600 mb-6">
              현재 Organizer 모집이 중단되었습니다.
            </p>
            <button
              onClick={() => router.push('/products')}
              className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
            >
              상품 목록으로
            </button>
          </div>
        </div>
      </AuthGuard>
    )
  }

  // organizer 역할이면 홈으로 리다이렉트
  if (userProfile?.role === 'organizer') {
    router.push('/')
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-bold mb-4">이미 승인되었습니다</h1>
          <p className="text-gray-600 mb-6">
            이미 Organizer로 승인되었습니다.
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 font-semibold"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  // organizer_pending 역할이면 취소 가능한 안내 페이지 표시
  if (userProfile?.role === 'organizer_pending') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <NavigationHeader userProfile={userProfile} currentPage="home" />
        <div className="min-h-screen flex items-center justify-center px-4 py-8">
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                승인 대기 중
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                Organizer 신청이 완료되었습니다. 관리자 승인을 기다려주세요.
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-yellow-800">
                승인 후 공동구매 건을 생성하고 관리할 수 있습니다.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={async () => {
                  if (!confirm('정말로 Organizer 신청을 취소하시겠습니까? 취소하면 다시 신청할 수 있습니다.')) {
                    return
                  }
                  
                  setCancelling(true)
                  try {
                    await cancelOrganizerApplication()
                    alert('신청이 취소되었습니다.')
                    router.push('/')
                  } catch (err: any) {
                    alert(err.message || '신청 취소에 실패했습니다.')
                  } finally {
                    setCancelling(false)
                  }
                }}
                disabled={cancelling}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 sm:py-4 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center"
              >
                {cancelling ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    취소 중...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    신청 취소하기
                  </>
                )}
              </button>
              <button
                onClick={() => router.push('/')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 sm:py-4 px-4 rounded-xl transition-colors"
              >
                홈으로 돌아가기
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AuthGuard allowedRoles={['user']}>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
          <h1 className="text-xl font-bold mb-4">Organizer 신청</h1>
          <p className="text-gray-600 mb-6">
            Organizer가 되시면 공동구매 그룹을 생성하고 관리할 수 있습니다.
            신청 후 관리자 승인이 필요합니다.
          </p>
          <div className="space-y-4">
            <button
              onClick={handleApply}
              disabled={submitting}
              className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {submitting ? '신청 중...' : '신청하기'}
            </button>
            <button
              onClick={() => router.push('/products')}
              className="w-full bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400"
            >
              취소
            </button>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}

