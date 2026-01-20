'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { onAuthChange } from '@/lib/firebase/auth'
import { User } from 'firebase/auth'
import { getCurrentUserProfile, UserProfile } from '@/lib/firebase/auth'
import { getGroup, Group } from '@/lib/firebase/groups'
import { getGroupOrders, Order, createOrder } from '@/lib/firebase/groups'
import { getProduct, Product } from '@/lib/firebase/products'
import NavigationHeader from '@/components/NavigationHeader'

export default function GroupDetailPage() {
  const router = useRouter()
  const params = useParams()
  const groupId = params.id as string
  
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [group, setGroup] = useState<Group | null>(null)
  const [product, setProduct] = useState<Product | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    // 인증이 완료된 후에만 데이터 로드
    if (!authLoading && user && userProfile?.role === 'user') {
      loadData()
    }
  }, [groupId, authLoading, user, userProfile])

  const loadData = async () => {
    setLoading(true)
    try {
      const [groupData, ordersData] = await Promise.all([
        getGroup(groupId),
        getGroupOrders(groupId)
      ])
      
      if (groupData) {
        setGroup(groupData)
        const productData = await getProduct(groupData.productId)
        setProduct(productData)
      } else {
        setError('그룹을 찾을 수 없습니다.')
      }
      
      setOrders(ordersData)
    } catch (error) {
      console.error('데이터 로드 오류:', error)
      setError('데이터를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
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
      
      const totalPrice = quantity * group.productPrice
      
      if (totalPrice < 10000) {
        throw new Error('최소 주문 금액은 10,000원입니다.')
      }
      
      await createOrder(
        group.id,
        userProfile.uid,
        userProfile.displayName || '사용자',
        product.id,
        product.name,
        quantity,
        group.productPrice
      )
      
      alert('주문이 완료되었습니다.')
      loadData()
      setQuantity(1)
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
  if (!group || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">공동구매 건을 찾을 수 없습니다.</div>
          <p className="text-gray-600 text-sm">링크가 올바른지 확인해주세요.</p>
        </div>
      </div>
    )
  }

  const totalPrice = quantity * group.productPrice
  const progress = Math.min((group.currentTotal / group.minimumTotal) * 100, 100)

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader userProfile={userProfile} currentPage="group" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
          </div>

        {group.status === '진행중' || group.status === '달성' ? (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">주문하기</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">수량</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div className="text-lg font-semibold">
                  총 금액: {totalPrice.toLocaleString()}원
                </div>
                {totalPrice < 10000 && (
                  <p className="text-red-500 text-sm">
                    최소 주문 금액은 10,000원입니다.
                  </p>
                )}
                {error && (
                  <p className="text-red-500 text-sm">{error}</p>
                )}
                <button
                  onClick={handleOrder}
                  disabled={submitting || totalPrice < 10000}
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

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">주문 목록</h2>
            {orders.length > 0 && (
              <span className="text-sm text-gray-600">
                총 {orders.length}건
              </span>
            )}
          </div>
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 mb-1">{order.userName}</p>
                    <p className="text-sm text-gray-600">
                      {order.quantity}개 × {order.unitPrice.toLocaleString()}원 = <span className="font-semibold text-gray-900">{order.totalPrice.toLocaleString()}원</span>
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-4 ${
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
            {orders.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">아직 주문이 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

