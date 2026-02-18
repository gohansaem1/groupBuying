# 카카오 Redirect URI 등록 확인 가이드

## 🔍 "등록했는데 안 된다" 문제 해결

Redirect URI를 등록했다고 생각하는데도 400 에러가 발생하는 경우, 다음을 **단계별로 정확히** 확인하세요.

---

## ✅ 1단계: Redirect URI 등록 위치 확인

### 정확한 메뉴 경로

1. [카카오 개발자 콘솔](https://developers.kakao.com/) 접속
2. **내 애플리케이션** 클릭
3. 앱 선택 (예: "제주 공동구매")
4. **제품 설정** → **카카오 로그인** 클릭
   - ⚠️ **주의**: "앱 설정"이 아니라 **"제품 설정"**입니다!
   - ⚠️ **주의**: "카카오 로그인" 탭을 클릭해야 합니다!

### Redirect URI 등록 섹션 찾기

**카카오 로그인** 탭에서:
- **Redirect URI 등록** 또는 **OAuth Redirect URI** 섹션 찾기
- 이 섹션이 보이지 않으면 **카카오 로그인 활성화**가 안 되어 있을 수 있습니다

---

## ✅ 2단계: 등록된 URI 정확히 확인

### 등록해야 할 정확한 URI

**Vercel 프로덕션:**
```
https://group-buying-nine.vercel.app/api/auth/kakao/callback
```

**로컬 개발 (추가로 등록 가능):**
```
http://localhost:3000/api/auth/kakao/callback
```

### ⚠️ 정확한 형식 체크리스트

다음 항목들을 **하나하나** 확인하세요:

- [ ] **프로토콜 포함**: `https://`로 시작하는지 확인
- [ ] **끝에 슬래시 없음**: `/api/auth/kakao/callback` (끝에 `/` 없어야 함)
- [ ] **대소문자 정확**: `group-buying-nine.vercel.app` (소문자)
- [ ] **경로 포함**: `/api/auth/kakao/callback`까지 정확히 포함
- [ ] **공백 없음**: URI 앞뒤에 공백이 없는지 확인
- [ ] **복사-붙여넣기**: 직접 타이핑하지 말고 복사-붙여넣기 권장

### ❌ 잘못된 예시

```
❌ https://group-buying-nine.vercel.app/api/auth/kakao/callback/  (끝에 /)
❌ group-buying-nine.vercel.app/api/auth/kakao/callback  (프로토콜 없음)
❌ https://group-buying-nine.vercel.app/api/auth/kakao/callback   (끝에 공백)
❌ https://Group-Buying-Nine.vercel.app/api/auth/kakao/callback  (대문자)
❌ https://group-buying-nine.vercel.app/login  (경로 다름)
```

---

## ✅ 3단계: 저장 버튼 클릭 확인

### ⚠️ 가장 흔한 실수!

**URI를 입력만 하고 저장 버튼을 누르지 않았을 수 있습니다.**

1. Redirect URI 입력 필드에 URI 입력
2. **"등록"** 또는 **"추가"** 버튼 클릭 (URI가 목록에 추가됨)
3. **⚠️ 중요: 페이지 하단의 "저장" 버튼 클릭!**
4. 저장 완료 메시지 확인

### 저장 확인 방법

- 페이지를 새로고침했을 때 URI가 여전히 목록에 있는지 확인
- 저장 완료 메시지가 표시되었는지 확인
- 다른 설정을 변경하고 저장했는지 확인

---

## ✅ 4단계: 카카오 로그인 활성화 확인

Redirect URI를 등록하려면 **카카오 로그인이 활성화**되어 있어야 합니다.

1. **제품 설정** → **카카오 로그인** 탭
2. **활성화 설정** 확인
3. **활성화** 상태여야 함
4. 비활성화되어 있으면 **활성화** 버튼 클릭 후 저장

---

## ✅ 5단계: 사이트 도메인 등록 확인

Redirect URI만 등록하는 것이 아니라, **사이트 도메인도 등록**되어 있어야 합니다.

1. **앱 설정** → **플랫폼** 탭 클릭
2. **웹 플랫폼** 등록 확인
3. **사이트 도메인**에 다음이 등록되어 있는지 확인:
   ```
   group-buying-nine.vercel.app
   ```
   ⚠️ **주의**: `https://` 없이 도메인만 입력

### 사이트 도메인 등록 방법

1. **웹 플랫폼 등록** 클릭 (없으면)
2. **사이트 도메인** 입력 필드에 `group-buying-nine.vercel.app` 입력
3. **저장** 버튼 클릭

---

## ✅ 6단계: JavaScript SDK 도메인 등록 확인

1. **앱 설정** → **플랫폼** 탭
2. **플랫폼 키** → **JavaScript 키** 클릭
3. **JavaScript SDK 도메인** 섹션 확인
4. 다음이 등록되어 있는지 확인:
   ```
   group-buying-nine.vercel.app
   ```
   또는
   ```
   https://group-buying-nine.vercel.app
   ```

---

## 🔧 실제 등록 확인 방법

### 방법 1: 카카오 개발자 콘솔에서 직접 확인

1. **제품 설정** → **카카오 로그인** 탭
2. **Redirect URI 등록** 섹션에서 등록된 URI 목록 확인
3. `https://group-buying-nine.vercel.app/api/auth/kakao/callback`가 **정확히** 목록에 있는지 확인
4. 목록에 없으면 다시 등록

### 방법 2: 브라우저 개발자 도구로 확인

1. Vercel 사이트에서 로그인 페이지 접속
2. **F12** → **Console** 탭
3. 카카오 로그인 버튼 클릭
4. 콘솔에 출력되는 Redirect URI 확인:
   ```
   [카카오 로그인] Redirect URI: https://group-buying-nine.vercel.app/api/auth/kakao/callback
   ```
5. 이 URI가 카카오 개발자 콘솔에 **정확히** 등록되어 있는지 확인

### 방법 3: 테스트 페이지 사용

1. `https://group-buying-nine.vercel.app/test-kakao` 접속
2. **테스트 다시 실행** 버튼 클릭
3. **Redirect URI** 항목 확인
4. 표시된 URI가 카카오 개발자 콘솔에 등록되어 있는지 확인

---

## 🚨 여전히 안 되면

### 1. 브라우저 캐시 문제

카카오 개발자 콘솔 설정 변경 후:
1. **브라우저 완전히 닫기** (모든 탭 닫기)
2. **시크릿 모드**에서 테스트
3. 또는 **다른 브라우저**에서 테스트

### 2. 설정 반영 시간

카카오 개발자 콘솔 설정 변경은 **즉시 반영**되지만, 가끔 몇 분 걸릴 수 있습니다.
- 5분 정도 기다린 후 다시 시도

### 3. 여러 앱 확인

카카오 개발자 콘솔에 **여러 앱**이 있을 수 있습니다.
- 현재 사용 중인 앱이 맞는지 확인
- 앱 키(JavaScript 키, REST API 키)가 환경 변수와 일치하는지 확인

### 4. 네트워크 탭에서 정확한 에러 확인

1. **F12** → **Network** 탭
2. 카카오 로그인 버튼 클릭
3. `oauth/authorize` 요청 찾기
4. **Response** 탭에서 카카오가 반환하는 정확한 에러 메시지 확인

예시:
- `KOE006: 등록되지 않은 Redirect URI` → Redirect URI가 등록되지 않음
- `KOE205: 잘못된 요청` → Redirect URI 형식 오류 또는 다른 설정 문제

---

## 📋 최종 체크리스트

다음 항목들을 **모두** 확인하세요:

- [ ] **제품 설정** → **카카오 로그인** 탭에서 Redirect URI 등록
- [ ] Redirect URI가 정확히 `https://group-buying-nine.vercel.app/api/auth/kakao/callback` (끝에 `/` 없음)
- [ ] URI 입력 후 **"등록"** 또는 **"추가"** 버튼 클릭
- [ ] 페이지 하단의 **"저장"** 버튼 클릭 완료
- [ ] 저장 완료 메시지 확인
- [ ] 카카오 로그인이 **활성화** 상태
- [ ] **앱 설정** → **플랫폼** → 사이트 도메인에 `group-buying-nine.vercel.app` 등록
- [ ] JavaScript SDK 도메인에 `group-buying-nine.vercel.app` 등록
- [ ] 브라우저 완전히 닫고 다시 열기 (또는 시크릿 모드)
- [ ] Vercel 환경 변수에 `NEXT_PUBLIC_KAKAO_REST_API_KEY` 설정 확인

---

## 💡 팁

### URI 복사 방법

1. 테스트 페이지(`/test-kakao`)에서 Redirect URI 확인
2. 또는 브라우저 콘솔에서 출력된 URI 복사
3. 카카오 개발자 콘솔에 정확히 붙여넣기

### 여러 환경 지원

개발 환경과 프로덕션 환경을 모두 지원하려면:
```
http://localhost:3000/api/auth/kakao/callback
https://group-buying-nine.vercel.app/api/auth/kakao/callback
```
두 URI를 모두 등록할 수 있습니다.

---

## 📞 추가 도움

위의 모든 단계를 확인했는데도 안 되면:
1. 브라우저 콘솔의 정확한 에러 메시지 확인
2. 네트워크 탭의 Response 내용 확인
3. 카카오 개발자 콘솔의 설정 스크린샷 확인
