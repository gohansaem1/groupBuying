'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import { getUserOrders, getGroup, Order, Group } from '@/lib/firebase/groups'
import { onAuthChange, getCurrentUserProfile, UserProfile } from '@/lib/firebase/auth'
import { User } from 'firebase/auth'
import NavigationHeader from '@/components/NavigationHeader'

export default function OrganizerOrdersPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [userOrders, setUserOrders] = useState<(Order & { group?: Group })[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [ordersLoading, setOrdersLoading] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      setUser(user)
      if (user) {
        const profile = await getCurrentUserProfile()
        setUserProfile(profile)
      } else {
        setUserProfile(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // 사용자 주문 내역 로드 (홈 페이지와 동일한 로직)
  useEffect(() => {
    const loadUserOrders = async () => {
      if (!user || !userProfile) {
        setUserOrders([])
        return
      }

      setOrdersLoading(true)
      try {
        const orders = await getUserOrders(user.uid)
        // 각 주문에 대한 그룹 정보 가져오기
        const ordersWithGroups = await Promise.all(
          orders.map(async (order) => {
            try {
              const group = await getGroup(order.groupId)
              return { ...order, group: group || undefined }
            } catch (err) {
              console.error(`그룹 정보 로드 실패 (${order.groupId}):`, err)
              return { ...order, group: undefined }
            }
          })
        )
        setUserOrders(ordersWithGroups)
      } catch (err) {
        console.error('주문 내역 로드 실패:', err)
        setUserOrders([])
      } finally {
        setOrdersLoading(false)
      }
    }

    loadUserOrders()
  }, [user, userProfile])

  if (loading) {
    return (
      <AuthGuard allowedRoles={['organizer', 'organizer_pending']}>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-lg">로딩 중...</div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard allowedRoles={['organizer', 'organizer_pending']}>
      <div className="min-h-screen bg-gray-50">
        <NavigationHeader userProfile={userProfile} currentPage="organizer" />

        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8">
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  내 주문 내역
                </h1>
                <p className="text-sm sm:text-base text-gray-600">
                  내가 주문한 공동구매 내역을 확인하세요
                </p>
              </div>
              <button
                onClick={() => router.push('/organizer')}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl transition-colors inline-flex items-center justify-center text-sm sm:text-base"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                진행자 대시보드
              </button>
            </div>
          </div>

          {/* 주문 내역 */}
          <div className="bg-white rounded-xl shadow-md p-5 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">내 주문 내역</h2>
            {ordersLoading ? (
              <div className="text-center py-8">
                <div className="text-gray-500">주문 내역을 불러오는 중...</div>
              </div>
            ) : userOrders.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-500">아직 주문 내역이 없습니다.</p>
                <p className="text-sm text-gray-400 mt-2">
                  진행자가 공유한 링크로 공동구매에 참여해보세요!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {userOrders.map((order) => (
                  <div key={order.id} className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-all hover:shadow-md">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                          {order.group?.title || order.productName}
                        </h3>
                        {order.group && (
                          <>
                            <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">{order.group.productName}</p>
                            <p className="text-xs sm:text-sm text-gray-600 mt-1">
                              진행자: {order.group.organizerName}
                            </p>
                          </>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap self-start sm:self-auto ${
                        order.status === '주문완료' ? 'bg-blue-100 text-blue-800' :
                        order.status === '확인완료' ? 'bg-purple-100 text-purple-800' :
                        order.status === '배송중' ? 'bg-indigo-100 text-indigo-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <div className="flex justify-between items-center text-xs sm:text-sm">
                        <span className="text-gray-600">
                          {order.quantity}개 × {order.unitPrice.toLocaleString()}원
                        </span>
                        <span className="font-semibold text-gray-900">
                          총 {order.totalPrice.toLocaleString()}원
                        </span>
                      </div>
                      <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        {order.group && (
                          <span className="text-xs text-gray-500">
                            공동구매 건 상태: {order.group.status}
                          </span>
                        )}
                        {order.groupId ? (
                          <button
                            onClick={() => {
                              // 진행자는 진행자 전용 공동구매 건 상세 페이지로
                              router.push(`/organizer/groups/${order.groupId}`)
                            }}
                            className="w-full sm:w-auto text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors inline-flex items-center justify-center shadow-sm hover:shadow-md"
                          >
                            <span>상세보기</span>
                            <svg className="w-3 h-3 sm:w-4 sm:h-4 ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">링크 정보 없음</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
