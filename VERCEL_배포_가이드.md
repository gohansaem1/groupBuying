# Vercel 배포 가이드

제주 공동구매 프로젝트를 Vercel에 배포하는 단계별 가이드입니다.

---

## 1단계: 배포 전 준비

### 1-1. 로컬 빌드 테스트

배포 전에 로컬에서 빌드가 성공하는지 확인합니다:

```bash
npm run build
```

빌드가 성공하면 `✓ Compiled successfully` 메시지가 나옵니다.

**에러가 나면:**
- TypeScript 에러 확인
- 환경 변수 누락 확인
- 의존성 문제 확인

---

### 1-2. 환경 변수 확인

`.env.local` 파일의 모든 환경 변수가 준비되어 있는지 확인:

**필수 환경 변수:**
- Firebase 클라이언트 설정 (6개)
- Firebase Admin SDK 설정 (3개)
- 카카오 설정 (2개)

---

## 2단계: Vercel 계정 및 프로젝트 준비

### 2-1. Vercel 계정 생성/로그인

1. [Vercel](https://vercel.com) 접속
2. **Sign Up** 또는 **Log In**
3. GitHub 계정으로 로그인 권장 (프로젝트 연결이 쉬움)

---

### 2-2. Git 저장소 준비

Vercel은 Git 저장소와 연결하여 배포합니다:

1. **GitHub에 프로젝트 푸시** (아직 안 했다면):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin master
   ```

2. 또는 **GitHub에서 새 저장소 생성** 후 위 명령어 실행

---

## 3단계: Vercel에 프로젝트 배포

### 3-1. 새 프로젝트 추가

1. Vercel 대시보드에서 **Add New...** → **Project** 클릭
2. GitHub 저장소 선택 (또는 Import Git Repository)
3. 프로젝트 선택 후 **Import** 클릭

---

### 3-2. 프로젝트 설정

**프레임워크 설정:**
- Framework Preset: **Next.js** (자동 감지됨)
- Root Directory: `./` (기본값)
- Build Command: `npm run build` (기본값)
- Output Directory: `.next` (기본값)
- Install Command: `npm install` (기본값)

**환경 변수 설정 (중요!):**

**Environment Variables** 섹션에서 다음 변수들을 추가:

#### Firebase 클라이언트 설정
```
NEXT_PUBLIC_FIREBASE_API_KEY=여기에_값
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=여기에_값
NEXT_PUBLIC_FIREBASE_PROJECT_ID=여기에_값
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=여기에_값
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=여기에_값
NEXT_PUBLIC_FIREBASE_APP_ID=여기에_값
```

#### Firebase Admin SDK 설정
```
FIREBASE_PROJECT_ID=여기에_값
FIREBASE_CLIENT_EMAIL=여기에_값
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**⚠️ 중요:** `FIREBASE_PRIVATE_KEY`는 큰따옴표로 감싸고, `\n`을 그대로 유지해야 합니다.

#### 카카오 설정
```
NEXT_PUBLIC_KAKAO_JS_KEY=여기에_값
NEXT_PUBLIC_KAKAO_REST_API_KEY=여기에_값
```

**각 환경 변수에 대해:**
- Production, Preview, Development 모두 선택 (또는 Production만 선택)

---

### 3-3. 배포 실행

1. **Deploy** 버튼 클릭
2. 빌드 진행 상황 확인 (몇 분 소요)
3. 배포 완료 후 **Visit** 버튼으로 사이트 확인

---

## 4단계: 배포 후 확인사항

### 4-1. 기본 동작 확인

1. **홈 페이지** 로드 확인
2. **카카오 로그인** 동작 확인
3. **관리자 페이지** 접근 확인

---

### 4-2. 카카오 개발자 콘솔 설정 업데이트

**중요:** 배포된 도메인을 카카오 개발자 콘솔에 추가해야 합니다!

1. [카카오 개발자 콘솔](https://developers.kakao.com/) 접속
2. 내 애플리케이션 → 앱 선택
3. **앱 설정** → **플랫폼** 탭
4. **사이트 도메인**에 배포된 도메인 추가:
   ```
   https://your-project.vercel.app
   ```
5. **카카오 로그인** 탭 → **Redirect URI**에 추가:
   ```
   https://your-project.vercel.app/login
   ```
6. **저장** 클릭

---

### 4-3. Firebase 설정 확인

Firebase Console에서도 배포된 도메인을 허용 목록에 추가해야 할 수 있습니다:

1. Firebase Console → Authentication → Settings
2. **승인된 도메인**에 배포된 도메인 추가

---

## 5단계: 문제 해결

### 빌드 실패

**에러 메시지 확인:**
- Vercel 대시보드 → Deployments → 실패한 배포 클릭 → Logs 확인

**흔한 원인:**
- 환경 변수 누락
- TypeScript 에러
- 의존성 문제

---

### 환경 변수 문제

**확인 방법:**
1. Vercel 대시보드 → Project → Settings → Environment Variables
2. 모든 변수가 올바르게 설정되어 있는지 확인
3. `FIREBASE_PRIVATE_KEY`의 따옴표와 `\n` 확인

---

### 카카오 로그인 실패

**확인 사항:**
1. 카카오 개발자 콘솔에서 배포된 도메인 추가됨
2. Redirect URI가 정확히 일치함
3. JavaScript 키가 올바름

---

## 6단계: 자동 배포 설정

GitHub에 푸시하면 자동으로 배포됩니다:

1. 코드 수정
2. Git 커밋 및 푸시:
   ```bash
   git add .
   git commit -m "변경사항 설명"
   git push
   ```
3. Vercel이 자동으로 새 배포 시작

---

## 체크리스트

- [ ] 로컬 빌드 성공 (`npm run build`)
- [ ] Git 저장소에 프로젝트 푸시 완료
- [ ] Vercel 계정 생성/로그인 완료
- [ ] Vercel에 프로젝트 Import 완료
- [ ] 모든 환경 변수 설정 완료
- [ ] 배포 성공 확인
- [ ] 배포된 사이트에서 홈 페이지 로드 확인
- [ ] 카카오 개발자 콘솔에 배포 도메인 추가
- [ ] 카카오 로그인 동작 확인
- [ ] 관리자 페이지 접근 확인

---

## 참고

- **프로덕션 URL**: `https://your-project.vercel.app`
- **프리뷰 URL**: 각 PR마다 자동 생성됨
- **환경 변수**: 프로젝트 설정에서 언제든지 수정 가능
- **도메인 커스텀**: Settings → Domains에서 커스텀 도메인 추가 가능

---

## 추가 팁

### 환경 변수 관리

- `.env.local`은 Git에 커밋하지 않음 (`.gitignore`에 포함)
- Vercel에서는 환경 변수를 대시보드에서 관리
- 민감한 정보는 절대 Git에 커밋하지 않기

### 빌드 최적화

- 불필요한 파일 제거
- 이미지 최적화
- 코드 스플리팅 확인

---

배포 중 문제가 발생하면 Vercel 대시보드의 **Logs**를 확인하세요!
