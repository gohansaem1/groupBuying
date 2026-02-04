'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import NavigationHeader from '@/components/NavigationHeader'
import { getGroup, getGroupOrders, Group, Order } from '@/lib/firebase/groups'
import { getCurrentUserProfile, UserProfile } from '@/lib/firebase/auth'
import { markShipping, markComplete, deleteGroup, updateGroupDates, confirmGroup, cancelConfirmGroup } from '@/lib/firebase/groups'
import { createGroupStatusChangeNotification } from '@/lib/firebase/notifications'
import { formatDate, formatDateTime, isApproaching } from '@/lib/utils/date'

export default function AdminGroupDetailPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = params.id as string
  
  const [group, setGroup] = useState<Group | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [orderPageSize, setOrderPageSize] = useState<number>(10) // 주문 목록 페이지당 항목 수
  const [orderCurrentPage, setOrderCurrentPage] = useState<number>(1) // 주문 목록 현재 페이지
  const [orderSortOrder, setOrderSortOrder] = useState<'최신순' | '과거순'>('최신순') // 주문 목록 정렬 순서
  const [editingDates, setEditingDates] = useState(false) // 날짜 수정 모드
  const [editStartDate, setEditStartDate] = useState('')
  const [editEndDate, setEditEndDate] = useState('')

  useEffect(() => {
    loadData()
  }, [groupId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [groupData, ordersData, profile] = await Promise.all([
        getGroup(groupId),
        getGroupOrders(groupId),
        getCurrentUserProfile()
      ])
      setGroup(groupData)
      setOrders(ordersData)
      setUserProfile(profile)
    } catch (error) {
      console.error('데이터 로드 오류:', error)
      alert('데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!group) return
    
    if (!confirm('정말로 확정 처리하시겠습니까?')) {
      return
    }
    
    setProcessing(true)
    try {
      await confirmGroup(groupId)
      
      // 알림 생성
      await createGroupStatusChangeNotification(groupId, group.title, group.status, '확정')
      
      alert('확정 처리되었습니다.')
      await loadData()
    } catch (error: any) {
      console.error('확정 처리 오류:', error)
      alert(error.message || '확정 처리에 실패했습니다.')
    } finally {
      setProcessing(false)
    }
  }

  const handleCancelConfirm = async () => {
    if (!group) return
    
    if (!confirm('정말로 확정을 취소하시겠습니까?')) {
      return
    }
    
    setProcessing(true)
    try {
      await cancelConfirmGroup(groupId)
      
      // 알림 생성
      await createGroupStatusChangeNotification(groupId, group.title, group.status, '달성')
      
      alert('확정이 취소되었습니다.')
      await loadData()
    } catch (error: any) {
      console.error('확정 취소 오류:', error)
      alert(error.message || '확정 취소에 실패했습니다.')
    } finally {
      setProcessing(false)
    }
  }

  const handleStatusChange = async (newStatus: '배송중' | '완료') => {
    if (!group) return
    
    const oldStatus = group.status
    const statusMessages = {
      '배송중': '배송준비',
      '완료': '배송완료'
    }
    
    if (!confirm(`정말로 ${statusMessages[newStatus]}로 변경하시겠습니까?`)) {
      return
    }
    
    setProcessing(true)
    try {
      if (newStatus === '배송중') {
        await markShipping(groupId)
      } else if (newStatus === '완료') {
        await markComplete(groupId)
      }
      
      // 알림 생성
      await createGroupStatusChangeNotification(groupId, group.title, oldStatus, newStatus)
      
      alert(`${statusMessages[newStatus]}로 변경되었습니다.`)
      await loadData()
    } catch (error: any) {
      console.error('상태 변경 오류:', error)
      alert(error.message || '상태 변경에 실패했습니다.')
    } finally {
      setProcessing(false)
    }
  }

  const handleDelete = async () => {
    if (!group) return
    
    const orderCount = orders.length
    const warningMessage = orderCount > 0
      ? `정말로 "${group.title}" 공동구매 건을 삭제하시겠습니까?\n\n주의: 현재 ${orderCount}개의 주문이 있습니다. 공동구매 건과 모든 주문이 함께 삭제됩니다.`
      : `정말로 "${group.title}" 공동구매 건을 삭제하시겠습니까?`
    
    if (!confirm(warningMessage)) {
      return
    }
    
    // 재확인
    const finalConfirmMessage = orderCount > 0
      ? `삭제된 공동구매 건과 ${orderCount}개의 주문은 복구할 수 없습니다. 정말 삭제하시겠습니까?`
      : '삭제된 공동구매 건은 복구할 수 없습니다. 정말 삭제하시겠습니까?'
    
    if (!confirm(finalConfirmMessage)) {
      return
    }
    
    setProcessing(true)
    try {
      await deleteGroup(groupId)
      alert('공동구매 건이 삭제되었습니다.')
      router.push('/admin')
    } catch (error: any) {
      console.error('삭제 오류:', error)
      alert(error.message || '삭제에 실패했습니다.')
    } finally {
      setProcessing(false)
    }
  }

  const handleStartEditDates = () => {
    if (!group) return
    
    // 현재 날짜를 입력 필드에 설정
    if (group.startDate) {
      const startDate = group.startDate.toDate()
      setEditStartDate(startDate.toISOString().split('T')[0])
    }
    if (group.endDate) {
      const endDate = group.endDate.toDate()
      setEditEndDate(endDate.toISOString().split('T')[0])
    }
    setEditingDates(true)
  }

  const handleCancelEditDates = () => {
    setEditingDates(false)
    setEditStartDate('')
    setEditEndDate('')
  }

  const handleUpdateDates = async () => {
    if (!group) return
    
    setProcessing(true)
    try {
      const { Timestamp } = await import('firebase/firestore')
      
      const startDate = editStartDate ? Timestamp.fromDate(new Date(editStartDate)) : undefined
      const endDate = editEndDate ? Timestamp.fromDate(new Date(editEndDate)) : undefined
      
      await updateGroupDates(group.id, startDate, endDate)
      
      // 데이터 다시 로드
      await loadData()
      setEditingDates(false)
      alert('날짜가 성공적으로 변경되었습니다.')
    } catch (error: any) {
      alert(error.message || '날짜 변경에 실패했습니다.')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <AuthGuard allowedRoles={['admin']}>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-lg">로딩 중...</div>
        </div>
      </AuthGuard>
    )
  }

  if (!group) {
    return (
      <AuthGuard allowedRoles={['admin']}>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">공동구매 건을 찾을 수 없습니다</h2>
            <button
              onClick={() => router.push('/admin')}
              className="text-blue-600 hover:text-blue-800"
            >
              관리자 대시보드로 돌아가기
            </button>
          </div>
        </div>
      </AuthGuard>
    )
  }

  const progress = (group.currentTotal / group.minimumTotal) * 100
  const totalOrders = orders.length
  const totalAmount = orders.reduce((sum, order) => sum + order.totalPrice, 0)

  return (
    <AuthGuard allowedRoles={['admin']}>
      <div className="min-h-screen bg-gray-50">
        <NavigationHeader 
          userProfile={userProfile} 
          currentPage="admin"
          onProfileUpdate={async (updatedProfile) => {
            setUserProfile(updatedProfile)
          }}
        />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* 헤더 */}
          <div className="mb-6">
            <button
              onClick={() => router.push('/admin')}
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center mb-4"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              관리자 대시보드로 돌아가기
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{group.title}</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-2">{group.productName}</p>
          </div>

          {/* 공동구매 건 정보 */}
          <div className="bg-white rounded-xl shadow-md p-5 sm:p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">진행자</h3>
                <p className="text-base font-semibold text-gray-900">{group.organizerName}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">상태</h3>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  group.status === '진행중' ? 'bg-blue-100 text-blue-800' :
                  group.status === '달성' ? 'bg-yellow-100 text-yellow-800' :
                  group.status === '확정' ? 'bg-purple-100 text-purple-800' :
                  group.status === '배송중' ? 'bg-indigo-100 text-indigo-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {group.status}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">목표 금액</h3>
                <p className="text-base font-semibold text-gray-900">
                  {group.minimumTotal.toLocaleString()}원
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">현재 금액</h3>
                <p className="text-base font-semibold text-gray-900">
                  {group.currentTotal.toLocaleString()}원
                </p>
              </div>
            </div>

            {/* 진행 상태 단계 표시 */}
            <div className="mb-6">
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
                  const isActionable = (isCurrent && group.status === '확정') || (isCurrent && group.status === '배송중')
                  
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
                        {isActionable && (
                          <span className="text-xs mt-0.5 text-red-600 font-semibold animate-pulse">
                            {group.status === '확정' ? '배송준비' : '배송완료'}
                          </span>
                        )}
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
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                  현재: {group.currentTotal.toLocaleString()}원
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  목표: {group.minimumTotal.toLocaleString()}원
                  <span className="ml-1 text-blue-600 font-semibold">
                    ({progress.toFixed(1)}%)
                  </span>
                </span>
              </div>
              
              {/* 상태별 안내 문구 */}
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs sm:text-sm text-blue-800 text-center">
                  {group.status === '진행중' && '주문을 받고 있습니다. 진행자가 링크를 공유하여 참여자를 모집 중입니다.'}
                  {group.status === '달성' && '목표 금액을 달성했습니다. 진행자가 확정 처리할 때까지 대기하세요.'}
                  {group.status === '확정' && '확정되었습니다. 배송준비 버튼을 눌러 배송 준비를 시작하세요.'}
                  {group.status === '배송중' && '배송 준비 중입니다. 배송완료 버튼을 눌러 완료 처리하세요.'}
                  {group.status === '완료' && '배송이 완료되었습니다.'}
                </p>
              </div>
            </div>

            {/* 날짜 정보 */}
            {group && (group.startDate || group.endDate) && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">공동구매 일정</h3>
                  {!editingDates && (
                    <button
                      onClick={handleStartEditDates}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      수정
                    </button>
                  )}
                </div>
                
                {!editingDates ? (
                  <div className="space-y-2 text-sm">
                    {group.startDate && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 w-24 flex-shrink-0">시작일:</span>
                        <span className="text-gray-900 font-medium">{formatDate(group.startDate)}</span>
                      </div>
                    )}
                    {group.endDate && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 w-24 flex-shrink-0">주문 마감일:</span>
                        <span className={`font-medium ${isApproaching(group.endDate, 3) ? 'text-red-600' : 'text-gray-900'}`}>
                          {formatDate(group.endDate)}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <label className="text-gray-500 w-24 flex-shrink-0 text-sm">시작일:</label>
                      <input
                        type="date"
                        value={editStartDate}
                        onChange={(e) => setEditStartDate(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-gray-500 w-24 flex-shrink-0 text-sm">주문 마감일:</label>
                      <input
                        type="date"
                        value={editEndDate}
                        onChange={(e) => {
                          setEditEndDate(e.target.value)
                        }}
                        min={editStartDate || undefined}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={handleUpdateDates}
                        disabled={processing}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {processing ? '저장 중...' : '저장'}
                      </button>
                      <button
                        onClick={handleCancelEditDates}
                        disabled={processing}
                        className="px-4 py-2 bg-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 상태 변경 버튼 및 삭제 버튼 */}
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {group.status === '달성' && (
                  <button
                    onClick={handleConfirm}
                    disabled={processing}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    확정 처리
                  </button>
                )}
                {group.status === '확정' && (
                  <>
                    <button
                      onClick={handleCancelConfirm}
                      disabled={processing}
                      className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      확정 취소
                    </button>
                    <button
                      onClick={() => handleStatusChange('배송중')}
                      disabled={processing}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      배송준비
                    </button>
                  </>
                )}
                {group.status === '배송중' && (
                  <button
                    onClick={() => handleStatusChange('완료')}
                    disabled={processing}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    배송완료
                  </button>
                )}
              </div>
              <button
                onClick={handleDelete}
                disabled={processing || group.status === '확정' || group.status === '배송중' || group.status === '완료'}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
                title={group.status === '확정' || group.status === '배송중' || group.status === '완료' ? '확정 처리된 공동구매 건은 삭제할 수 없습니다.' : '공동구매 건 삭제'}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                삭제
              </button>
            </div>
          </div>

          {/* 품목별 주문 집계 */}
          {orders.length > 0 && (
            <div className="bg-white rounded-xl shadow-md p-5 sm:p-6 mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">품목별 주문 집계 (배송용)</h2>
              {(() => {
                // 품목별로 주문량 집계
                const productSummary = new Map<string, {
                  productName: string
                  unitPrice: number
                  totalQuantity: number
                  totalAmount: number
                }>()
                
                orders.forEach(order => {
                  const existing = productSummary.get(order.productId)
                  if (existing) {
                    existing.totalQuantity += order.quantity
                    existing.totalAmount += order.totalPrice
                  } else {
                    productSummary.set(order.productId, {
                      productName: order.productName,
                      unitPrice: order.unitPrice,
                      totalQuantity: order.quantity,
                      totalAmount: order.totalPrice
                    })
                  }
                })
                
                return (
                  <div className="space-y-3">
                    {Array.from(productSummary.values()).map((summary, idx) => (
                      <div
                        key={idx}
                        className="border border-gray-200 rounded-lg p-4 bg-blue-50"
                      >
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                          <div className="flex-1">
                            <p className="text-base font-bold text-gray-900 mb-1">{summary.productName}</p>
                            <p className="text-sm text-gray-600">
                              <span className="font-semibold text-blue-700">총 {summary.totalQuantity}개</span>
                              <span className="text-gray-500 mx-1">·</span>
                              <span>단가: {summary.unitPrice.toLocaleString()}원</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-blue-700">
                              {summary.totalAmount.toLocaleString()}원
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          )}

          {/* 주문 목록 - 사용자별 그룹화 */}
          <div className="bg-white rounded-xl shadow-md p-5 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">주문 목록</h2>
              <div className="text-sm text-gray-600">
                총 {totalOrders}건 / {totalAmount.toLocaleString()}원
              </div>
            </div>

            {orders.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">아직 주문이 없습니다.</p>
              </div>
            ) : (
              (() => {
              // 주문건별로 그룹화 (같은 userId와 같은 시간(초 단위)에 주문한 것들을 하나로 묶기)
              const ordersByGroup = new Map<string, Order[]>()
              orders.forEach(order => {
                const orderDate = order.createdAt?.toDate?.()
                if (!orderDate) {
                  // createdAt이 없으면 개별 주문으로 처리
                  ordersByGroup.set(order.id, [order])
                  return
                }
                
                // userId와 초 단위 시간을 기준으로 그룹 키 생성
                const groupKey = `${order.userId}_${Math.floor(orderDate.getTime() / 1000)}`
                const groupOrders = ordersByGroup.get(groupKey) || []
                groupOrders.push(order)
                ordersByGroup.set(groupKey, groupOrders)
              })

              // 정렬 및 페이지네이션
              const orderGroupsArray = Array.from(ordersByGroup.entries())
              const sortedOrderGroups = [...orderGroupsArray].sort((a, b) => {
                const aDate = a[1][0].createdAt?.toMillis() || 0
                const bDate = b[1][0].createdAt?.toMillis() || 0
                return orderSortOrder === '최신순' ? bDate - aDate : aDate - bDate
              })
              const totalOrderPages = Math.ceil(sortedOrderGroups.length / orderPageSize)
              const startOrderIndex = (orderCurrentPage - 1) * orderPageSize
              const paginatedOrderGroups = sortedOrderGroups.slice(startOrderIndex, startOrderIndex + orderPageSize)

              return (
                <>
                  {/* 주문 목록 정렬 및 페이지네이션 컨트롤 */}
                  {sortedOrderGroups.length > 0 && (
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
                        전체 {sortedOrderGroups.length}개 중 {startOrderIndex + 1}-{Math.min(startOrderIndex + orderPageSize, sortedOrderGroups.length)}개 표시
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {paginatedOrderGroups.map(([groupKey, orderGroup], groupIdx) => {
                      const firstOrder = orderGroup[0]
                      const totalAmount = orderGroup.reduce((sum, o) => sum + o.totalPrice, 0)
                      const totalQuantity = orderGroup.reduce((sum, o) => sum + o.quantity, 0)
                      const productCount = new Set(orderGroup.map(o => o.productId)).size // 품목 종류 개수
                      const orderDate = firstOrder.createdAt?.toDate?.()

                      return (
                        <div
                          key={groupIdx}
                          className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-gray-900">{firstOrder.userName}</p>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  firstOrder.status === '주문완료' ? 'bg-blue-100 text-blue-800' :
                                  firstOrder.status === '확정' ? 'bg-purple-100 text-purple-800' :
                                  firstOrder.status === '배송중' ? 'bg-indigo-100 text-indigo-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {firstOrder.status}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">
                                품목 {productCount}종 · 주문 {totalQuantity}개 · {totalAmount.toLocaleString()}원
                                {orderDate && (
                                  <span className="ml-2 text-gray-500">
                                    · {formatDateTime(orderDate)}
                                  </span>
                                )}
                              </p>
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
              })()
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
