# .env.local 파일 설정 가이드

## 파일 생성 방법

프로젝트 루트 디렉토리에 `.env.local` 파일을 생성하고 아래 내용을 복사하세요.

## 전체 예시

```env
# Firebase 클라이언트 설정
# Firebase Console > 프로젝트 설정 > 일반 탭 > 내 앱 > 웹 앱에서 복사
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz1234567
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890

# 카카오 설정
# 카카오 개발자 콘솔 > 내 애플리케이션 > 앱 키 > JavaScript 키 복사
NEXT_PUBLIC_KAKAO_JS_KEY=abcdef1234567890abcdef1234567890

# Firebase Admin SDK 설정
# Firebase Console > 프로젝트 설정 > 서비스 계정 > 새 비공개 키 만들기
# 다운로드한 JSON 파일에서 다음 값들을 복사
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

## 각 값 가져오는 방법

### 1. Firebase 클라이언트 설정

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 선택
3. 프로젝트 설정(톱니바퀴 아이콘) 클릭
4. "일반" 탭에서 "내 앱" 섹션 찾기
5. 웹 앱(</> 아이콘)이 없으면 "앱 추가" 클릭
6. 웹 앱이 있으면 설정 정보 표시
7. `firebaseConfig` 객체에서 값들 복사:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",           // → NEXT_PUBLIC_FIREBASE_API_KEY
  authDomain: "xxx.firebaseapp.com",  // → NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  projectId: "xxx",              // → NEXT_PUBLIC_FIREBASE_PROJECT_ID
  storageBucket: "xxx.appspot.com",  // → NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  messagingSenderId: "123456789", // → NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  appId: "1:123456789:web:xxx"   // → NEXT_PUBLIC_FIREBASE_APP_ID
};
```

### 2. 카카오 JavaScript 키

1. [카카오 개발자 콘솔](https://developers.kakao.com/) 접속
2. "내 애플리케이션" 클릭
3. 앱 선택 (없으면 앱 추가)
4. "앱 키" 탭 클릭
5. "JavaScript 키" 복사 → `NEXT_PUBLIC_KAKAO_JS_KEY`에 붙여넣기

예시: `abcdef1234567890abcdef1234567890`

### 3. Firebase Admin SDK 설정

#### 방법 1: 서비스 계정 키 다운로드

1. Firebase Console > 프로젝트 설정 > "서비스 계정" 탭
2. "새 비공개 키 만들기" 클릭
3. JSON 파일 다운로드
4. JSON 파일에서 값 추출:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",           // → FIREBASE_PROJECT_ID
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",  // → FIREBASE_PRIVATE_KEY
  "client_email": "firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com",  // → FIREBASE_CLIENT_EMAIL
  ...
}
```

#### 방법 2: 수동 입력

- `FIREBASE_PROJECT_ID`: Firebase 프로젝트 ID (위의 `project_id`와 동일)
- `FIREBASE_CLIENT_EMAIL`: 서비스 계정 이메일 (위의 `client_email`)
- `FIREBASE_PRIVATE_KEY`: 전체 private_key를 따옴표로 감싸서 입력

**중요**: `FIREBASE_PRIVATE_KEY`는 줄바꿈(`\n`)을 포함해야 합니다.

```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

## 실제 예시 (가짜 값)

```env
# Firebase 클라이언트 설정
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz1234567
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=jeju-group-buying.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=jeju-group-buying
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=jeju-group-buying.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890abcdef

# 카카오 설정
NEXT_PUBLIC_KAKAO_JS_KEY=abcdef1234567890abcdef1234567890abcdef

# Firebase Admin SDK 설정
FIREBASE_PROJECT_ID=jeju-group-buying
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-abcde@jeju-group-buying.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7vKT1XxYz\nAbCdEfGhIjKlMnOpQrStUvWxYz1234567890AbCdEfGhIjKlMnOpQrStUvWxYz\n-----END PRIVATE KEY-----\n"
```

## 주의사항

1. **따옴표 사용**: `FIREBASE_PRIVATE_KEY`는 반드시 큰따옴표로 감싸야 합니다
2. **줄바꿈**: `FIREBASE_PRIVATE_KEY`의 `\n`은 실제 줄바꿈을 의미합니다
3. **공백 없음**: 변수명과 `=` 사이에 공백이 없어야 합니다
4. **주석**: `#`으로 시작하는 줄은 주석입니다
5. **보안**: `.env.local` 파일은 절대 Git에 커밋하지 마세요 (이미 .gitignore에 포함됨)

## 파일 생성 후 확인

1. `.env.local` 파일이 프로젝트 루트에 있는지 확인
2. 모든 값이 올바르게 입력되었는지 확인
3. 개발 서버 재시작: `npm run dev`

## 문제 해결

### 환경 변수가 적용되지 않을 때
- 개발 서버를 재시작하세요
- 변수명 앞에 `NEXT_PUBLIC_` 접두사가 있는지 확인하세요
- `.env.local` 파일이 프로젝트 루트에 있는지 확인하세요

### Firebase Admin 초기화 오류
- `FIREBASE_PRIVATE_KEY`가 큰따옴표로 감싸져 있는지 확인
- `\n`이 포함되어 있는지 확인
- JSON 파일에서 복사할 때 전체 키를 복사했는지 확인



