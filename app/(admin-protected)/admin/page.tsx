'use client'

import React, { useState, useEffect } from 'react'
import AuthGuard from '@/components/AuthGuard'
import { getAllProducts, createProduct, updateProduct, deleteProduct, Product } from '@/lib/firebase/products'
import { getOrganizerRecruitmentStatus, setOrganizerRecruitmentStatus, getAllUsers, updateUserRole, getPendingOrganizers, getOrganizerCommissionRate, setOrganizerCommissionRate, promoteOrganizerToAdmin, getDefaultCommissionRate, setDefaultCommissionRate, deleteOrganizerCommissionRate } from '@/lib/firebase/admin'
import { UserProfile, getCurrentUserProfile, UserRole } from '@/lib/firebase/auth'
import { getAllGroups, Group, Order, getGroupOrders, confirmGroup, cancelConfirmGroup, updateDeliveryDetailStatus } from '@/lib/firebase/groups'
import { Timestamp, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { markShipping, markComplete } from '@/lib/firebase/groups'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import NavigationHeader from '@/components/NavigationHeader'
import { formatDate, formatTimeRemaining, isApproaching, formatDateTime } from '@/lib/utils/date'
import * as XLSX from 'xlsx'

type GroupStatus = '전체' | '진행중' | '달성' | '확정' | '배송중' | '완료'

export default function AdminPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'products' | 'groups' | 'users' | 'settings' | 'delivery'>('products')
  const [products, setProducts] = useState<Product[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [organizerRecruitmentEnabled, setOrganizerRecruitmentEnabled] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [productsData, groupsData, recruitmentStatus, profile] = await Promise.all([
        getAllProducts(),
        getAllGroups(),
        getOrganizerRecruitmentStatus(),
        getCurrentUserProfile()
      ])
      setProducts(productsData)
      setGroups(groupsData)
      setOrganizerRecruitmentEnabled(recruitmentStatus)
      setUserProfile(profile)
    } catch (error) {
      console.error('데이터 로드 오류:', error)
    } finally {
      setLoading(false)
    }
  }

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
          <div className="flex space-x-4 mb-6 border-b">
            <button
              onClick={() => setActiveTab('products')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'products'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              상품 관리
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'groups'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              공동구매 건 관리
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'users'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              사용자 관리
            </button>
            <button
              onClick={() => setActiveTab('delivery')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'delivery'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              배송관리
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'settings'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              설정
            </button>
          </div>

          {activeTab === 'products' && (
            <ProductsTab products={products} onUpdate={loadData} />
          )}
          {activeTab === 'groups' && (
            <GroupsTab groups={groups} products={products} onUpdate={loadData} />
          )}
          {activeTab === 'users' && (
            <UsersTab onUpdate={loadData} />
          )}
          {activeTab === 'delivery' && (
            <DeliveryTab groups={groups} onUpdate={loadData} />
          )}
          {activeTab === 'settings' && (
            <SettingsTab
              organizerRecruitmentEnabled={organizerRecruitmentEnabled}
              onUpdate={loadData}
            />
          )}
        </div>
      </div>
    </AuthGuard>
  )
}

