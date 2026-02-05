# Vercel 환경 변수 설정 가이드

## 🔴 현재 문제
`auth/invalid-api-key` 에러는 Firebase 환경 변수가 Vercel에 제대로 설정되지 않았음을 의미합니다.

---

## ✅ 해결 방법: Vercel에 환경 변수 설정

### 1단계: Vercel 대시보드 접속

1. [Vercel 대시보드](https://vercel.com/dashboard) 접속
2. 프로젝트 선택: `group-buying-nine`
3. **Settings** 탭 클릭
4. 왼쪽 메뉴에서 **Environment Variables** 클릭

---

### 2단계: Firebase 클라이언트 환경 변수 설정 (6개)

`.env.local` 파일에서 다음 값들을 복사하여 Vercel에 추가하세요:

#### 추가할 환경 변수들:

1. **NEXT_PUBLIC_FIREBASE_API_KEY**
   - `.env.local`의 `NEXT_PUBLIC_FIREBASE_API_KEY=` 뒤의 값 복사
   - 예: `AIzaSyC...` (긴 문자열)

2. **NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN**
   - `.env.local`의 `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=` 뒤의 값 복사
   - 예: `your-project.firebaseapp.com`

3. **NEXT_PUBLIC_FIREBASE_PROJECT_ID**
   - `.env.local`의 `NEXT_PUBLIC_FIREBASE_PROJECT_ID=` 뒤의 값 복사
   - 예: `your-project-id`

4. **NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET**
   - `.env.local`의 `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=` 뒤의 값 복사
   - 예: `your-project.appspot.com`

5. **NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID**
   - `.env.local`의 `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=` 뒤의 값 복사
   - 예: `123456789012` (숫자)

6. **NEXT_PUBLIC_FIREBASE_APP_ID**
   - `.env.local`의 `NEXT_PUBLIC_FIREBASE_APP_ID=` 뒤의 값 복사
   - 예: `1:123456789012:web:abcdef123456` (긴 문자열)

**각 변수 추가 방법:**
1. **Key** 입력란에 변수명 입력 (예: `NEXT_PUBLIC_FIREBASE_API_KEY`)
2. **Value** 입력란에 값 붙여넣기
3. **Environment** 선택: **Production**, **Preview**, **Development** 모두 선택 (또는 Production만)
4. **Add** 버튼 클릭

---

### 3단계: Firebase Admin SDK 환경 변수 설정 (3개)

1. **FIREBASE_PROJECT_ID**
   - `.env.local`의 `FIREBASE_PROJECT_ID=` 뒤의 값 복사
   - 보통 `NEXT_PUBLIC_FIREBASE_PROJECT_ID`와 동일한 값

2. **FIREBASE_CLIENT_EMAIL**
   - `.env.local`의 `FIREBASE_CLIENT_EMAIL=` 뒤의 값 복사
   - 예: `firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com`

3. **FIREBASE_PRIVATE_KEY** ⚠️ **중요!**
   - `.env.local`의 `FIREBASE_PRIVATE_KEY=` 뒤의 값 복사
   - **큰따옴표(`"`)로 감싸야 합니다!**
   - `\n` 문자를 그대로 유지해야 합니다
   - 예:
     ```
     "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
     ```
   - **주의**: 전체를 큰따옴표로 감싸고, 줄바꿈 문자(`\n`)를 그대로 유지

---

### 4단계: 카카오 환경 변수 설정 (2개)

1. **NEXT_PUBLIC_KAKAO_JS_KEY**
   - `.env.local`의 `NEXT_PUBLIC_KAKAO_JS_KEY=` 뒤의 값 복사
   - 예: `abcdef1234567890abcdef1234567890` (32자 문자열)

2. **NEXT_PUBLIC_KAKAO_REST_API_KEY**
   - `.env.local`의 `NEXT_PUBLIC_KAKAO_REST_API_KEY=` 뒤의 값 복사
   - 예: `abcdef1234567890abcdef1234567890` (32자 문자열)

---

## 📋 전체 환경 변수 체크리스트

총 **11개**의 환경 변수가 필요합니다:

### Firebase 클라이언트 (6개)
- [ ] `NEXT_PUBLIC_FIREBASE_API_KEY`
- [ ] `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- [ ] `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- [ ] `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_APP_ID`

### Firebase Admin SDK (3개)
- [ ] `FIREBASE_PROJECT_ID`
- [ ] `FIREBASE_CLIENT_EMAIL`
- [ ] `FIREBASE_PRIVATE_KEY` (큰따옴표 포함)

### 카카오 (2개)
- [ ] `NEXT_PUBLIC_KAKAO_JS_KEY`
- [ ] `NEXT_PUBLIC_KAKAO_REST_API_KEY`

---

## ⚠️ 주의사항

### 1. FIREBASE_PRIVATE_KEY 형식
```
❌ 잘못된 형식:
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
-----END PRIVATE KEY-----

✅ 올바른 형식:
"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

### 2. 공백 제거
- 값 앞뒤에 공백이 없어야 합니다
- 복사할 때 공백이 포함되지 않도록 주의

### 3. 따옴표 처리
- `FIREBASE_PRIVATE_KEY`만 큰따옴표로 감싸야 합니다
- 다른 변수들은 따옴표 없이 값만 입력

---

## 🔄 환경 변수 설정 후 재배포

1. 모든 환경 변수 추가 완료 후
2. Vercel 대시보드 → **Deployments** 탭
3. 최신 배포 클릭 → **Redeploy** 버튼 클릭
4. 또는 자동으로 재배포될 때까지 대기 (몇 분 소요)

---

## ✅ 확인 방법

재배포 후:

1. 배포된 사이트 접속: `https://group-buying-nine.vercel.app`
2. **F12** 키로 개발자 도구 열기
3. **Console** 탭 확인
4. `[Firebase Config]` 관련 에러가 사라졌는지 확인
5. 카카오 로그인 버튼 클릭하여 정상 작동 확인

---

## 🐛 여전히 에러가 발생하는 경우

### 1. 환경 변수 값 확인
- `.env.local` 파일의 값과 Vercel의 값이 정확히 일치하는지 확인
- 특히 `NEXT_PUBLIC_FIREBASE_API_KEY`가 올바른지 확인

### 2. Firebase Console 확인
- [Firebase Console](https://console.firebase.google.com/) 접속
- 프로젝트 설정 → 일반 탭
- **웹 앱** 섹션에서 API 키 확인
- Vercel의 `NEXT_PUBLIC_FIREBASE_API_KEY`와 일치하는지 확인

### 3. 빌드 로그 확인
- Vercel 대시보드 → Deployments → 최신 배포 → **Build Logs**
- 환경 변수 관련 에러가 있는지 확인

### 4. 환경 변수 삭제 후 재추가
- 기존 환경 변수를 모두 삭제
- `.env.local` 파일을 다시 확인
- 하나씩 다시 추가

---

## 📞 추가 도움말

문제가 계속되면:
1. `.env.local` 파일의 값들을 다시 확인
2. Firebase Console에서 API 키 재확인
3. Vercel 환경 변수 스크린샷 공유 (값은 가리고 변수명만)
