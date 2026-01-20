'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import { getGroup, Group } from '@/lib/firebase/groups'
import { getGroupOrders, Order, updateOrder, cancelOrder, createOrder } from '@/lib/firebase/groups'
import { getProduct, Product } from '@/lib/firebase/products'
import { getCurrentUserProfile, UserProfile } from '@/lib/firebase/auth'
import { confirmGroup } from '@/lib/firebase/groups'
import NavigationHeader from '@/components/NavigationHeader'

export default function OrganizerGroupDetailPage() {
  const router = useRouter()
  const params = useParams()
  const groupId = params.id as string
  
  const [group, setGroup] = useState<Group | null>(null)
  const [product, setProduct] = useState<Product | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingOrder, setEditingOrder] = useState<string | null>(null)
  const [editQuantity, setEditQuantity] = useState(1)
  const [orderQuantity, setOrderQuantity] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!groupId) return
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
      
      if (groupData) {
        setGroup(groupData)
        const productData = await getProduct(groupData.productId)
        setProduct(productData)
      }
      
      setOrders(ordersData)
      setUserProfile(profile)
    } catch (error: any) {
      console.error('데이터 로드 오류:', error)
      setError(error.message || '데이터를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleStartEdit = (order: Order) => {
    setEditingOrder(order.id)
    setEditQuantity(order.quantity)
    setError(null)
  }

  const handleCancelEdit = () => {
    setEditingOrder(null)
    setEditQuantity(1)
    setError(null)
  }

  const handleUpdateOrder = async (orderId: string) => {
    if (!group) return
    
    setSubmitting(true)
    setError(null)
    
    try {
      const totalPrice = editQuantity * group.productPrice
      
      if (totalPrice < 10000) {
        throw new Error('최소 주문 금액은 10,000원입니다.')
      }
      
      await updateOrder(orderId, editQuantity, group.productPrice)
      alert('주문이 수정되었습니다.')
      setEditingOrder(null)
      loadData()
    } catch (err: any) {
      setError(err.message || '주문 수정에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('정말로 이 주문을 취소하시겠습니까?')) {
      return
    }
    
    setSubmitting(true)
    setError(null)
    
    try {
      await cancelOrder(orderId)
      alert('주문이 취소되었습니다.')
      loadData()
    } catch (err: any) {
      setError(err.message || '주문 취소에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleOrder = async () => {
    if (!group || !product) return
    
    setSubmitting(true)
    setError(null)
    
    try {
      const userProfile = await getCurrentUserProfile()
      if (!userProfile) {
        throw new Error('로그인이 필요합니다.')
      }
      
      const totalPrice = orderQuantity * group.productPrice
      
      if (totalPrice < 10000) {
        throw new Error('최소 주문 금액은 10,000원입니다.')
      }
      
      await createOrder(
        group.id,
        userProfile.uid,
        userProfile.displayName || '사용자',
        product.id,
        product.name,
        orderQuantity,
        group.productPrice
      )
      
      alert('주문이 완료되었습니다.')
      setOrderQuantity(1)
      loadData()
    } catch (err: any) {
      setError(err.message || '주문에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirm = async () => {
    if (!group) return
    
    if (!confirm('공동구매 건을 확인완료 처리하시겠습니까?')) {
      return
    }
    
    setSubmitting(true)
    setError(null)
    
    try {
      await confirmGroup(group.id)
      alert('공동구매 건이 확인완료 처리되었습니다.')
      loadData()
    } catch (err: any) {
      setError(err.message || '확인 처리에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    )
  }

  if (!group || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">공동구매 건을 찾을 수 없습니다.</div>
          <button
            onClick={() => router.push('/organizer/my-orders')}
            className="text-blue-600 hover:text-blue-800 mt-4"
          >
            목록으로
          </button>
        </div>
      </div>
    )
  }

  const progress = Math.min((group.currentTotal / group.minimumTotal) * 100, 100)
  const totalOrdersAmount = orders.reduce((sum, order) => sum + order.totalPrice, 0)

  return (
    <AuthGuard allowedRoles={['organizer']}>
      <div className="min-h-screen bg-gray-50">
        <NavigationHeader userProfile={userProfile} currentPage="organizer" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <button
            onClick={() => router.push('/organizer/my-orders')}
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            목록으로
          </button>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* 공동구매 건 정보 */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h1 className="text-2xl font-bold mb-2">{group.title}</h1>
            <p className="text-lg text-gray-700 mb-2">{product.name}</p>
            <p className="text-gray-600 mb-4">{product.description}</p>
            <div className="mb-4">
              <span className="text-gray-500 line-through">{product.listPrice.toLocaleString()}원</span>
              <span className="ml-2 text-2xl font-semibold text-red-600">
                {group.productPrice.toLocaleString()}원
              </span>
            </div>
            
            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2">
                <span>주최자: {group.organizerName}</span>
                <span>{group.currentTotal.toLocaleString()}원 / {group.minimumTotal.toLocaleString()}원</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-blue-500 h-4 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {group.minimumTotal - group.currentTotal > 0
                  ? `목표까지 ${(group.minimumTotal - group.currentTotal).toLocaleString()}원 남았습니다.`
                  : '목표 금액을 달성했습니다!'}
              </p>
            </div>
            
            <div className="mt-4">
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                group.status === '진행중' ? 'bg-blue-100 text-blue-800' :
                group.status === '달성' ? 'bg-yellow-100 text-yellow-800' :
                group.status === '확인완료' ? 'bg-purple-100 text-purple-800' :
                group.status === '배송중' ? 'bg-indigo-100 text-indigo-800' :
                'bg-green-100 text-green-800'
              }`}>
                {group.status}
              </span>
            </div>

            {group.status === '달성' && (
              <div className="mt-4">
                <button
                  onClick={handleConfirm}
                  disabled={submitting}
                  className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  확인완료 처리
                </button>
              </div>
            )}
          </div>

          {/* 주문하기 (진행자도 주문 가능) */}
          {group.status === '진행중' || group.status === '달성' ? (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">주문하기</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">수량</label>
                  <input
                    type="number"
                    min="1"
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(Number(e.target.value))}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div className="text-lg font-semibold">
                  총 금액: {(orderQuantity * group.productPrice).toLocaleString()}원
                </div>
                {(orderQuantity * group.productPrice) < 10000 && (
                  <p className="text-red-500 text-sm">
                    최소 주문 금액은 10,000원입니다.
                  </p>
                )}
                {error && (
                  <p className="text-red-500 text-sm">{error}</p>
                )}
                <button
                  onClick={handleOrder}
                  disabled={submitting || (orderQuantity * group.productPrice) < 10000}
                  className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? '주문 중...' : '주문하기'}
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  * 결제는 수동 계좌이체로 진행됩니다.
                </p>
              </div>
            </div>
          ) : null}

          {/* 주문 목록 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">주문 목록</h2>
              <div className="text-sm text-gray-600">
                총 {orders.length}건 · {totalOrdersAmount.toLocaleString()}원
              </div>
            </div>
            
            <div className="space-y-3">
              {orders.map((order) => (
                <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                  {editingOrder === order.id ? (
                    // 수정 모드
                    <div className="space-y-3">
                      <div>
                        <p className="font-medium text-gray-900 mb-2">{order.userName}</p>
                        <div className="flex items-center space-x-2">
                          <label className="text-sm text-gray-600">수량:</label>
                          <input
                            type="number"
                            min="1"
                            value={editQuantity}
                            onChange={(e) => setEditQuantity(Number(e.target.value))}
                            className="border rounded-lg px-3 py-1 w-20"
                          />
                          <span className="text-sm text-gray-600">
                            × {group.productPrice.toLocaleString()}원 = {(editQuantity * group.productPrice).toLocaleString()}원
                          </span>
                        </div>
                        {(editQuantity * group.productPrice) < 10000 && (
                          <p className="text-red-500 text-xs mt-1">최소 주문 금액은 10,000원입니다.</p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleUpdateOrder(order.id)}
                          disabled={submitting || (editQuantity * group.productPrice) < 10000}
                          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          저장
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={submitting}
                          className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 disabled:opacity-50 text-sm"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    // 보기 모드
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 mb-1">{order.userName}</p>
                        <p className="text-sm text-gray-600">
                          {order.quantity}개 × {order.unitPrice.toLocaleString()}원 = <span className="font-semibold text-gray-900">{order.totalPrice.toLocaleString()}원</span>
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                          order.status === '주문완료' ? 'bg-blue-100 text-blue-800' :
                          order.status === '확인완료' ? 'bg-purple-100 text-purple-800' :
                          order.status === '배송중' ? 'bg-indigo-100 text-indigo-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {order.status}
                        </span>
                        {order.status === '주문완료' && (
                          <>
                            <button
                              onClick={() => handleStartEdit(order)}
                              disabled={submitting}
                              className="text-blue-600 hover:text-blue-800 text-sm disabled:opacity-50"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => handleCancelOrder(order.id)}
                              disabled={submitting}
                              className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
                            >
                              취소
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {orders.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">아직 주문이 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}