function ProductsTab({ products, onUpdate }: { products: Product[]; onUpdate: () => void }) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  const handleAddProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    try {
      await createProduct({
        name: formData.get('name') as string,
        description: '', // 기본값
        listPrice: Number(formData.get('listPrice')),
        discountRate: Number(formData.get('discountRate')),
        saleStatus: '판매중', // 기본값
      })
      setShowAddForm(false)
      onUpdate()
    } catch (error) {
      console.error('상품 생성 오류:', error)
      alert('상품 생성에 실패했습니다.')
    }
  }

  const handleUpdateProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingProduct) return
    
    const formData = new FormData(e.currentTarget)
    
    try {
      await updateProduct(editingProduct.id, {
        name: formData.get('name') as string,
        description: '', // 기본값
        listPrice: Number(formData.get('listPrice')),
        discountRate: Number(formData.get('discountRate')),
        saleStatus: '판매중', // 기본값
      })
      setEditingProduct(null)
      onUpdate()
    } catch (error) {
      console.error('상품 수정 오류:', error)
      alert('상품 수정에 실패했습니다.')
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    
    try {
      await deleteProduct(productId)
      onUpdate()
    } catch (error: any) {
      alert(error.message || '상품 삭제에 실패했습니다.')
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">상품 관리</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          상품 추가
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">새 상품 추가</h3>
          <form onSubmit={handleAddProduct}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">상품명 *</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">정가 *</label>
                <input
                  type="number"
                  name="listPrice"
                  required
                  min="0"
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">할인율 (%) *</label>
                <input
                  type="number"
                  name="discountRate"
                  required
                  min="0"
                  max="100"
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  추가
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                >
                  취소
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상품명</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">정가</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">할인율</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">할인가</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">등록일</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => {
              const salePrice = product.listPrice * (1 - product.discountRate / 100)
              return (
                <tr key={product.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingProduct?.id === product.id ? (
                      <form onSubmit={handleUpdateProduct}>
                        <input
                          type="text"
                          name="name"
                          defaultValue={product.name}
                          className="w-full border rounded px-2 py-1"
                          required
                        />
                      </form>
                    ) : (
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingProduct?.id === product.id ? (
                      <input
                        type="number"
                        name="listPrice"
                        defaultValue={product.listPrice}
                        className="w-full border rounded px-2 py-1"
                        required
                      />
                    ) : (
                      <div className="text-sm text-gray-900">{product.listPrice.toLocaleString()}원</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingProduct?.id === product.id ? (
                      <input
                        type="number"
                        name="discountRate"
                        defaultValue={product.discountRate}
                        className="w-full border rounded px-2 py-1"
                        required
                      />
                    ) : (
                      <div className="text-sm text-gray-900">{product.discountRate}%</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{salePrice.toLocaleString()}원</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {product.createdAt ? formatDateTime(product.createdAt) : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {editingProduct?.id === product.id ? (
                      <div className="flex space-x-2">
                        <button
                          type="submit"
                          form="edit-form"
                          className="text-blue-600 hover:text-blue-900"
                        >
                          저장
                        </button>
                        <button
                          onClick={() => setEditingProduct(null)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setEditingProduct(product)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          삭제
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {editingProduct && (
          <form id="edit-form" onSubmit={handleUpdateProduct} className="hidden">
            <input type="hidden" name="name" defaultValue={editingProduct.name} />
            <input type="hidden" name="listPrice" defaultValue={editingProduct.listPrice} />
            <input type="hidden" name="discountRate" defaultValue={editingProduct.discountRate} />
          </form>
        )}
      </div>
    </div>
  )
}

function GroupsTab({ groups, products, onUpdate }: { groups: Group[]; products: Product[]; onUpdate: () => void }) {
  const router = useRouter()
  const [selectedStatus, setSelectedStatus] = useState<GroupStatus>('전체')
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [sortOrder, setSortOrder] = useState<'최신순' | '과거순'>('최신순')
  const [pageSize, setPageSize] = useState<number>(10)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [groupOrdersMap, setGroupOrdersMap] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const profile = await getCurrentUserProfile()
      if (!profile) return
      setUserProfile(profile)

      // 각 그룹의 주문 총액 계산
      const ordersMap = new Map<string, number>()
      for (const group of groups) {
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
    }
  }

  useEffect(() => {
    loadData()
  }, [groups])

  const handleShipping = async (groupId: string) => {
    try {
      await markShipping(groupId)
      onUpdate()
    } catch (error: any) {
      alert(error.message || '배송 처리에 실패했습니다.')
    }
  }

  const handleComplete = async (groupId: string) => {
    try {
      await markComplete(groupId)
      onUpdate()
    } catch (error: any) {
      alert(error.message || '완료 처리에 실패했습니다.')
    }
  }

  const handleConfirm = async (groupId: string) => {
    try {
      await confirmGroup(groupId)
      onUpdate()
    } catch (error: any) {
      alert(error.message || '확정 처리에 실패했습니다.')
    }
  }

  const handleCancelConfirm = async (groupId: string) => {
    try {
      await cancelConfirmGroup(groupId)
      onUpdate()
    } catch (error: any) {
      alert(error.message || '확정 취소에 실패했습니다.')
    }
  }

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
    <div>
      {/* 헤더 */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              공동구매 건 관리
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              모든 공동구매 건을 관리하고 배송을 처리하세요
            </p>
          </div>
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
                onClick={() => {
                  setSelectedStatus(status)
                  setCurrentPage(1)
                }}
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

      {/* 정렬 및 페이지네이션 컨트롤 */}
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
                        onClick={() => router.push(`/admin/groups/${group.id}`)}
                        className="text-lg sm:text-xl font-bold text-gray-900 line-clamp-2 cursor-pointer hover:text-blue-600 transition-colors"
                      >
                        {group.title}
                      </h3>
                      {group.createdAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          생성일: {formatDateTime(group.createdAt)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
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
                        <>
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
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleShipping(group.id)
                            }}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-sm hover:shadow-md"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            배송 처리
                          </button>
                        </>
                      )}
                      {group.status === '배송중' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleComplete(group.id)
                          }}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-sm hover:shadow-md"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          완료 처리
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                    <span>주최자: {group.organizerName}</span>
                    <span className="text-gray-400">·</span>
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
                  
                  {/* 상태별 안내 문구 (관리자 전용) */}
                  {group.status && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs sm:text-sm text-blue-800 text-center">
                        {group.status === '진행중' && '주문을 받고 있습니다. 진행자가 관리하고 있습니다.'}
                        {group.status === '달성' && '목표 금액을 달성했습니다. 진행자가 확정 처리할 때까지 대기하세요.'}
                        {group.status === '확정' && '확정되었습니다. 배송 준비 상태로 변경해주세요.'}
                        {group.status === '배송중' && '배송 준비 중입니다. 배송 완료 상태로 변경해주세요.'}
                        {group.status === '완료' && '배송이 완료되었습니다.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 빈 상태 */}
      {filteredGroups.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="text-gray-500 text-lg mb-2">
            {selectedStatus === '전체' 
              ? '공동구매 건이 없습니다.'
              : `${selectedStatus} 상태인 공동구매 건이 없습니다.`}
          </p>
        </div>
      )}
      
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
    </div>
  )
}

function UsersTab({ onUpdate }: { onUpdate: () => void }) {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [pendingOrganizers, setPendingOrganizers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'user' | 'organizer' | 'admin'>('pending')
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [editingRole, setEditingRole] = useState<string | null>(null)
  const [newRole, setNewRole] = useState<UserRole>('user')
  const [commissionRates, setCommissionRates] = useState<Map<string, number>>(new Map()) // 진행자별 수수료율 (개별 설정된 경우만)
  const [hasCustomCommission, setHasCustomCommission] = useState<Set<string>>(new Set()) // 개별 수수료율이 설정된 진행자 ID 목록
  const [defaultCommissionRate, setDefaultCommissionRate] = useState<number>(10) // 기본 수수료율
  const [editingCommission, setEditingCommission] = useState<string | null>(null) // 수정 중인 진행자 ID
  const [commissionInputs, setCommissionInputs] = useState<Map<string, number>>(new Map()) // 수수료율 입력값
  const [selectedApplication, setSelectedApplication] = useState<string | null>(null) // 선택된 신청 정보

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const [allUsers, pending, profile] = await Promise.all([
        getAllUsers(),
        getPendingOrganizers(),
        getCurrentUserProfile()
      ])
      setUsers(allUsers)
      setPendingOrganizers(pending)
      setCurrentUser(profile)
      
      // 기본 수수료율 로드
      const defaultRate = await getDefaultCommissionRate()
      setDefaultCommissionRate(defaultRate)
      
      // 진행자별 수수료율 로드 (개별 설정된 경우만)
      const organizers = allUsers.filter(u => u.role === 'organizer')
      const ratesMap = new Map<string, number>()
      const customSet = new Set<string>()
      
      await Promise.all(
        organizers.map(async (organizer) => {
          try {
            // 개별 수수료율이 있는지 확인
            const commissionRef = doc(db, 'organizerCommissions', organizer.uid)
            const commissionSnap = await getDoc(commissionRef)
            
            if (commissionSnap.exists() && commissionSnap.data().rate !== undefined && commissionSnap.data().rate !== null) {
              // 개별 수수료율이 설정되어 있음
              ratesMap.set(organizer.uid, commissionSnap.data().rate)
              customSet.add(organizer.uid)
            }
          } catch (error) {
            console.error(`진행자 ${organizer.uid} 수수료율 로드 실패:`, error)
          }
        })
      )
      setCommissionRates(ratesMap)
      setHasCustomCommission(customSet)
    } catch (error) {
      console.error('사용자 로드 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApproveOrganizer = async (userId: string) => {
    try {
      await updateUserRole(userId, 'organizer')
      // 진행자 승인 시 organizerAgreedToTerms는 false로 유지 (진행자 페이지에서 동의 받음)
      onUpdate()
      loadUsers()
    } catch (error) {
      console.error('진행자 승인 오류:', error)
      alert('진행자 승인에 실패했습니다.')
    }
  }

  const handleRejectOrganizer = async (userId: string) => {
    if (!confirm('정말로 진행자 신청을 거부하시겠습니까?')) {
      return
    }
    try {
      const userRef = doc(db, 'users', userId)
      await updateDoc(userRef, {
        role: 'user',
        organizerApplication: null,
        updatedAt: serverTimestamp(),
      })
      onUpdate()
      loadUsers()
      alert('진행자 신청이 거부되었습니다.')
    } catch (error) {
      console.error('진행자 거부 오류:', error)
      alert('진행자 거부에 실패했습니다.')
    }
  }

  const handlePromoteToAdmin = async (organizerId: string) => {
    if (!confirm('이 진행자를 관리자로 승격하시겠습니까?')) {
      return
    }
    try {
      await promoteOrganizerToAdmin(organizerId)
      alert('관리자로 승격되었습니다.')
      onUpdate()
      loadUsers()
    } catch (error: any) {
      console.error('관리자 승격 오류:', error)
      alert(error.message || '관리자 승격에 실패했습니다.')
    }
  }

  const handleChangeRole = async (userId: string, role: UserRole) => {
    try {
      await updateUserRole(userId, role)
      alert('역할이 변경되었습니다.')
      setEditingRole(null)
      onUpdate()
      loadUsers()
    } catch (error: any) {
      console.error('역할 변경 오류:', error)
      alert(error.message || '역할 변경에 실패했습니다.')
    }
  }

  const isOwner = currentUser?.role === 'owner'
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'owner'

  // 필터링된 사용자 목록
  const getFilteredUsers = () => {
    if (filter === 'pending') {
      return pendingOrganizers
    }
    
    let filtered = users.filter(user => {
      if (filter === 'all') return true
      if (filter === 'user') return user.role === 'user'
      if (filter === 'organizer') return user.role === 'organizer'
      if (filter === 'admin') return user.role === 'admin' || user.role === 'owner'
      return true
    })
    
    // 승인 대기는 별도로 표시하지 않음
    return filtered.filter(user => user.role !== 'organizer_pending')
  }

  const displayUsers = getFilteredUsers()

  // 관리자가 변경할 수 있는 역할 목록
  const getAvailableRolesForAdmin = (): UserRole[] => {
    return ['user', 'organizer']
  }

  // 오너가 변경할 수 있는 역할 목록
  const getAvailableRolesForOwner = (): UserRole[] => {
    return ['user', 'organizer', 'admin']
  }

  const getAvailableRoles = (): UserRole[] => {
    if (isOwner) {
      return getAvailableRolesForOwner()
    }
    if (isAdmin) {
      return getAvailableRolesForAdmin()
    }
    return []
  }

  if (loading) {
    return <div>로딩 중...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">사용자 관리</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg text-sm ${
              filter === 'pending'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            승인 대기 ({pendingOrganizers.length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            전체 ({users.filter(u => u.role !== 'organizer_pending').length})
          </button>
          <button
            onClick={() => setFilter('user')}
            className={`px-4 py-2 rounded-lg text-sm ${
              filter === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            사용자 ({users.filter(u => u.role === 'user').length})
          </button>
          <button
            onClick={() => setFilter('organizer')}
            className={`px-4 py-2 rounded-lg text-sm ${
              filter === 'organizer'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            진행자 ({users.filter(u => u.role === 'organizer').length})
          </button>
          {isOwner && (
            <button
              onClick={() => setFilter('admin')}
              className={`px-4 py-2 rounded-lg text-sm ${
                filter === 'admin'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              관리자 ({users.filter(u => u.role === 'admin' || u.role === 'owner').length})
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이름</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이메일</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">역할</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">수수료율</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {displayUsers.map((user) => (
              <React.Fragment key={user.uid}>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.nickname || user.displayName || '이름 없음'}</div>
                    {user.organizerApplication && (
                      <div className="text-xs text-gray-500 mt-1">
                        실명: {user.organizerApplication.realName}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.email || '-'}</div>
                    {user.organizerApplication && (
                      <div className="text-xs text-gray-500 mt-1">
                        연락처: {user.organizerApplication.phoneNumber}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.role === 'owner' ? 'bg-red-100 text-red-800' :
                      user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                      user.role === 'organizer' ? 'bg-blue-100 text-blue-800' :
                      user.role === 'organizer_pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role === 'owner' ? '오너' :
                       user.role === 'admin' ? '관리자' :
                       user.role === 'organizer' ? '진행자' :
                       user.role === 'organizer_pending' ? '승인 대기' :
                       '사용자'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {user.role === 'organizer' ? (
                      editingCommission === user.uid ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={commissionInputs.get(user.uid) ?? commissionRates.get(user.uid) ?? defaultCommissionRate}
                            onChange={(e) => {
                              const newInputs = new Map(commissionInputs)
                              newInputs.set(user.uid, Number(e.target.value))
                              setCommissionInputs(newInputs)
                            }}
                            min="0"
                            max="100"
                            step="0.1"
                            className="w-20 border rounded px-2 py-1 text-sm"
                          />
                          <span className="text-xs text-gray-500">%</span>
                          <button
                            onClick={async () => {
                              const rate = commissionInputs.get(user.uid) ?? commissionRates.get(user.uid) ?? defaultCommissionRate
                              if (rate < 0 || rate > 100) {
                                alert('수수료율은 0%에서 100% 사이여야 합니다.')
                                return
                              }
                              try {
                                await setOrganizerCommissionRate(user.uid, rate)
                                const newRates = new Map(commissionRates)
                                newRates.set(user.uid, rate)
                                setCommissionRates(newRates)
                                const newCustomSet = new Set(hasCustomCommission)
                                newCustomSet.add(user.uid)
                                setHasCustomCommission(newCustomSet)
                                setEditingCommission(null)
                                alert('수수료율이 업데이트되었습니다.')
                              } catch (error: any) {
                                alert(error.message || '수수료율 업데이트에 실패했습니다.')
                              }
                            }}
                            className="text-blue-600 hover:text-blue-900 text-xs"
                          >
                            저장
                          </button>
                          <button
                            onClick={() => {
                              setEditingCommission(null)
                              const newInputs = new Map(commissionInputs)
                              newInputs.delete(user.uid)
                              setCommissionInputs(newInputs)
                            }}
                            className="text-gray-600 hover:text-gray-900 text-xs"
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {hasCustomCommission.has(user.uid) ? (
                              <>
                                {commissionRates.get(user.uid)}% <span className="text-xs text-gray-500">(개별 설정)</span>
                              </>
                            ) : (
                              <>
                                {defaultCommissionRate}% <span className="text-xs text-gray-500">(기본값)</span>
                              </>
                            )}
                          </span>
                          {isAdmin && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setEditingCommission(user.uid)
                                  const newInputs = new Map(commissionInputs)
                                  newInputs.set(user.uid, commissionRates.get(user.uid) ?? defaultCommissionRate)
                                  setCommissionInputs(newInputs)
                                }}
                                className="text-blue-600 hover:text-blue-900 text-xs"
                              >
                                {hasCustomCommission.has(user.uid) ? '수정' : '설정'}
                              </button>
                              {hasCustomCommission.has(user.uid) && (
                                <button
                                  onClick={async () => {
                                    if (!confirm('개별 수수료율을 삭제하고 기본 수수료율을 사용하시겠습니까?')) {
                                      return
                                    }
                                    try {
                                      await deleteOrganizerCommissionRate(user.uid)
                                      const newRates = new Map(commissionRates)
                                      newRates.delete(user.uid)
                                      setCommissionRates(newRates)
                                      const newCustomSet = new Set(hasCustomCommission)
                                      newCustomSet.delete(user.uid)
                                      setHasCustomCommission(newCustomSet)
                                      alert('개별 수수료율이 삭제되었습니다. 기본 수수료율을 사용합니다.')
                                    } catch (error: any) {
                                      alert(error.message || '수수료율 삭제에 실패했습니다.')
                                    }
                                  }}
                                  className="text-red-600 hover:text-red-900 text-xs"
                                  title="개별 수수료율 삭제 (기본값 사용)"
                                >
                                  삭제
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {user.role === 'organizer_pending' && (
                      <div className="flex flex-col gap-2">
                        {user.organizerApplication && (
                          <button
                            onClick={() => setSelectedApplication(selectedApplication === user.uid ? null : user.uid)}
                            className="text-gray-600 hover:text-gray-900 text-xs text-left"
                          >
                            {selectedApplication === user.uid ? '신청 정보 숨기기' : '신청 정보 보기'}
                          </button>
                        )}
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleApproveOrganizer(user.uid)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            승인
                          </button>
                          <button
                            onClick={() => handleRejectOrganizer(user.uid)}
                            className="text-red-600 hover:text-red-900"
                          >
                            거부
                          </button>
                        </div>
                      </div>
                    )}
                    {user.role !== 'organizer_pending' && user.role !== 'owner' && isAdmin && (
                      <div className="flex items-center gap-2">
                        {editingRole === user.uid ? (
                        <>
                          <select
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value as UserRole)}
                            className="border rounded px-2 py-1 text-sm"
                          >
                            {getAvailableRoles().map(role => (
                              <option key={role} value={role}>
                                {role === 'user' ? '사용자' :
                                 role === 'organizer' ? '진행자' :
                                 role === 'admin' ? '관리자' : role}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleChangeRole(user.uid, newRole)}
                            className="text-blue-600 hover:text-blue-900 text-xs"
                          >
                            저장
                          </button>
                          <button
                            onClick={() => {
                              setEditingRole(null)
                              setNewRole(user.role)
                            }}
                            className="text-gray-600 hover:text-gray-900 text-xs"
                          >
                            취소
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingRole(user.uid)
                              setNewRole(user.role)
                            }}
                            className="text-purple-600 hover:text-purple-900 font-medium"
                          >
                            역할 변경
                          </button>
                          {user.role === 'organizer' && isOwner && (
                            <button
                              onClick={() => handlePromoteToAdmin(user.uid)}
                              className="text-indigo-600 hover:text-indigo-900 font-medium ml-2"
                            >
                              관리자로 승격
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </td>
              </tr>
                {user.role === 'organizer_pending' && selectedApplication === user.uid && user.organizerApplication && (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 bg-gray-50">
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <h3 className="font-semibold mb-3">진행자 신청 정보</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">실명:</span> {user.organizerApplication.realName}
                          </div>
                          <div>
                            <span className="font-medium">휴대폰 번호:</span> {user.organizerApplication.phoneNumber}
                          </div>
                          <div className="md:col-span-2">
                            <span className="font-medium">배송지:</span> ({user.organizerApplication.deliveryPostcode}) {user.organizerApplication.deliveryAddress} {user.organizerApplication.deliveryAddressDetail}
                            {user.organizerApplication.buildingPassword && (
                              <span className="ml-2 text-gray-500">(공동현관 비밀번호: {user.organizerApplication.buildingPassword})</span>
                            )}
                          </div>
                          <div className="md:col-span-2">
                            <span className="font-medium">정산 계좌번호:</span> {user.organizerApplication.accountNumber}
                          </div>
                          <div className="md:col-span-2">
                            <span className="font-medium">동의 사항:</span>
                            <div className="mt-1 space-y-1 text-xs">
                              <div>✓ 개인정보 수집·이용 동의</div>
                              <div>✓ 진행자 운영 책임 동의</div>
                              <div>✓ 주문내역 확인 및 픽업 운영 동의</div>
                              {user.organizerApplication.agreedToMarketing && (
                                <div>✓ 마케팅 정보 수신 동의</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SettingsTab({
  organizerRecruitmentEnabled,
  onUpdate
}: {
  organizerRecruitmentEnabled: boolean
  onUpdate: () => void
}) {
  const [defaultCommissionRate, setDefaultCommissionRateState] = useState<number>(10)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      // 기본 수수료율 로드
      const defaultRate = await getDefaultCommissionRate()
      setDefaultCommissionRateState(defaultRate)
    } catch (error) {
      console.error('설정 로드 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleRecruitment = async () => {
    try {
      await setOrganizerRecruitmentStatus(!organizerRecruitmentEnabled)
      onUpdate()
    } catch (error) {
      console.error('모집 상태 변경 오류:', error)
      alert('모집 상태 변경에 실패했습니다.')
    }
  }

  const handleUpdateDefaultCommissionRate = async () => {
    try {
      if (defaultCommissionRate < 0 || defaultCommissionRate > 100) {
        alert('수수료율은 0%에서 100% 사이여야 합니다.')
        return
      }
      
      await setDefaultCommissionRate(defaultCommissionRate)
      alert('기본 수수료율이 업데이트되었습니다.\n\n참고: 이미 개별 수수료율이 설정된 진행자는 변경되지 않습니다.')
      onUpdate()
    } catch (error: any) {
      console.error('기본 수수료율 업데이트 오류:', error)
      alert(error.message || '기본 수수료율 업데이트에 실패했습니다.')
    }
  }

  if (loading) {
    return <div>로딩 중...</div>
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">설정</h2>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">진행자 모집 설정</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">
              진행자 모집을 {organizerRecruitmentEnabled ? '활성화' : '비활성화'}합니다.
            </p>
          </div>
          <button
            onClick={handleToggleRecruitment}
            className={`px-4 py-2 rounded-lg ${
              organizerRecruitmentEnabled
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
            }`}
          >
            {organizerRecruitmentEnabled ? '비활성화' : '활성화'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">기본 수수료율 설정</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">기본 수수료율 (%)</label>
            <input
              type="number"
              value={defaultCommissionRate}
              onChange={(e) => setDefaultCommissionRateState(Number(e.target.value))}
              min="0"
              max="100"
              step="0.1"
              className="w-full border rounded-lg px-3 py-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              새로 생성되는 진행자에게 적용되는 기본 수수료율입니다. 이미 개별 수수료율이 설정된 진행자는 변경되지 않습니다.
            </p>
          </div>
          <button
            onClick={handleUpdateDefaultCommissionRate}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            기본 수수료율 업데이트
          </button>
        </div>
      </div>
    </div>
  )
}

// 배송관리 탭
function DeliveryTab({ groups, onUpdate }: { groups: Group[]; onUpdate: () => void }) {
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())
  const [filterStatus, setFilterStatus] = useState<'입금안내' | '입금확인' | '생산입력' | '배송입력' | '배송완료'>('입금안내')
  const [groupOrdersMap, setGroupOrdersMap] = useState<Map<string, Order[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [processingGroups, setProcessingGroups] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadOrders()
  }, [groups])

  const loadOrders = async () => {
    setLoading(true)
    try {
      const ordersMap = new Map<string, Order[]>()
      for (const group of groups) {
        try {
          const orders = await getGroupOrders(group.id)
          ordersMap.set(group.id, orders)
        } catch (err) {
          console.error(`그룹 ${group.id} 주문 조회 실패:`, err)
          ordersMap.set(group.id, [])
        }
      }
      setGroupOrdersMap(ordersMap)
    } catch (error) {
      console.error('주문 로드 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleGroupSelection = (groupId: string) => {
    const newSelected = new Set(selectedGroups)
    if (newSelected.has(groupId)) {
      newSelected.delete(groupId)
    } else {
      newSelected.add(groupId)
    }
    setSelectedGroups(newSelected)
  }

  // 배송중 또는 완료 상태인 그룹 필터링
  const shippingGroups = groups.filter(group => 
    group.status === '배송중' || group.status === '완료'
  )
  
  // 배송중 상태 ID 생성 함수 (배송중 상태변경일자+번호)
  const getShippingId = (group: Group) => {
    if (group.status !== '배송중' && group.status !== '완료') return ''
    if (!group.shippingStartedAt) return ''
    
    // Timestamp를 Date로 변환
    const getDateFromTimestamp = (ts: any): Date => {
      if (ts instanceof Date) return ts
      if (ts instanceof Timestamp) return ts.toDate()
      if (ts && typeof ts.toDate === 'function') return ts.toDate()
      if (ts && ts.seconds) {
        return Timestamp.fromMillis(ts.seconds * 1000 + (ts.nanoseconds || 0) / 1000000).toDate()
      }
      return new Date(ts)
    }
    
    const date = getDateFromTimestamp(group.shippingStartedAt)
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
    
    // 같은 날짜에 배송중으로 변경된 건들을 그룹화하여 번호 부여
    const sameDateGroups = shippingGroups.filter(g => {
      if (!g.shippingStartedAt) return false
      const gDate = getDateFromTimestamp(g.shippingStartedAt)
      const gDateStr = `${gDate.getFullYear()}${String(gDate.getMonth() + 1).padStart(2, '0')}${String(gDate.getDate()).padStart(2, '0')}`
      return gDateStr === dateStr
    }).sort((a, b) => {
      const aDate = getDateFromTimestamp(a.shippingStartedAt!)
      const bDate = getDateFromTimestamp(b.shippingStartedAt!)
      return aDate.getTime() - bDate.getTime()
    })
    
    const groupIndex = sameDateGroups.findIndex(g => g.id === group.id)
    return `${dateStr}-${String(groupIndex + 1).padStart(3, '0')}`
  }
  
  // 세부 상태별 필터링
  const filteredGroups = shippingGroups.filter(group => {
    const currentStatus = group.deliveryDetailStatus || '입금안내'
    // 배송완료 필터는 완료 상태인 그룹만 표시
    if (filterStatus === '배송완료') {
      return group.status === '완료'
    }
    // 다른 필터는 배송중 상태인 그룹 중에서 세부 상태로 필터링
    return group.status === '배송중' && currentStatus === filterStatus
  })

  const handleUpdateDetailStatus = async (groupId: string, status: '입금안내' | '입금확인' | '생산입력' | '배송입력' | '배송완료') => {
    setProcessingGroups(prev => new Set(prev).add(groupId))
    try {
      await updateDeliveryDetailStatus(groupId, status)
      await loadOrders() // 주문 데이터 다시 로드
      onUpdate() // 그룹 데이터 새로고침
    } catch (error: any) {
      alert(error.message || '상태 변경에 실패했습니다.')
    } finally {
      setProcessingGroups(prev => {
        const newSet = new Set(prev)
        newSet.delete(groupId)
        return newSet
      })
    }
  }

  const handleBatchUpdateStatus = async (direction: 'prev' | 'next') => {
    if (selectedGroups.size === 0) {
      alert('상태를 변경할 공동구매 건을 선택해주세요.')
      return
    }

    const statusSteps: ('입금안내' | '입금확인' | '생산입력' | '배송입력' | '배송완료')[] = ['입금안내', '입금확인', '생산입력', '배송입력', '배송완료']
    
    const updates: Array<{ groupId: string; newStatus: '입금안내' | '입금확인' | '생산입력' | '배송입력' | '배송완료' }> = []
    
    selectedGroups.forEach(groupId => {
      const group = groups.find(g => g.id === groupId)
      if (!group) return
      
      // 배송완료 필터에서 선택한 경우, status가 '완료'이면 deliveryDetailStatus를 '배송완료'로 간주
      let currentStatus = group.deliveryDetailStatus || '입금안내'
      if (filterStatus === '배송완료' && group.status === '완료') {
        currentStatus = '배송완료'
      }
      
      const currentIndex = statusSteps.indexOf(currentStatus)
      
      if (direction === 'prev' && currentIndex > 0) {
        updates.push({ groupId, newStatus: statusSteps[currentIndex - 1] })
      } else if (direction === 'next' && currentIndex < statusSteps.length - 1) {
        updates.push({ groupId, newStatus: statusSteps[currentIndex + 1] })
      }
    })

    if (updates.length === 0) {
      alert('변경 가능한 공동구매 건이 없습니다.')
      return
    }

    setProcessingGroups(new Set(updates.map(u => u.groupId)))
    
    try {
      await Promise.all(updates.map(({ groupId, newStatus }) => 
        updateDeliveryDetailStatus(groupId, newStatus)
      ))
      await loadOrders()
      await onUpdate() // 그룹 데이터 새로고침 (await 추가)
      setSelectedGroups(new Set()) // 선택 해제
      alert(`${updates.length}개 공동구매 건의 상태가 변경되었습니다.`)
    } catch (error: any) {
      alert(error.message || '일괄 상태 변경에 실패했습니다.')
    } finally {
      setProcessingGroups(new Set())
    }
  }

  const toggleSelectAll = () => {
    if (selectedGroups.size === filteredGroups.length) {
      setSelectedGroups(new Set())
    } else {
      setSelectedGroups(new Set(filteredGroups.map(g => g.id)))
    }
  }

  const handleExportExcel = () => {
    if (selectedGroups.size === 0) {
      alert('다운로드할 공동구매 건을 선택해주세요.')
      return
    }

    const exportData: any[] = []
    
    // 생산입력: 모든 선택된 공동구매 건에서 상품ID별로 합산
    if (filterStatus === '생산입력') {
      // 모든 선택된 공동구매 건의 주문을 모아서 상품ID별로 그룹화
      const productMap = new Map<string, { productId: string; productName: string; totalQuantity: number; totalPrice: number }>()
      
      selectedGroups.forEach(groupId => {
        const group = groups.find(g => g.id === groupId)
        if (!group) return
        
        const orders = groupOrdersMap.get(groupId) || []
        
        orders.forEach(order => {
          // 상품ID가 없으면 상품명을 키로 사용
          const key = order.productId || order.productName || '알수없음'
          const existing = productMap.get(key)
          
          if (existing) {
            existing.totalQuantity += order.quantity
            existing.totalPrice += order.totalPrice
          } else {
            productMap.set(key, {
              productId: order.productId || '',
              productName: order.productName,
              totalQuantity: order.quantity,
              totalPrice: order.totalPrice
            })
          }
        })
      })
      
      // 상품ID로 정렬 (상품ID가 없는 것은 뒤로)
      const sortedProducts = Array.from(productMap.entries()).sort((a, b) => {
        if (!a[1].productId && b[1].productId) return 1
        if (a[1].productId && !b[1].productId) return -1
        if (!a[1].productId && !b[1].productId) return a[1].productName.localeCompare(b[1].productName)
        return a[1].productId.localeCompare(b[1].productId)
      })
      
      sortedProducts.forEach(([key, productData]) => {
        exportData.push({
          '상품ID': productData.productId || '(없음)',
          '상품명': productData.productName,
          '총 주문수량': productData.totalQuantity,
          '총 금액': productData.totalPrice
        })
      })
    } else {
      // 배송입력 및 기타 상태: 기존 로직 유지
      selectedGroups.forEach(groupId => {
        const group = groups.find(g => g.id === groupId)
        if (!group) return
        
        const orders = groupOrdersMap.get(groupId) || []
        
        // 배송입력: 주문건마다 배송정보와 주문건의 상품수량
        if (filterStatus === '배송입력') {
          // 주문을 주문건(transaction)별로 그룹화
          const orderGroups = new Map<string, Order[]>()
          orders.forEach(order => {
            const key = `${order.userId}_${order.createdAt?.toMillis() || 0}`
            if (!orderGroups.has(key)) {
              orderGroups.set(key, [])
            }
            orderGroups.get(key)!.push(order)
          })
          
          orderGroups.forEach((orderGroup, key) => {
            const firstOrder = orderGroup[0]
            const totalQuantity = orderGroup.reduce((sum, o) => sum + o.quantity, 0)
            const totalPrice = orderGroup.reduce((sum, o) => sum + o.totalPrice, 0)
            
            exportData.push({
              '공동구매 건': group.title,
              '주문자': firstOrder.userName,
              '수령인 이름': group.deliveryName || '',
              '수령인 전화번호': group.deliveryPhone || '',
              '배송지 주소': group.deliveryAddress || '',
              '상세주소': group.deliveryAddressDetail || '',
              '우편번호': group.deliveryPostcode || '',
              '공동출입문 비밀번호': group.deliveryBuildingPassword || '',
              '상품명': orderGroup.map(o => `${o.productName} x${o.quantity}`).join(', '),
              '주문 수량': totalQuantity,
              '총 금액': totalPrice,
              '주문일시': firstOrder.createdAt ? formatDateTime(firstOrder.createdAt) : ''
            })
          })
        } else {
          // 기타 상태: 기존 형식 유지
          // 주문을 주문건(transaction)별로 그룹화
          const orderGroups = new Map<string, Order[]>()
          orders.forEach(order => {
            const key = `${order.userId}_${order.createdAt?.toMillis() || 0}`
            if (!orderGroups.has(key)) {
              orderGroups.set(key, [])
            }
            orderGroups.get(key)!.push(order)
          })
          
          orderGroups.forEach((orderGroup, key) => {
            const firstOrder = orderGroup[0]
            const totalQuantity = orderGroup.reduce((sum, o) => sum + o.quantity, 0)
            const totalPrice = orderGroup.reduce((sum, o) => sum + o.totalPrice, 0)
            
            exportData.push({
              '공동구매 건': group.title,
              '주문자': firstOrder.userName,
              '수령인 이름': group.deliveryName || '',
              '수령인 전화번호': group.deliveryPhone || '',
              '배송지 주소': group.deliveryAddress || '',
              '상세주소': group.deliveryAddressDetail || '',
              '우편번호': group.deliveryPostcode || '',
              '공동출입문 비밀번호': group.deliveryBuildingPassword || '',
              '배송 세부 상태': group.deliveryDetailStatus || '입금안내',
              '상품명': orderGroup.map(o => `${o.productName} x${o.quantity}`).join(', '),
              '총 수량': totalQuantity,
              '총 금액': totalPrice,
              '주문일시': firstOrder.createdAt ? formatDateTime(firstOrder.createdAt) : ''
            })
          })
        }
      })
    }

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    const sheetName = filterStatus === '생산입력' ? '생산정보' : filterStatus === '배송입력' ? '배송정보' : '배송정보'
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    
    const fileName = `${sheetName}_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">배송관리</h2>
        <p className="text-sm text-gray-600">
          공동구매 건을 선택하여 배송정보를 엑셀로 다운로드할 수 있습니다.
        </p>
      </div>

      {/* 필터 및 액션 */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {(['입금안내', '입금확인', '생산입력', '배송입력', '배송완료'] as const).map((status) => (
            <button
              key={status}
              onClick={() => {
                setFilterStatus(status as any)
                setSelectedGroups(new Set())
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filterStatus === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={toggleSelectAll}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            {selectedGroups.size === filteredGroups.length ? '전체 해제' : '전체 선택'}
          </button>
          {selectedGroups.size > 0 && (
            <>
              <button
                onClick={() => handleBatchUpdateStatus('prev')}
                disabled={processingGroups.size > 0}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                이전 단계로 ({selectedGroups.size}개)
              </button>
              <button
                onClick={() => handleBatchUpdateStatus('next')}
                disabled={processingGroups.size > 0}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음 단계로 ({selectedGroups.size}개)
              </button>
            </>
          )}
          <button
            onClick={handleExportExcel}
            disabled={selectedGroups.size === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            엑셀 다운로드 ({selectedGroups.size}개)
          </button>
        </div>
      </div>

      {/* 공동구매 건 목록 */}
      {loading ? (
        <div className="text-center py-8">로딩 중...</div>
      ) : filteredGroups.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">
            {shippingGroups.length === 0 
              ? '배송중 또는 완료 상태인 공동구매 건이 없습니다.'
              : '선택한 조건에 해당하는 공동구매 건이 없습니다.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredGroups.map((group) => {
            const orders = groupOrdersMap.get(group.id) || []
            const orderCount = orders.length
            const currentDetailStatus = group.deliveryDetailStatus || '입금안내'
            const isProcessing = processingGroups.has(group.id)
            
            // 단계 순서 정의
            const statusSteps: ('입금안내' | '입금확인' | '생산입력' | '배송입력' | '배송완료')[] = ['입금안내', '입금확인', '생산입력', '배송입력', '배송완료']
            const currentIndex = statusSteps.indexOf(currentDetailStatus)
            const prevStatus = currentIndex > 0 ? statusSteps[currentIndex - 1] : null
            const nextStatus = currentIndex < statusSteps.length - 1 ? statusSteps[currentIndex + 1] : null
            
            return (
              <div
                key={group.id}
                className="bg-white rounded-lg shadow border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={selectedGroups.has(group.id)}
                    onChange={() => toggleGroupSelection(group.id)}
                    className="mt-1 w-5 h-5"
                    disabled={isProcessing}
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-gray-900">{group.title}</h3>
                          {group.status === '배송중' && group.shippingStartedAt && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                              배송ID: {getShippingId(group)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          진행자: {group.organizerName} | 주문 수: {orderCount}건
                        </p>
                        {group.deliveryAddress && (
                          <div className="text-sm text-gray-600 mt-2 space-y-1">
                            <p>
                              수령인: {group.deliveryName || '-'} | 전화번호: {group.deliveryPhone || '-'}
                            </p>
                            <p>
                              배송지: {group.deliveryPostcode} {group.deliveryAddress} {group.deliveryAddressDetail}
                              {group.deliveryBuildingPassword && ` (비밀번호: ${group.deliveryBuildingPassword})`}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* 배송 세부 상태 표시 */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-700">
                            현재 상태: <span className="text-blue-600 font-semibold">{currentDetailStatus}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
