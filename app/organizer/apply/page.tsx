'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import { getCurrentUserProfile, cancelOrganizerApplication, UserProfile } from '@/lib/firebase/auth'
import { getOrganizerRecruitmentStatus } from '@/lib/firebase/admin'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import NavigationHeader from '@/components/NavigationHeader'

declare global {
  interface Window {
    daum: any
  }
}

export default function ApplyOrganizerPage() {
  const router = useRouter()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [recruitmentEnabled, setRecruitmentEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  // 폼 상태
  const [realName, setRealName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [deliveryPostcode, setDeliveryPostcode] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliveryAddressDetail, setDeliveryAddressDetail] = useState('')
  const [buildingPassword, setBuildingPassword] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false)
  const [agreedToResponsibility, setAgreedToResponsibility] = useState(false)
  const [agreedToPickup, setAgreedToPickup] = useState(false)
  const [agreedToMarketing, setAgreedToMarketing] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [profile, enabled] = await Promise.all([
        getCurrentUserProfile(),
        getOrganizerRecruitmentStatus()
      ])
      setUserProfile(profile)
      setRecruitmentEnabled(enabled)
    } catch (error) {
      console.error('데이터 로드 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddressSearch = () => {
    if (!window.daum) {
      alert('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.')
      return
    }

    new window.daum.Postcode({
      oncomplete: function (data: any) {
        setDeliveryPostcode(data.zonecode)
        setDeliveryAddress(data.roadAddress || data.jibunAddress)
        setDeliveryAddressDetail('')
      }
    }).open()
  }

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userProfile) return
    
    // 이미 신청한 경우 방지
    if (userProfile.role === 'organizer_pending' || userProfile.role === 'organizer') {
      alert('이미 신청하셨거나 승인되었습니다.')
      router.push('/')
      return
    }

    // 필수 정보 검증
    if (!realName.trim()) {
      alert('실명을 입력해주세요.')
      return
    }
    if (!phoneNumber.trim()) {
      alert('휴대폰 번호를 입력해주세요.')
      return
    }
    if (!deliveryPostcode.trim() || !deliveryAddress.trim() || !deliveryAddressDetail.trim()) {
      alert('배송지 주소를 모두 입력해주세요.')
      return
    }
    if (!accountNumber.trim()) {
      alert('정산 계좌번호를 입력해주세요.')
      return
    }

    // 필수 동의 검증
    if (!agreedToPrivacy) {
      alert('개인정보 수집·이용 동의는 필수입니다.')
      return
    }
    if (!agreedToResponsibility) {
      alert('진행자 운영 책임 동의는 필수입니다.')
      return
    }
    if (!agreedToPickup) {
      alert('주문내역 확인 및 픽업 운영 동의는 필수입니다.')
      return
    }
    
    setSubmitting(true)
    try {
      const userRef = doc(db, 'users', userProfile.uid)
      const applicationData: any = {
        realName: realName.trim(),
        phoneNumber: phoneNumber.trim(),
        deliveryPostcode: deliveryPostcode.trim(),
        deliveryAddress: deliveryAddress.trim(),
        deliveryAddressDetail: deliveryAddressDetail.trim(),
        accountNumber: accountNumber.trim(),
        agreedToPrivacy,
        agreedToResponsibility,
        agreedToPickup,
        appliedAt: serverTimestamp(),
      }

      // 선택 항목은 값이 있을 때만 추가
      if (buildingPassword.trim()) {
        applicationData.buildingPassword = buildingPassword.trim()
      }
      if (agreedToMarketing) {
        applicationData.agreedToMarketing = true
      }

      await updateDoc(userRef, {
        role: 'organizer_pending',
        organizerApplication: applicationData,
        updatedAt: serverTimestamp(),
      })
      
      alert('진행자 신청이 완료되었습니다. 관리자 승인을 기다려주세요.')
      router.push('/')
    } catch (error) {
      console.error('신청 오류:', error)
      alert('신청에 실패했습니다.')
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

  if (!recruitmentEnabled) {
    return (
      <AuthGuard allowedRoles={['user']}>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
            <h1 className="text-xl font-bold mb-4">신청 불가</h1>
            <p className="text-gray-600 mb-6">
              현재 진행자 모집이 중단되었습니다.
            </p>
            <button
              onClick={() => router.push('/products')}
              className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
            >
              상품 목록으로
            </button>
          </div>
        </div>
      </AuthGuard>
    )
  }

  // organizer 역할이면 홈으로 리다이렉트
  if (userProfile?.role === 'organizer') {
    router.push('/')
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-bold mb-4">이미 승인되었습니다</h1>
          <p className="text-gray-600 mb-6">
            이미 진행자로 승인되었습니다.
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 font-semibold"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  // organizer_pending 역할이면 취소 가능한 안내 페이지 표시
  if (userProfile?.role === 'organizer_pending') {
    const application = userProfile.organizerApplication
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <NavigationHeader 
          userProfile={userProfile} 
          currentPage="home"
          onProfileUpdate={async (updatedProfile) => {
            setUserProfile(updatedProfile)
          }}
        />
        <div className="min-h-screen flex items-center justify-center px-4 py-8">
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                승인 대기 중
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                진행자 신청이 완료되었습니다. 관리자 승인을 기다려주세요.
              </p>
            </div>

            {application && (
              <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2 text-sm">
                <div><span className="font-semibold">실명:</span> {application.realName}</div>
                <div><span className="font-semibold">연락처:</span> {application.phoneNumber}</div>
                <div><span className="font-semibold">배송지:</span> ({application.deliveryPostcode}) {application.deliveryAddress} {application.deliveryAddressDetail}</div>
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-yellow-800">
                승인 후 공동구매 건을 생성하고 관리할 수 있습니다.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={async () => {
                  if (!confirm('정말로 진행자 신청을 취소하시겠습니까? 취소하면 다시 신청할 수 있습니다.')) {
                    return
                  }
                  
                  setCancelling(true)
                  try {
                    await cancelOrganizerApplication()
                    alert('신청이 취소되었습니다.')
                    router.push('/')
                  } catch (err: any) {
                    alert(err.message || '신청 취소에 실패했습니다.')
                  } finally {
                    setCancelling(false)
                  }
                }}
                disabled={cancelling}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 sm:py-4 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center"
              >
                {cancelling ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    취소 중...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    신청 취소하기
                  </>
                )}
              </button>
              <button
                onClick={() => router.push('/')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 sm:py-4 px-4 rounded-xl transition-colors"
              >
                홈으로 돌아가기
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AuthGuard allowedRoles={['user']}>
      <div className="min-h-screen bg-gray-50">
        <NavigationHeader 
          userProfile={userProfile} 
          currentPage="home"
          onProfileUpdate={async (updatedProfile) => {
            setUserProfile(updatedProfile)
          }}
        />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-md p-6 sm:p-8">
            <h1 className="text-2xl font-bold mb-2">진행자 신청</h1>
            <p className="text-gray-600 mb-6">
              진행자가 되시면 공동구매 그룹을 생성하고 관리할 수 있습니다.
              신청 후 관리자 승인이 필요합니다.
            </p>

            <form onSubmit={handleApply} className="space-y-6">
              {/* 기본 정보 */}
              <div>
                <h2 className="text-lg font-semibold mb-4">기본 정보</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      실명 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={realName}
                      onChange={(e) => setRealName(e.target.value)}
                      required
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="실명을 입력해주세요"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      휴대폰 번호 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      required
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="010-1234-5678"
                    />
                  </div>
                </div>
              </div>

              {/* 배송지 정보 */}
              <div>
                <h2 className="text-lg font-semibold mb-4">배송지 정보</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      배송지 주소 <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={deliveryPostcode}
                        readOnly
                        className="flex-1 border rounded-lg px-3 py-2 bg-gray-50"
                        placeholder="우편번호"
                      />
                      <button
                        type="button"
                        onClick={handleAddressSearch}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                      >
                        주소 검색
                      </button>
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={deliveryAddress}
                      readOnly
                      className="w-full border rounded-lg px-3 py-2 bg-gray-50"
                      placeholder="기본주소"
                    />
                  </div>

                  <div>
                    <input
                      type="text"
                      value={deliveryAddressDetail}
                      onChange={(e) => setDeliveryAddressDetail(e.target.value)}
                      required
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="상세주소를 입력해주세요"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      공동현관 비밀번호 <span className="text-gray-500 text-xs">(선택)</span>
                    </label>
                    <input
                      type="text"
                      value={buildingPassword}
                      onChange={(e) => setBuildingPassword(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="공동현관 비밀번호 (선택사항)"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      ⚠️ 민감정보입니다. 배송 목적 외 사용되지 않으며, 배송 완료 후 삭제됩니다.
                    </p>
                  </div>
                </div>
              </div>

              {/* 정산 정보 */}
              <div>
                <h2 className="text-lg font-semibold mb-4">정산 정보</h2>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    정산 계좌번호 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    required
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="은행명 계좌번호 (예: 국민은행 123-456-789012)"
                  />
                </div>
              </div>

              {/* 동의 사항 */}
              <div>
                <h2 className="text-lg font-semibold mb-4">동의 사항</h2>
                <div className="space-y-4">
                  <label className="flex items-start cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreedToPrivacy}
                      onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                      required
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <span className="font-medium">
                        [필수] 개인정보 수집·이용 동의
                      </span>
                      <p className="text-sm text-gray-600 mt-1">
                        진행자 신청 및 운영을 위해 실명, 연락처, 배송지, 계좌번호를 수집·이용합니다.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreedToResponsibility}
                      onChange={(e) => setAgreedToResponsibility(e.target.checked)}
                      required
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <span className="font-medium">
                        [필수] 진행자 운영 책임 동의
                      </span>
                      <p className="text-sm text-gray-600 mt-1">
                        공동구매 진행, 입금 확인, 상품 수령 및 배송, 픽업 운영에 대한 책임을 동의합니다.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreedToPickup}
                      onChange={(e) => setAgreedToPickup(e.target.checked)}
                      required
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <span className="font-medium">
                        [필수] 주문내역 확인 및 픽업 운영 동의
                      </span>
                      <p className="text-sm text-gray-600 mt-1">
                        주문내역을 확인하고, 픽업 장소에서 구매자들에게 상품을 전달하는 것을 동의합니다.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreedToMarketing}
                      onChange={(e) => setAgreedToMarketing(e.target.checked)}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <span className="font-medium">
                        [선택] 마케팅 정보 수신 동의
                      </span>
                      <p className="text-sm text-gray-600 mt-1">
                        진행자 관련 이벤트 및 프로모션 정보를 수신하는 것에 동의합니다.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* 제출 버튼 */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  {submitting ? '신청 중...' : '신청하기'}
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/products')}
                  className="px-6 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
