# 카카오 로그인 Redirect URI 등록 가이드

## 400 Bad Request 에러 해결

`GET https://kauth.kakao.com/oauth/authorize ... 400 (Bad Request)` 에러가 발생하는 경우, **Redirect URI가 카카오 개발자 콘솔에 등록되지 않았습니다.**

---

## 해결 방법

### 1. 카카오 개발자 콘솔 접속

1. [카카오 개발자 콘솔](https://developers.kakao.com/) 접속
2. 로그인
3. **내 애플리케이션** → 앱 선택

### 2. Redirect URI 등록

1. **카카오 로그인** 탭 클릭
2. **Redirect URI 등록** 섹션 찾기
3. 다음 URI들을 **정확히** 추가:

#### 로컬 개발 환경
```
http://localhost:3000/api/auth/kakao/callback
http://127.0.0.1:3000/api/auth/kakao/callback
```

#### 프로덕션 환경 (Vercel)
```
https://group-buying-nine.vercel.app/api/auth/kakao/callback
```

⚠️ **주의사항**:
- **정확한 URL**: 끝에 `/` 없이 정확히 입력
- **프로토콜 구분**: `http://`와 `https://`는 별도로 등록 필요
- **대소문자 구분**: URL은 대소문자를 구분합니다
- **경로 포함**: `/api/auth/kakao/callback`까지 포함해야 합니다

### 3. 저장 및 확인

1. **저장** 버튼 클릭
2. 저장 완료 메시지 확인
3. 브라우저 **완전히 닫고 다시 열기** (또는 시크릿 모드)
4. 다시 로그인 시도

---

## 현재 사용 중인 Redirect URI

코드에서 자동으로 생성되는 Redirect URI:
- **로컬**: `http://localhost:3000/api/auth/kakao/callback`
- **Vercel**: `https://group-buying-nine.vercel.app/api/auth/kakao/callback`

이 URI들이 카카오 개발자 콘솔에 **정확히** 등록되어 있어야 합니다.

---

## 추가 확인 사항

### 사이트 도메인도 등록되어 있는지 확인

1. **앱 설정** → **플랫폼** 탭
2. **웹 플랫폼** 등록 확인
3. **사이트 도메인**에 다음이 등록되어 있는지 확인:
   - `http://localhost:3000`
   - `https://group-buying-nine.vercel.app`

### JavaScript SDK 도메인도 등록 확인

1. **앱 설정** → **플랫폼** 탭
2. **플랫폼 키** → **JavaScript 키** 클릭
3. **JavaScript SDK 도메인**에 다음이 등록되어 있는지 확인:
   - `http://localhost:3000`
   - `https://group-buying-nine.vercel.app`

---

## 에러 메시지별 해결 방법

### "KOE006: 등록되지 않은 Redirect URI"
→ Redirect URI가 카카오 개발자 콘솔에 등록되지 않았습니다.
→ 위의 "Redirect URI 등록" 단계를 따라 정확히 등록하세요.

### "KOE205: 잘못된 요청"
→ Redirect URI 형식이 잘못되었거나 등록되지 않았습니다.
→ URL에 오타가 없는지, 끝에 `/`가 없는지 확인하세요.

### "등록되지 않은 플랫폼"
→ 사이트 도메인 또는 JavaScript SDK 도메인이 등록되지 않았습니다.
→ 위의 "추가 확인 사항"을 확인하세요.

---

## 테스트 방법

1. 카카오 개발자 콘솔에서 Redirect URI **저장** 완료
2. 브라우저 **완전히 닫고 다시 열기** (또는 시크릿 모드)
3. 로그인 페이지 접속
4. 카카오 로그인 버튼 클릭
5. 카카오 웹 로그인 화면이 표시되는지 확인
6. 아이디/비밀번호 입력 후 로그인
7. 정상적으로 로그인되는지 확인

---

## 참고

- 카카오 개발자 콘솔 설정 변경 후 **즉시 반영**됩니다 (재시작 불필요)
- 하지만 브라우저 캐시 때문에 **브라우저를 완전히 닫고 다시 열어야** 할 수 있습니다
- 시크릿 모드에서 테스트하면 캐시 문제를 피할 수 있습니다
