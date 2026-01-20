# Firebase 설정 가이드

## 1. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/)에 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름 입력 (예: "jeju-group-buying")
4. Google Analytics 설정 (선택사항)
5. 프로젝트 생성 완료

## 2. Firebase 웹 앱 추가

1. Firebase Console에서 프로젝트 선택
2. 프로젝트 설정(톱니바퀴 아이콘) 클릭
3. "내 앱" 섹션에서 웹 앱 추가(</> 아이콘) 클릭
4. 앱 닉네임 입력 (예: "제주 공동구매")
5. "앱 등록" 클릭
6. Firebase SDK 설정 정보 복사

## 3. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```env
# Firebase 클라이언트 설정
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# 카카오 설정
NEXT_PUBLIC_KAKAO_JS_KEY=your_kakao_js_key_here

# Firebase Admin SDK (서버 사이드용)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY=your_private_key
```

### Firebase Admin SDK 설정

1. Firebase Console → 프로젝트 설정 → 서비스 계정 탭
2. "새 비공개 키 만들기" 클릭
3. JSON 파일 다운로드
4. JSON 파일에서 다음 값들을 `.env.local`에 추가:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (전체 키를 따옴표 없이 복사)

## 4. Firestore 데이터베이스 생성

1. Firebase Console → Firestore Database
2. "데이터베이스 만들기" 클릭
3. 프로덕션 모드 선택 (나중에 규칙 수정 가능)
4. 위치 선택 (예: asia-northeast3 - 서울)
5. "사용 설정" 클릭

## 5. Firebase Authentication 활성화

1. Firebase Console → Authentication
2. "시작하기" 또는 "Get started" 클릭
3. Authentication 활성화 완료

**참고:** 이 프로젝트는 Custom Token을 사용하므로, 별도의 Sign-in method를 활성화할 필요가 없습니다. Firebase Admin SDK로 Custom Token을 생성합니다.

## 5. Firestore 보안 규칙 배포

1. Firebase Console → Firestore Database → 규칙 탭
2. 프로젝트의 `firestore.rules` 파일 내용을 복사
3. Firebase Console의 규칙 편집기에 붙여넣기
4. "게시" 클릭

## 6. Authentication 설정

### 방법 1: 개발용 (Google 로그인)

1. Firebase Console → Authentication
2. "시작하기" 클릭
3. "Sign-in method" 탭
4. "Google" 제공업체 활성화
5. 프로젝트 지원 이메일 설정
6. "저장" 클릭

### 방법 2: 프로덕션용 (카카오 로그인)

카카오 로그인은 Custom Token 방식을 사용하므로 별도 설정이 필요 없습니다.
`app/api/auth/kakao/route.ts`에서 처리됩니다.

## 7. 카카오 개발자 콘솔 설정

1. [카카오 개발자 콘솔](https://developers.kakao.com/) 접속
2. "내 애플리케이션" → "애플리케이션 추가하기"
3. 앱 이름 입력 (예: "제주 공동구매")
4. 앱 생성 후 "앱 키" 탭에서 JavaScript 키 복사
5. `.env.local`의 `NEXT_PUBLIC_KAKAO_JS_KEY`에 추가

### 카카오 로그인 활성화

1. 카카오 개발자 콘솔 → 내 애플리케이션 선택
2. "제품 설정" → "카카오 로그인" 활성화
3. "Redirect URI 등록":
   - 개발: `http://localhost:3000`
   - 프로덕션: `https://your-domain.com`
4. "동의항목" 설정:
   - 필수: 닉네임, 프로필 사진
   - 선택: 이메일 (필요시)

## 8. 첫 관리자 계정 생성

Firestore에서 직접 생성하거나, Firebase Console에서 사용자를 추가한 후:

1. Firestore Console → `users` 컬렉션
2. 새 문서 추가 (UID는 Firebase Auth의 사용자 UID)
3. 다음 필드 추가:
   ```json
   {
     "uid": "user_uid_here",
     "email": "admin@example.com",
     "displayName": "관리자",
     "role": "admin",
     "createdAt": "2024-01-01T00:00:00Z",
     "updatedAt": "2024-01-01T00:00:00Z"
   }
   ```

또는 코드에서 직접 생성:

1. 앱에 로그인
2. 브라우저 콘솔에서:
   ```javascript
   // Firestore에서 직접 수정하거나
   // 관리자 페이지에서 역할 변경
   ```

## 9. 테스트

1. 개발 서버 실행: `npm run dev`
2. 브라우저에서 `http://localhost:3000` 접속
3. 카카오 로그인 테스트
4. 로그인 후 역할 확인

## 문제 해결

### Firebase Admin 초기화 오류
- `.env.local` 파일이 올바르게 설정되었는지 확인
- `FIREBASE_PRIVATE_KEY`에 줄바꿈(`\n`)이 포함되어 있는지 확인
- 서버 재시작 필요

### 카카오 SDK 로드 오류
- `NEXT_PUBLIC_KAKAO_JS_KEY`가 올바르게 설정되었는지 확인
- 카카오 개발자 콘솔에서 앱이 활성화되었는지 확인
- Redirect URI가 올바르게 등록되었는지 확인

### Firestore 규칙 오류
- 규칙이 올바르게 배포되었는지 확인
- Firebase Console에서 규칙 테스트 도구 사용

