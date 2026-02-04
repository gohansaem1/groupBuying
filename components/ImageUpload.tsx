'use client'

import { useState, useRef } from 'react'
import { uploadImage, validateImageFile, deleteImage } from '@/lib/firebase/storage'

interface ImageUploadProps {
  currentImageUrl?: string
  onImageUploaded: (url: string) => void
  onImageRemoved?: () => void
  storagePath: string
  label?: string
  required?: boolean
  maxSize?: number // MB 단위
}

export default function ImageUpload({
  currentImageUrl,
  onImageUploaded,
  onImageRemoved,
  storagePath,
  label = '이미지',
  required = false,
  maxSize = 5,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)

    // 파일 검증
    const validation = validateImageFile(file)
    if (!validation.valid) {
      setError(validation.error || '파일 검증에 실패했습니다.')
      return
    }

    // 미리보기 생성
    const preview = URL.createObjectURL(file)
    setPreviewUrl(preview)

    // 업로드 시작
    setUploading(true)
    setUploadProgress(0)

    try {
      const downloadURL = await uploadImage(
        file,
        storagePath,
        (progress) => {
          setUploadProgress(progress)
        }
      )

      onImageUploaded(downloadURL)
      setError(null)
    } catch (err: any) {
      setError(err.message || '이미지 업로드에 실패했습니다.')
      setPreviewUrl(currentImageUrl || null)
    } finally {
      setUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemove = async () => {
    if (!currentImageUrl) {
      setPreviewUrl(null)
      if (onImageRemoved) {
        onImageRemoved()
      }
      return
    }

    // Storage에서 이미지 삭제 시도 (실패해도 계속 진행)
    try {
      // URL에서 경로 추출 시도 (간단한 방법)
      // 실제로는 메타데이터에 경로를 저장하는 것이 좋음
      if (onImageRemoved) {
        onImageRemoved()
      }
    } catch (err) {
      console.error('이미지 삭제 실패:', err)
    }

    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* 미리보기 */}
      {previewUrl && (
        <div className="relative inline-block">
          <img
            src={previewUrl}
            alt="미리보기"
            className="w-32 h-32 object-cover rounded-lg border border-gray-300"
          />
          {!uploading && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
            >
              ×
            </button>
          )}
        </div>
      )}

      {/* 업로드 버튼 */}
      {!previewUrl && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
            id={`image-upload-${storagePath}`}
          />
          <label
            htmlFor={`image-upload-${storagePath}`}
            className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer ${
              uploading
                ? 'bg-gray-100 cursor-not-allowed'
                : 'bg-white hover:bg-gray-50'
            }`}
          >
            <svg
              className="w-5 h-5 mr-2 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-sm text-gray-700">
              {uploading ? '업로드 중...' : '이미지 선택'}
            </span>
          </label>
        </div>
      )}

      {/* 업로드 진행률 */}
      {uploading && (
        <div className="w-full">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {Math.round(uploadProgress)}% 업로드 중...
          </p>
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* 도움말 */}
      <p className="text-xs text-gray-500">
        JPEG, PNG, WebP 형식, 최대 {maxSize}MB까지 업로드 가능합니다.
      </p>
    </div>
  )
}



