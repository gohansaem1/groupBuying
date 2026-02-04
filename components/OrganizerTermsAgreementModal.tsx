'use client'

import { useState } from 'react'

interface OrganizerTermsAgreementModalProps {
  onAgree: () => void
  onClose?: () => void
}

export default function OrganizerTermsAgreementModal({ onAgree, onClose }: OrganizerTermsAgreementModalProps) {
  const [agreed, setAgreed] = useState(false)

  const handleAgree = () => {
    if (agreed) {
      onAgree()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">진행자 서비스 이용 약관 동의</h2>
          
          <div className="mb-6 space-y-4 text-sm text-gray-700">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">필수 동의 사항</h3>
              <ul className="space-y-2 list-disc list-inside">
                <li>진행자 정보(실명, 연락처, 배송지, 계좌번호 등)를 공동구매/픽업 운영 목적으로 저장·이용함</li>
                <li>주문정보를 확인하고 구매자에게 상품을 전달하는 책임을 동의함</li>
                <li>공동구매 진행, 입금 확인, 상품 수령 및 배송, 픽업 운영에 대한 책임을 동의함</li>
              </ul>
            </div>
          </div>

          <label className="flex items-start cursor-pointer mb-6">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 mr-3 w-4 h-4"
            />
            <span className="text-sm">
              위 약관에 동의합니다. <span className="text-red-500">*</span>
            </span>
          </label>

          <div className="flex gap-3">
            <button
              onClick={handleAgree}
              disabled={!agreed}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              동의하고 시작하기
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="px-6 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400"
              >
                취소
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


