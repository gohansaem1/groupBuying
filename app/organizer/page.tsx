'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import { getProducts, Product } from '@/lib/firebase/products'
import { getOrganizerGroups, createGroup, Group } from '@/lib/firebase/groups'
import { confirmGroup } from '@/lib/firebase/groups'
import { getCurrentUserProfile, UserProfile } from '@/lib/firebase/auth'
import { getOrganizerRecruitmentStatus } from '@/lib/firebase/admin'
import NavigationHeader from '@/components/NavigationHeader'

export default function OrganizerPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [groupTitle, setGroupTitle] = useState('')
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
      
      const [productsData, groupsData] = await Promise.all([
        getProducts(),
        getOrganizerGroups(profile.uid)
      ])
      setProducts(productsData)
      setGroups(groupsData)
    } catch (error) {
      console.error('데이터 로드 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGroup = async () => {
    if (!selectedProduct || !userProfile) return
    
    if (!groupTitle.trim()) {
      alert('공동구매 건 제목을 입력해주세요.')
      return
    }
    
    try {
      const salePrice = selectedProduct.listPrice * (1 - selectedProduct.discountRate / 100)
      
      await createGroup(
        groupTitle.trim(),
        userProfile.uid,
        userProfile.displayName || '주최자',
        selectedProduct.id,
        selectedProduct.name,
        salePrice
      )
      
      alert('공동구매 건이 생성되었습니다.')
      setShowCreateForm(false)
      setSelectedProduct(null)
      setGroupTitle('')
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

  if (userProfile?.role === 'organizer_pending') {
    return (
      <AuthGuard allowedRoles={['organizer_pending', 'organizer']}>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="bg-white rounded-lg shadow-md p-8 max-w-md">
            <h1 className="text-xl font-bold mb-4">승인 대기 중</h1>
            <p className="text-gray-600 mb-6">
              Organizer 역할 승인을 기다리고 있습니다. 관리자 승인 후 공동구매 건을 생성할 수 있습니다.
            </p>
            <button
              onClick={handleLogout}
              className="w-full bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
            >
              로그아웃
            </button>
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard allowedRoles={['organizer']}>
      <div className="min-h-screen bg-gray-50">
        <NavigationHeader userProfile={userProfile} currentPage="organizer" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">공동구매 건 목록</h2>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
            >
              공동구매 건 생성
            </button>
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
                <div>
                  <label className="block text-sm font-medium mb-2">상품 선택</label>
                  <select
                    value={selectedProduct?.id || ''}
                    onChange={(e) => {
                      const product = products.find(p => p.id === e.target.value)
                      setSelectedProduct(product || null)
                    }}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="">상품을 선택하세요</option>
                    {products.map((product) => {
                      const salePrice = product.listPrice * (1 - product.discountRate / 100)
                      return (
                        <option key={product.id} value={product.id}>
                          {product.name} - {salePrice.toLocaleString()}원
                        </option>
                      )
                    })}
                  </select>
                </div>
                {selectedProduct && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="font-medium">{selectedProduct.name}</p>
                    <p className="text-sm text-gray-600 mt-1">{selectedProduct.description}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      판매가: {(selectedProduct.listPrice * (1 - selectedProduct.discountRate / 100)).toLocaleString()}원
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      * 최소 공동구매 총액: 40,000원
                    </p>
                  </div>
                )}
                <div className="flex space-x-2">
                  <button
                    onClick={handleCreateGroup}
                    disabled={!selectedProduct || !groupTitle.trim()}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    생성
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateForm(false)
                      setSelectedProduct(null)
                      setGroupTitle('')
                    }}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {groups.map((group) => {
              const progress = Math.min((group.currentTotal / group.minimumTotal) * 100, 100)
              
              return (
                <div key={group.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{group.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">{group.productName}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        목표: {group.minimumTotal.toLocaleString()}원 / 현재: {group.currentTotal.toLocaleString()}원
                      </p>
                      <div className="mt-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                      <span className={`inline-block mt-2 px-2 py-1 rounded text-sm ${
                        group.status === '진행중' ? 'bg-blue-100 text-blue-800' :
                        group.status === '달성' ? 'bg-yellow-100 text-yellow-800' :
                        group.status === '확인완료' ? 'bg-purple-100 text-purple-800' :
                        group.status === '배송중' ? 'bg-indigo-100 text-indigo-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {group.status}
                      </span>
                    </div>
                    <div className="ml-4 flex flex-col space-y-2">
                      <button
                        onClick={() => copyGroupUrl(group.id)}
                        className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 text-sm"
                      >
                        링크 복사
                      </button>
                      <button
                        onClick={() => router.push(`/organizer/groups/${group.id}`)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        상세보기
                      </button>
                      {group.status === '달성' && (
                        <button
                          onClick={() => handleConfirm(group.id)}
                          className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 text-sm"
                        >
                          확인완료 처리
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            {groups.length === 0 && (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500">생성한 공동구매 건이 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}

