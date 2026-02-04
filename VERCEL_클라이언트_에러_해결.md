# Vercel 배포 후 클라이언트 사이드 에러 해결 가이드

## 🔍 에러 확인 방법

### 1. 브라우저 콘솔 확인
1. 배포된 사이트 접속: `https://group-buying-nine.vercel.app`
2. **F12** 키를 눌러 개발자 도구 열기
3. **Console** 탭에서 에러 메시지 확인
4. 에러 메시지를 복사해 보관

### 2. Vercel 로그 확인
1. Vercel 대시보드 접속
2. 프로젝트 선택
3. **Deployments** 탭 클릭
4. 최신 배포 클릭 → **Functions** 또는 **Build Logs** 확인

---

## 🐛 일반적인 원인 및 해결 방법

### 원인 1: 환경 변수 누락 또는 잘못된 설정

**증상:**
- `NEXT_PUBLIC_FIREBASE_API_KEY is not defined`
- `NEXT_PUBLIC_KAKAO_JS_KEY is not defined`
- Firebase 초기화 실패

**해결 방법:**

1. **Vercel 환경 변수 확인**
   - Vercel 대시보드 → 프로젝트 → **Settings** → **Environment Variables**
   - 다음 변수들이 모두 설정되어 있는지 확인:

   **Firebase 클라이언트 (6개):**
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
   NEXT_PUBLIC_FIREBASE_PROJECT_ID
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
   NEXT_PUBLIC_FIREBASE_APP_ID
   ```

   **Firebase Admin SDK (3개):**
   ```
   FIREBASE_PROJECT_ID
   FIREBASE_CLIENT_EMAIL
   FIREBASE_PRIVATE_KEY
   ```

   **카카오 (2개):**
   ```
   NEXT_PUBLIC_KAKAO_JS_KEY
   NEXT_PUBLIC_KAKAO_REST_API_KEY
   ```

2. **환경 변수 값 확인**
   - `.env.local` 파일의 값과 일치하는지 확인
   - 특히 `FIREBASE_PRIVATE_KEY`는 큰따옴표로 감싸고 `\n`을 그대로 유지해야 함

3. **재배포**
   - 환경 변수 수정 후 **Redeploy** 필요
   - Vercel 대시보드 → Deployments → 최신 배포 → **Redeploy**

---

### 원인 2: Firebase 초기화 실패

**증상:**
- `Firebase: Error (auth/invalid-api-key)`
- `Firebase: Error (auth/domain-not-authorized)`

**해결 방법:**

1. **Firebase Console 확인**
   - [Firebase Console](https://console.firebase.google.com/) 접속
   - 프로젝트 선택 → **Authentication** → **Settings**
   - **승인된 도메인**에 `group-buying-nine.vercel.app` 추가

2. **Firebase 설정 확인**
   - Firebase Console → 프로젝트 설정 → 일반
   - **웹 앱** 설정에서 API 키와 도메인이 올바른지 확인

---

### 원인 3: 카카오 SDK 초기화 실패

**증상:**
- `카카오 SDK가 초기화되지 않았습니다`
- `NEXT_PUBLIC_KAKAO_JS_KEY가 설정되지 않았습니다`

**해결 방법:**

1. **카카오 개발자 콘솔 확인**
   - [카카오 개발자 콘솔](https://developers.kakao.com/) 접속
   - 내 애플리케이션 → 앱 선택
   - **앱 설정** → **앱 키**에서 **JavaScript 키** 확인
   - Vercel 환경 변수 `NEXT_PUBLIC_KAKAO_JS_KEY`와 일치하는지 확인

2. **플랫폼 설정 확인**
   - **앱 설정** → **플랫폼** → Web 플랫폼
   - 사이트 도메인에 `group-buying-nine.vercel.app` 추가되어 있는지 확인

3. **Redirect URI 확인**
   - **제품 설정** → **카카오 로그인** → **Redirect URI**
   - `https://group-buying-nine.vercel.app/login` 추가되어 있는지 확인

