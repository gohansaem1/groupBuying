# Firebase 프로젝트 ID 불일치 오류 해결

## 오류 메시지

```
Firebase Admin 초기화 성공: groupbuying-5d9c5
카카오 로그인 API 오류: Error: There is no configuration corresponding to the provided identifier.
```

## 원인

Firebase Admin SDK는 초기화되었지만, 클라이언트와 서버의 프로젝트 ID가 일치하지 않거나, Firebase Authentication이 제대로 설정되지 않았을 수 있습니다.

## 해결 방법

### 1단계: 프로젝트 ID 일치 확인

`.env.local` 파일에서 두 프로젝트 ID가 일치하는지 확인:

```env
# 클라이언트용 (NEXT_PUBLIC_ 접두사)
NEXT_PUBLIC_FIREBASE_PROJECT_ID=groupbuying-5d9c5

# 서버용 (Admin SDK)
FIREBASE_PROJECT_ID=groupbuying-5d9c5
```

**중요:** 두 값이 정확히 일치해야 합니다!

### 2단계: Firebase Console에서 확인

1. **Firebase Console 접속**
   - https://console.firebase.google.com/ 접속
   - 프로젝트 선택

2. **프로젝트 ID 확인**
   - 프로젝트 설정(⚙️) → 일반 탭
   - "프로젝트 ID" 확인
   - 예: `groupbuying-5d9c5`

3. **`.env.local` 파일과 비교**
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`와 `FIREBASE_PROJECT_ID`가 모두 동일한지 확인

### 3단계: Firebase Authentication 활성화 확인

1. **Firebase Console → Authentication**
   - 왼쪽 메뉴에서 "Authentication" 클릭
   - "시작하기" 또는 "Get started" 클릭

2. **Sign-in method 확인**
   - "Sign-in method" 탭 클릭
   - Custom Token이 사용 가능한지 확인 (Admin SDK 사용 시 필요)

### 4단계: 환경 변수 재확인

`.env.local` 파일을 열고 다음을 확인:

```env
# 클라이언트 설정 (모두 NEXT_PUBLIC_ 접두사)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=groupbuying-5d9c5  # ← 확인!
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# 서버 설정 (Admin SDK)
FIREBASE_PROJECT_ID=groupbuying-5d9c5  # ← 클라이언트와 동일해야 함!
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="..."
```

### 5단계: 개발 서버 재시작

환경 변수를 확인한 후 개발 서버 재시작:

```bash
# Ctrl+C로 중지 후
npm run dev
```

### 6단계: 로그 확인

터미널에서 다음 로그가 나타나는지 확인:

```
Firebase Admin 초기화 성공: groupbuying-5d9c5
Firebase Admin 준비 완료: { projectId: 'groupbuying-5d9c5', ... }
Firebase 사용자 처리 시작: { uid: 'kakao_...', ... }
```

## 빠른 체크리스트

- [ ] `.env.local` 파일 확인
- [ ] `NEXT_PUBLIC_FIREBASE_PROJECT_ID` 값 확인
- [ ] `FIREBASE_PROJECT_ID` 값 확인
- [ ] 두 프로젝트 ID가 정확히 일치하는지 확인
- [ ] Firebase Console에서 프로젝트 ID 확인
- [ ] Firebase Authentication 활성화 확인
- [ ] 개발 서버 재시작
- [ ] 터미널 로그 확인

## 추가 디버깅

코드가 개선되어 더 자세한 로그가 출력됩니다:

- Firebase Admin 초기화 상태
- 사용자 처리 과정
- 오류 발생 시 상세 정보

터미널 로그를 확인하여 어느 단계에서 오류가 발생하는지 확인하세요.

## 참고

- Firebase Admin SDK는 서버 사이드에서만 작동합니다
- 클라이언트와 서버의 프로젝트 ID는 반드시 일치해야 합니다
- Firebase Authentication이 활성화되어 있어야 합니다

