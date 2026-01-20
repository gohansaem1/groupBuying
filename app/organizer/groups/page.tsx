'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import { getOrganizerGroups, Group } from '@/lib/firebase/groups'
import { getGroupOrders, Order } from '@/lib/firebase/groups'
import { getCurrentUserProfile, UserProfile } from '@/lib/firebase/auth'
import NavigationHeader from '@/components/NavigationHeader'

export default function OrganizerGroupsPage() {
  const router = useRouter()
  const [groups, setGroups] = useState<Group[]>([])
  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const profile = await getCurrentUserProfile()
      if (!profile) return

      setUserProfile(profile)

      // 진행자가 만든 모든 공동구매 건 가져오기
      const groupsData = await getOrganizerGroups(profile.uid)
      setGroups(groupsData)

      // 각 공동구매 건의 주문 가져오기
      const ordersPromises = groupsData.map(group => getGroupOrders(group.id))
      const ordersArrays = await Promise.all(ordersPromises)
      const flatOrders = ordersArrays.flat()
      setAllOrders(flatOrders)
    } catch (error) {
      console.error('데이터 로드 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  const getGroupOrdersForGroup = (groupId: string) => {
    return allOrders.filter(order => order.groupId === groupId)
  }

  const getTotalAmount = (orders: Order[]) => {
    return orders.reduce((sum, order) => sum + order.totalPrice, 0)
  }

  if (loading) {
    return (
      <AuthGuard allowedRoles={['organizer']}>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-lg">로딩 중...</div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard allowedRoles={['organizer']}>
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
                  생성한 공동구매 건의 주문 내역을 확인하세요
                </p>
              </div>
              <button
                onClick={() => router.push('/organizer')}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl transition-colors inline-flex items-center justify-center text-sm sm:text-base"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                공동구매 건 생성
              </button>
            </div>
          </div>

          {groups.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-8 sm:p-12 text-center">
              <svg className="w-16 h-16 sm:w-20 sm:h-20 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500 text-base sm:text-lg mb-2">아직 생성한 공동구매 건이 없습니다</p>
              <p className="text-sm text-gray-400 mb-6">공동구매 건을 생성하여 시작하세요</p>
              <button
                onClick={() => router.push('/organizer')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl transition-colors inline-flex items-center"
              >
                공동구매 건 생성하기
              </button>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {groups.map((group) => {
                const groupOrders = getGroupOrdersForGroup(group.id)
                const totalAmount = getTotalAmount(groupOrders)
                const progress = group.minimumTotal > 0 
                  ? Math.min((group.currentTotal / group.minimumTotal) * 100, 100)
                  : 0

                return (
                  <div key={group.id} className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden">
                    <div className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4 mb-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1 truncate">
                            {group.title}
                          </h3>
                          <p className="text-sm text-gray-500 mb-2">{group.productName}</p>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                              group.status === '진행중' ? 'bg-blue-100 text-blue-800' :
                              group.status === '달성' ? 'bg-yellow-100 text-yellow-800' :
                              group.status === '확인완료' ? 'bg-purple-100 text-purple-800' :
                              group.status === '배송중' ? 'bg-indigo-100 text-indigo-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {group.status}
                            </span>
                            <span className="text-xs sm:text-sm text-gray-600">
                              주문 {groupOrders.length}건
                            </span>
                            <span className="text-xs sm:text-sm text-gray-600">
                              총 {totalAmount.toLocaleString()}원
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => router.push(`/organizer/groups/${group.id}`)}
                          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm sm:text-base inline-flex items-center justify-center"
                        >
                          <span>상세보기</span>
                          <svg className="w-4 h-4 ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>

                      {/* 진행률 바 */}
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs sm:text-sm text-gray-600">
                            목표: {group.minimumTotal.toLocaleString()}원
                          </span>
                          <span className="text-xs sm:text-sm font-semibold text-gray-900">
                            {group.currentTotal.toLocaleString()}원 ({Math.round(progress)}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 sm:h-3">
                          <div
                            className={`h-2.5 sm:h-3 rounded-full transition-all ${
                              progress >= 100 ? 'bg-green-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {/* 주문 목록 미리보기 */}
                      {groupOrders.length > 0 ? (
                        <div className="border-t border-gray-200 pt-4 mt-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-3">주문 내역</h4>
                          <div className="space-y-2">
                            {groupOrders.slice(0, 3).map((order) => (
                              <div key={order.id} className="flex justify-between items-center text-xs sm:text-sm bg-gray-50 rounded-lg p-2 sm:p-3">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 truncate">{order.userName}</p>
                                  <p className="text-gray-600">
                                    {order.quantity}개 × {order.unitPrice.toLocaleString()}원
                                  </p>
                                </div>
                                <div className="ml-3 text-right">
                                  <p className="font-semibold text-gray-900">{order.totalPrice.toLocaleString()}원</p>
                                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                                    order.status === '주문완료' ? 'bg-blue-100 text-blue-800' :
                                    order.status === '확인완료' ? 'bg-purple-100 text-purple-800' :
                                    order.status === '배송중' ? 'bg-indigo-100 text-indigo-800' :
                                    'bg-green-100 text-green-800'
                                  }`}>
                                    {order.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                            {groupOrders.length > 3 && (
                              <p className="text-xs text-gray-500 text-center pt-2">
                                외 {groupOrders.length - 3}건 더 보기
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="border-t border-gray-200 pt-4 mt-4">
                          <p className="text-sm text-gray-500 text-center py-2">아직 주문이 없습니다</p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  )
}

