'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
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
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [firebaseError, setFirebaseError] = useState<string | null>(null)
  
  // useRef를 사용하여 컴포넌트 생명주기 동안 유지되는 값들 추적
  const timeoutExecutedRef = useRef(false)
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null)
  const authChangeCompletedRef = useRef(false)

  useEffect(() => {
    // /admin 경로에서는 AuthGuard를 사용하지 않음 (서버 사이드 세션 쿠키로 보호)
    if (pathname?.startsWith('/admin')) {
      console.warn('[AuthGuard] /admin 경로에서는 AuthGuard를 사용하지 않습니다. 서버 사이드 세션 쿠키로 보호됩니다.')
      setLoading(false)
      return
    }

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

    // 이미 타임아웃이 실행되었으면 재실행 방지
    if (timeoutExecutedRef.current) {
      return
    }

    let unsubscribe: (() => void) | null = null
    let isMounted = true

    try {
      unsubscribe = onAuthChange(async (user) => {
        if (!isMounted) return
        
        // 타임아웃이 이미 실행되었으면 무시
        if (timeoutExecutedRef.current) return
        
        // 타임아웃 타이머 정리
        if (fallbackTimerRef.current) {
          clearTimeout(fallbackTimerRef.current)
          fallbackTimerRef.current = null
        }
        
        authChangeCompletedRef.current = true
        
        if (!user) {
          // 현재 URL을 returnUrl로 넘겨 로그인 페이지로 리다이렉트
          const currentPath = pathname || window.location.pathname
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
      fallbackTimerRef.current = setTimeout(() => {
        if (isMounted && !authChangeCompletedRef.current && !timeoutExecutedRef.current) {
          timeoutExecutedRef.current = true
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
      if (unsubscribe) {
        unsubscribe()
      }
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current)
        fallbackTimerRef.current = null
      }
    }
  }, [router, pathname, allowedRoles])

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

