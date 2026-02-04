# Firebase Authentication 설정 가이드

## 첫 번째 로그인 방법 추가하기

Firebase Authentication을 활성화하고 Custom Token 로그인을 사용할 수 있도록 설정합니다.

## 1단계: Firebase Console 접속

1. **Firebase Console 접속**
   - https://console.firebase.google.com/ 접속
   - Google 계정으로 로그인
   - 프로젝트 선택 (예: `groupbuying-5d9c5`)

## 2단계: Authentication 활성화

1. **Authentication 메뉴 클릭**
   - 왼쪽 메뉴에서 "Authentication" 클릭
   - 또는 "빌드" → "Authentication" 클릭

2. **시작하기 클릭**
   - "시작하기" 또는 "Get started" 버튼 클릭
   - Authentication이 활성화됩니다

## 3단계: 로그인 방법 설정

현재 프로젝트는 **Custom Token** 방식을 사용하므로, 별도의 Sign-in method를 활성화할 필요는 없습니다.

하지만 테스트를 위해 **익명 로그인**을 활성화할 수 있습니다 (선택사항):

### 익명 로그인 활성화 (선택사항)

1. **Sign-in method 탭 클릭**
   - Authentication 화면에서 "Sign-in method" 탭 클릭

2. **익명 로그인 활성화**
   - "익명" 또는 "Anonymous" 클릭
   - "사용 설정" 또는 "Enable" 토글 ON
   - "저장" 클릭

   **참고:** 이 프로젝트는 카카오 로그인을 사용하므로 익명 로그인은 필수가 아닙니다.

## 4단계: Custom Token 사용 확인

이 프로젝트는 Firebase Admin SDK를 사용하여 Custom Token을 생성합니다:

- 카카오 로그인 → 카카오 액세스 토큰 받기
- 서버에서 Firebase Admin SDK로 Custom Token 생성
- 클라이언트에서 Custom Token으로 Firebase 로그인

**Custom Token은 별도로 활성화할 필요가 없습니다.** Firebase Authentication이 활성화되어 있으면 자동으로 사용할 수 있습니다.

## 5단계: Authentication 규칙 확인

Firebase Authentication이 활성화되면, Firestore 보안 규칙에서 `request.auth`를 사용할 수 있습니다.

현재 `firestore.rules` 파일은 이미 `request.auth`를 사용하도록 설정되어 있습니다:

```javascript
function isSignedIn() {
  return request.auth != null;
}
```

## 6단계: 테스트

1. **개발 서버 실행**
   ```bash
   npm run dev
   ```

2. **브라우저에서 테스트**
   - http://localhost:3000 접속
   - "카카오 로그인" 버튼 클릭
   - 카카오 로그인 완료
   - Firebase Authentication에 사용자가 생성되는지 확인

3. **Firebase Console에서 확인**
   - Authentication → Users 탭
   - 로그인한 사용자가 나타나는지 확인
   - UID 형식: `kakao_1234567890` (카카오 ID 기반)

## 빠른 체크리스트

- [ ] Firebase Console 접속
- [ ] Authentication 메뉴 클릭
- [ ] "시작하기" 클릭하여 활성화
- [ ] Authentication 활성화 확인
- [ ] 개발 서버 실행
- [ ] 카카오 로그인 테스트
- [ ] Firebase Console에서 사용자 확인

## 문제 해결

### Authentication이 활성화되지 않는 경우

1. **프로젝트 권한 확인**
   - Firebase Console에서 프로젝트 소유자 권한이 있는지 확인

2. **브라우저 캐시 삭제**
   - Ctrl + Shift + R (강력 새로고침)

3. **다른 브라우저에서 시도**

### 사용자가 생성되지 않는 경우

1. **터미널 로그 확인**
   - Firebase Admin 초기화 로그 확인
   - 사용자 생성 로그 확인

2. **환경 변수 확인**
   - `.env.local` 파일의 Firebase Admin SDK 설정 확인

3. **Firebase Console 확인**
   - Authentication → Users 탭에서 사용자 확인

## 참고

- **Custom Token**: Firebase Admin SDK로 생성하는 토큰
- **카카오 로그인**: OAuth 제공자 (카카오)
- **Firebase Authentication**: 사용자 인증 관리 시스템

이 프로젝트는 카카오 로그인을 사용하지만, Firebase Authentication을 통해 사용자를 관리합니다.



