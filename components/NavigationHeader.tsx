'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UserProfile, getCurrentUserProfile } from '@/lib/firebase/auth'
import { signOut } from '@/lib/firebase/auth'
import ProfileModal from './ProfileModal'

interface NavigationHeaderProps {
  userProfile: UserProfile | null
  currentPage?: 'admin' | 'organizer' | 'home' | 'group' | 'my-orders' | 'my-groups'
  onProfileUpdate?: (profile: UserProfile) => void
}

export default function NavigationHeader({ userProfile: propUserProfile, currentPage, onProfileUpdate }: NavigationHeaderProps) {
  const router = useRouter()
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(propUserProfile)

  // propUserProfile이 변경되면 내부 상태도 업데이트
  useEffect(() => {
    setUserProfile(propUserProfile)
  }, [propUserProfile])

  const handleLogout = async () => {
    // 관리자 페이지인 경우 관리자 로그아웃 API 호출 (세션 쿠키 삭제)
    // 오너 계정은 세션 쿠키 기반 인증을 사용하므로 별도 로그아웃 필요
    if (currentPage === 'admin') {
      try {
        const response = await fetch('/api/admin/logout', {
          method: 'POST',
        })
        
        if (response.ok) {
          router.push('/admin/login')
        } else {
          console.error('관리자 로그아웃 실패:', await response.text())
          alert('로그아웃에 실패했습니다.')
        }
      } catch (error) {
        console.error('관리자 로그아웃 오류:', error)
        alert('로그아웃 중 오류가 발생했습니다.')
      }
      return
    }
    
    // 일반 사용자 로그아웃 (Firebase Auth)
    await signOut()
    router.push('/')
  }

  const isAdmin = userProfile?.role === 'admin'
  const isOrganizer = userProfile?.role === 'organizer'
  const isOrganizerPending = userProfile?.role === 'organizer_pending'

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2 sm:gap-3 md:gap-4">
          {/* 타이틀 (홈페이지 이름) */}
          <button
            onClick={() => router.push('/')}
            className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer flex-shrink-0"
          >
            <span className="hidden sm:inline">제주 공동구매</span>
            <span className="sm:hidden">제주 공동구매</span>
          </button>

          {/* 중앙 네비게이션 영역 */}
          {userProfile && (
            <div className="flex items-center gap-1 sm:gap-2 md:gap-3 flex-1 justify-center min-w-0 overflow-x-auto">
              {/* 관리자 대시보드 */}
              {isAdmin && (
                <button
                  onClick={() => router.push('/admin')}
                  className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg transition-all font-medium whitespace-nowrap flex-shrink-0 ${
                    currentPage === 'admin'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-purple-50 text-purple-700 hover:bg-purple-100 hover:shadow-sm'
                  }`}
                  title="관리자"
                >
                  <span className="inline-flex items-center">
                    <svg className="w-4 h-4 sm:w-4 sm:h-4 md:mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span className="hidden md:inline">관리자</span>
                  </span>
                </button>
              )}

              {/* 진행자 대시보드 */}
              {isOrganizer && (
                <button
                  onClick={() => router.push('/organizer')}
                  className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg transition-all font-medium whitespace-nowrap flex-shrink-0 ${
                    currentPage === 'organizer'
                      ? 'bg-green-600 text-white shadow-md'
                      : 'bg-green-50 text-green-700 hover:bg-green-100 hover:shadow-sm'
                  }`}
                  title="진행자 대시보드"
                >
                  <span className="inline-flex items-center">
                    <svg className="w-4 h-4 sm:w-4 sm:h-4 md:mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="hidden md:inline">진행자 대시보드</span>
                  </span>
                </button>
              )}

              {/* 내 주문 내역 */}
              <button
                onClick={() => {
                  router.push('/organizer/my-orders')
                }}
                className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg transition-all font-medium whitespace-nowrap flex-shrink-0 ${
                  currentPage === 'my-orders'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100 hover:shadow-sm'
                }`}
                title="내 주문 내역"
              >
                <span className="inline-flex items-center">
                  <svg className="w-4 h-4 sm:w-4 sm:h-4 md:mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="hidden md:inline">내 주문 내역</span>
                </span>
              </button>
              {/* 내 공동구매 목록 */}
              <button
                onClick={() => {
                  router.push('/my-groups')
                }}
                className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg transition-all font-medium whitespace-nowrap flex-shrink-0 ${
                  currentPage === 'my-groups'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-green-50 text-green-700 hover:bg-green-100 hover:shadow-sm'
                }`}
                title="내 공동구매 목록"
              >
                <span className="inline-flex items-center">
                  <svg className="w-4 h-4 sm:w-4 sm:h-4 md:mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span className="hidden md:inline">내 공동구매 목록</span>
                </span>
              </button>
            </div>
          )}

          {/* 우측: 유저네임 및 로그아웃 버튼 */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-3 flex-shrink-0">
            {userProfile && (
              <>
                {/* 데스크톱: 닉네임 표시 */}
                <button
                  onClick={() => setIsProfileModalOpen(true)}
                  className="hidden md:flex items-center gap-2 text-xs sm:text-sm text-gray-700 font-medium hover:text-blue-600 transition-colors px-2 sm:px-3 py-1 rounded-lg hover:bg-gray-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="max-w-[100px] truncate">
                    {userProfile.nickname || userProfile.displayName || '사용자'}님
                  </span>
                </button>
                
                {/* 모바일/태블릿: 프로필 아이콘 */}
                <button
                  onClick={() => setIsProfileModalOpen(true)}
                  className="md:hidden text-gray-600 hover:text-gray-900 px-1.5 sm:px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                  title={userProfile.nickname || userProfile.displayName || '프로필'}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </button>

                {/* 로그아웃 버튼 */}
                <button
                  onClick={handleLogout}
                  className="text-xs sm:text-sm text-gray-600 hover:text-gray-900 px-1.5 sm:px-2 md:px-3 py-1 rounded-lg hover:bg-gray-100 transition-colors whitespace-nowrap"
                >
                  <span className="hidden sm:inline">로그아웃</span>
                  <span className="sm:hidden">로그아웃</span>
                </button>
              </>
            )}
            {!userProfile && (
              <button
                onClick={() => router.push('/login')}
                className="text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg transition-colors whitespace-nowrap"
              >
                로그인
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* 프로필 모달 */}
      {isProfileModalOpen && (
        <ProfileModal
          isOpen={true}
          onClose={() => {
            setIsProfileModalOpen(false)
          }}
          userProfile={userProfile}
          onProfileUpdate={async (updatedProfile) => {
            // NavigationHeader의 userProfile 업데이트
            setUserProfile(updatedProfile)
            
            // 부모 컴포넌트의 콜백 호출
            if (onProfileUpdate) {
              try {
                await onProfileUpdate(updatedProfile)
              } catch (error) {
                console.error('프로필 업데이트 콜백 오류:', error)
              }
            }
          }}
        />
      )}
    </header>
  )
}

