'use client'

import { useState, useEffect } from 'react'
import AuthGuard from '@/components/AuthGuard'
import { getAllProducts, createProduct, updateProduct, Product } from '@/lib/firebase/products'
import { getOrganizerRecruitmentStatus, setOrganizerRecruitmentStatus, getAllUsers, updateUserRole, getPendingOrganizers } from '@/lib/firebase/admin'
import { UserProfile, getCurrentUserProfile } from '@/lib/firebase/auth'
import { getAllGroups, Group } from '@/lib/firebase/groups'
import { confirmGroup, markShipping, markComplete } from '@/lib/firebase/groups'
import { useRouter } from 'next/navigation'
import NavigationHeader from '@/components/NavigationHeader'

export default function AdminPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'products' | 'groups' | 'users' | 'settings'>('products')
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
        <NavigationHeader userProfile={userProfile} currentPage="admin" />

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
            <GroupsTab groups={groups} onUpdate={loadData} />
          )}
          {activeTab === 'users' && (
            <UsersTab onUpdate={loadData} />
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
        description: formData.get('description') as string,
        listPrice: Number(formData.get('listPrice')),
        discountRate: Number(formData.get('discountRate')),
        saleStatus: formData.get('saleStatus') as '판매중' | '판매중지',
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
        description: formData.get('description') as string,
        listPrice: Number(formData.get('listPrice')),
        discountRate: Number(formData.get('discountRate')),
        saleStatus: formData.get('saleStatus') as '판매중' | '판매중지',
      })
      setEditingProduct(null)
      onUpdate()
    } catch (error) {
      console.error('상품 수정 오류:', error)
      alert('상품 수정에 실패했습니다.')
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">상품 목록</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
        >
          상품 추가
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <h3 className="text-lg font-semibold mb-4">새 상품 추가</h3>
          <form onSubmit={handleAddProduct}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">상품명</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">설명</label>
                <textarea
                  name="description"
                  required
                  className="w-full border rounded-lg px-3 py-2"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">정가 (원)</label>
                  <input
                    type="number"
                    name="listPrice"
                    required
                    min="0"
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">할인율 (%)</label>
                  <input
                    type="number"
                    name="discountRate"
                    required
                    min="0"
                    max="100"
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">판매 상태</label>
                <select
                  name="saleStatus"
                  required
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="판매중">판매중</option>
                  <option value="판매중지">판매중지</option>
                </select>
              </div>
              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
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

      <div className="space-y-4">
        {products.map((product) => {
          const salePrice = product.listPrice * (1 - product.discountRate / 100)
          
          return (
            <div key={product.id} className="bg-white rounded-lg shadow p-4">
              {editingProduct?.id === product.id ? (
                <form onSubmit={handleUpdateProduct}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">상품명</label>
                      <input
                        type="text"
                        name="name"
                        defaultValue={product.name}
                        required
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">설명</label>
                      <textarea
                        name="description"
                        defaultValue={product.description}
                        required
                        className="w-full border rounded-lg px-3 py-2"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">정가 (원)</label>
                        <input
                          type="number"
                          name="listPrice"
                          defaultValue={product.listPrice}
                          required
                          min="0"
                          className="w-full border rounded-lg px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">할인율 (%)</label>
                        <input
                          type="number"
                          name="discountRate"
                          defaultValue={product.discountRate}
                          required
                          min="0"
                          max="100"
                          className="w-full border rounded-lg px-3 py-2"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">판매 상태</label>
                      <select
                        name="saleStatus"
                        defaultValue={product.saleStatus}
                        required
                        className="w-full border rounded-lg px-3 py-2"
                      >
                        <option value="판매중">판매중</option>
                        <option value="판매중지">판매중지</option>
                      </select>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        type="submit"
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                      >
                        저장
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingProduct(null)}
                        className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold">{product.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{product.description}</p>
                      <div className="mt-2">
                        <span className="text-gray-500 line-through">{product.listPrice.toLocaleString()}원</span>
                        <span className="ml-2 text-lg font-semibold text-red-600">
                          {salePrice.toLocaleString()}원 ({product.discountRate}% 할인)
                        </span>
                      </div>
                      <span className={`inline-block mt-2 px-2 py-1 rounded text-sm ${
                        product.saleStatus === '판매중' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {product.saleStatus}
                      </span>
                    </div>
                    <button
                      onClick={() => setEditingProduct(product)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      수정
                    </button>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function GroupsTab({ groups, onUpdate }: { groups: Group[]; onUpdate: () => void }) {
  const handleConfirm = async (groupId: string) => {
    try {
      await confirmGroup(groupId)
      onUpdate()
    } catch (error: any) {
      alert(error.message || '확인 처리에 실패했습니다.')
    }
  }

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

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">공동구매 건 목록</h2>
      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">{group.title}</h3>
                <p className="text-sm text-gray-500">{group.productName}</p>
                <p className="text-sm text-gray-600">주최자: {group.organizerName}</p>
                <p className="text-sm text-gray-600 mt-1">
                  목표: {group.minimumTotal.toLocaleString()}원 / 현재: {group.currentTotal.toLocaleString()}원
                </p>
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
              <div className="flex flex-col space-y-2">
                {group.status === '달성' && (
                  <button
                    onClick={() => handleConfirm(group.id)}
                    className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 text-sm"
                  >
                    확인완료 처리
                  </button>
                )}
                {group.status === '확인완료' && (
                  <button
                    onClick={() => handleShipping(group.id)}
                    className="bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 text-sm"
                  >
                    배송중 처리
                  </button>
                )}
                {group.status === '배송중' && (
                  <button
                    onClick={() => handleComplete(group.id)}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 text-sm"
                  >
                    완료 처리
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function UsersTab({ onUpdate }: { onUpdate: () => void }) {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [pendingOrganizers, setPendingOrganizers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending'>('pending')

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const [allUsers, pending] = await Promise.all([
        getAllUsers(),
        getPendingOrganizers()
      ])
      setUsers(allUsers)
      setPendingOrganizers(pending)
    } catch (error) {
      console.error('사용자 로드 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: 'user' | 'organizer_pending' | 'organizer' | 'admin') => {
    try {
      await updateUserRole(userId, newRole)
      alert('역할이 변경되었습니다.')
      loadUsers()
      onUpdate()
    } catch (error) {
      console.error('역할 변경 오류:', error)
      alert('역할 변경에 실패했습니다.')
    }
  }

  const displayUsers = filter === 'pending' ? pendingOrganizers : users

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-lg">로딩 중...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">사용자 관리</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg text-sm ${
              filter === 'pending'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            승인 대기 ({pendingOrganizers.length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm ${
              filter === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            전체 사용자
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {displayUsers.map((user) => (
          <div key={user.uid} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="font-semibold">{user.displayName || '이름 없음'}</p>
                <p className="text-sm text-gray-600">{user.email}</p>
                <span className={`inline-block mt-2 px-2 py-1 rounded text-xs ${
                  user.role === 'admin' ? 'bg-red-100 text-red-800' :
                  user.role === 'organizer' ? 'bg-green-100 text-green-800' :
                  user.role === 'organizer_pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {user.role === 'admin' ? '관리자' :
                   user.role === 'organizer' ? 'Organizer' :
                   user.role === 'organizer_pending' ? '승인 대기' :
                   '일반 사용자'}
                </span>
              </div>
              <div className="ml-4">
                <select
                  value={user.role}
                  onChange={(e) => handleRoleChange(user.uid, e.target.value as any)}
                  className="border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="user">일반 사용자</option>
                  <option value="organizer_pending">승인 대기</option>
                  <option value="organizer">Organizer</option>
                  <option value="admin">관리자</option>
                </select>
              </div>
            </div>
          </div>
        ))}
        {displayUsers.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">사용자가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function SettingsTab({
  organizerRecruitmentEnabled,
  onUpdate,
}: {
  organizerRecruitmentEnabled: boolean
  onUpdate: () => void
}) {
  const handleToggle = async () => {
    try {
      await setOrganizerRecruitmentStatus(!organizerRecruitmentEnabled)
      onUpdate()
    } catch (error) {
      console.error('설정 변경 오류:', error)
      alert('설정 변경에 실패했습니다.')
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">설정</h2>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-semibold">Organizer 모집</h3>
            <p className="text-sm text-gray-600 mt-1">
              Organizer 모집을 전역으로 켜거나 끌 수 있습니다.
            </p>
          </div>
          <button
            onClick={handleToggle}
            className={`px-4 py-2 rounded-lg font-medium ${
              organizerRecruitmentEnabled
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
            }`}
          >
            {organizerRecruitmentEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>
    </div>
  )
}

