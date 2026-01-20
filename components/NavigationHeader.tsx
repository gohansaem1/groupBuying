'use client'

import { useRouter } from 'next/navigation'
import { UserProfile } from '@/lib/firebase/auth'
import { signOut } from '@/lib/firebase/auth'

interface NavigationHeaderProps {
  userProfile: UserProfile | null
  currentPage?: 'admin' | 'organizer' | 'home' | 'group' | 'my-orders'
}

export default function NavigationHeader({ userProfile, currentPage }: NavigationHeaderProps) {
  const router = useRouter()

  const handleLogout = async () => {
    await signOut()
    router.push('/')
  }

  const isAdmin = userProfile?.role === 'admin'
  const isOrganizer = userProfile?.role === 'organizer'
  const isOrganizerPending = userProfile?.role === 'organizer_pending'

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2 sm:space-x-4 lg:space-x-6 min-w-0">
            <button
              onClick={() => router.push('/')}
              className="text-base sm:text-lg lg:text-xl font-bold truncate hover:text-blue-600 transition-colors cursor-pointer"
            >
              제주 공동구매
            </button>
            {userProfile && (
              <nav className="hidden sm:flex items-center space-x-2 lg:space-x-4">
                {/* 관리자 대시보드 링크 */}
                {isAdmin && (
                  <button
                    onClick={() => router.push('/admin')}
                    className={`text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all font-medium ${
                      currentPage === 'admin'
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-purple-50 text-purple-700 hover:bg-purple-100 hover:shadow-sm'
                    }`}
                  >
                    <span className="inline-flex items-center">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      관리자
                    </span>
                  </button>
                )}

                {/* 진행자 대시보드 링크 - 승인된 진행자만 */}
                {isOrganizer && (
                  <button
                    onClick={() => router.push('/organizer')}
                    className={`text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all font-medium ${
                      currentPage === 'organizer'
                        ? 'bg-green-600 text-white shadow-md'
                        : 'bg-green-50 text-green-700 hover:bg-green-100 hover:shadow-sm'
                    }`}
                  >
                    <span className="inline-flex items-center">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="hidden lg:inline">진행자 대시보드</span>
                      <span className="lg:hidden">진행자</span>
                    </span>
                  </button>
                )}
                {/* 승인 요청 중인 경우 비활성화된 버튼 표시 */}
                {isOrganizerPending && (
                  <button
                    disabled
                    className="text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors opacity-50 cursor-not-allowed bg-gray-100 text-gray-400"
                    title="승인 대기 중입니다"
                  >
                    진행자
                  </button>
                )}
              </nav>
            )}
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            {userProfile && (
              <>
                {/* 닉네임 및 내 주문 내역 버튼 */}
                <div className="hidden sm:flex items-center space-x-2">
                  <button
                    onClick={() => router.push('/profile')}
                    className="text-xs sm:text-sm text-gray-700 font-medium hover:text-blue-600 transition-colors inline-flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {userProfile.nickname || userProfile.displayName || '사용자'}님
                  </button>
                  <span className="text-gray-300 mx-1">|</span>
                  <button
                    onClick={() => {
                      // 역할에 따라 다른 경로로 이동
                      if (userProfile.role === 'organizer' || userProfile.role === 'organizer_pending') {
                        router.push('/organizer/my-orders')
                      } else {
                        // 일반 사용자나 관리자는 홈으로 (헤더에서 내 주문 내역은 진행자만 별도 페이지)
                        router.push('/')
                      }
                    }}
                    className={`text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all font-medium ${
                      currentPage === 'my-orders'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100 hover:shadow-sm'
                    }`}
                  >
                    <span className="inline-flex items-center">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      내 주문 내역
                    </span>
                  </button>
                </div>
                {/* 모바일: 프로필 아이콘만 표시 */}
                <button
                  onClick={() => router.push('/profile')}
                  className="text-xs sm:text-sm text-gray-600 hover:text-gray-900 px-2 sm:px-3 py-1 rounded-lg hover:bg-gray-100 transition-colors sm:hidden"
                  title="프로필"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </button>
                {/* 모바일: 진행자 대시보드 버튼 */}
                {isOrganizer && (
                  <button
                    onClick={() => router.push('/organizer')}
                    className="text-xs sm:text-sm text-gray-600 hover:text-gray-900 px-2 sm:px-3 py-1 rounded-lg hover:bg-gray-100 transition-colors sm:hidden"
                    title="진행자 대시보드"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                )}
                {/* 모바일: 내 주문 내역 버튼 */}
                <button
                  onClick={() => {
                    if (userProfile.role === 'organizer' || userProfile.role === 'organizer_pending') {
                      router.push('/organizer/my-orders')
                    } else {
                      router.push('/')
                    }
                  }}
                  className="text-xs sm:text-sm text-gray-600 hover:text-gray-900 px-2 sm:px-3 py-1 rounded-lg hover:bg-gray-100 transition-colors sm:hidden"
                  title="내 주문 내역"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>
              </>
            )}
            {userProfile && (
              <button
                onClick={handleLogout}
                className="text-xs sm:text-sm text-gray-600 hover:text-gray-900 px-2 sm:px-3 py-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                로그아웃
              </button>
            )}
            {!userProfile && (
              <button
                onClick={() => router.push('/login')}
                className="text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors"
              >
                로그인
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

