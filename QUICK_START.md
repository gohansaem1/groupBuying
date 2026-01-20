# ⚡ 빠른 시작 가이드

가장 빠르게 시작하는 방법입니다.

## 1분 안에 시작하기

### 1. 환경 변수 파일 생성

프로젝트 루트에 `.env.local` 파일을 생성하세요.

### 2. 최소 필수 설정만 입력

먼저 Firebase만 설정해서 테스트해봅시다:

```env
# Firebase 클라이언트 (필수)
NEXT_PUBLIC_FIREBASE_API_KEY=여기에_입력
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=여기에_입력
NEXT_PUBLIC_FIREBASE_PROJECT_ID=여기에_입력
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=여기에_입력
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=여기에_입력
NEXT_PUBLIC_FIREBASE_APP_ID=여기에_입력

# Firebase Admin SDK (필수)
FIREBASE_PROJECT_ID=여기에_입력
FIREBASE_CLIENT_EMAIL=여기에_입력
FIREBASE_PRIVATE_KEY="여기에_입력"
```

### 3. 개발 서버 실행

```bash
npm run dev
```

### 4. 브라우저 접속

http://localhost:3000 접속

---

## 값 가져오는 방법 (간단 버전)

### Firebase 값들

1. https://console.firebase.google.com/ 접속
2. 프로젝트 선택
3. 설정(⚙️) → 일반 탭
4. 웹 앱(</>) 클릭
5. `firebaseConfig`에서 값들 복사

### Firebase Admin SDK

1. 설정(⚙️) → 서비스 계정 탭
2. "새 비공개 키 만들기" 클릭
3. JSON 파일 다운로드
4. JSON 파일에서 값들 복사

---

## 단계별 상세 가이드

더 자세한 설명이 필요하면 `STEP_BY_STEP_SETUP.md` 파일을 참고하세요.

