# 카카오 로그인 token_exchange_failed 에러 해결 가이드

## 에러 의미

`token_exchange_failed` 에러는 카카오 인가 코드를 액세스 토큰으로 교환하는 과정에서 실패했다는 의미입니다.

---

## 원인 및 해결 방법

### 1. REST API 키 문제 (가장 흔함)

**증상**: `token_exchange_failed` 또는 `invalid_client` 에러

**원인**: 
- Vercel 환경 변수에 REST API 키가 설정되지 않았거나
- REST API 키가 잘못되었거나
- JS 키와 REST API 키를 혼동

**해결 방법**:

1. **카카오 개발자 콘솔에서 REST API 키 확인**
   - [카카오 개발자 콘솔](https://developers.kakao.com/) 접속
   - 내 애플리케이션 → 앱 선택
   - 앱 설정 → 일반 탭
   - 앱 키 섹션에서 **REST API 키** 확인

2. **Vercel 환경 변수 설정**
   - Vercel 대시보드 → 프로젝트 선택
   - Settings → Environment Variables
   - `NEXT_PUBLIC_KAKAO_REST_API_KEY` 추가/수정
   - 값: 카카오 개발자 콘솔에서 복사한 REST API 키
   - **저장** 클릭

3. **재배포**
   - 환경 변수 변경 후 자동 재배포되거나
   - 수동으로 재배포 필요할 수 있음

---

### 2. Redirect URI 불일치

**증상**: `token_exchange_failed` 또는 `redirect_uri_mismatch` 에러

**원인**: 
- 카카오 개발자 콘솔에 등록된 Redirect URI와 코드에서 사용하는 URI가 일치하지 않음

**해결 방법**:

1. **현재 사용 중인 Redirect URI 확인**
   - 브라우저 콘솔에서 확인:
     ```
     [카카오 로그인] Redirect URI: https://group-buying-nine.vercel.app/api/auth/kakao/callback
     ```

2. **카카오 개발자 콘솔에서 정확히 등록**
   - 카카오 로그인 탭 → Redirect URI 등록
   - 다음 URI를 **정확히** 등록:
     ```
     https://group-buying-nine.vercel.app/api/auth/kakao/callback
     ```
   - **저장** 클릭

3. **주의사항**:
   - 끝에 `/` 없이 정확히 입력
   - `http://`와 `https://`는 별도로 등록
   - 대소문자 구분

---

### 3. 인가 코드 만료 또는 재사용

**증상**: `token_exchange_failed` 또는 `invalid_grant` 에러

**원인**: 
- 인가 코드는 한 번만 사용 가능
- 인가 코드가 만료됨 (보통 몇 분 내)

**해결 방법**:
- 다시 로그인 버튼을 클릭하여 새로운 인가 코드 받기
- 브라우저를 완전히 닫고 다시 열기

---

## 서버 로그 확인 방법

### Vercel에서 로그 확인

1. Vercel 대시보드 → 프로젝트 선택
2. **Deployments** 탭
3. 최신 배포 클릭
4. **Functions** 탭
5. `/api/auth/kakao/callback` 함수 클릭
6. **Logs** 탭에서 에러 로그 확인

### 확인할 로그

다음 로그들이 출력되는지 확인:
```
[카카오 콜백] 설정 확인: { hasRestApiKey: true/false, redirectUri: '...', ... }
[카카오 콜백] 액세스 토큰 교환 시작
[카카오 콜백] 토큰 교환 응답: { status: 200/400, ... }
[카카오 콜백] 토큰 교환 오류 상세: { ... }
```

---

## 체크리스트

다음 항목들을 확인하세요:

- [ ] Vercel 환경 변수에 `NEXT_PUBLIC_KAKAO_REST_API_KEY`가 설정되어 있음
- [ ] REST API 키가 카카오 개발자 콘솔의 값과 일치함
- [ ] Redirect URI가 카카오 개발자 콘솔에 정확히 등록됨
- [ ] 환경 변수 변경 후 재배포 완료
- [ ] Vercel 서버 로그에서 상세 에러 메시지 확인

---

## 환경 변수 확인

### 로컬 개발 환경

`.env.local` 파일에 다음이 있어야 합니다:
```env
NEXT_PUBLIC_KAKAO_JS_KEY=f168b7e3d360eca1f86c3ff0d80e30a3
NEXT_PUBLIC_KAKAO_REST_API_KEY=5bdf04b7ab4847db2e230b2a37fbc0e2
```

### Vercel 프로덕션 환경

Vercel 대시보드에서 다음 환경 변수가 설정되어 있어야 합니다:
- `NEXT_PUBLIC_KAKAO_JS_KEY`
- `NEXT_PUBLIC_KAKAO_REST_API_KEY` (중요!)

---

## 참고

- REST API 키와 JavaScript 키는 **다를 수 있습니다**
- 토큰 교환에는 **REST API 키**가 필요합니다
- 환경 변수 변경 후에는 **재배포**가 필요할 수 있습니다
