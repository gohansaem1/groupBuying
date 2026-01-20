# Firebase Admin SDK 오류 해결: "There is no configuration corresponding to the provided identifier"

## 오류 메시지

```
Failed to load resource: the server responded with a status of 500 (Internal Server Error)
카카오 로그인 오류: Error: There is no configuration corresponding to the provided identifier.
```

## 원인

Firebase Admin SDK가 올바르게 초기화되지 않았습니다. 주로 환경 변수 설정 문제입니다.

## 해결 방법

### 1단계: 환경 변수 확인

`.env.local` 파일을 열고 다음 값들이 모두 설정되어 있는지 확인하세요:

```env
# Firebase Admin SDK 설정 (필수!)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 2단계: Firebase Admin SDK 키 다운로드

1. **Firebase Console 접속**
   - https://console.firebase.google.com/ 접속
   - 프로젝트 선택

2. **서비스 계정 키 생성**
   - 프로젝트 설정(⚙️) → **서비스 계정** 탭 클릭
   - "새 비공개 키 만들기" 클릭
   - 확인 대화상자에서 "키 생성" 클릭
   - **JSON 파일이 자동으로 다운로드됩니다**

3. **JSON 파일에서 값 추출**
   - 다운로드한 JSON 파일을 메모장으로 열기
   - 다음 값들을 확인:
     ```json
     {
       "project_id": "your-project-id",           // ← 이것!
       "client_email": "firebase-adminsdk-xxx@...", // ← 이것!
       "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"  // ← 이것!
     }
     ```

### 3단계: .env.local 파일에 정확히 입력

`.env.local` 파일을 열고 다음 형식으로 입력:

```env
# Firebase Admin SDK 설정
FIREBASE_PROJECT_ID=여기에_project_id_값_붙여넣기
FIREBASE_CLIENT_EMAIL=여기에_client_email_값_붙여넣기
FIREBASE_PRIVATE_KEY="여기에_private_key_전체_붙여넣기"
```

**중요한 주의사항:**

1. **FIREBASE_PRIVATE_KEY는 큰따옴표로 감싸야 합니다**
   ```env
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```

2. **private_key는 JSON 파일에서 전체를 복사해야 합니다**
   - `-----BEGIN PRIVATE KEY-----` 부터
   - `-----END PRIVATE KEY-----` 까지
   - 중간의 모든 줄 포함

3. **줄바꿈은 `\n`으로 표시**
   - JSON 파일의 실제 줄바꿈을 `\n`으로 변환
   - 예: `\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n`

4. **공백 확인**
   - 변수명과 `=` 사이에 공백 없음
   - 예: `FIREBASE_PROJECT_ID=value` (올바름)
   - 예: `FIREBASE_PROJECT_ID = value` (잘못됨)

### 4단계: 값 확인

`.env.local` 파일의 값들이 올바른지 확인:

```env
# 예시 (실제 값으로 교체해야 함)
FIREBASE_PROJECT_ID=jeju-group-buying
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-abcde@jeju-group-buying.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7vKT1XxYz\nAbCdEfGhIjKlMnOpQrStUvWxYz1234567890AbCdEfGhIjKlMnOpQrStUvWxYz\n-----END PRIVATE KEY-----\n"
```

### 5단계: 개발 서버 재시작

환경 변수를 변경했으므로 개발 서버를 재시작해야 합니다:

```bash
# 터미널에서 Ctrl+C로 중지 후
npm run dev
```

### 6단계: 테스트

1. 브라우저에서 http://localhost:3000 접속
2. "카카오 로그인" 버튼 클릭
3. 로그인 성공 확인

## 문제 해결 체크리스트

- [ ] `.env.local` 파일이 프로젝트 루트에 있음
- [ ] `FIREBASE_PROJECT_ID` 값이 올바르게 입력됨
- [ ] `FIREBASE_CLIENT_EMAIL` 값이 올바르게 입력됨
- [ ] `FIREBASE_PRIVATE_KEY` 값이 큰따옴표로 감싸져 있음
- [ ] `FIREBASE_PRIVATE_KEY`에 `\n`이 포함되어 있음
- [ ] JSON 파일에서 전체 private_key를 복사했음
- [ ] 변수명과 `=` 사이에 공백 없음
- [ ] 개발 서버 재시작 완료

## 자주 발생하는 실수

### ❌ 잘못된 예시

```env
# 따옴표 없음
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...

# 줄바꿈 없음
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...-----END PRIVATE KEY-----"

# 공백 있음
FIREBASE_PROJECT_ID = your-project-id

# 값이 없음
FIREBASE_PROJECT_ID=
```

### ✅ 올바른 예시

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

## 추가 디버깅

터미널에서 개발 서버를 실행하면 다음과 같은 로그가 나타나야 합니다:

```
Firebase Admin 초기화 성공: your-project-id
```

만약 오류가 발생하면:
- 환경 변수 값 확인
- JSON 파일에서 값 재확인
- 개발 서버 재시작

## 참고

- Firebase Admin SDK는 서버 사이드에서만 사용됩니다
- 환경 변수는 `NEXT_PUBLIC_` 접두사 없이 사용합니다
- `.env.local` 파일은 Git에 커밋하지 마세요 (보안)

