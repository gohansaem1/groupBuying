'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import { getUserOrders, getGroup, Order, Group } from '@/lib/firebase/groups'
import { onAuthChange, getCurrentUserProfile, UserProfile } from '@/lib/firebase/auth'
import { User } from 'firebase/auth'
import NavigationHeader from '@/components/NavigationHeader'
import { formatDate, formatDateTime, isApproaching } from '@/lib/utils/date'

type TabType = '전체' | '진행중' | '확정' | '배송중' | '완료'

export default function OrganizerMyOrdersPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [userOrders, setUserOrders] = useState<(Order & { group?: Group })[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set()) // 열린 주문 내역 주문건 키
  const [statusGuideExpanded, setStatusGuideExpanded] = useState(false) // 상태 안내 펼침/접힘
  const [activeTab, setActiveTab] = useState<TabType>('전체')
  const [orderPageSize, setOrderPageSize] = useState<number>(10) // 주문 목록 페이지당 항목 수
  const [orderCurrentPage, setOrderCurrentPage] = useState<number>(1) // 주문 목록 현재 페이지
  const [orderSortOrder, setOrderSortOrder] = useState<'최신순' | '과거순'>('최신순') // 주문 목록 정렬 순서

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

  const reloadOrders = async (preserveScrollPosition?: number) => {
    if (!user) return
    
    // 스크롤 위치 저장 (파라미터가 없으면 현재 위치 사용)
    const scrollPosition = preserveScrollPosition !== undefined ? preserveScrollPosition : window.scrollY
    
    // 주문 내역 다시 로드
    const orders = await getUserOrders(user.uid)
    const ordersWithGroups = await Promise.all(
      orders.map(async (o) => {
        try {
          const group = await getGroup(o.groupId)
          return { ...o, group: group || undefined }
        } catch (err) {
          return { ...o, group: undefined }
        }
      })
    )
    setUserOrders(ordersWithGroups)
    
    // 스크롤 위치 복원
    setTimeout(() => {
      window.scrollTo({ top: scrollPosition, behavior: 'auto' })
    }, 100)
  }


  if (loading) {
    return (
      <AuthGuard allowedRoles={['user', 'organizer', 'organizer_pending', 'admin']}>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-lg">로딩 중...</div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard allowedRoles={['user', 'organizer', 'organizer_pending', 'admin']}>
      <div className="min-h-screen bg-gray-50">
        <NavigationHeader 
          userProfile={userProfile} 
          currentPage="my-orders"
          onProfileUpdate={async (updatedProfile) => {
            setUserProfile(updatedProfile)
          }}
        />

        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8">
          {/* 헤더 */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              내 주문 내역
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mb-4">
              내가 주문한 공동구매 내역을 확인하세요
            </p>
            
            {/* 상태별 설명 공통 표시 (접기/펼치기) */}
            <div className="bg-white rounded-lg border border-gray-200 mb-4">
              <button
                onClick={() => setStatusGuideExpanded(!statusGuideExpanded)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <h2 className="text-sm font-semibold text-gray-700">주문 상태 안내</h2>
                <svg
                  className={`w-5 h-5 text-gray-600 transition-transform ${
                    statusGuideExpanded ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {statusGuideExpanded && (
                <div className="px-4 pb-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    <div className="flex items-start gap-2">
                      <span className="px-2 py-1 bg-blue-500 text-white text-xs font-bold rounded-lg flex-shrink-0">진행중</span>
                      <p className="text-xs sm:text-sm text-gray-600">주문을 변경하거나 취소할 수 있습니다.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="px-2 py-1 bg-purple-500 text-white text-xs font-bold rounded-lg flex-shrink-0">확정</span>
                      <p className="text-xs sm:text-sm text-gray-600">주문이 확정되었습니다. 변경 및 취소가 불가능합니다.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="px-2 py-1 bg-indigo-500 text-white text-xs font-bold rounded-lg flex-shrink-0">배송중</span>
                      <p className="text-xs sm:text-sm text-gray-600">배송 준비 중입니다. 곧 배송이 시작됩니다.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded-lg flex-shrink-0">완료</span>
                      <p className="text-xs sm:text-sm text-gray-600">배송이 완료되었습니다. 수령 방법을 확인해주세요.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 탭 메뉴 */}
            <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-4">
              {(['전체', '진행중', '확정', '배송중', '완료'] as TabType[]).map((tab) => {
                // 주문건별로 그룹화
                const ordersByGroup = new Map<string, (Order & { group?: Group })[]>()
                userOrders.forEach(order => {
                  const orderDate = order.createdAt?.toDate?.()
                  if (!orderDate) {
                    ordersByGroup.set(order.id, [order])
                    return
                  }
                  const groupKey = `${order.groupId}_${order.userId}_${Math.floor(orderDate.getTime() / 1000)}`
                  const groupOrders = ordersByGroup.get(groupKey) || []
                  groupOrders.push(order)
                  ordersByGroup.set(groupKey, groupOrders)
                })

                let count = 0
                if (tab === '전체') {
                  count = ordersByGroup.size
                } else {
                  // 각 탭에 맞는 상태의 주문건 개수 계산
                  const filteredGroups = Array.from(ordersByGroup.entries()).filter(([groupKey, orders]) => {
                    const firstOrder = orders[0]
                    const groupStatus = firstOrder.group?.status || '진행중'
                    // '달성' 상태는 '진행중'으로 매핑
                    const mappedStatus = groupStatus === '달성' ? '진행중' : groupStatus
                    return mappedStatus === tab
                  })
                  count = filteredGroups.length
                }

                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all border-b-2 ${
                      activeTab === tab
                        ? 'bg-blue-50 text-blue-700 border-blue-600'
                        : 'text-gray-600 hover:text-gray-900 border-transparent hover:border-gray-300'
                    }`}
                  >
                    {tab}
                    {count > 0 && (
                      <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
                        activeTab === tab
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 콘텐츠 영역 */}
          {ordersLoading ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="text-center py-12">
                <div className="text-gray-500">주문 내역을 불러오는 중...</div>
              </div>
            </div>
          ) : (() => {
            // 주문건별로 그룹화 (같은 userId와 같은 시간(초 단위)에 주문한 것들을 하나로 묶기)
            const ordersByGroup = new Map<string, (Order & { group?: Group })[]>()
            userOrders.forEach(order => {
              const orderDate = order.createdAt?.toDate?.()
              if (!orderDate) {
                // createdAt이 없으면 개별 주문으로 처리
                ordersByGroup.set(order.id, [order])
                return
              }
              
              // userId와 초 단위 시간을 기준으로 그룹 키 생성
              const groupKey = `${order.groupId}_${order.userId}_${Math.floor(orderDate.getTime() / 1000)}`
              const groupOrders = ordersByGroup.get(groupKey) || []
              groupOrders.push(order)
              ordersByGroup.set(groupKey, groupOrders)
            })

            // 탭에 따라 필터링
            const filteredGroups = Array.from(ordersByGroup.entries()).filter(([groupKey, orders]) => {
              if (activeTab === '전체') return true
              const firstOrder = orders[0]
              const groupStatus = firstOrder.group?.status || '진행중'
              // '달성' 상태는 '진행중'으로 매핑
              const mappedStatus = groupStatus === '달성' ? '진행중' : groupStatus
              return mappedStatus === activeTab
            })

            // 정렬 및 페이지네이션
            const sortedGroups = [...filteredGroups].sort((a, b) => {
              const aDate = a[1][0].createdAt?.toMillis() || 0
              const bDate = b[1][0].createdAt?.toMillis() || 0
              return orderSortOrder === '최신순' ? bDate - aDate : aDate - bDate
            })
            const totalOrderPages = Math.ceil(sortedGroups.length / orderPageSize)
            const startOrderIndex = (orderCurrentPage - 1) * orderPageSize
            const paginatedGroups = sortedGroups.slice(startOrderIndex, startOrderIndex + orderPageSize)

            return sortedGroups.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-500">아직 주문 내역이 없습니다.</p>
                  <p className="text-sm text-gray-400 mt-2">
                    {activeTab === '전체' 
                      ? '진행자가 공유한 링크로 공동구매에 참여해보세요!'
                      : `${activeTab} 상태인 주문 내역이 없습니다.`}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* 주문 목록 정렬 및 페이지네이션 컨트롤 */}
                {sortedGroups.length > 0 && (
                  <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <label className="text-sm text-gray-700 font-medium">정렬:</label>
                      <select
                        value={orderSortOrder}
                        onChange={(e) => {
                          setOrderSortOrder(e.target.value as '최신순' | '과거순')
                          setOrderCurrentPage(1)
                        }}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="최신순">최신순</option>
                        <option value="과거순">과거순</option>
                      </select>
                      <label className="text-sm text-gray-700 font-medium ml-4">페이지당:</label>
                      <select
                        value={orderPageSize}
                        onChange={(e) => {
                          setOrderPageSize(Number(e.target.value))
                          setOrderCurrentPage(1)
                        }}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="5">5개</option>
                        <option value="10">10개</option>
                      </select>
                    </div>
                    <div className="text-sm text-gray-600">
                      전체 {sortedGroups.length}개 중 {startOrderIndex + 1}-{Math.min(startOrderIndex + orderPageSize, sortedGroups.length)}개 표시
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {paginatedGroups.map(([groupKey, orderGroup]) => {
                    const firstOrder = orderGroup[0]
                    const groupId = firstOrder.groupId
                    const totalAmount = orderGroup.reduce((sum, order) => sum + order.totalPrice, 0)
                    const totalQuantity = orderGroup.reduce((sum, order) => sum + order.quantity, 0)
                    const orderDate = firstOrder.createdAt?.toDate?.()
                    // 주문건 내 모든 주문 중 가장 최근의 updatedAt 찾기
                    const latestUpdatedAt = orderGroup.reduce((latest, o) => {
                      const oUpdatedAt = o.updatedAt?.toDate?.()
                      if (!oUpdatedAt) return latest
                      if (!latest) return oUpdatedAt
                      return oUpdatedAt.getTime() > latest.getTime() ? oUpdatedAt : latest
                    }, null as Date | null)
                    const updatedDate = latestUpdatedAt
                    const isModified = updatedDate && orderDate && updatedDate.getTime() > orderDate.getTime() + 1000
                    const isExpanded = expandedOrders.has(groupKey)

                    return (
                      <div
                        key={groupKey}
                        className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                      >
                        <div className="bg-gray-50 p-4">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 
                                  onClick={() => {
                                    if (!groupId) return
                                    // 역할에 따라 다른 경로로 이동
                                    if (userProfile && (userProfile.role === 'organizer' || userProfile.role === 'organizer_pending')) {
                                      router.push(`/organizer/groups/${groupId}`)
                                    } else {
                                      router.push(`/groups/${groupId}`)
                                    }
                                  }}
                                  className="text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer"
                                >
                                  {firstOrder.group?.title || firstOrder.productName}
                                </h3>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  firstOrder.status === '주문완료' ? 'bg-blue-500 text-white' :
                                  firstOrder.status === '확정' ? 'bg-purple-500 text-white' :
                                  firstOrder.status === '배송중' ? 'bg-indigo-500 text-white' :
                                  'bg-green-500 text-white'
                                }`}>
                                  {firstOrder.status === '주문완료' ? '진행중' : firstOrder.status}
                                </span>
                              </div>
                              {firstOrder.group && (
                                <p className="text-xs text-gray-600 mb-1">
                                  진행자: {firstOrder.group.organizerName || '알 수 없음'}
                                </p>
                              )}
                              {orderDate && (
                                <div className="flex items-center gap-2">
                                  <p className="text-xs text-gray-500">
                                    주문: {formatDateTime(orderDate)}
                                  </p>
                                  {isModified && updatedDate && (
                                    <span className="text-xs text-orange-600 font-medium">
                                      · 수정됨 {formatDateTime(updatedDate)}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* 주문 내역 버튼 */}
                          <div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                const newExpanded = new Set(expandedOrders)
                                if (newExpanded.has(groupKey)) {
                                  newExpanded.delete(groupKey)
                                } else {
                                  newExpanded.add(groupKey)
                                }
                                setExpandedOrders(newExpanded)
                              }}
                              className="w-full p-3 bg-white rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-700">주문 내역</span>
                                <span className="text-sm text-gray-600">
                                  ({totalQuantity}개 · {totalAmount.toLocaleString()}원)
                                </span>
                              </div>
                              <svg
                                className={`w-5 h-5 text-gray-600 transition-transform ${
                                  isExpanded ? 'rotate-180' : ''
                                }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            {isExpanded && (
                              <div 
                                className="mt-2 p-3 bg-white rounded-lg border border-gray-200"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="space-y-3">
                                  {orderGroup.map((order, idx) => {
                                    const orderCreatedAt = order.createdAt?.toDate?.()
                                    const orderUpdatedAt = order.updatedAt?.toDate?.()
                                    const isOrderModified = orderUpdatedAt && orderCreatedAt && orderUpdatedAt.getTime() > orderCreatedAt.getTime() + 1000
                                    
                                    return (
                                      <div key={order.id || idx} className="flex items-center justify-between text-sm">
                                        <div className="flex flex-col gap-1">
                                          <div className="flex items-center gap-2 text-gray-700">
                                            <span className="font-medium" title={order.productName}>
                                              {order.productName.length > 8 ? `${order.productName.substring(0, 8)}...` : order.productName}
                                            </span>
                                            <span className="text-gray-500">×</span>
                                            <span className="text-gray-600">{order.quantity}개</span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold text-gray-900">
                                            {order.totalPrice.toLocaleString()}원
                                          </span>
                                        </div>
                                      </div>
                                    )
                                      })}

                                      <div className="pt-2 border-t border-blue-200 flex items-center justify-between">
                                        <span className="text-sm font-semibold text-gray-900">총 금액</span>
                                        <span className="text-base font-bold text-blue-700">
                                          {totalAmount.toLocaleString()}원
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                          </div>
                        </div>
                      </div>
                  )
                })}
                </div>

                {/* 주문 목록 페이지네이션 */}
                {totalOrderPages > 1 && (
                  <div className="mt-6 flex items-center justify-center gap-2">
                    <button
                      onClick={() => setOrderCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={orderCurrentPage === 1}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      이전
                    </button>
                    {Array.from({ length: totalOrderPages }, (_, i) => i + 1).map(pageNum => {
                      // 현재 페이지 주변 2페이지씩만 표시
                      if (
                        pageNum === 1 ||
                        pageNum === totalOrderPages ||
                        (pageNum >= orderCurrentPage - 2 && pageNum <= orderCurrentPage + 2)
                      ) {
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setOrderCurrentPage(pageNum)}
                            className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
                              orderCurrentPage === pageNum
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        )
                      } else if (
                        pageNum === orderCurrentPage - 3 ||
                        pageNum === orderCurrentPage + 3
                      ) {
                        return <span key={pageNum} className="px-2 text-gray-500">...</span>
                      }
                      return null
                    })}
                    <button
                      onClick={() => setOrderCurrentPage(prev => Math.min(totalOrderPages, prev + 1))}
                      disabled={orderCurrentPage === totalOrderPages}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      다음
                    </button>
                  </div>
                )}
              </>
            )
          })()}
        </div>
      </div>
    </AuthGuard>
  )
}

