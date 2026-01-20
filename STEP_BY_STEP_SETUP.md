# 🚀 단계별 설정 가이드 (차근차근 따라하기)

이 가이드는 처음부터 끝까지 단계별로 진행하면서 테스트할 수 있도록 작성되었습니다.

## 📋 목차

1. [프로젝트 확인](#1-프로젝트-확인)
2. [Firebase 설정 (1단계)](#2-firebase-설정-1단계)
3. [환경 변수 설정 (2단계)](#3-환경-변수-설정-2단계)
4. [카카오 로그인 설정 (3단계)](#4-카카오-로그인-설정-3단계)
5. [Firestore 규칙 배포 (4단계)](#5-firestore-규칙-배포-4단계)
6. [테스트하기](#6-테스트하기)

---

## 1. 프로젝트 확인

### 현재 프로젝트 구조

```
groupBuying/
├── app/                    # Next.js 앱 라우터
│   ├── admin/             # 관리자 페이지
│   ├── api/               # API 라우트
│   │   ├── auth/kakao/   # 카카오 로그인 API
│   │   └── webhooks/kakao/ # 카카오 웹훅 API
│   ├── groups/           # 그룹 상세 페이지
│   ├── login/            # 로그인 페이지
│   ├── organizer/        # Organizer 페이지
│   └── products/         # 상품 목록 페이지
├── components/           # 공통 컴포넌트
├── lib/                  # 라이브러리
│   ├── firebase/         # Firebase 관련 함수
│   └── webhooks/         # 웹훅 처리 함수
└── .env.local            # 환경 변수 (생성 필요!)
```

### 필요한 것들

- ✅ Node.js 설치됨
- ✅ npm 설치됨
- ✅ 코드는 모두 준비됨
- ⬜ Firebase 프로젝트 생성 필요
- ⬜ 카카오 개발자 앱 등록 필요
- ⬜ 환경 변수 설정 필요

---

## 2. Firebase 설정 (1단계)

### 2-1. Firebase 프로젝트 생성

1. **Firebase Console 접속**
   - https://console.firebase.google.com/ 접속
   - Google 계정으로 로그인

2. **프로젝트 추가**
   - "프로젝트 추가" 또는 "Add project" 클릭
   - 프로젝트 이름 입력: `jeju-group-buying` (원하는 이름)
   - Google Analytics 설정: **선택사항** (체크 해제해도 됨)
   - "프로젝트 만들기" 클릭
   - 잠시 대기 (프로젝트 생성 중...)

### 2-2. Firebase 웹 앱 추가

1. **프로젝트 선택**
   - 생성한 프로젝트 클릭

2. **웹 앱 추가**
   - 프로젝트 개요 화면에서 `</>` (웹) 아이콘 클릭
   - 앱 닉네임 입력: `제주 공동구매`
   - "앱 등록" 클릭

3. **설정 정보 복사**
   - 다음 화면에서 `firebaseConfig` 객체가 보입니다
   - **이 정보를 메모장에 복사해두세요!** (나중에 사용)

   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",              // ← 이것!
     authDomain: "xxx.firebaseapp.com", // ← 이것!
     projectId: "xxx",                 // ← 이것!
     storageBucket: "xxx.appspot.com",  // ← 이것!
     messagingSenderId: "123456789",    // ← 이것!
     appId: "1:123456789:web:xxx"      // ← 이것!
   };
   ```

### 2-3. Firestore 데이터베이스 생성

1. **Firestore Database 메뉴**
   - 왼쪽 메뉴에서 "Firestore Database" 클릭
   - "데이터베이스 만들기" 클릭

2. **보안 규칙 설정**
   - **프로덕션 모드** 선택 (나중에 규칙 배포할 예정)
   - "다음" 클릭

3. **위치 선택**
   - `asia-northeast3 (서울)` 선택 (가장 가까운 위치)
   - "사용 설정" 클릭
   - 잠시 대기 (데이터베이스 생성 중...)

### 2-4. Firebase Authentication 활성화

1. **Authentication 메뉴**
   - 왼쪽 메뉴에서 "Authentication" 클릭
   - "시작하기" 또는 "Get started" 클릭
   - Authentication이 활성화됩니다

2. **Sign-in method 확인**
   - "Sign-in method" 탭 클릭
   - 이 프로젝트는 Custom Token을 사용하므로 별도 설정 불필요
   - (선택사항) 테스트용으로 "익명" 로그인 활성화 가능

   **중요:** Custom Token은 Firebase Admin SDK로 생성되므로, 별도로 활성화할 필요가 없습니다.

### 2-5. Firebase Admin SDK 키 생성

1. **서비스 계정 메뉴**
   - 프로젝트 설정(톱니바퀴 아이콘) 클릭
   - "서비스 계정" 탭 클릭

2. **비공개 키 생성**
   - "새 비공개 키 만들기" 클릭
   - 확인 대화상자에서 "키 생성" 클릭
   - **JSON 파일이 자동으로 다운로드됩니다!**
   - **이 파일을 안전한 곳에 보관하세요!**

3. **JSON 파일 내용 확인**
   - 다운로드한 JSON 파일을 메모장으로 열기
   - 다음 값들을 확인:
     - `project_id`
     - `client_email`
     - `private_key` (전체 키, 매우 길음)

### ✅ 1단계 완료 체크

- [ ] Firebase 프로젝트 생성 완료
- [ ] 웹 앱 추가 완료
- [ ] firebaseConfig 정보 복사 완료
- [ ] Firestore 데이터베이스 생성 완료
- [ ] Firebase Authentication 활성화 완료
- [ ] Admin SDK JSON 파일 다운로드 완료

---

## 3. 환경 변수 설정 (2단계)

이제 `.env.local` 파일을 만들고 값을 입력합니다.

### 3-1. 파일 생성

1. **프로젝트 루트 폴더 확인**
   - `C:\Users\gohan\groupBuying` 폴더가 열려있는지 확인

2. **새 파일 생성**
   - 파일 탐색기에서 우클릭 → 새로 만들기 → 텍스트 문서
   - 파일 이름을 `.env.local`로 변경
   - 확장자 변경 확인 대화상자에서 "예" 클릭

   **또는 VS Code에서:**
   - 좌측 파일 탐색기에서 프로젝트 루트 우클릭
   - "새 파일" 클릭
   - `.env.local` 입력

### 3-2. Firebase 클라이언트 설정 입력

`.env.local` 파일을 열고 아래 내용을 복사한 후, **실제 값으로 교체**하세요:

```env
# ============================================
# Firebase 클라이언트 설정
# ============================================
# Firebase Console에서 복사한 firebaseConfig 값들을 입력하세요

NEXT_PUBLIC_FIREBASE_API_KEY=여기에_apiKey_값_붙여넣기
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=여기에_authDomain_값_붙여넣기
NEXT_PUBLIC_FIREBASE_PROJECT_ID=여기에_projectId_값_붙여넣기
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=여기에_storageBucket_값_붙여넣기
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=여기에_messagingSenderId_값_붙여넣기
NEXT_PUBLIC_FIREBASE_APP_ID=여기에_appId_값_붙여넣기
```

**예시 (실제 값으로 교체해야 함):**
```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz1234567
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=jeju-group-buying.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=jeju-group-buying
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=jeju-group-buying.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890abcdef
```

### 3-3. Firebase Admin SDK 설정 입력

다운로드한 JSON 파일을 열고, 다음 값들을 복사하여 입력하세요:

```env
# ============================================
# Firebase Admin SDK 설정
# ============================================
# 다운로드한 JSON 파일에서 복사하세요

FIREBASE_PROJECT_ID=여기에_project_id_값_붙여넣기
FIREBASE_CLIENT_EMAIL=여기에_client_email_값_붙여넣기
FIREBASE_PRIVATE_KEY="여기에_private_key_전체_붙여넣기"
```

**중요한 주의사항:**

1. **FIREBASE_PRIVATE_KEY는 큰따옴표로 감싸야 합니다**
2. **private_key는 JSON 파일에서 전체를 복사해야 합니다**
   - `-----BEGIN PRIVATE KEY-----` 부터
   - `-----END PRIVATE KEY-----` 까지
3. **줄바꿈은 그대로 두세요** (JSON 파일 그대로 복사)

**예시:**
```env
FIREBASE_PROJECT_ID=jeju-group-buying
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-abcde@jeju-group-buying.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

**private_key 복사 팁:**
- JSON 파일에서 `"private_key": "..."` 부분의 전체 값을 복사
- 큰따옴표 안의 내용만 복사 (따옴표 제외)
- 그 다음 `.env.local`에서 큰따옴표로 감싸기

### 3-4. 카카오 설정 (나중에 추가)

일단 카카오 설정은 나중에 하고, 먼저 Firebase만 테스트해봅시다.

```env
# ============================================
# 카카오 설정 (3단계에서 추가)
# ============================================
# NEXT_PUBLIC_KAKAO_JS_KEY=
# NEXT_PUBLIC_KAKAO_REST_API_KEY=
```

### ✅ 2단계 완료 체크

- [ ] `.env.local` 파일 생성 완료
- [ ] Firebase 클라이언트 설정 6개 값 모두 입력 완료
- [ ] Firebase Admin SDK 설정 3개 값 모두 입력 완료
- [ ] FIREBASE_PRIVATE_KEY가 큰따옴표로 감싸져 있음
- [ ] 파일 저장 완료

### 🧪 2단계 테스트

터미널에서 개발 서버 실행:

```bash
npm run dev
```

**성공하면:**
- 서버가 시작되고 `http://localhost:3000`에서 실행됨
- 브라우저에서 접속하면 로그인 페이지가 보임

**오류가 나면:**
- `.env.local` 파일의 값들을 다시 확인
- 특히 따옴표, 공백, 줄바꿈 확인
- 개발 서버 재시작 (`Ctrl+C` 후 다시 `npm run dev`)

---

## 4. 카카오 로그인 설정 (3단계)

### 4-1. 카카오 개발자 콘솔 접속

1. **카카오 개발자 콘솔 접속**
   - https://developers.kakao.com/ 접속
   - 카카오 계정으로 로그인

2. **애플리케이션 추가**
   - "내 애플리케이션" 클릭
   - "애플리케이션 추가하기" 클릭
   - 앱 이름 입력: `제주 공동구매`
   - "저장" 클릭

### 4-2. 앱 키 확인

1. **앱 키 탭**
   - 생성한 앱 클릭
   - "앱 키" 탭 클릭

2. **키 복사**
   - **JavaScript 키** 복사 → 메모장에 저장
   - **REST API 키** 복사 → 메모장에 저장

### 4-2. 플랫폼 도메인 등록 (중요!)

1. **앱 설정 → 플랫폼 탭**
   - 왼쪽 메뉴에서 "앱 설정" → "플랫폼" 탭 클릭

2. **웹 플랫폼 등록**
   - "웹 플랫폼 등록" 클릭
   - 사이트 도메인 입력:
     ```
     http://localhost:3001
     ```
     **주의:** 
     - 포트 번호를 포함해야 합니다 (`:3001`)
     - 개발 서버가 다른 포트를 사용하면 해당 포트로 변경
     - `http://` 프로토콜 포함
     - 슬래시(`/`) 없이 입력
   - "저장" 클릭

3. **추가 포트 등록 (선택사항)**
   - 다른 포트도 사용할 수 있도록:
     ```
     http://localhost:3000
     ```
   - "저장" 클릭

### 4-3. 카카오 로그인 활성화

1. **제품 설정**
   - 왼쪽 메뉴에서 "제품 설정" → "카카오 로그인" 클릭
   - "활성화 설정" ON

2. **Redirect URI 등록**
   - "Redirect URI 등록" 클릭
   - `http://localhost:3001` 입력 (또는 사용 중인 포트)
   - `http://localhost:3000` 입력 (다른 포트 사용 시)
   - "저장" 클릭

3. **동의항목 설정**
   - "동의항목" 탭 클릭
   - 필수 동의항목:
     - ✅ 닉네임 (필수)
     - ✅ 프로필 사진 (필수)
   - 선택 동의항목:
     - ⬜ 이메일 (선택사항)

### 4-4. 환경 변수에 추가

`.env.local` 파일을 열고 카카오 설정 추가:

```env
# ============================================
# 카카오 설정
# ============================================
NEXT_PUBLIC_KAKAO_JS_KEY=여기에_JavaScript_키_붙여넣기
NEXT_PUBLIC_KAKAO_REST_API_KEY=여기에_REST_API_키_붙여넣기
```

**예시:**
```env
NEXT_PUBLIC_KAKAO_JS_KEY=abcdef1234567890abcdef1234567890abcdef
NEXT_PUBLIC_KAKAO_REST_API_KEY=abcdef1234567890abcdef1234567890abcdef
```

### ✅ 3단계 완료 체크

- [ ] 카카오 개발자 콘솔에서 앱 생성 완료
- [ ] JavaScript 키 복사 완료
- [ ] REST API 키 복사 완료
- [ ] 카카오 로그인 활성화 완료
- [ ] Redirect URI 등록 완료
- [ ] `.env.local`에 카카오 키 추가 완료

### 🧪 3단계 테스트

1. **개발 서버 재시작**
   ```bash
   # 터미널에서 Ctrl+C로 중지 후
   npm run dev
   ```
   - 포트 번호 확인 (예: `http://localhost:3001`)

2. **브라우저에서 테스트**
   - 개발 서버가 표시한 포트로 접속 (예: http://localhost:3001)
   - "카카오 로그인" 버튼 클릭
   - 카카오 로그인 화면이 나타나면 성공!

3. **오류 발생 시**
   - "등록되지 않은 플랫폼" 오류가 나면:
     - 카카오 개발자 콘솔 → 앱 설정 → 플랫폼 탭 확인
     - 사용 중인 포트 번호가 정확히 등록되었는지 확인
     - 예: `http://localhost:3001` (포트 번호 포함!)

---

## 5. Firestore 규칙 배포 (4단계)

### 5-1. 규칙 파일 확인

프로젝트에 `firestore.rules` 파일이 있습니다. 이 파일의 내용을 Firebase Console에 배포해야 합니다.

### 5-2. Firebase Console에 규칙 배포

1. **Firebase Console 접속**
   - https://console.firebase.google.com/ 접속
   - 프로젝트 선택

2. **Firestore 규칙 탭**
   - 왼쪽 메뉴에서 "Firestore Database" 클릭
   - 상단 탭에서 "규칙" 클릭

3. **규칙 복사**
   - 프로젝트의 `firestore.rules` 파일 열기
   - 전체 내용 복사

4. **규칙 붙여넣기**
   - Firebase Console의 규칙 편집기에 붙여넣기
   - "게시" 버튼 클릭
   - 확인 대화상자에서 "게시" 확인

### ✅ 4단계 완료 체크

- [ ] Firestore 규칙 배포 완료

---

## 6. 테스트하기

### 6-1. 기본 테스트

1. **개발 서버 실행**
   ```bash
   npm run dev
   ```

2. **브라우저 접속**
   - http://localhost:3000 접속
   - 로그인 페이지가 보이는지 확인

3. **카카오 로그인 테스트**
   - "카카오 로그인" 버튼 클릭
   - 카카오 로그인 완료
   - 메인 페이지로 리다이렉트되는지 확인

### 6-2. 첫 관리자 계정 생성

1. **Firebase Console 접속**
   - Firestore Database → 데이터 탭

2. **users 컬렉션 확인**
   - 카카오 로그인 후 `users` 컬렉션이 생성되었는지 확인
   - 사용자 문서가 생성되었는지 확인

3. **관리자 권한 부여**
   - 사용자 문서 클릭
   - `role` 필드를 `admin`으로 변경
   - 저장

4. **관리자 페이지 접속**
   - 브라우저에서 http://localhost:3000/admin 접속
   - 관리자 대시보드가 보이면 성공!

### 6-3. 기능 테스트

1. **상품 추가 테스트**
   - 관리자 페이지 → 상품 관리 탭
   - "상품 추가" 클릭
   - 상품 정보 입력 후 저장
   - 상품이 목록에 나타나는지 확인

2. **Organizer 신청 테스트**
   - 로그아웃 후 일반 사용자로 로그인
   - 상품 목록 페이지에서 "Organizer 신청" 클릭
   - 신청 완료

3. **관리자 승인 테스트**
   - 관리자로 로그인
   - 사용자 관리 탭에서 승인 대기 사용자 확인
   - 역할을 `organizer`로 변경

4. **그룹 생성 테스트**
   - Organizer로 로그인
   - "그룹 생성" 클릭
   - 상품 선택 후 그룹 생성
   - 그룹이 생성되는지 확인

---

## 🎉 완료!

모든 설정이 완료되었습니다!

### 다음 단계

- 실제 상품 추가
- 사용자 테스트
- 프로덕션 배포 준비

### 문제 해결

문제가 발생하면:
1. 개발 서버 재시작
2. 브라우저 콘솔 확인 (F12)
3. 터미널 오류 메시지 확인
4. `.env.local` 파일 값 재확인

---

## 📝 체크리스트 요약

### 필수 설정
- [ ] Firebase 프로젝트 생성
- [ ] 웹 앱 추가 및 설정 정보 복사
- [ ] Firestore 데이터베이스 생성
- [ ] Firebase Admin SDK 키 다운로드
- [ ] `.env.local` 파일 생성
- [ ] Firebase 클라이언트 설정 입력
- [ ] Firebase Admin SDK 설정 입력
- [ ] 카카오 개발자 앱 생성
- [ ] 카카오 키 복사 및 환경 변수 입력
- [ ] Firestore 규칙 배포
- [ ] 첫 관리자 계정 생성

### 테스트
- [ ] 개발 서버 실행 성공
- [ ] 카카오 로그인 성공
- [ ] 관리자 페이지 접근 성공
- [ ] 상품 추가 성공
- [ ] 그룹 생성 성공

