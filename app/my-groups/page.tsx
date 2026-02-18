'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import { getUserVisitedGroups, getUserOrders, getGroup, getOrganizerGroups, Group, Order } from '@/lib/firebase/groups'
import { onAuthChange, getCurrentUserProfile, UserProfile } from '@/lib/firebase/auth'
import { User } from 'firebase/auth'
import NavigationHeader from '@/components/NavigationHeader'
import { formatDate, formatTimeRemaining, isApproaching, formatDateTime } from '@/lib/utils/date'

type TabType = '전체' | '참여' | '미참여'

export default function MyGroupsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [visitedGroups, setVisitedGroups] = useState<Group[]>([])
  const [createdGroups, setCreatedGroups] = useState<Group[]>([])
  const [orderedGroups, setOrderedGroups] = useState<Map<string, Order[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [groupsLoading, setGroupsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('전체')
  const [sortOrder, setSortOrder] = useState<'최신순' | '과거순'>('최신순') // 정렬 순서
  const [pageSize, setPageSize] = useState<number>(10) // 페이지당 항목 수
  const [currentPage, setCurrentPage] = useState<number>(1) // 현재 페이지

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

  // 접속한 그룹 및 주문한 그룹 로드
  useEffect(() => {
    const loadData = async () => {
      if (!user || !userProfile) {
        setVisitedGroups([])
        setCreatedGroups([])
        setOrderedGroups(new Map())
        return
      }

      setGroupsLoading(true)
      try {
        const visited = await getUserVisitedGroups(user.uid)
        setVisitedGroups(visited)

        if (userProfile && (userProfile.role === 'organizer' || userProfile.role === 'organizer_pending')) {
          const created = await getOrganizerGroups(user.uid)
          setCreatedGroups(created)
        } else {
          setCreatedGroups([])
        }

        const orders = await getUserOrders(user.uid)
        const orderedMap = new Map<string, Order[]>()
        
        for (const order of orders) {
          if (!orderedMap.has(order.groupId)) {
            orderedMap.set(order.groupId, [])
          }
          orderedMap.get(order.groupId)!.push(order)
        }
        
        setOrderedGroups(orderedMap)
      } catch (err) {
        console.error('데이터 로드 실패:', err)
        setVisitedGroups([])
        setCreatedGroups([])
        setOrderedGroups(new Map())
      } finally {
        setGroupsLoading(false)
      }
    }

    loadData()
  }, [user, userProfile])


  // 주문한 그룹 ID 목록
  const orderedGroupIds = Array.from(orderedGroups.keys())
  const createdGroupIds = createdGroups.map(g => g.id)
  const visitedOnlyGroups = visitedGroups.filter(group => 
    !orderedGroupIds.includes(group.id) && !createdGroupIds.includes(group.id)
  )

  // 탭별 그룹 목록
  const tabGroups = useMemo(() => {
    if (activeTab === '참여') {
      // 주문한 그룹 (생성한 것 포함)
      return orderedGroupIds
        .map(groupId => {
          const orders = orderedGroups.get(groupId) || []
          // 생성한 그룹인 경우 createdGroups에서 찾기
          const createdGroup = createdGroups.find(g => g.id === groupId)
          const visitedGroup = visitedGroups.find(g => g.id === groupId)
          const group = createdGroup || visitedGroup
          return { groupId, group, orders }
        })
        .filter(item => item.group || item.orders.length > 0)
    } else if (activeTab === '미참여') {
      // 접속만 한 그룹 + 생성한 그룹 중 주문하지 않은 것
      const linkGroups: Array<{ groupId: string; group: Group | undefined; orders: Order[] }> = []
      
      // 생성한 그룹 중 주문하지 않은 것만
      createdGroups.forEach(group => {
        const orders = orderedGroups.get(group.id) || []
        // 주문이 없으면 미참여에 포함
        if (orders.length === 0) {
          linkGroups.push({ groupId: group.id, group, orders: [] })
        }
      })
      
      // 접속만 한 그룹 (생성하지 않은 것, 주문하지 않은 것)
      visitedOnlyGroups.forEach(group => {
        linkGroups.push({ groupId: group.id, group, orders: [] })
      })
      
      return linkGroups
    } else {
      // 전체: 모든 그룹 합치기
      const all: Array<{ groupId: string; group: Group | undefined; orders: Order[] }> = []
      
      // 생성한 것
      createdGroups.forEach(group => {
        const orders = orderedGroups.get(group.id) || []
        all.push({ groupId: group.id, group, orders })
      })
      
      // 주문한 것 (생성하지 않은 것)
      orderedGroupIds.forEach(groupId => {
        if (!createdGroupIds.includes(groupId)) {
          const orders = orderedGroups.get(groupId) || []
          const group = visitedGroups.find(g => g.id === groupId)
          all.push({ groupId, group, orders })
        }
      })
      
      // 접속만 한 것
      visitedOnlyGroups.forEach(group => {
        all.push({ groupId: group.id, group, orders: [] })
      })
      
      return all
    }
  }, [activeTab, orderedGroupIds, createdGroups, visitedGroups, visitedOnlyGroups, orderedGroups, createdGroupIds])

  if (loading) {
    return (
      <AuthGuard allowedRoles={['user', 'organizer', 'organizer_pending']}>
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
          currentPage="my-groups"
          onProfileUpdate={async (updatedProfile) => {
            setUserProfile(updatedProfile)
          }}
        />

        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8">
          {/* 헤더 */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              내 공동구매 목록
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mb-6">
              접속했던 공동구매 건들을 확인하세요
            </p>

            {/* 탭 메뉴 */}
            <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-4">
              {(['전체', '참여', '미참여'] as TabType[]).map((tab) => {
                let count = 0
                if (tab === '전체') {
                  // 전체: 생성한 것 + 주문한 것(생성하지 않은 것) + 접속만 한 것
                  const allIds = new Set<string>()
                  // 생성한 것
                  createdGroupIds.forEach(id => allIds.add(id))
                  // 주문한 것 (생성하지 않은 것)
                  orderedGroupIds.forEach(id => {
                    if (!createdGroupIds.includes(id)) {
                      allIds.add(id)
                    }
                  })
                  // 접속만 한 것
                  visitedOnlyGroups.forEach(group => allIds.add(group.id))
                  count = allIds.size
                } else if (tab === '참여') {
                  // 주문한 그룹 (생성한 것 포함)
                  count = orderedGroupIds
                    .filter(groupId => {
                      const orders = orderedGroups.get(groupId) || []
                      const createdGroup = createdGroups.find(g => g.id === groupId)
                      const visitedGroup = visitedGroups.find(g => g.id === groupId)
                      const group = createdGroup || visitedGroup
                      return group || orders.length > 0
                    }).length
                } else if (tab === '미참여') {
                  // 생성한 그룹 중 주문하지 않은 것 + 접속만 한 그룹
                  const linkIds = new Set<string>()
                  // 생성한 그룹 중 주문하지 않은 것만
                  createdGroups.forEach(group => {
                    const orders = orderedGroups.get(group.id) || []
                    if (orders.length === 0) {
                      linkIds.add(group.id)
                    }
                  })
                  // 접속만 한 그룹 (생성하지 않은 것)
                  visitedOnlyGroups.forEach(group => linkIds.add(group.id))
                  count = linkIds.size
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
          {groupsLoading ? (
            <div className="text-center py-12">
              <div className="text-gray-500">공동구매 목록을 불러오는 중...</div>
            </div>
          ) : (() => {
            // 정렬 및 페이지네이션 적용
            const sortedGroups = [...tabGroups].sort((a, b) => {
              const aDate = a.group?.createdAt?.toMillis() || 0
              const bDate = b.group?.createdAt?.toMillis() || 0
              return sortOrder === '최신순' ? bDate - aDate : aDate - bDate
            })
            const totalPages = Math.ceil(sortedGroups.length / pageSize)
            const startIndex = (currentPage - 1) * pageSize
            const paginatedGroups = sortedGroups.slice(startIndex, startIndex + pageSize)
            
            return sortedGroups.length > 0 ? (
              <>
                {/* 정렬 및 페이지 크기 선택 */}
                <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-700 font-medium">정렬:</label>
                    <select
                      value={sortOrder}
                      onChange={(e) => {
                        setSortOrder(e.target.value as '최신순' | '과거순')
                        setCurrentPage(1)
                      }}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="최신순">최신순</option>
                      <option value="과거순">과거순</option>
                    </select>
                    <label className="text-sm text-gray-700 font-medium ml-4">페이지당:</label>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value))
                        setCurrentPage(1)
                      }}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="5">5개</option>
                      <option value="10">10개</option>
                    </select>
                  </div>
                  <div className="text-sm text-gray-600">
                    전체 {sortedGroups.length}개 중 {startIndex + 1}-{Math.min(startIndex + pageSize, sortedGroups.length)}개 표시
                  </div>
                </div>

                <div className="space-y-4">
                  {paginatedGroups.map(({ groupId, group, orders }) => {
                if (!group && orders.length === 0) return null

                const isCreated = createdGroupIds.includes(groupId)
                const progress = group ? (group.currentTotal / group.minimumTotal) * 100 : 0

                return (
                  <div
                    key={groupId}
                    className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-200 overflow-hidden ${
                      isCreated ? 'border-l-4 border-l-green-500' : ''
                    }`}
                  >
                    <div className="p-5 sm:p-6">
                      <div className="mb-4">
                        {/* 첫 번째 행: 제목과 진행자 이름 */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 
                              onClick={() => {
                                if (userProfile && (userProfile.role === 'organizer' || userProfile.role === 'organizer_pending')) {
                                  router.push(`/organizer/groups/${groupId}`)
                                } else {
                                  router.push(`/groups/${groupId}`)
                                }
                              }}
                              className="text-lg sm:text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors line-clamp-2 cursor-pointer"
                            >
                              {group?.title || '공동구매 건'}
                            </h3>
                            {/* 생성일시 */}
                            {group?.createdAt && (
                              <p className="text-xs text-gray-500 mt-1">
                                생성일: {formatDateTime(group.createdAt)}
                              </p>
                            )}
                          </div>
                          {/* 진행자 이름 */}
                          {group && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 flex-shrink-0">
                              <span>{group.organizerName || '알 수 없음'}</span>
                              {user && group.organizerId === user.uid && (
                                <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 text-xs font-medium rounded">
                                  나
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* 정보 표시 */}
                        {group && (
                          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mb-2">
                            {group.menuItems && group.menuItems.length > 0 && (
                              <>
                                <span>상품 {group.menuItems.length}개</span>
                                <span className="text-gray-400">·</span>
                              </>
                            )}
                            <span>
                              {group.currentTotal.toLocaleString()}원 / {group.minimumTotal.toLocaleString()}원
                              <span className="ml-1 text-blue-600 font-semibold">
                                ({progress.toFixed(1)}%)
                              </span>
                            </span>
                          </div>
                        )}
                        
                        {/* 달성률 진행 바 */}
                        {group && (
                          <div className="mb-3">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(progress, 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* 날짜 정보 */}
                      {group && (group.startDate || group.endDate) && (
                        <div className="mt-3 mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="space-y-1.5 text-xs">
                            {group.startDate && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 w-20 flex-shrink-0">시작일:</span>
                                <span className="text-gray-700 font-medium">{formatDate(group.startDate)}</span>
                              </div>
                            )}
                            {group.endDate && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 w-20 flex-shrink-0">마감일:</span>
                                <span className={`font-medium ${
                                  group.status === '진행중' && isApproaching(group.endDate, 1) ? 'text-red-600' :
                                  group.status === '진행중' && isApproaching(group.endDate, 3) ? 'text-orange-600' :
                                  'text-gray-700'
                                }`}>
                                  {formatDate(group.endDate)}
                                </span>
                                {group.status === '진행중' && group.endDate && (
                                  <span className={`text-xs ml-1 font-medium ${
                                    isApproaching(group.endDate, 1) ? 'text-red-600' :
                                    isApproaching(group.endDate, 3) ? 'text-orange-600' :
                                    'text-blue-600'
                                  }`}>
                                    ({formatTimeRemaining(group.endDate)} 남음)
                                  </span>
                                )}
                              </div>
                            )}
                            {group.deliveryMethod && (
                              <div className="flex items-start gap-2 mt-1 pt-1 border-t border-gray-300">
                                <span className="text-gray-500 w-20 flex-shrink-0">수령방법:</span>
                                <span className="text-gray-700 text-xs">{group.deliveryMethod}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* 주문 마감일 임박 알림 */}
                      {group && group.status === '진행중' && group.endDate && isApproaching(group.endDate, 3) && (
                        <div className={`mb-3 p-3 rounded-lg border ${
                          isApproaching(group.endDate, 1) 
                            ? 'bg-red-50 border-red-200' 
                            : 'bg-orange-50 border-orange-200'
                        }`}>
                          <div className="flex items-start gap-2">
                            <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                              isApproaching(group.endDate, 1) ? 'text-red-600' : 'text-orange-600'
                            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <div className="flex-1">
                              <p className={`text-xs font-semibold ${
                                isApproaching(group.endDate, 1) ? 'text-red-800' : 'text-orange-800'
                              }`}>
                                {isApproaching(group.endDate, 1) 
                                  ? '⚠️ 주문 마감일이 임박했습니다!' 
                                  : '⏰ 주문 마감일이 곧 다가옵니다'}
                              </p>
                              <p className={`text-xs mt-1 ${
                                isApproaching(group.endDate, 1) ? 'text-red-700' : 'text-orange-700'
                              }`}>
                                마감일: {formatDate(group.endDate)} ({formatTimeRemaining(group.endDate)} 남음)
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* 진행 상태 단계 표시 */}
                      {group && (
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-3">
                            {[
                              { status: '진행중', label: '진행중', completedBg: 'bg-blue-500', currentBg: 'bg-blue-100', currentBorder: 'border-blue-500', currentText: 'text-blue-700', lineColor: 'bg-blue-500' },
                              { status: '달성', label: '달성', completedBg: 'bg-yellow-500', currentBg: 'bg-yellow-100', currentBorder: 'border-yellow-500', currentText: 'text-yellow-700', lineColor: 'bg-yellow-500' },
                              { status: '확정', label: '확정', completedBg: 'bg-purple-500', currentBg: 'bg-purple-100', currentBorder: 'border-purple-500', currentText: 'text-purple-700', lineColor: 'bg-purple-500' },
                              { status: '배송중', label: '배송준비', completedBg: 'bg-indigo-500', currentBg: 'bg-indigo-100', currentBorder: 'border-indigo-500', currentText: 'text-indigo-700', lineColor: 'bg-indigo-500' },
                              { status: '완료', label: '배송완료', completedBg: 'bg-green-500', currentBg: 'bg-green-100', currentBorder: 'border-green-500', currentText: 'text-green-700', lineColor: 'bg-green-500' }
                            ].map((step, index, array) => {
                              const currentIndex = array.findIndex(s => s.status === group.status)
                              const isCompleted = index < currentIndex || (index === currentIndex && group.status !== '진행중')
                              const isCurrent = index === currentIndex
                              
                              return (
                                <div key={step.status} className="flex items-center flex-1">
                                  <div className="flex flex-col items-center flex-1">
                                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all ${
                                      isCompleted
                                        ? `${step.completedBg} text-white shadow-md`
                                        : isCurrent
                                        ? `${step.currentBg} border-2 ${step.currentBorder} ${step.currentText}`
                                        : 'bg-gray-200 text-gray-400'
                                    }`}>
                                      {isCompleted ? (
                                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                      ) : (
                                        index + 1
                                      )}
                                    </div>
                                    <span className={`text-xs mt-1 text-center font-medium ${
                                      isCurrent ? step.currentText : isCompleted ? 'text-gray-700' : 'text-gray-400'
                                    }`}>
                                      {step.label}
                                    </span>
                                  </div>
                                  {index < array.length - 1 && (
                                    <div className={`flex-1 h-0.5 mx-1 sm:mx-2 ${
                                      index < currentIndex ? step.lineColor : 'bg-gray-200'
                                    }`} />
                                  )}
                                </div>
                              )
                            })}
                          </div>
                          {/* 상태별 상황 설명 */}
                          {group.status && (
                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <p className="text-xs sm:text-sm text-blue-800 text-center">
                                {group.status === '진행중' && '현재 주문을 받고 있습니다. 지금 참여하실 수 있습니다.'}
                                {group.status === '달성' && '목표 금액을 달성했습니다. 진행자가 확정 처리할 때까지 대기 중입니다.'}
                                {group.status === '확정' && '주문이 확정되었습니다. 관리자가 배송 준비를 진행 중입니다.'}
                                {group.status === '배송중' && '배송 준비가 진행 중입니다. 곧 배송이 시작됩니다.'}
                                {group.status === '완료' && '진행자에 상품 배송했습니다. 확인해주세요.'}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  )
                  })}
                </div>

                {/* 페이지네이션 */}
                {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      이전
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
                      // 현재 페이지 주변 2페이지씩만 표시
                      if (
                        pageNum === 1 ||
                        pageNum === totalPages ||
                        (pageNum >= currentPage - 2 && pageNum <= currentPage + 2)
                      ) {
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
                              currentPage === pageNum
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        )
                      } else if (
                        pageNum === currentPage - 3 ||
                        pageNum === currentPage + 3
                      ) {
                        return <span key={pageNum} className="px-2 text-gray-500">...</span>
                      }
                      return null
                    })}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      다음
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="text-gray-500 text-lg mb-2">
                {activeTab === '전체' && '아직 공동구매 건이 없습니다.'}
                {activeTab === '참여' && '참여한 공동구매 건이 없습니다.'}
                {activeTab === '미참여' && '접속한 공동구매 건이 없습니다.'}
              </p>
              <p className="text-sm text-gray-400">
                {activeTab === '전체' && '진행자가 공유한 링크로 공동구매에 참여해보세요!'}
                {activeTab === '참여' && '공동구매에 주문해보세요!'}
                {activeTab === '미참여' && '공동구매 링크로 접속해보세요!'}
              </p>
            </div>
            )
          })()}
        </div>
      </div>
    </AuthGuard>
  )
}
