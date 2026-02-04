'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { onAuthChange } from '@/lib/firebase/auth'
import { User } from 'firebase/auth'
import { getCurrentUserProfile, UserProfile } from '@/lib/firebase/auth'
import { getGroup, Group, GroupMenuItem, recordGroupVisit } from '@/lib/firebase/groups'
import { getGroupOrders, Order, createMultipleOrders, updateUserOrder, cancelOrder, cancelUserOrdersInGroup } from '@/lib/firebase/groups'
import NavigationHeader from '@/components/NavigationHeader'
import { formatDate, formatDateTime, formatTimeRemaining, isApproaching } from '@/lib/utils/date'

export default function GroupDetailPage() {
  const router = useRouter()
  const params = useParams()
  const groupId = params.id as string
  
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [group, setGroup] = useState<Group | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [cart, setCart] = useState<Map<string, number>>(new Map()) // 메뉴 아이템 ID -> 수량
  const [loading, setLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set()) // 열린 주문 내역 주문건 키
  const [orderPageSize, setOrderPageSize] = useState<number>(10) // 주문 목록 페이지당 항목 수
  const [orderCurrentPage, setOrderCurrentPage] = useState<number>(1) // 주문 목록 현재 페이지
  const [orderSortOrder, setOrderSortOrder] = useState<'최신순' | '과거순'>('최신순') // 주문 목록 정렬 순서
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null) // 수정 중인 주문 ID
  const [editingQuantity, setEditingQuantity] = useState<number>(1) // 수정 중인 수량
  const [selectedProductForAdd, setSelectedProductForAdd] = useState<Map<string, string>>(new Map()) // 주문건 키 -> 선택된 상품 ID
  const [addProductQuantity, setAddProductQuantity] = useState<Map<string, number>>(new Map()) // 주문건 키 -> 추가할 수량
  const [timeRemaining, setTimeRemaining] = useState<string>('') // 주문 마감일까지 남은 시간

  // 인증 상태 확인
  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      setUser(user)
      if (user) {
        const profile = await getCurrentUserProfile()
        setUserProfile(profile)
        // 일반 사용자가 아니면 리다이렉트
        if (profile && profile.role !== 'user') {
          if (profile.role === 'admin') {
            router.push('/admin')
          } else if (profile.role === 'organizer' || profile.role === 'organizer_pending') {
            router.push('/organizer')
          }
        }
      } else {
        setUserProfile(null)
        // 로그인하지 않은 경우 로그인 페이지로 리다이렉트 (returnUrl 포함)
        const returnUrl = `/groups/${groupId}`
        router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`)
      }
      setAuthLoading(false)
    })

    return () => unsubscribe()
  }, [groupId, router])

  useEffect(() => {
    // 인증이 완료된 후에만 데이터 로드 및 접속 기록 저장
    if (!authLoading && user && userProfile) {
      // 일반 사용자만 상세 페이지에서 주문 가능
      if (userProfile.role === 'user') {
        loadData()
      }
      // 모든 역할에서 접속 기록 저장
      recordGroupVisit(user.uid, groupId).catch((err: any) => {
        console.error('접속 기록 저장 실패:', err)
      })
    }
  }, [groupId, authLoading, user, userProfile])

  // 실시간 카운트다운 업데이트 (1분마다)
  useEffect(() => {
    if (!group || !group.endDate || group.status !== '진행중') {
      setTimeRemaining('')
      return
    }

    const updateTimeRemaining = () => {
      setTimeRemaining(formatTimeRemaining(group.endDate))
    }

    // 즉시 업데이트
    updateTimeRemaining()

    // 1분마다 업데이트
    const interval = setInterval(updateTimeRemaining, 60000)

    return () => clearInterval(interval)
  }, [group])

  const loadData = async (preserveScrollPosition?: number) => {
    // 스크롤 위치 저장 (파라미터가 없으면 현재 위치 사용)
    const scrollPosition = preserveScrollPosition !== undefined ? preserveScrollPosition : window.scrollY
    
    setLoading(true)
    try {
      const [groupData, ordersData] = await Promise.all([
        getGroup(groupId),
        getGroupOrders(groupId)
      ])
      
      if (groupData) {
        setGroup(groupData)
        // 하위 호환성: 기존 데이터는 menuItems가 없을 수 있음
        if (!groupData.menuItems || groupData.menuItems.length === 0) {
          setError('이 공동구매 건은 상품이 구성되지 않았습니다.')
        }
      } else {
        setError('공동구매 건을 찾을 수 없습니다.')
      }
      
      setOrders(ordersData)
      
      // 데이터 로드 후 스크롤 위치 복원
      setTimeout(() => {
        window.scrollTo({ top: scrollPosition, behavior: 'auto' })
      }, 100)
    } catch (error) {
      console.error('데이터 로드 오류:', error)
      setError('데이터를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 메뉴 아이템 수량 증가
  const increaseMenuItemQuantity = (menuItemId: string) => {
    const newCart = new Map(cart)
    const currentQty = newCart.get(menuItemId) || 0
    newCart.set(menuItemId, currentQty + 1)
    setCart(newCart)
    setError(null)
  }

  // 메뉴 아이템 수량 감소
  const decreaseMenuItemQuantity = (menuItemId: string) => {
    const newCart = new Map(cart)
    const currentQty = newCart.get(menuItemId) || 0
    if (currentQty > 1) {
      newCart.set(menuItemId, currentQty - 1)
    } else {
      newCart.delete(menuItemId)
    }
    setCart(newCart)
    setError(null)
  }

  // 메뉴 아이템 제거
  const removeMenuItem = (menuItemId: string) => {
    const newCart = new Map(cart)
    newCart.delete(menuItemId)
    setCart(newCart)
    setError(null)
  }

  // 장바구니 총액 계산
  const getCartTotal = (): number => {
    if (!group || !group.menuItems) return 0
    let total = 0
    cart.forEach((quantity, menuItemId) => {
      const menuItem = group.menuItems.find(item => item.productId === menuItemId)
      if (menuItem) {
        total += quantity * menuItem.productPrice
      }
    })
    return total
  }

  const handleStartEdit = (order: Order) => {
    setEditingOrderId(order.id)
    setEditingQuantity(order.quantity)
  }

  const handleCancelEdit = () => {
    setEditingOrderId(null)
    setEditingQuantity(1)
  }

  const handleUpdateOrder = async (order: Order) => {
    if (!user) return
    
    // 스크롤 위치 저장
    const scrollPosition = window.scrollY
    
    if (editingQuantity < 1) {
      alert('수량은 1개 이상이어야 합니다.')
      return
    }

    setSubmitting(true)
    try {
      await updateUserOrder(order.id, user.uid, editingQuantity, order.unitPrice)
      setEditingOrderId(null)
      loadData(scrollPosition)
    } catch (error: any) {
      alert(error.message || '주문 수정에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteOrder = async (order: Order) => {
    if (!user) return

    // 스크롤 위치 저장
    const scrollPosition = window.scrollY

    setSubmitting(true)
    try {
      await cancelOrder(order.id, user.uid)
      loadData(scrollPosition)
    } catch (error: any) {
      alert(error.message || '주문 취소에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteOrderGroup = async (orderGroup: Order[]) => {
    if (!user || !orderGroup.length) return

    const firstOrder = orderGroup[0]
    if (firstOrder.userId !== user.uid) {
      alert('자신의 주문만 삭제할 수 있습니다.')
      return
    }

    // 스크롤 위치 저장
    const scrollPosition = window.scrollY

    setSubmitting(true)
    try {
      // 해당 주문건의 주문들만 삭제
      const { writeBatch, doc } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase/config')
      const batch = writeBatch(db)
      
      // 그룹 정보 가져오기 (최소 구매 조건 체크용)
      const { getDoc } = await import('firebase/firestore')
      const groupRef = doc(db, 'groups', firstOrder.groupId)
      const groupSnap = await getDoc(groupRef)
      
      if (!groupSnap.exists()) {
        throw new Error('공동구매 건을 찾을 수 없습니다.')
      }
      
      const group = groupSnap.data()
      
      // 해당 사용자의 모든 주문 조회 (주문완료 상태만)
      const { collection, query, where, getDocs } = await import('firebase/firestore')
      const ordersRef = collection(db, 'orders')
      const userOrdersQuery = query(
        ordersRef,
        where('groupId', '==', firstOrder.groupId),
        where('userId', '==', user.uid),
        where('status', '==', '주문완료')
      )
      const userOrdersSnap = await getDocs(userOrdersQuery)
      const allUserOrders = userOrdersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order))
      
      // 삭제할 주문 ID들
      const orderIdsToDelete = new Set(orderGroup.map(o => o.id))
      
      // 삭제 후 남을 주문들의 총액 계산
      const remainingOrdersTotal = allUserOrders
        .filter(o => !orderIdsToDelete.has(o.id))
        .reduce((sum, o) => sum + o.totalPrice, 0)
      
      // 최소 구매 금액 체크 (주문자별 최소 주문 금액 10,000원)
      const MIN_USER_ORDER_AMOUNT = 10000
      if (remainingOrdersTotal < MIN_USER_ORDER_AMOUNT) {
        throw new Error(`최소 주문 금액은 ${MIN_USER_ORDER_AMOUNT.toLocaleString()}원입니다. 삭제 후 주문 금액: ${remainingOrdersTotal.toLocaleString()}원`)
      }
      
      // 삭제할 주문들의 총액 계산
      const totalPriceToDeduct = orderGroup.reduce((sum, o) => sum + o.totalPrice, 0)
      
      // 주문 삭제
      for (const order of orderGroup) {
        const orderRef = doc(db, 'orders', order.id)
        batch.delete(orderRef)
      }
      
      await batch.commit()
      
      // 그룹 총액 업데이트
      const { updateDoc, serverTimestamp } = await import('firebase/firestore')
      const newTotal = Math.max(0, group.currentTotal - totalPriceToDeduct)
      
      const statusUpdates: any = {
        currentTotal: newTotal,
        updatedAt: serverTimestamp(),
      }
      
      // 최소 금액 미달성 시 상태 변경 (확정 상태 이전만 가능)
      if (newTotal < group.minimumTotal && (group.status === '달성' || group.status === '진행중')) {
        statusUpdates.status = '진행중'
      }
      
      await updateDoc(groupRef, statusUpdates)
      
      // 감사 로그 기록
      const { getCurrentUserProfile } = await import('@/lib/firebase/auth')
      const userProfile = await getCurrentUserProfile()
      const userName = userProfile?.nickname || userProfile?.displayName
      const { logOrderCancelled } = await import('@/lib/firebase/auditLogs')
      
      for (const order of orderGroup) {
        await logOrderCancelled(
          user.uid,
          userName || undefined,
          order.id,
          order.productName,
          order.quantity,
          order.totalPrice,
          { reason: '주문건 삭제', orderGroup: true }
        )
      }
      
      loadData(scrollPosition)
    } catch (error: any) {
      alert(error.message || '주문 삭제에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddProductToOrder = async (orderGroup: Order[], groupKey: string) => {
    if (!user || !orderGroup.length) return

    const firstOrder = orderGroup[0]
    if (firstOrder.userId !== user.uid) {
      alert('자신의 주문에만 상품을 추가할 수 있습니다.')
      return
    }

    // 스크롤 위치 저장
    const scrollPosition = window.scrollY

    const selectedProductId = selectedProductForAdd.get(groupKey)
    const quantity = addProductQuantity.get(groupKey) || 1

    if (!selectedProductId || !group || !group.menuItems) {
      alert('상품을 선택해주세요.')
      return
    }

    if (quantity < 1) {
      alert('수량은 1개 이상이어야 합니다.')
      return
    }

    const menuItem = group.menuItems.find(item => item.productId === selectedProductId)
    if (!menuItem) {
      alert('선택한 상품을 찾을 수 없습니다.')
      return
    }

    // 동일 상품이 있는지 확인
    const existingOrder = orderGroup.find(o => o.productId === menuItem.productId && o.status === '주문완료')
    
    setSubmitting(true)
    try {
      if (existingOrder) {
        // 기존 주문의 수량 증가 (상품 추가)
        await updateUserOrder(
          existingOrder.id, 
          user.uid, 
          existingOrder.quantity + quantity, 
          existingOrder.unitPrice,
          { action: 'product_added', addedQuantity: quantity, productName: menuItem.productName }
        )
      } else {
        // 기존 주문건에 새 상품 추가 (같은 createdAt 사용)
        const userProfile = await getCurrentUserProfile()
        if (!userProfile) {
          throw new Error('로그인이 필요합니다.')
        }

        // 기존 주문건의 createdAt 사용
        const existingCreatedAt = firstOrder.createdAt

        const orderData = [{
          groupId: group.id,
          userId: userProfile.uid,
          userName: userProfile.nickname || userProfile.displayName || '사용자',
          productId: menuItem.productId,
          productName: menuItem.productName,
          quantity: quantity,
          unitPrice: menuItem.productPrice,
        }]

        await createMultipleOrders(orderData, existingCreatedAt)
      }
      
      // 상태 초기화
      const newSelected = new Map(selectedProductForAdd)
      newSelected.delete(groupKey)
      setSelectedProductForAdd(newSelected)
      
      const newQuantity = new Map(addProductQuantity)
      newQuantity.delete(groupKey)
      setAddProductQuantity(newQuantity)
      
      loadData(scrollPosition)
    } catch (error: any) {
      alert(error.message || '주문 추가에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  // 주문 처리
  const handleOrder = async () => {
    if (!group || !group.menuItems || cart.size === 0) {
      setError('주문할 상품을 선택해주세요.')
      return
    }
    
    // 스크롤 위치 저장
    const scrollPosition = window.scrollY
    
    setSubmitting(true)
    setError(null)
    
    try {
      const userProfile = await getCurrentUserProfile()
      if (!userProfile) {
        throw new Error('로그인이 필요합니다.')
      }
      
      // 주문 데이터 생성
      const orderData = Array.from(cart.entries())
        .map(([productId, quantity]) => {
          const menuItem = group.menuItems.find(item => item.productId === productId)
          if (!menuItem) return null
          
          return {
            groupId: group.id,
            userId: userProfile.uid,
            userName: userProfile.nickname || userProfile.displayName || '사용자',
            productId: menuItem.productId,
            productName: menuItem.productName,
            quantity,
            unitPrice: menuItem.productPrice,
          }
        })
        .filter(Boolean) as Array<{
          groupId: string
          userId: string
          userName: string
          productId: string
          productName: string
          quantity: number
          unitPrice: number
        }>
      
      if (orderData.length === 0) {
        throw new Error('주문할 상품이 없습니다.')
      }
      
      // 최소 주문 금액 체크 (전체 합계)
      const totalPrice = getCartTotal()
      if (totalPrice < 10000) {
        throw new Error('최소 주문 금액은 10,000원입니다.')
      }
      
      await createMultipleOrders(orderData)
      
      setCart(new Map())
      
      // 데이터 로드 후 스크롤 위치 복원
      await loadData(scrollPosition)
    } catch (err: any) {
      setError(err.message || '주문에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  // 인증 로딩 중
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    )
  }

  // 로그인하지 않은 경우 (리다이렉트 중)
  if (!user || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">로그인 페이지로 이동 중...</div>
      </div>
    )
  }

  // 일반 사용자가 아닌 경우 (리다이렉트 중)
  if (userProfile.role !== 'user') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">이동 중...</div>
      </div>
    )
  }

  // 데이터 로딩 중
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    )
  }

  // 그룹을 찾을 수 없는 경우
  if (!group || !group.menuItems || group.menuItems.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">공동구매 건을 찾을 수 없습니다.</div>
          <p className="text-gray-600 text-sm">링크가 올바른지 확인해주세요.</p>
        </div>
      </div>
    )
  }

  const progress = (group.currentTotal / group.minimumTotal) * 100
  const cartTotal = getCartTotal()

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader 
        userProfile={userProfile}
        onProfileUpdate={async (updatedProfile) => {
          setUserProfile(updatedProfile)
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 뒤로가기 버튼 */}
        <button
          onClick={() => {
            // 이전 페이지가 있으면 뒤로가기, 없으면 내 공동구매 목록으로
            if (window.history.length > 1) {
              router.back()
            } else {
              router.push('/my-groups')
            }
          }}
          className="text-sm text-gray-600 hover:text-gray-900 flex items-center mb-4"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          뒤로가기
        </button>

        {/* 상품 정보 카드 */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="md:flex">
            {/* 상품 이미지 영역 (플레이스홀더) */}
            <div className="md:w-1/3 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8 sm:p-12">
              <div className="text-center">
                <svg className="w-24 h-24 sm:w-32 sm:h-32 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p className="text-sm text-gray-500">상품 이미지</p>
              </div>
            </div>
            
            {/* 공동구매 건 정보 */}
            <div className="md:w-2/3 p-6 sm:p-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">{group.title}</h1>
              <p className="text-gray-600 mb-6 leading-relaxed">
                {group.menuItems.length}개의 상품이 준비되어 있습니다.
              </p>
              
              {/* 진행 상태 단계 표시 */}
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
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>현재: {group.currentTotal.toLocaleString()}원</span>
                  <span>
                    목표: {group.minimumTotal.toLocaleString()}원
                    <span className="ml-1 text-blue-600 font-semibold">
                      ({progress.toFixed(1)}%)
                    </span>
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {group.minimumTotal - group.currentTotal > 0
                    ? `목표까지 ${(group.minimumTotal - group.currentTotal).toLocaleString()}원 남았습니다.`
                    : '🎉 목표 금액을 달성했습니다!'}
                </p>
              </div>
              
              {/* 상태별 안내 문구 */}
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs sm:text-sm text-blue-800 text-center">
                  {group.status === '진행중' && '주문을 받고 있습니다. 원하는 상품을 선택하여 주문하세요.'}
                  {group.status === '달성' && '목표 금액을 달성했습니다. 주문이 가능합니다.'}
                  {group.status === '확정' && '확정되었습니다. 주문이 불가능합니다. 관리자가 배송준비로 변경할 때까지 대기하세요.'}
                  {group.status === '배송중' && '배송 준비 중입니다. 관리자가 배송완료로 변경할 때까지 대기하세요.'}
                  {group.status === '완료' && '배송이 완료되었습니다.'}
                </p>
              </div>
              
              {/* 날짜 정보 */}
              {group && (group.startDate || group.endDate) && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">공동구매 일정</h3>
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
                        {group.status === '진행중' && timeRemaining && (
                          <span className={`text-xs ml-2 font-medium ${
                            isApproaching(group.endDate, 1) ? 'text-red-600' : 
                            isApproaching(group.endDate, 3) ? 'text-orange-600' : 
                            'text-blue-600'
                          }`}>
                            ({timeRemaining} 남음)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* 수령방법 정보 */}
                  {group.deliveryMethod && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">수령방법</h3>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <span className="text-gray-500 text-sm w-20 flex-shrink-0">방법:</span>
                          <span className="text-gray-900 font-medium text-sm">{group.deliveryMethod}</span>
                        </div>
                        {group.deliveryDescription && (
                          <div className="flex items-start gap-2">
                            <span className="text-gray-500 text-sm w-20 flex-shrink-0">상세:</span>
                            <p className="text-gray-700 text-sm whitespace-pre-line">{group.deliveryDescription}</p>
                          </div>
                        )}
                        {group.deliveryLocation && (
                          <div className="flex items-start gap-2">
                            <span className="text-gray-500 text-sm w-20 flex-shrink-0">장소:</span>
                            <span className="text-gray-700 text-sm">{group.deliveryLocation}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* 진행자 정보 */}
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-4">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>진행자: {group.organizerName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 주문 섹션 - 상품목록 방식 */}
        {(group.status === '진행중' || group.status === '달성') ? (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold mb-6">상품목록</h2>
            
              {/* 상품 목록 - 한 열로 표시 */}
              <div className="space-y-1.5 mb-4">
              {group.menuItems.map((menuItem) => {
                const quantity = cart.get(menuItem.productId) || 0
                return (
                  <div
                    key={menuItem.productId}
                    className={`flex gap-2 border rounded-lg p-2 transition-all ${
                      quantity > 0
                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {/* 상품 정보 */}
                    <div className="flex-1 flex flex-col justify-between gap-1">
                      {/* 상단: 상품명 및 용량 */}
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 leading-tight">{menuItem.productName}</h3>
                        {menuItem.capacity && (
                          <p className="text-xs text-gray-600 mt-0.5">{menuItem.capacity}</p>
                        )}
                      </div>
                      
                      {/* 중간: 가격 정보 */}
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-gray-400 line-through text-xs">
                          {menuItem.listPrice.toLocaleString()}원
                        </span>
                        <span className="text-sm font-bold text-red-600">
                          {menuItem.productPrice.toLocaleString()}원
                        </span>
                        {menuItem.discountRate > 0 && (
                          <span className="text-xs bg-red-100 text-red-700 px-1 py-0.5 rounded">
                            {menuItem.discountRate}% 할인
                          </span>
                        )}
                      </div>
                      
                      {/* 하단: 수량 조절 */}
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => decreaseMenuItemQuantity(menuItem.productId)}
                          disabled={quantity === 0}
                          className="w-6 h-6 rounded-full bg-white border border-gray-300 hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                        >
                          <svg className="w-3 h-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={quantity}
                          onChange={(e) => {
                            const newQuantity = Math.max(0, parseInt(e.target.value) || 0)
                            const newCart = new Map(cart)
                            if (newQuantity === 0) {
                              newCart.delete(menuItem.productId)
                            } else {
                              newCart.set(menuItem.productId, newQuantity)
                            }
                            setCart(newCart)
                            setError(null)
                          }}
                          className="w-12 text-sm font-bold text-gray-900 text-center border border-gray-300 bg-white rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          onClick={() => increaseMenuItemQuantity(menuItem.productId)}
                          className="w-6 h-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 장바구니 요약 및 주문하기 */}
            {cart.size > 0 && (
              <div className="border-t border-gray-200 pt-3">
                <h3 className="text-base font-semibold mb-2">주문 내역</h3>
                <div className="space-y-1.5 mb-3">
                  {Array.from(cart.entries()).map(([productId, quantity]) => {
                    const menuItem = group.menuItems.find(item => item.productId === productId)
                    if (!menuItem) return null
                    return (
                      <div key={productId} className="flex justify-between items-center text-sm">
                        <span className="text-gray-700">
                          {menuItem.productName} × {quantity}개
                        </span>
                        <span className="font-semibold text-gray-900">
                          {(quantity * menuItem.productPrice).toLocaleString()}원
                        </span>
                      </div>
                    )
                  })}
                </div>
                
                <div className="flex justify-between items-center mb-3 pt-3 border-t border-gray-200">
                  <span className="text-base font-semibold text-gray-900">총 주문 금액</span>
                  <span className="text-2xl sm:text-3xl font-bold text-blue-600">
                    {cartTotal.toLocaleString()}원
                  </span>
                </div>
                
                {cartTotal < 10000 && (
                  <p className="text-red-500 text-xs mb-2">
                    최소 주문 금액은 10,000원입니다. (현재: {cartTotal.toLocaleString()}원)
                  </p>
                )}
                
                {error && (
                  <p className="text-red-500 text-xs mb-2">{error}</p>
                )}
                
                <button
                  onClick={handleOrder}
                  disabled={submitting || cartTotal < 10000 || cart.size === 0}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 sm:py-5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg sm:text-xl shadow-lg"
                >
                  {submitting ? (
                    <span className="inline-flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      주문 중...
                    </span>
                  ) : (
                    `주문하기 (${cart.size}개 상품)`
                  )}
                </button>
                
                <p className="text-xs text-gray-500 mt-3 text-center">
                  * 결제는 수동 계좌이체로 진행됩니다.
                </p>
              </div>
            )}

            {cart.size === 0 && (
              <div className="text-center py-8 text-gray-400">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <p>장바구니가 비어있습니다.</p>
                  <p className="text-sm mt-2">위의 상품목록에서 상품을 선택하고 수량을 추가하세요.</p>
              </div>
            )}
          </div>
        ) : null}

        {/* 주문 목록 - 사용자별 그룹화 */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold">주문 목록</h2>
            {orders.length > 0 && (
              <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                총 {orders.length}건
              </span>
            )}
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
                    const orderDate = firstOrder.createdAt?.toDate?.()
                    // 주문건 내 모든 주문 중 가장 최근의 updatedAt 찾기
                    const latestUpdatedAt = orderGroup.reduce((latest, o) => {
                      const oUpdatedAt = o.updatedAt?.toDate?.()
                      if (!oUpdatedAt) return latest
                      if (!latest) return oUpdatedAt
                      return oUpdatedAt.getTime() > latest.getTime() ? oUpdatedAt : latest
                    }, null as Date | null)
                    const updatedDate = latestUpdatedAt
                    const isModified = updatedDate && orderDate && updatedDate.getTime() > orderDate.getTime() + 1000 // 1초 이상 차이면 수정된 것으로 간주
                    const isMyOrder = user && firstOrder.userId === user.uid
                    const hasEditableOrders = orderGroup.some(o => o.status === '주문완료' && isMyOrder)
                    const isExpanded = expandedOrders.has(groupKey)
                    const selectedProductId = selectedProductForAdd.get(groupKey)
                    const addQuantity = addProductQuantity.get(groupKey) || 1
                    const selectedMenuItem = selectedProductId && group && group.menuItems
                      ? group.menuItems.find(item => item.productId === selectedProductId)
                      : null
                    const previewTotal = selectedMenuItem ? selectedMenuItem.productPrice * addQuantity : 0

                    return (
                      <div
                        key={groupIdx}
                        className="border border-gray-200 rounded-lg overflow-hidden bg-white"
                      >
                        <div className="bg-gray-50 p-4">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-gray-900">{firstOrder.userName}</p>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  firstOrder.status === '주문완료' ? 'bg-blue-500 text-white' :
                                  firstOrder.status === '확정' ? 'bg-purple-500 text-white' :
                                  firstOrder.status === '배송중' ? 'bg-indigo-500 text-white' :
                                  'bg-green-500 text-white'
                                }`}>
                                  {firstOrder.status}
                                </span>
                              </div>
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
                            {hasEditableOrders && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (confirm('이 주문건을 모두 삭제하시겠습니까?')) {
                                    handleDeleteOrderGroup(orderGroup)
                                  }
                                }}
                                disabled={submitting}
                                className="px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
                              >
                                주문건 삭제
                              </button>
                            )}
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
                                      const isEditing = editingOrderId === order.id
                                      const canEdit = order.status === '주문완료' && isMyOrder
                                      const orderCreatedAt = order.createdAt?.toDate?.()
                                      const orderUpdatedAt = order.updatedAt?.toDate?.()
                                      const isOrderModified = orderUpdatedAt && orderCreatedAt && orderUpdatedAt.getTime() > orderCreatedAt.getTime() + 1000
                                      
                                      return (
                                        <div key={order.id || idx} className="flex items-center justify-between text-sm">
                                        {isEditing ? (
                                          <div className="flex-1 flex items-center gap-2">
                                            <span className="font-medium text-gray-700" title={order.productName}>
                                              {order.productName.length > 8 ? `${order.productName.substring(0, 8)}...` : order.productName}
                                            </span>
                                            <span className="text-gray-500">×</span>
                                            <input
                                              type="number"
                                              min="1"
                                              value={editingQuantity}
                                              onChange={(e) => setEditingQuantity(Number(e.target.value))}
                                              onClick={(e) => e.stopPropagation()}
                                              onFocus={(e) => e.stopPropagation()}
                                              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                                              disabled={submitting}
                                            />
                                            <span className="text-gray-600">개</span>
                                            <span className="text-gray-500">
                                              = {(editingQuantity * order.unitPrice).toLocaleString()}원
                                            </span>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                handleUpdateOrder(order)
                                              }}
                                              disabled={submitting}
                                              className="ml-2 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                                            >
                                              저장
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                handleCancelEdit()
                                              }}
                                              disabled={submitting}
                                              className="px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400 disabled:opacity-50"
                                            >
                                              취소
                                            </button>
                                          </div>
                                        ) : (
                                          <>
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
                                              {canEdit && (
                                                <div className="flex items-center gap-1 ml-2">
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation()
                                                      handleStartEdit(order)
                                                    }}
                                                    className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                                                    title="수정"
                                                  >
                                                    수정
                                                  </button>
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation()
                                                      handleDeleteOrder(order)
                                                    }}
                                                    className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                                                    title="삭제"
                                                  >
                                                    삭제
                                                  </button>
                                                </div>
                                              )}
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    )
                                  })}

                                  {/* 상품 추가 섹션 (자신의 주문이고 주문완료 상태일 때만) */}
                                  {hasEditableOrders && group && group.menuItems && (
                                    <div className="flex items-center justify-between text-sm py-2 border-t border-blue-200">
                                      <div className="flex-1 flex items-center gap-2 text-gray-700 flex-wrap">
                                        {/* 상품 선택 */}
                                        {selectedMenuItem ? (
                                          <>
                                            <span className="font-medium" title={selectedMenuItem.productName}>
                                              {selectedMenuItem.productName.length > 8 ? `${selectedMenuItem.productName.substring(0, 8)}...` : selectedMenuItem.productName}
                                            </span>
                                            <span className="text-gray-500">×</span>
                                            <input
                                              type="number"
                                              min="1"
                                              value={addQuantity}
                                              onChange={(e) => {
                                                const newQuantity = new Map(addProductQuantity)
                                                newQuantity.set(groupKey, Math.max(1, Number(e.target.value)))
                                                setAddProductQuantity(newQuantity)
                                              }}
                                              onClick={(e) => e.stopPropagation()}
                                              onFocus={(e) => e.stopPropagation()}
                                              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                                              disabled={submitting}
                                            />
                                            <span className="text-gray-600">개</span>
                                            <span className="text-gray-500">
                                              = {previewTotal.toLocaleString()}원
                                            </span>
                                          </>
                                        ) : (
                                          <select
                                            value={selectedProductId || ''}
                                            onChange={(e) => {
                                              const newSelected = new Map(selectedProductForAdd)
                                              newSelected.set(groupKey, e.target.value)
                                              setSelectedProductForAdd(newSelected)
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
                                          >
                                            <option value="">상품 선택</option>
                                            {group.menuItems.map((menuItem) => (
                                              <option key={menuItem.productId} value={menuItem.productId}>
                                                {menuItem.productName.length > 8 ? `${menuItem.productName.substring(0, 8)}...` : menuItem.productName} - {menuItem.productPrice.toLocaleString()}원
                                              </option>
                                            ))}
                                          </select>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1">
                                        {selectedMenuItem && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              const newSelected = new Map(selectedProductForAdd)
                                              newSelected.delete(groupKey)
                                              setSelectedProductForAdd(newSelected)
                                              const newQuantity = new Map(addProductQuantity)
                                              newQuantity.delete(groupKey)
                                              setAddProductQuantity(newQuantity)
                                            }}
                                            disabled={submitting}
                                            className="px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400 disabled:opacity-50"
                                          >
                                            취소
                                          </button>
                                        )}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleAddProductToOrder(orderGroup, groupKey)
                                          }}
                                          disabled={submitting || !selectedProductId}
                                          className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                          {submitting ? '추가 중...' : '추가'}
                                        </button>
                                      </div>
                                    </div>
                                  )}

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
            })()
          )}
        </div>
      </div>

    </div>
  )
}
