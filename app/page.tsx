'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthChange, signOut, cancelOrganizerApplication } from '@/lib/firebase/auth'
import { User } from 'firebase/auth'
import { getCurrentUserProfile, UserProfile } from '@/lib/firebase/auth'
import { getOrganizerRecruitmentStatus } from '@/lib/firebase/admin'
import { isFirebaseInitialized, getFirebaseInitError } from '@/lib/firebase/config'
import NavigationHeader from '@/components/NavigationHeader'

export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [recruitmentEnabled, setRecruitmentEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [firebaseError, setFirebaseError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    // Firebase 초기화 상태 확인
    if (!isFirebaseInitialized()) {
      const initError = getFirebaseInitError()
      if (initError) {
        console.error('[홈 페이지] Firebase 초기화 실패:', initError.message)
        setFirebaseError(initError.message)
      } else {
        console.warn('[홈 페이지] Firebase가 초기화되지 않았습니다.')
        setFirebaseError('Firebase가 초기화되지 않았습니다. 환경 변수를 확인하세요.')
      }
      // Firebase 초기화 실패 시에도 기본 UI 표시
      setLoading(false)
      return
    }

    let unsubscribe: (() => void) | null = null
    let isMounted = true

    try {
      unsubscribe = onAuthChange(async (user) => {
        if (!isMounted) return
        
        setUser(user)
        if (user) {
          try {
            const [profile, recruitmentStatus] = await Promise.all([
              getCurrentUserProfile(),
              getOrganizerRecruitmentStatus()
            ])
            if (!isMounted) return
            
            setUserProfile(profile)
            setRecruitmentEnabled(recruitmentStatus)
            
            // 닉네임이 없으면 닉네임 설정 페이지로 리다이렉트
            if (profile && !profile.nickname && window.location.pathname !== '/setup-nickname') {
              router.push('/setup-nickname')
              return
            }
          } catch (error: any) {
            console.error('[홈 페이지] 프로필 로드 실패:', error)
            if (!isMounted) return
            setFirebaseError(`프로필 로드 실패: ${error.message}`)
          }
        } else {
          setUserProfile(null)
          setRecruitmentEnabled(false)
        }
        if (isMounted) {
          setLoading(false)
        }
      })
    } catch (error: any) {
      console.error('[홈 페이지] onAuthChange 설정 실패:', error)
      setFirebaseError(`인증 초기화 실패: ${error.message}`)
      setLoading(false)
    }

    // Firebase 응답이 느릴 때 3초 후 로딩 해제 (접속 지연 완화)
    const fallbackTimer = setTimeout(() => {
      if (isMounted) {
        console.warn('[홈 페이지] Firebase 응답 지연으로 인해 로딩 상태를 해제합니다.')
        setLoading(false)
      }
    }, 3000)

    return () => {
      isMounted = false
      if (unsubscribe) {
        unsubscribe()
      }
      clearTimeout(fallbackTimer)
    }
  }, [router])

  const handleLogin = () => {
    router.push('/login')
  }

  // Firebase 에러가 있으면 에러 메시지와 함께 기본 UI 표시
  if (firebaseError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Firebase 초기화 오류</h2>
            <p className="text-sm text-red-700 mb-2">{firebaseError}</p>
            <p className="text-xs text-red-600">
              Vercel 대시보드에서 NEXT_PUBLIC_FIREBASE_* 환경 변수가 설정되어 있는지 확인하세요.
            </p>
          </div>
          
          {/* 기본 UI는 계속 표시 */}
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              제주 공동구매 플랫폼
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600 mb-6 sm:mb-8">
              함께 모여 더 저렴하게! 제주 지역 공동구매 서비스
            </p>
            <button
              onClick={handleLogin}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 sm:py-4 px-6 sm:px-8 rounded-xl transition-all text-base sm:text-lg shadow-lg shadow-blue-500/50"
            >
              시작하기
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 로딩 중 - 최대 3초만 표시
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationHeader userProfile={null} currentPage="home" />
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg text-gray-600 mb-2">로딩 중...</div>
            <p className="text-sm text-gray-500">잠시만 기다려주세요</p>
          </div>
        </div>
      </div>
    )
  }

  // 로그인하지 않은 사용자 - 홈 화면 표시
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationHeader userProfile={null} currentPage="home" />

        {/* 메인 콘텐츠 */}
        <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8 lg:py-12">
          {/* 히어로 섹션 */}
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              제주 공동구매 플랫폼
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600 mb-6 sm:mb-8">
              함께 모여 더 저렴하게! 제주 지역 공동구매 서비스
            </p>
            <button
              onClick={handleLogin}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 sm:py-4 px-6 sm:px-8 rounded-xl transition-all text-base sm:text-lg shadow-lg shadow-blue-500/50"
            >
              시작하기
            </button>
          </div>

          {/* 주요 기능 소개 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
            <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-5 sm:p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">간편한 참여</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                진행자가 공유한 링크로 쉽게 공동구매에 참여할 수 있습니다.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-5 sm:p-6">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">합리적인 가격</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                많은 사람이 함께 모여 더 저렴한 가격으로 상품을 구매할 수 있습니다.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-5 sm:p-6 sm:col-span-2 lg:col-span-1">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">진행자 지원</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                진행자가 되어 공동구매를 주최하고 관리할 수 있습니다.
              </p>
            </div>
          </div>

          {/* 공동구매 참여 안내 */}
          <div className="bg-white rounded-xl shadow-md p-6 sm:p-8 mb-6">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6 text-center">
              공동구매 참여 방법
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-600">1</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">링크 받기</h4>
                <p className="text-sm text-gray-600">
                  진행자가 공유한 공동구매 건 링크를 받으세요
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-600">2</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">로그인하기</h4>
                <p className="text-sm text-gray-600">
                  카카오 로그인으로 간편하게 로그인하세요
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-600">3</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">주문하기</h4>
                <p className="text-sm text-gray-600">
                  원하는 수량을 선택하고 주문을 완료하세요
                </p>
              </div>
            </div>
          </div>

          {/* CTA 섹션 */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-6 sm:p-8 text-center text-white">
            <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">지금 시작하세요</h3>
            <p className="text-blue-100 mb-5 sm:mb-6 text-sm sm:text-base">
              카카오 로그인으로 간편하게 가입하고 공동구매에 참여하세요
            </p>
            <button
              onClick={handleLogin}
              className="bg-white text-blue-600 hover:bg-gray-100 font-semibold py-3 sm:py-4 px-6 sm:px-8 rounded-xl transition-all text-base sm:text-lg shadow-lg"
            >
              로그인하기
            </button>
          </div>
        </main>
      </div>
    )
  }

  // 로그인한 모든 사용자(관리자, 진행자, organizer_pending, 일반 사용자) 홈 페이지 표시
  if (!loading && user && userProfile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationHeader 
          userProfile={userProfile} 
          currentPage="home"
          onProfileUpdate={async (updatedProfile) => {
            setUserProfile(updatedProfile)
          }}
        />
        {userProfile.role === 'organizer_pending' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2">
              <span className="inline-flex items-center text-sm font-medium text-yellow-800">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                승인 요청 중입니다. 관리자 승인 후 진행자 기능을 사용할 수 있습니다.
              </span>
            </div>
          </div>
        )}

        {/* 메인 콘텐츠 */}
        <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8">
          {/* 환영 메시지 */}
          <div className="mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              안녕하세요, {userProfile.nickname || userProfile.displayName || '사용자'}님!
            </h2>
            <p className="text-sm sm:text-base text-gray-600">
              제주 공동구매 플랫폼에 오신 것을 환영합니다.
            </p>
          </div>

          {/* 홍보형 배너 섹션 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {/* 간편한 참여 */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-md hover:shadow-lg transition-shadow p-5 sm:p-6 border border-blue-200">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">간편한 참여</h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                진행자가 공유한 링크로 쉽게 공동구매에 참여할 수 있습니다.
              </p>
            </div>

            {/* 합리적인 가격 */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-md hover:shadow-lg transition-shadow p-5 sm:p-6 border border-green-200">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">합리적인 가격</h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                많은 사람이 함께 모여 더 저렴한 가격으로 상품을 구매할 수 있습니다.
              </p>
            </div>

            {/* 진행자 지원 */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-md hover:shadow-lg transition-shadow p-5 sm:p-6 border border-purple-200 md:col-span-2 lg:col-span-1">
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">진행자 지원</h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                공동구매를 주도하는 진행자를 위한 다양한 기능과 지원을 제공합니다.
              </p>
            </div>
          </div>


          {/* Organizer 신청 섹션 */}
          {recruitmentEnabled && userProfile.role === 'user' && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-md hover:shadow-lg transition-shadow p-5 sm:p-6 border border-blue-200">
              <div className="flex items-start space-x-3 sm:space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                    진행자(Organizer)가 되어보세요
                  </h3>
                  <p className="text-sm sm:text-base text-gray-700 mb-3 sm:mb-4">
                    공동구매 건을 생성하고 관리할 수 있는 진행자가 되시면 더 많은 혜택을 받으실 수 있습니다.
                  </p>
                  <div className="space-y-2 mb-3 sm:mb-4">
                    <div className="flex items-center text-xs sm:text-sm text-gray-700">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      공동구매 건 생성 및 관리
                    </div>
                    <div className="flex items-center text-xs sm:text-sm text-gray-700">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      주문 관리 및 확인
                    </div>
                    <div className="flex items-center text-xs sm:text-sm text-gray-700">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      링크 공유 및 참여자 모집
                    </div>
                  </div>
                  <button
                    onClick={() => router.push('/organizer/apply')}
                    className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl transition-all inline-flex items-center justify-center text-sm sm:text-base shadow-md shadow-blue-500/50"
                  >
                    <span>Organizer 신청하기</span>
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* 승인 대기 중 안내 */}
          {userProfile.role === 'organizer_pending' && (
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl shadow-md p-5 sm:p-6 border border-yellow-200">
              <div className="flex items-start space-x-3 sm:space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                    Organizer 신청 완료
                  </h3>
                  <p className="text-sm sm:text-base text-gray-700 mb-4">
                    Organizer 신청이 완료되었습니다. 관리자 승인을 기다려주세요. 승인 후 공동구매 건을 생성할 수 있습니다.
                  </p>
                  <button
                    onClick={async () => {
                      if (!confirm('정말로 Organizer 신청을 취소하시겠습니까?')) {
                        return
                      }
                      
                      setCancelling(true)
                      try {
                        await cancelOrganizerApplication()
                        alert('신청이 취소되었습니다.')
                        // 프로필 다시 로드
                        const profile = await getCurrentUserProfile()
                        setUserProfile(profile)
                      } catch (err: any) {
                        alert(err.message || '신청 취소에 실패했습니다.')
                      } finally {
                        setCancelling(false)
                      }
                    }}
                    disabled={cancelling}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 sm:py-2.5 px-4 sm:px-6 rounded-xl transition-colors inline-flex items-center text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {cancelling ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        취소 중...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        신청 취소
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-lg">로딩 중...</div>
    </div>
  )
}

