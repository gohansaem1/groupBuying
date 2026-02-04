/**
 * 카카오 웹훅 SET(Security Event Token) 검증
 * 
 * 참고: https://developers.kakao.com/docs/latest/ko/kakaologin/callback#ssf-verify-set
 */

import jwt from 'jsonwebtoken'
import jwksClient from 'jwks-rsa'

interface VerificationResult {
  valid: boolean
  payload?: any
  error?: string
  description?: string
}

// 카카오 공개키 클라이언트 (캐싱 권장)
const client = jwksClient({
  jwksUri: 'https://kauth.kakao.com/.well-known/jwks.json',
  cache: true,
  cacheMaxAge: 86400000, // 24시간 캐싱
})

// 공개키 가져오기
function getKey(header: any, callback: any) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err)
      return
    }
    const signingKey = key?.getPublicKey()
    callback(null, signingKey)
  })
}

/**
 * 카카오 웹훅 SET 검증
 */
export async function verifyKakaoWebhook(setToken: string): Promise<VerificationResult> {
  try {
    // 1. SET 파싱 (JWT 형식)
    const parts = setToken.split('.')
    if (parts.length !== 3) {
      return {
        valid: false,
        error: 'invalid_request',
        description: 'Invalid SET format'
      }
    }

    // 2. 헤더 디코딩
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString())
    
    // 3. 페이로드 디코딩 (검증 전에 미리 확인)
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())

    // 4. issuer 확인
    if (payload.iss !== 'https://kauth.kakao.com') {
      return {
        valid: false,
        error: 'invalid_issuer',
        description: 'Invalid issuer'
      }
    }

    // 5. audience 확인 (REST API 키와 일치해야 함)
    const restApiKey = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY || process.env.KAKAO_REST_API_KEY
    if (!restApiKey) {
      console.warn('KAKAO_REST_API_KEY가 설정되지 않았습니다.')
    } else if (payload.aud !== restApiKey) {
      return {
        valid: false,
        error: 'invalid_audience',
        description: 'Invalid audience'
      }
    }

    // 6. JWT 서명 검증
    return new Promise((resolve) => {
      jwt.verify(
        setToken,
        getKey as any,
        {
          algorithms: ['RS256'],
          issuer: 'https://kauth.kakao.com',
          audience: restApiKey,
        },
        (err, decoded) => {
          if (err) {
            resolve({
              valid: false,
              error: 'invalid_key',
              description: err.message || 'Signature verification failed'
            })
          } else {
            resolve({
              valid: true,
              payload: decoded
            })
          }
        }
      )
    })
  } catch (error: any) {
    return {
      valid: false,
      error: 'invalid_request',
      description: error.message || 'SET verification error'
    }
  }
}



