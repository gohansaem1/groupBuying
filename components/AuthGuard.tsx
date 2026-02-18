'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthChange } from '@/lib/firebase/auth'
import { User } from 'firebase/auth'
import { getCurrentUserProfile, UserProfile } from '@/lib/firebase/auth'
import { isFirebaseInitialized, getFirebaseInitError } from '@/lib/firebase/config'

interface AuthGuardProps {
  children: React.ReactNode
  allowedRoles?: ('user' | 'organizer_pending' | 'organizer' | 'admin' | 'owner')[]
}

export default function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [firebaseError, setFirebaseError] = useState<string | null>(null)

  useEffect(() => {
    // Firebase 초기화 상태 확인
    if (!isFirebaseInitialized()) {
      const initError = getFirebaseInitError()
      if (initError) {
        console.error('[AuthGuard] Firebase 초기화 실패:', initError.message)
        setFirebaseError(initError.message)
      } else {
        console.warn('[AuthGuard] Firebase가 초기화되지 않았습니다.')
        setFirebaseError('Firebase가 초기화되지 않았습니다. 환경 변수를 확인하세요.')
      }
      setLoading(false)
      return
    }

    let unsubscribe: (() => void) | null = null
    let isMounted = true
    let timeoutExecuted = false // 타임아웃이 이미 실행되었는지 추적
    let fallbackTimer: NodeJS.Timeout | null = null

    try {
      unsubscribe = onAuthChange(async (user) => {
        if (!isMounted) return
        
        // 타임아웃이 이미 실행되었으면 무시
        if (timeoutExecuted) return
        
        // 타임아웃 타이머 정리
        if (fallbackTimer) {
          clearTimeout(fallbackTimer)
          fallbackTimer = null
        }
        
        if (!user) {
          // 현재 URL을 returnUrl로 넘겨 로그인 페이지로 리다이렉트
          const currentPath = window.location.pathname
          router.push(`/login?returnUrl=${encodeURIComponent(currentPath)}`)
          return
        }

        setUser(user)
        try {
          const profile = await getCurrentUserProfile()
          if (!isMounted) return
          
          setUserProfile(profile)
          
          if (profile && allowedRoles) {
            // owner는 admin 권한도 가짐
            const hasAccess = allowedRoles.includes(profile.role) || 
                             (profile.role === 'owner' && allowedRoles.includes('admin'))
            if (!hasAccess) {
              router.push('/')
              return
            }
          }
        } catch (error: any) {
          console.error('[AuthGuard] 프로필 로드 실패:', error)
          if (!isMounted) return
          setFirebaseError(`프로필 로드 실패: ${error.message}`)
        }
        
        if (isMounted) {
          setLoading(false)
        }
      })
      
      // Firebase 응답이 느릴 때 3초 후 로딩 해제 (한 번만 실행)
      fallbackTimer = setTimeout(() => {
        if (isMounted && !timeoutExecuted) {
          timeoutExecuted = true
          console.warn('[AuthGuard] Firebase 응답 지연으로 인해 로딩 상태를 해제합니다.')
          setLoading(false)
        }
      }, 3000)
    } catch (error: any) {
      console.error('[AuthGuard] onAuthChange 설정 실패:', error)
      setFirebaseError(`인증 초기화 실패: ${error.message}`)
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
  }, [router, allowedRoles])

  // Firebase 에러가 있으면 에러 메시지 표시
  if (firebaseError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">인증 오류</h2>
          <p className="text-sm text-red-700 mb-4">{firebaseError}</p>
          <p className="text-xs text-gray-600 mb-4">
            Vercel 대시보드에서 NEXT_PUBLIC_FIREBASE_* 환경 변수가 설정되어 있는지 확인하세요.
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  if (loading || !user || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-lg text-gray-600 mb-2">로딩 중...</div>
          <p className="text-sm text-gray-500">잠시만 기다려주세요</p>
        </div>
      </div>
    )
  }

  if (allowedRoles) {
    const hasAccess = allowedRoles.includes(userProfile.role) || 
                     (userProfile.role === 'owner' && allowedRoles.includes('admin'))
    if (!hasAccess) {
      return null
    }
  }

  return <>{children}</>
}

