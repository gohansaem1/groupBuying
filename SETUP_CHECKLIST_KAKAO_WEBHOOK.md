# 카카오 웹훅 설정 체크리스트

## ✅ 필수 설정 항목

### 1. 환경 변수 설정 (.env.local)

`.env.local` 파일에 다음을 추가하세요:

```env
# 카카오 REST API 키 (웹훅 검증용 - 필수!)
NEXT_PUBLIC_KAKAO_REST_API_KEY=your_rest_api_key_here
```

**REST API 키 가져오기:**
1. [카카오 개발자 콘솔](https://developers.kakao.com/) 접속
2. 내 애플리케이션 선택
3. **앱 키** 탭 클릭
4. **REST API 키** 복사

### 2. 카카오 개발자 콘솔 웹훅 설정

1. [카카오 개발자 콘솔](https://developers.kakao.com/) 접속
2. 내 애플리케이션 선택
3. **앱 설정** → **웹훅** 탭 클릭
4. **웹훅 URL 등록**:
   - **로컬 테스트**: ngrok 등 터널링 서비스 사용 필요
     - 예: `https://abc123.ngrok.io/api/webhooks/kakao`
   - **프로덕션**: 실제 도메인 사용
     - 예: `https://your-domain.com/api/webhooks/kakao`
5. **웹훅 이벤트 선택**:
   - ✅ **계정 상태 변경 웹훅** 활성화 (필수)
   - ⬜ 연결 해제 웹훅 (선택사항)
6. **저장** 클릭

### 3. 로컬 테스트 설정 (선택사항)

로컬에서 테스트하려면 ngrok 설치:

```bash
# ngrok 설치 (전역)
npm install -g ngrok

# 또는 직접 다운로드
# https://ngrok.com/download

# 로컬 서버 터널링
ngrok http 3000
```

ngrok에서 제공하는 HTTPS URL을 카카오 개발자 콘솔에 등록하세요.

## ✅ 코드는 이미 구현됨

다음 파일들은 이미 구현되어 있으므로 수정할 필요 없습니다:

- ✅ `app/api/webhooks/kakao/route.ts` - 웹훅 수신 엔드포인트
- ✅ `lib/webhooks/kakao-verify.ts` - SET 검증 로직
- ✅ `lib/webhooks/kakao-handler.ts` - 이벤트 처리 로직
- ✅ 패키지 설치 완료 (`jsonwebtoken`, `jwks-rsa`)

## ⚠️ 확인 사항

### Firestore 규칙 확인

웹훅이 사용자 문서를 업데이트할 수 있도록 Firestore 규칙을 확인하세요.

현재 규칙 (`firestore.rules`):
```javascript
match /users/{userId} {
  allow read: if isSignedIn() && (request.auth.uid == userId || isAdmin());
  allow create: if isSignedIn() && request.auth.uid == userId;
  allow update: if isSignedIn() && (request.auth.uid == userId || isAdmin());
}
```

**문제**: 웹훅은 서버 사이드에서 실행되므로 `request.auth`가 없을 수 있습니다.

**해결 방법**: 
1. Firebase Admin SDK를 사용하여 서버 사이드에서 업데이트 (권장)
2. 또는 Firestore 규칙에 서버 사이드 업데이트 허용 추가

현재 `kakao-handler.ts`는 클라이언트 SDK를 사용하고 있으므로, 서버 사이드로 변경하거나 Firestore 규칙을 수정해야 합니다.

## 🔧 수정 필요: Firestore 업데이트 방식

현재 `lib/webhooks/kakao-handler.ts`는 클라이언트 SDK를 사용하고 있습니다.
웹훅은 서버 사이드에서 실행되므로 Firebase Admin SDK를 사용해야 합니다.

**수정 방법**: `lib/webhooks/kakao-handler.ts`를 Firebase Admin SDK로 변경하거나,
Firestore 규칙에서 서버 사이드 업데이트를 허용해야 합니다.

## 📝 테스트 방법

1. 환경 변수 설정 확인
2. 개발 서버 실행: `npm run dev`
3. ngrok 실행 (로컬 테스트 시): `ngrok http 3000`
4. 카카오 개발자 콘솔에 웹훅 URL 등록
5. 카카오 계정으로 로그인 후 계정 삭제 테스트
6. Firestore에서 사용자 문서 확인

## ❌ 문제 해결

### 웹훅이 수신되지 않을 때
- 카카오 개발자 콘솔에서 웹훅 URL이 올바르게 등록되었는지 확인
- 프로덕션에서는 HTTPS URL만 사용 가능
- 로컬 테스트는 ngrok 등 터널링 서비스 사용

### SET 검증 실패
- `NEXT_PUBLIC_KAKAO_REST_API_KEY` 환경 변수 확인
- REST API 키가 올바른지 확인
- 개발 서버 재시작

### Firestore 업데이트 실패
- Firestore 규칙 확인
- 서버 사이드 업데이트 권한 확인
- Firebase Admin SDK 사용 여부 확인

