'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import { getProducts, Product } from '@/lib/firebase/products'
import { getGroups, Group } from '@/lib/firebase/groups'
import { signOut, getCurrentUserProfile } from '@/lib/firebase/auth'
import { getOrganizerRecruitmentStatus } from '@/lib/firebase/admin'

export default function ProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [recruitmentEnabled, setRecruitmentEnabled] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [productsData, groupsData, recruitmentStatus] = await Promise.all([
        getProducts(),
        getGroups(),
        getOrganizerRecruitmentStatus()
      ])
      setProducts(productsData)
      setGroups(groupsData)
      setRecruitmentEnabled(recruitmentStatus)
    } catch (error) {
      console.error('데이터 로드 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await signOut()
    router.push('/login')
  }

  const getProductGroups = (productId: string) => {
    return groups.filter(g => g.productId === productId)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    )
  }

  // 일반 사용자는 공동구매 건 링크로만 접근 가능
  return (
    <AuthGuard allowedRoles={['user']}>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <h1 className="text-xl font-bold">제주 공동구매</h1>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                로그아웃
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <h2 className="text-xl font-semibold mb-4">공동구매 참여 안내</h2>
            <p className="text-gray-600 mb-6">
              진행자가 공유한 링크로 접속해주세요.
            </p>
            <p className="text-sm text-gray-500">
              공동구매에 참여하려면 진행자가 제공한 공동구매 건 링크가 필요합니다.
            </p>
            {recruitmentEnabled && (
              <div className="mt-6 pt-6 border-t">
                <p className="text-sm text-gray-600 mb-2">진행자가 되고 싶으신가요?</p>
                <button
                  onClick={() => router.push('/organizer/apply')}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Organizer 신청하기
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}