---

### 원인 4: 빌드 시 에러

**증상:**
- 빌드는 성공했지만 런타임 에러 발생
- TypeScript 타입 에러

**해결 방법:**

1. **로컬 빌드 테스트**
   ```bash
   npm run build
   ```
   - 로컬에서 빌드가 성공하는지 확인
   - 에러가 있으면 먼저 수정

2. **Vercel 빌드 로그 확인**
   - Vercel 대시보드 → Deployments → 빌드 로그 확인
   - 경고나 에러 메시지 확인

---

### 원인 5: CORS 또는 네트워크 에러

**증상:**
- `CORS policy error`
- `Network request failed`

**해결 방법:**

1. **Firebase CORS 설정**
   - Firebase Console → Storage → Rules
   - CORS 설정 확인

2. **카카오 도메인 설정**
   - 카카오 개발자 콘솔에서 도메인 등록 확인

---

## 🔧 단계별 디버깅

### Step 1: 환경 변수 확인
```bash
# Vercel 대시보드에서 확인
Settings → Environment Variables
```

### Step 2: 브라우저 콘솔 확인
1. F12 → Console 탭
2. 에러 메시지 확인
3. Network 탭에서 실패한 요청 확인

### Step 3: Vercel 함수 로그 확인
1. Vercel 대시보드 → Functions
2. API 라우트 에러 확인

### Step 4: 재배포
1. 환경 변수 수정 후
2. Deployments → Redeploy

---

## ✅ 체크리스트

- [ ] Vercel 환경 변수 모두 설정됨 (11개)
- [ ] Firebase Console에 배포 도메인 추가됨
- [ ] 카카오 개발자 콘솔에 배포 도메인 추가됨
- [ ] 카카오 Redirect URI 추가됨
- [ ] 브라우저 콘솔에서 에러 메시지 확인함
- [ ] Vercel 빌드 로그 확인함
- [ ] 재배포 시도함

---

## 🚨 긴급 해결 방법

### 방법 1: 환경 변수 전체 재설정
1. `.env.local` 파일의 모든 값 복사
2. Vercel 대시보드에서 기존 환경 변수 삭제
3. 새로 추가 (주의: `FIREBASE_PRIVATE_KEY` 형식 확인)
4. Redeploy

### 방법 2: 빌드 캐시 삭제 후 재배포
1. Vercel 대시보드 → Settings → General
2. **Clear Build Cache** 클릭
3. Redeploy

### 방법 3: 로컬에서 프로덕션 빌드 테스트
```bash
npm run build
npm start
```
- 로컬에서 프로덕션 빌드가 정상 작동하는지 확인
- 문제가 있으면 먼저 수정 후 Vercel에 배포

---

## 📞 추가 도움말

### 에러 메시지 공유
문제 해결을 위해 다음 정보를 공유해주세요:
1. 브라우저 콘솔 에러 메시지 (전체)
2. Vercel 빌드 로그 (에러 부분)
3. Vercel 함수 로그 (에러 부분)
4. 환경 변수 설정 여부 (변수명만, 값은 제외)

### 일반적인 해결 순서
1. ✅ 환경 변수 확인 및 수정
2. ✅ Firebase/C카카오 도메인 설정 확인
3. ✅ 재배포
4. ✅ 브라우저 콘솔 확인
5. ✅ Vercel 로그 확인

---

## 💡 예방 방법

### 배포 전 확인사항
- [ ] 로컬에서 `npm run build` 성공
- [ ] `.env.local` 파일의 모든 값 확인
- [ ] 환경 변수 이름과 값이 정확한지 확인
- [ ] Firebase/C카카오 설정이 올바른지 확인

### 자동화
- Git에 푸시하면 자동 배포되므로, 배포 전에 로컬 빌드 테스트 필수
