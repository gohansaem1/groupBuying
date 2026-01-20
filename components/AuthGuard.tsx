'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthChange } from '@/lib/firebase/auth'
import { User } from 'firebase/auth'
import { getCurrentUserProfile, UserProfile } from '@/lib/firebase/auth'

interface AuthGuardProps {
  children: React.ReactNode
  allowedRoles?: ('user' | 'organizer_pending' | 'organizer' | 'admin')[]
}

export default function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      if (!user) {
        // 현재 URL을 returnUrl로 넘겨 로그인 페이지로 리다이렉트
        const currentPath = window.location.pathname
        router.push(`/login?returnUrl=${encodeURIComponent(currentPath)}`)
        return
      }

      setUser(user)
      const profile = await getCurrentUserProfile()
      setUserProfile(profile)
      
      if (profile && allowedRoles && !allowedRoles.includes(profile.role)) {
        // 역할이 허용되지 않으면 홈으로 리다이렉트
        router.push('/')
        return
      }
      
      setLoading(false)
    })

    return () => unsubscribe()
  }, [router, allowedRoles])

  if (loading || !user || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    )
  }

  if (allowedRoles && !allowedRoles.includes(userProfile.role)) {
    return null
  }

  return <>{children}</>
}

