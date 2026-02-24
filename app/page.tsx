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
  const [firebaseErrorDetail, setFirebaseErrorDetail] = useState<string | null>(null)
  const [timeoutReached, setTimeoutReached] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  // Firebase 데이터 재로드 함수
  const reloadFirebaseData = async () => {
    if (!user) return
    
    setFirebaseError(null)
    setFirebaseErrorDetail(null)
    setLoading(true)
    
    try {
      const [profile, recruitmentStatus] = await Promise.all([
        getCurrentUserProfile(),
        getOrganizerRecruitmentStatus()
      ])
      
      setUserProfile(profile)
      setRecruitmentEnabled(recruitmentStatus)
      setLoading(false)
      
      // 닉네임이 없으면 닉네임 설정 페이지로 리다이렉트
      if (profile && !profile.nickname && window.location.pathname !== '/setup-nickname') {
        router.push('/setup-nickname')
        return
      }
    } catch (error: any) {
      console.error('[홈 페이지] 프로필 재로드 실패:', error)
      handleFirebaseError(error, '프로필 로드')
      setLoading(false)
    }
  }

  // Firebase 에러 처리 함수
  const handleFirebaseError = (error: any, context: string) => {
    const errorCode = error?.code || error?.errorInfo?.code || 'unknown'
    const errorMessage = error?.message || error?.errorInfo?.message || '알 수 없는 오류'
    
    console.error(`[홈 페이지] ${context} 실패:`, {
      code: errorCode,
      message: errorMessage,
      error: error
    })
    
    // 에러 코드별 메시지 분류
    let userMessage = ''
    let detailMessage = ''
    
    if (errorCode === 'permission-denied' || errorMessage.includes('permission-denied')) {
      userMessage = 'Firestore 권한 오류가 발생했습니다.'
      detailMessage = 'Firestore 보안 규칙을 확인하거나, Firebase Console > Authentication > Authorized domains에 현재 도메인이 등록되어 있는지 확인하세요.'
    } else if (errorCode === 'unavailable' || errorMessage.includes('unavailable')) {
      userMessage = 'Firebase 서비스에 일시적으로 접근할 수 없습니다.'
      detailMessage = '네트워크 연결을 확인하거나 잠시 후 다시 시도해주세요.'
    } else if (errorCode === 'unauthenticated' || errorMessage.includes('unauthenticated')) {
      userMessage = '인증이 필요합니다.'
      detailMessage = 'Firebase Console > Authentication > Authorized domains에 현재 도메인이 등록되어 있는지 확인하세요.'
    } else if (errorMessage.includes('network') || errorMessage.includes('Network')) {
      userMessage = '네트워크 오류가 발생했습니다.'
      detailMessage = '인터넷 연결을 확인하고 다시 시도해주세요.'
    } else {
      userMessage = `${context} 실패: ${errorMessage}`
      detailMessage = `에러 코드: ${errorCode}`
    }
    
    setFirebaseError(userMessage)
    setFirebaseErrorDetail(detailMessage)
  }

  useEffect(() => {
    // Firebase 초기화 상태 확인
    // try-catch로 감싸서 모듈 로드 에러도 처리
    try {
      if (!isFirebaseInitialized()) {
        const initError = getFirebaseInitError()
        if (initError) {
          console.error('[홈 페이지] Firebase 초기화 실패:', initError.message)
          setFirebaseError('Firebase 초기화 실패')
          setFirebaseErrorDetail(initError.message)
        } else {
          console.warn('[홈 페이지] Firebase가 초기화되지 않았습니다.')
          setFirebaseError('Firebase가 초기화되지 않았습니다.')
          setFirebaseErrorDetail('환경 변수를 확인하세요.')
        }
        // Firebase 초기화 실패 시에도 기본 UI 표시
        setLoading(false)
        return
      }
    } catch (error: any) {
      // 모듈 로드 에러 처리
      console.error('[홈 페이지] Firebase 모듈 로드 실패:', error)
      setFirebaseError('Firebase 모듈 로드 실패')
      setFirebaseErrorDetail(error.message || '환경 변수를 확인하세요.')
      setLoading(false)
      return
    }

    let unsubscribe: (() => void) | null = null
    let isMounted = true
    let authChangeCompleted = false
    let timeoutExecuted = false // 타임아웃이 이미 실행되었는지 추적
    let fallbackTimer: NodeJS.Timeout | null = null

    try {
      unsubscribe = onAuthChange(async (user) => {
        if (!isMounted) return
        
        // 타임아웃이 이미 실행되었으면 무시하지 않고 처리 (사용자 상태 업데이트)
        // 단, 로딩 상태는 이미 해제되었을 수 있으므로 확인
        
        // 타임아웃 타이머 정리
        if (fallbackTimer) {
          clearTimeout(fallbackTimer)
          fallbackTimer = null
        }
        
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
            authChangeCompleted = true
            
            // 닉네임이 없으면 닉네임 설정 페이지로 리다이렉트
            if (profile && !profile.nickname && window.location.pathname !== '/setup-nickname') {
              router.push('/setup-nickname')
              return
            }
          } catch (error: any) {
            if (!isMounted) return
            handleFirebaseError(error, '프로필 로드')
            // 에러 발생 시에도 로딩 해제
            authChangeCompleted = true
          }
        } else {
          setUserProfile(null)
          setRecruitmentEnabled(false)
          authChangeCompleted = true
        }
        if (isMounted) {
          setLoading(false)
        }
      })
      
      // Firebase 응답이 느릴 때 1.5초 후 로딩 해제 및 타임아웃 표시 (한 번만 실행)
      // 배포 환경에서 Firebase 초기화가 느릴 수 있으므로 짧은 타임아웃 설정
      fallbackTimer = setTimeout(() => {
        if (isMounted && !authChangeCompleted && !timeoutExecuted) {
          timeoutExecuted = true
          console.warn('[홈 페이지] Firebase 응답 지연 (1.5초 초과)')
          console.warn('[홈 페이지] 가능한 원인:')
          console.warn('  1. Firebase 환경 변수 누락 (NEXT_PUBLIC_FIREBASE_*)')
          console.warn('  2. Firestore 보안 규칙 문제 (permission-denied)')
          console.warn('  3. Firebase Auth Authorized domains 미등록')
          console.warn('  4. 네트워크 연결 문제')
          setTimeoutReached(true)
          setLoading(false)
        }
      }, 1500)
    } catch (error: any) {
      console.error('[홈 페이지] onAuthChange 설정 실패:', error)
      handleFirebaseError(error, '인증 초기화')
      setLoading(false)
    }

    return () => {
      isMounted = false
      timeoutExecuted = true // cleanup 시 타임아웃 비활성화
      if (unsubscribe) {
        unsubscribe()
      }
      if (fallbackTimer) {
        clearTimeout(fallbackTimer)
      }
    }
  }, [router])

  const handleLogin = () => {
    router.push('/login')
  }

  // 기본 홈 UI 렌더링 함수 (에러/타임아웃 시에도 사용)
  const renderHomeContent = () => (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader userProfile={userProfile} currentPage="home" />
      
      {/* 에러/타임아웃 알림 */}
      {(firebaseError || timeoutReached) && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className={`border rounded-lg p-4 mb-4 ${
            timeoutReached && !firebaseError 
              ? 'bg-yellow-50 border-yellow-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {timeoutReached && !firebaseError ? (
                  <svg className="h-5 w-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3 flex-1">
                <h3 className={`text-sm font-semibold ${
                  timeoutReached && !firebaseError ? 'text-yellow-800' : 'text-red-800'
                }`}>
                  {timeoutReached && !firebaseError 
                    ? 'Firebase 응답 지연' 
                    : firebaseError || 'Firebase 오류'}
                </h3>
                {firebaseErrorDetail && (
                  <p className="mt-1 text-sm text-red-700">{firebaseErrorDetail}</p>
                )}
                {timeoutReached && !firebaseError && (
                  <p className="mt-1 text-sm text-yellow-700">
                    Firebase 서비스 응답이 지연되고 있습니다. 기본 콘텐츠를 표시합니다.
                  </p>
                )}
                {user && (
                  <button
                    onClick={reloadFirebaseData}
                    className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-800 underline"
                  >
                    다시 시도
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8 lg:py-12">
        {/* 로그인하지 않은 사용자 또는 타임아웃/에러 시 기본 홈 화면 */}
        {(!user || timeoutReached || firebaseError) && (
          <>
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
          </>
        )}
      </main>
    </div>
  )

  // 로딩 중이지만 타임아웃/에러가 있으면 기본 UI 표시
  if (loading && !timeoutReached && !firebaseError) {
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

  // 타임아웃/에러가 있거나 로그인하지 않은 사용자 - 기본 홈 화면 표시
  if (!user || timeoutReached || firebaseError) {
    return renderHomeContent()
  }

  // 로그인한 사용자이지만 프로필이 아직 로드되지 않은 경우
  if (user && !userProfile) {
    // 프로필 로딩 중이지만 타임아웃이 지났으면 기본 UI 표시
    if (timeoutReached || firebaseError) {
      return renderHomeContent()
    }
    // 프로필 로딩 중
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationHeader userProfile={null} currentPage="home" />
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg text-gray-600 mb-2">로딩 중...</div>
            <p className="text-sm text-gray-500">프로필을 불러오는 중입니다</p>
          </div>
        </div>
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

  // 모든 조건을 만족하지 않는 경우 (fallback) - 기본 홈 화면 표시
  return renderHomeContent()
}

