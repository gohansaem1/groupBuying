'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import { getProducts, Product } from '@/lib/firebase/products'
import { getOrganizerGroups, createGroup, Group, GroupMenuItem, getGroupOrders } from '@/lib/firebase/groups'
import { confirmGroup, cancelConfirmGroup } from '@/lib/firebase/groups'
import { getCurrentUserProfile, UserProfile, agreeToOrganizerTerms } from '@/lib/firebase/auth'
import OrganizerTermsAgreementModal from '@/components/OrganizerTermsAgreementModal'
import { getOrganizerRecruitmentStatus } from '@/lib/firebase/admin'
import NavigationHeader from '@/components/NavigationHeader'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { formatDate, formatTimeRemaining, isApproaching, formatDateTime } from '@/lib/utils/date'

type GroupStatus = '전체' | '진행중' | '달성' | '확정' | '배송중' | '완료'

export default function OrganizerPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedMenuItems, setSelectedMenuItems] = useState<Map<string, Product>>(new Map()) // 선택된 메뉴 아이템들
  const [groupTitle, setGroupTitle] = useState('')
  const [startDate, setStartDate] = useState('') // 공동구매 시작일
  const [endDate, setEndDate] = useState('') // 공동구매 종료일 (주문 마감일)
  const [deliveryAddress, setDeliveryAddress] = useState('') // 배송지 주소
  const [deliveryAddressDetail, setDeliveryAddressDetail] = useState('') // 배송지 상세주소
  const [deliveryPostcode, setDeliveryPostcode] = useState('') // 우편번호
  const [deliveryBuildingPassword, setDeliveryBuildingPassword] = useState('') // 공동출입문 비밀번호
  const [deliveryName, setDeliveryName] = useState('') // 배송지 수령인 이름
  const [deliveryPhone, setDeliveryPhone] = useState('') // 배송지 수령인 전화번호
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<GroupStatus>('전체')
  const [commissionRate, setCommissionRate] = useState<number>(0) // 수수료율 (기본값 0%)
  const [groupOrdersMap, setGroupOrdersMap] = useState<Map<string, number>>(new Map()) // groupId -> 주문 총액
  const [sortOrder, setSortOrder] = useState<'최신순' | '과거순'>('최신순') // 정렬 순서
  const [pageSize, setPageSize] = useState<number>(10) // 페이지당 항목 수
  const [currentPage, setCurrentPage] = useState<number>(1) // 현재 페이지
  const [showOrganizerTermsModal, setShowOrganizerTermsModal] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const profile = await getCurrentUserProfile()
      if (!profile) return
      
      setUserProfile(profile)

      // 진행자 동의 여부 확인
      if (profile.role === 'organizer' && !profile.organizerAgreedToTerms) {
        setShowOrganizerTermsModal(true)
        setLoading(false)
        return
      }
      
      // 수수료율 조회 (기본값 10%)
      try {
        const commissionRef = doc(db, 'organizerCommissions', profile.uid)
        const commissionSnap = await getDoc(commissionRef)
        if (commissionSnap.exists()) {
          setCommissionRate(commissionSnap.data().rate || 10)
        } else {
          setCommissionRate(10) // 기본값 10%
        }
      } catch (err) {
        console.error('수수료율 조회 실패:', err)
        setCommissionRate(10) // 기본값 10%
      }
      
      const [productsData, groupsData] = await Promise.all([
        getProducts(),
        getOrganizerGroups(profile.uid)
      ])
      setProducts(productsData)
      setGroups(groupsData)
      
      // 각 그룹의 주문 총액 계산
      const ordersMap = new Map<string, number>()
      for (const group of groupsData) {
        try {
          const orders = await getGroupOrders(group.id)
          const totalAmount = orders.reduce((sum, order) => sum + order.totalPrice, 0)
          ordersMap.set(group.id, totalAmount)
        } catch (err) {
          console.error(`그룹 ${group.id} 주문 조회 실패:`, err)
        }
      }
      setGroupOrdersMap(ordersMap)
    } catch (error) {
      console.error('데이터 로드 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleMenuItem = (product: Product) => {
    const newMenuItems = new Map(selectedMenuItems)
    if (newMenuItems.has(product.id)) {
      newMenuItems.delete(product.id)
    } else {
      newMenuItems.set(product.id, product)
    }
    setSelectedMenuItems(newMenuItems)
  }

  // 다음 주소 API 호출 함수
  const handleAddressSearch = () => {
    if (typeof window === 'undefined' || !(window as any).daum) {
      alert('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.')
      return
    }

    new (window as any).daum.Postcode({
      oncomplete: function(data: any) {
        // 도로명 주소 선택 시
        let addr = ''
        if (data.userSelectedType === 'R') {
          addr = data.roadAddress
        } else {
          addr = data.jibunAddress
        }

        setDeliveryPostcode(data.zonecode)
        setDeliveryAddress(addr)
        // 상세주소 입력 필드에 포커스
        setTimeout(() => {
          const detailInput = document.getElementById('deliveryAddressDetail') as HTMLInputElement
          if (detailInput) {
            detailInput.focus()
          }
        }, 100)
      }
    }).open()
  }

  const handleCreateGroup = async () => {
    if (selectedMenuItems.size === 0 || !userProfile) {
      alert('최소 1개 이상의 상품을 선택해주세요.')
      return
    }
    
    if (!groupTitle.trim()) {
      alert('공동구매 건 제목을 입력해주세요.')
      return
    }
    
    // 날짜 유효성 검증
    if (!startDate || !endDate) {
      alert('시작일과 주문 마감일을 모두 입력해주세요.')
      return
    }
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    // 과거 날짜 방지
    if (start < today) {
      alert('시작일은 오늘 이후여야 합니다.')
      return
    }
    
    // 날짜 순서 검증
    if (start >= end) {
      alert('시작일은 주문 마감일보다 이전이어야 합니다.')
      return
    }
    
    // 최소 기간 검증 (시작일과 종료일 사이 최소 1일)
    const daysBetween = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    if (daysBetween < 1) {
      alert('시작일과 주문 마감일 사이에는 최소 1일 이상이 필요합니다.')
      return
    }
    
    try {
      // 선택된 상품들을 GroupMenuItem 배열로 변환
      const menuItems: GroupMenuItem[] = Array.from(selectedMenuItems.values()).map(product => {
        const menuItem: GroupMenuItem = {
          productId: product.id,
          productName: product.name || '상품명 없음',
          productPrice: product.listPrice * (1 - product.discountRate / 100),
          listPrice: product.listPrice,
          discountRate: product.discountRate,
          description: product.description || '',
        }
        
        // 선택적 필드는 값이 있을 때만 추가
        if (product.capacity) {
          menuItem.capacity = product.capacity
        }
        if (product.imageUrl) {
          menuItem.imageUrl = product.imageUrl
        }
        if (product.detailImages && product.detailImages.length > 0) {
          menuItem.detailImages = product.detailImages
        }
        if (product.detailDescription) {
          menuItem.detailDescription = product.detailDescription
        }
        
        return menuItem
      })
      
      await createGroup(
        groupTitle.trim(),
        userProfile.uid,
        userProfile.nickname || userProfile.displayName || '주최자',
        menuItems,
        undefined, // imageUrl
        new Date(startDate),
        new Date(endDate),
        undefined, // deliveryMethod
        undefined, // deliveryDescription
        undefined, // deliveryLocation
        deliveryAddress || undefined, // deliveryAddress
        deliveryAddressDetail || undefined, // deliveryAddressDetail
        deliveryPostcode || undefined, // deliveryPostcode
        deliveryBuildingPassword || undefined, // deliveryBuildingPassword
        deliveryName || undefined, // deliveryName
        deliveryPhone || undefined // deliveryPhone
      )
      
      alert('공동구매 건이 생성되었습니다.')
      setShowCreateForm(false)
      setSelectedMenuItems(new Map())
      setGroupTitle('')
      setStartDate('')
      setEndDate('')
      setDeliveryAddress('')
      setDeliveryAddressDetail('')
      setDeliveryPostcode('')
      setDeliveryBuildingPassword('')
      setDeliveryName('')
      setDeliveryPhone('')
      loadData()
    } catch (error: any) {
      alert(error.message || '공동구매 건 생성에 실패했습니다.')
    }
  }

  const handleConfirm = async (groupId: string) => {
    try {
      await confirmGroup(groupId)
      alert('공동구매 건이 확인되었습니다.')
      loadData()
    } catch (error: any) {
      alert(error.message || '확인 처리에 실패했습니다.')
    }
  }

  const handleCancelConfirm = async (groupId: string) => {
    if (!confirm('확정을 취소하시겠습니까? 취소하면 달성 상태로 돌아갑니다.')) {
      return
    }
    try {
      await cancelConfirmGroup(groupId)
      alert('확정이 취소되었습니다.')
      loadData()
    } catch (error: any) {
      alert(error.message || '확정 취소에 실패했습니다.')
    }
  }

  const copyGroupUrl = async (groupId: string) => {
    const url = `${window.location.origin}/groups/${groupId}`
    try {
      await navigator.clipboard.writeText(url)
      alert('링크가 복사되었습니다!')
    } catch (error) {
      // 클립보드 API가 실패하면 fallback 사용
      const textArea = document.createElement('textarea')
      textArea.value = url
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      alert('링크가 복사되었습니다!')
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    )
  }


  return (
    <AuthGuard allowedRoles={['organizer']}>
      <div className="min-h-screen bg-gray-50">
        <NavigationHeader 
          userProfile={userProfile} 
          currentPage="organizer"
          onProfileUpdate={async (updatedProfile) => {
            setUserProfile(updatedProfile)
          }}
        />

        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8">
          {/* 헤더 */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  진행자 대시보드
                </h1>
                <p className="text-sm sm:text-base text-gray-600">
                  내가 생성한 공동구매 건을 관리하세요
                </p>
              </div>
              <button
                onClick={() => setShowCreateForm(true)}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl transition-colors inline-flex items-center justify-center text-sm sm:text-base shadow-md shadow-blue-500/50"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                공동구매 건 생성
              </button>
            </div>

            {/* 상태별 필터 탭 */}
            <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-4 mb-6">
              {(['전체', '진행중', '달성', '확정', '배송중', '완료'] as GroupStatus[]).map((status) => {
                const count = status === '전체' 
                  ? groups.length 
                  : groups.filter(g => g.status === status).length
                
                return (
                  <button
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all border-b-2 ${
                      selectedStatus === status
                        ? 'bg-blue-50 text-blue-700 border-blue-600'
                        : 'text-gray-600 hover:text-gray-900 border-transparent hover:border-gray-300'
                    }`}
                  >
                    {status}
                    {count > 0 && (
                      <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
                        selectedStatus === status
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

          {showCreateForm && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">새 공동구매 건 생성</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    공동구매 건 제목 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={groupTitle}
                    onChange={(e) => setGroupTitle(e.target.value)}
                    placeholder="예: 제주 감귤 1차 공동구매"
                    className="w-full border rounded-lg px-3 py-2"
                    maxLength={100}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    같은 상품으로 여러 공동구매 건을 구분할 수 있도록 제목을 입력해주세요.
                  </p>
                </div>
                {/* 날짜 관련 필드 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      공동구매 시작일 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value)
                        // 시작일이 변경되면 종료일이 시작일보다 이전이면 초기화
                        if (e.target.value && endDate && new Date(e.target.value) >= new Date(endDate)) {
                          setEndDate('')
                        }
                      }}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full border rounded-lg px-3 py-2"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      공동구매 시작 날짜 (오늘 이후)
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      주문 마감일 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value)
                      }}
                      min={startDate ? (() => {
                        // 시작일 다음날을 최소값으로 설정
                        const start = new Date(startDate)
                        start.setDate(start.getDate() + 1)
                        return start.toISOString().split('T')[0]
                      })() : new Date().toISOString().split('T')[0]}
                      className="w-full border rounded-lg px-3 py-2"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      주문을 받는 마지막 날짜 (시작일 이후)
                    </p>
                    {startDate && endDate && new Date(startDate) >= new Date(endDate) && (
                      <p className="text-xs text-red-500 mt-1">
                        주문 마감일은 시작일보다 이후여야 합니다.
                      </p>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-3">
                    상품 구성 (여러 상품 선택 가능) <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                    {products.map((product) => {
                      const salePrice = product.listPrice * (1 - product.discountRate / 100)
                      const isSelected = selectedMenuItems.has(product.id)
                      
                      return (
                        <div
                          key={product.id}
                          onClick={() => toggleMenuItem(product)}
                          className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 shadow-md'
                              : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{product.name}</h4>
                              <p className="text-xs text-gray-600 mt-1 line-clamp-2">{product.description}</p>
                            </div>
                            {isSelected && (
                              <div className="ml-2 flex-shrink-0">
                                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex items-baseline gap-2 mt-2">
                            <span className="text-gray-400 line-through text-xs">
                              {product.listPrice.toLocaleString()}원
                            </span>
                            <span className="text-lg font-bold text-red-600">
                              {salePrice.toLocaleString()}원
                            </span>
                            {product.discountRate > 0 && (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                                {product.discountRate}% 할인
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {selectedMenuItems.size > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <p className="text-sm font-medium text-blue-900">
                        선택된 상품: {selectedMenuItems.size}개
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {Array.from(selectedMenuItems.values()).map((product) => (
                          <span
                            key={product.id}
                            className="inline-flex items-center gap-1 bg-white px-2 py-1 rounded text-xs font-medium text-gray-700"
                          >
                            {product.name}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleMenuItem(product)
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {products.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      등록된 상품이 없습니다. 관리자에게 문의하세요.
                    </p>
                  )}
                </div>
                
                {/* 배송정보 입력 필드 */}
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-md font-semibold">배송정보</h4>
                    <span className="text-xs text-gray-500 bg-blue-50 px-2 py-1 rounded">
                      관리자만 확인 가능
                    </span>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        수령인 이름 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={deliveryName}
                        onChange={(e) => setDeliveryName(e.target.value)}
                        placeholder="수령인 이름을 입력해주세요"
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        수령인 전화번호 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={deliveryPhone}
                        onChange={(e) => setDeliveryPhone(e.target.value)}
                        placeholder="010-1234-5678"
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        배송지 주소 <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={deliveryPostcode}
                          placeholder="우편번호"
                          readOnly
                          className="w-32 border rounded-lg px-3 py-2 bg-gray-50"
                        />
                        <button
                          type="button"
                          onClick={handleAddressSearch}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                          주소 검색
                        </button>
                      </div>
                      <input
                        type="text"
                        value={deliveryAddress}
                        placeholder="주소를 검색해주세요"
                        readOnly
                        className="w-full mt-2 border rounded-lg px-3 py-2 bg-gray-50"
                      />
                      <input
                        id="deliveryAddressDetail"
                        type="text"
                        value={deliveryAddressDetail}
                        onChange={(e) => setDeliveryAddressDetail(e.target.value)}
                        placeholder="상세주소를 입력해주세요"
                        className="w-full mt-2 border rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        공동출입문 비밀번호
                      </label>
                      <input
                        type="text"
                        value={deliveryBuildingPassword}
                        onChange={(e) => setDeliveryBuildingPassword(e.target.value)}
                        placeholder="빌라/아파트 공동출입문 비밀번호 (선택사항)"
                        className="w-full border rounded-lg px-3 py-2"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        목장에서 직배송하는 경우 필요합니다. 빌라나 아파트의 경우 공동출입문 비밀번호를 입력해주세요.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-600">
                    * 최소 공동구매 총액: 40,000원
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    * 여러 상품을 선택하여 상품 목록을 구성할 수 있습니다.
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleCreateGroup}
                    disabled={selectedMenuItems.size === 0 || !groupTitle.trim() || !startDate || !endDate || !deliveryAddress || !deliveryAddressDetail || !deliveryName || !deliveryPhone}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    생성 ({selectedMenuItems.size}개 상품)
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateForm(false)
                      setSelectedMenuItems(new Map())
                      setGroupTitle('')
                      setStartDate('')
                      setEndDate('')
                      setDeliveryAddress('')
                      setDeliveryAddressDetail('')
                      setDeliveryPostcode('')
                      setDeliveryBuildingPassword('')
                      setDeliveryName('')
                      setDeliveryPhone('')
                    }}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 총 정산 정보 요약 */}
          {groups.length > 0 && (() => {
            const completedGroups = groups.filter(g => g.status === '완료')
            const completedTotal = completedGroups.reduce((sum, g) => {
              const orderTotal = groupOrdersMap.get(g.id) || 0
              return sum + orderTotal
            }, 0)
            const completedSettlement = completedTotal * (commissionRate / 100)
            
            return (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-md border border-blue-200 p-5 sm:p-6 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">정산 정보</h3>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <span>완료된 건 주문 총액:</span>
                        <span className="font-bold text-gray-900">
                          {completedTotal.toLocaleString()}원
                        </span>
                      </div>
                      {commissionRate > 0 && (
                        <div className="flex items-center gap-2">
                          <span>수수료율:</span>
                          <span className="font-semibold text-blue-700">{commissionRate}%</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 pt-2 border-t border-blue-200">
                        <span className="font-semibold text-gray-900">정산액 (수수료):</span>
                        <span className="text-xl font-bold text-blue-700">
                          {completedSettlement.toLocaleString()}원
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        * 완료된 공동구매 건의 주문 총액의 {commissionRate}%를 수수료로 받습니다.
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600 mb-1">완료된 공동구매</div>
                    <div className="text-3xl font-bold text-blue-600">
                      {completedGroups.length}건
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* 정렬 및 페이지네이션 컨트롤 */}
          {(() => {
            const filteredGroups = groups.filter(group => selectedStatus === '전체' || group.status === selectedStatus)
            const sortedGroups = [...filteredGroups].sort((a, b) => {
              const aDate = a.createdAt?.toMillis() || 0
              const bDate = b.createdAt?.toMillis() || 0
              return sortOrder === '최신순' ? bDate - aDate : aDate - bDate
            })
            const totalPages = Math.ceil(sortedGroups.length / pageSize)
            const startIndex = (currentPage - 1) * pageSize
            const paginatedGroups = sortedGroups.slice(startIndex, startIndex + pageSize)
            
            return (
              <>
                {/* 정렬 및 페이지 크기 선택 */}
                {filteredGroups.length > 0 && (
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
                      전체 {filteredGroups.length}개 중 {startIndex + 1}-{Math.min(startIndex + pageSize, filteredGroups.length)}개 표시
                    </div>
                  </div>
                )}

                {/* 공동구매 건 목록 */}
                <div className="space-y-4">
                  {paginatedGroups.map((group) => {
              const progress = (group.currentTotal / group.minimumTotal) * 100
              const orderTotal = groupOrdersMap.get(group.id) || 0
              const settlementAmount = orderTotal * (commissionRate / 100) // 진행자가 받는 수수료
              
              return (
                <div
                  key={group.id}
                  className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-200 overflow-hidden"
                >
                  <div className="p-5 sm:p-6">
                    <div className="mb-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 
                            onClick={() => router.push(`/organizer/groups/${group.id}`)}
                            className="text-lg sm:text-xl font-bold text-gray-900 line-clamp-2 cursor-pointer hover:text-blue-600 transition-colors"
                          >
                            {group.title}
                          </h3>
                          {/* 생성일시 */}
                          {group.createdAt && (
                            <p className="text-xs text-gray-500 mt-1">
                              생성일: {formatDateTime(group.createdAt)}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {group.status === '달성' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleConfirm(group.id)
                              }}
                              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-sm hover:shadow-md"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              확정 처리
                            </button>
                          )}
                          {group.status === '확정' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCancelConfirm(group.id)
                              }}
                              className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-sm hover:shadow-md"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              확정 취소
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                        <span>상품 {group.menuItems?.length || 0}개</span>
                        <span className="text-gray-400">·</span>
                        <span>
                          {group.currentTotal.toLocaleString()}원 / {group.minimumTotal.toLocaleString()}원
                          <span className="ml-1 text-blue-600 font-semibold">
                            ({progress.toFixed(1)}%)
                          </span>
                        </span>
                      </div>
                      
                      {/* 날짜 정보 */}
                      {(group.startDate || group.endDate) && (
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
                      {group.status === '진행중' && group.endDate && isApproaching(group.endDate, 3) && (
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
                    </div>

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
                          
                          // 각 상태별 안내 문구
                          const getStatusMessage = () => {
                            if (isCurrent) {
                              switch (group.status) {
                                case '진행중':
                                  return '주문을 받고 있습니다. 링크를 공유하여 참여자를 모집하세요.'
                                case '달성':
                                  return '목표 금액을 달성했습니다. 확정 처리 버튼을 눌러주세요.'
                                case '확정':
                                  return '확정되었습니다. 관리자가 배송준비로 변경할 때까지 대기하세요.'
                                case '배송중':
                                  return '배송 준비 중입니다. 관리자가 배송완료로 변경할 때까지 대기하세요.'
                                case '완료':
                                  return '배송이 완료되었습니다.'
                                default:
                                  return ''
                              }
                            }
                            return ''
                          }
                          
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
                      {/* 상태별 안내 문구 */}
                      {group.status && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-xs sm:text-sm text-blue-800 text-center">
                            {group.status === '진행중' && '주문을 받고 있습니다. 링크를 공유하여 참여자를 모집하세요.'}
                            {group.status === '달성' && '목표 금액을 달성했습니다. 확정 처리 버튼을 눌러주세요.'}
                            {group.status === '확정' && '확정되었습니다. 관리자가 배송준비로 변경할 때까지 대기하세요. (확정 취소 가능)'}
                            {group.status === '배송중' && '배송 준비 중입니다. 관리자가 배송완료로 변경할 때까지 대기하세요.'}
                            {group.status === '완료' && '배송이 완료되었습니다.'}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* 정산 정보 (완료된 건에만 표시) */}
                    {group.status === '완료' && orderTotal > 0 && (
                      <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">주문 총액:</span>
                            <span className="font-semibold text-gray-900">{orderTotal.toLocaleString()}원</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">정산액 (수수료 {commissionRate}%):</span>
                            <span className="font-bold text-green-700">{settlementAmount.toLocaleString()}원</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 액션 버튼 */}
                    <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          copyGroupUrl(group.id)
                        }}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-sm hover:shadow-md"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        링크 복사
                      </button>
                    </div>
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

                {filteredGroups.length === 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <p className="text-gray-500 text-lg mb-2">
                      {selectedStatus === '전체' 
                        ? '생성한 공동구매 건이 없습니다.'
                        : `${selectedStatus} 상태인 공동구매 건이 없습니다.`}
                    </p>
                    {selectedStatus === '전체' && (
                      <button
                        onClick={() => setShowCreateForm(true)}
                        className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                      >
                        첫 공동구매 건 생성하기
                      </button>
                    )}
                  </div>
                )}
              </>
            )
          })()}
        </div>
      </div>

      {showOrganizerTermsModal && (
        <OrganizerTermsAgreementModal
          onAgree={async () => {
            try {
              await agreeToOrganizerTerms()
              setShowOrganizerTermsModal(false)
              // 데이터 다시 로드
              loadData()
            } catch (error) {
              console.error('진행자 약관 동의 처리 오류:', error)
              alert('동의 처리에 실패했습니다.')
            }
          }}
          onClose={() => {
            setShowOrganizerTermsModal(false)
            router.push('/')
          }}
        />
      )}
    </AuthGuard>
  )
}

