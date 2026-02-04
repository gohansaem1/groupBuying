# 카카오 로그인 웹훅 설정 가이드

카카오 로그인 사용자의 계정 상태 변경 시 자동으로 알림을 받는 웹훅 기능을 설정합니다.

참고 문서: [카카오 개발자 문서](https://developers.kakao.com/docs/latest/ko/kakaologin/callback#ssf)

## 웹훅이란?

웹훅은 카카오 로그인 사용자의 계정 상태에 변경 사항이 생겼을 때, 카카오디벨로퍼스에 설정된 웹훅 URL로 HTTP 요청을 보내 서비스에게 공유하는 기능입니다.

## 지원하는 이벤트 타입

1. **계정 삭제** (`account-deleted`)
   - 사용자가 카카오 계정을 삭제한 경우

2. **계정 비활성화** (`account-disabled`)
   - 사용자 계정이 비활성화된 경우

3. **계정 활성화** (`account-enabled`)
   - 사용자 계정이 다시 활성화된 경우

4. **식별자 변경** (`identifier-changed`)
   - 사용자의 이메일 또는 전화번호가 변경된 경우

5. **식별자 재사용** (`identifier-recycled`)
   - 사용자의 이메일 또는 전화번호가 재사용된 경우

## 설정 방법

### 1. 카카오 개발자 콘솔 설정

1. [카카오 개발자 콘솔](https://developers.kakao.com/) 접속
2. 내 애플리케이션 선택
3. **앱 설정** → **플랫폼** 탭
4. **웹** 플랫폼 등록 (없으면 추가)
5. **앱 설정** → **웹훅** 탭
6. **웹훅 URL 등록**:
   - 개발: `http://localhost:3000/api/webhooks/kakao`
   - 프로덕션: `https://your-domain.com/api/webhooks/kakao`
7. **웹훅 이벤트 선택**:
   - 연결 해제 웹훅 (선택사항)
   - 계정 상태 변경 웹훅 (필수)
8. **저장** 클릭

### 2. 환경 변수 설정

`.env.local` 파일에 REST API 키 추가:

```env
# 카카오 설정
NEXT_PUBLIC_KAKAO_JS_KEY=your_javascript_key
# REST API 키 (웹훅 검증용)
NEXT_PUBLIC_KAKAO_REST_API_KEY=your_rest_api_key
```

**REST API 키 가져오기:**
1. 카카오 개발자 콘솔 → 내 애플리케이션
2. **앱 키** 탭
3. **REST API 키** 복사

### 3. 패키지 설치

```bash
npm install jsonwebtoken jwks-rsa
npm install --save-dev @types/jsonwebtoken
```

### 4. 웹훅 엔드포인트 확인

웹훅 엔드포인트는 이미 구현되어 있습니다:
- `app/api/webhooks/kakao/route.ts`: 웹훅 수신 엔드포인트
- `lib/webhooks/kakao-verify.ts`: SET 검증 로직
- `lib/webhooks/kakao-handler.ts`: 이벤트 처리 로직

## 웹훅 동작 방식

1. **카카오에서 웹훅 전송**
   - 사용자 계정 상태 변경 시 카카오가 SET(Security Event Token) 형식으로 전송

2. **SET 검증**
   - JWT 서명 검증
   - Issuer 확인 (`https://kauth.kakao.com`)
   - Audience 확인 (REST API 키와 일치)
   - 공개키로 서명 검증

3. **이벤트 처리**
   - Firestore의 사용자 문서 업데이트
   - 계정 상태 필드 업데이트

4. **응답**
   - 검증 성공: `202 Accepted` (3초 내 응답)
   - 검증 실패: `400 Bad Request` (에러 코드 포함)

## Firestore 사용자 문서 구조

웹훅 처리 후 사용자 문서에 다음 필드가 추가/업데이트됩니다:

```typescript
{
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  role: 'user' | 'organizer_pending' | 'organizer' | 'admin'
  
  // 웹훅 관련 필드
  accountStatus?: 'enabled' | 'disabled' | 'deleted'
  accountDeletedAt?: Timestamp
  accountDisabledAt?: Timestamp
  accountEnabledAt?: Timestamp
  identifierChangedAt?: Timestamp
  identifierRecycledAt?: Timestamp
  emailRecycled?: boolean
  phoneRecycled?: boolean
  phoneNumber?: string
  
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

## 테스트

### 로컬 테스트

1. **ngrok 설치** (로컬 서버를 외부에 노출):
   ```bash
   npm install -g ngrok
   ngrok http 3000
   ```

2. **ngrok URL을 카카오 개발자 콘솔에 등록**:
   - 예: `https://abc123.ngrok.io/api/webhooks/kakao`

3. **카카오 계정으로 로그인 후 계정 삭제 테스트**

### 프로덕션 테스트

1. 프로덕션 도메인을 카카오 개발자 콘솔에 등록
2. 실제 카카오 계정으로 테스트
3. Firestore에서 사용자 문서 확인

## 보안 고려사항

1. **SET 검증 필수**: 모든 웹훅 요청은 반드시 검증해야 합니다
2. **3초 내 응답**: 카카오는 3초 내 응답을 기대합니다
3. **HTTPS 사용**: 프로덕션에서는 반드시 HTTPS를 사용하세요
4. **공개키 캐싱**: 공개키는 24시간 캐싱하여 사용합니다 (과도한 요청 방지)

## 문제 해결

### 웹훅이 수신되지 않을 때
- 카카오 개발자 콘솔에서 웹훅 URL이 올바르게 등록되었는지 확인
- 프로덕션에서는 HTTPS URL만 사용 가능
- 로컬 테스트는 ngrok 등 터널링 서비스 사용

### SET 검증 실패
- REST API 키가 올바르게 설정되었는지 확인
- 환경 변수 `NEXT_PUBLIC_KAKAO_REST_API_KEY` 확인
- 카카오 공개키 조회가 정상적으로 되는지 확인

### 이벤트가 처리되지 않을 때
- Firestore 규칙에서 사용자 문서 업데이트 권한 확인
- 콘솔 로그에서 오류 메시지 확인
- 사용자 UID 형식 확인 (`kakao_{kakaoId}`)

## 참고 자료

- [카카오 로그인 웹훅 문서](https://developers.kakao.com/docs/latest/ko/kakaologin/callback#ssf)
- [SET 검증 가이드](https://developers.kakao.com/docs/latest/ko/kakaologin/callback#ssf-verify-set)
- [OpenID SSF 규격](https://openid.net/specs/openid-sse-framework-1_0.html)



