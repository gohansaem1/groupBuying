# 관리자 계정 생성 가이드

관리자(admin) 계정을 생성하거나 기존 사용자를 관리자로 승격하는 방법입니다.

## 역할 설명

### admin (관리자)
- **로그인 방식**: 카카오 로그인 사용
- **권한**:
  - 모든 사용자 조회 및 역할 변경
  - 상품 관리 (생성, 수정, 삭제)
  - 공동구매 건 관리 (조회, 상태 변경)
  - 진행자(Organizer) 승인/거부
  - Organizer 모집 ON/OFF 설정
  - 수수료율 설정
- **제한사항**:
  - 공동구매 건 생성 불가 (Organizer만 가능)
  - 오너(owner) 역할 변경 불가

### owner (오너)
- **로그인 방식**: 이메일/비밀번호 (`/admin/login`)
- **권한**: 관리자 권한 + Organizer를 Admin으로 승격 가능
- **생성 방법**: `scripts/create-owner-account.js` 사용

---

## 방법 1: 기존 사용자를 관리자로 승격 (추천)

### 1-1. 스크립트 사용 (대화형 모드)

```bash
node scripts/create-admin-account.js
```

스크립트가 실행되면:
1. 모든 사용자 목록이 표시됩니다
2. 관리자로 승격할 사용자 번호를 선택합니다
3. 역할이 자동으로 변경됩니다

### 1-2. 직접 UID/이메일 지정

```bash
# UID로 승격
node scripts/create-admin-account.js promote <사용자UID>

# 이메일로 승격
node scripts/create-admin-account.js promote user@example.com
```

---

## 방법 2: Firebase Console에서 직접 수정

### 1단계: Firebase Console 접속
1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 선택

### 2단계: Firestore Database로 이동
1. 왼쪽 메뉴에서 **Firestore Database** 클릭
2. **users** 컬렉션 클릭

### 3단계: 사용자 문서 찾기
- 카카오 계정의 UID 또는 이메일로 검색
- 또는 Firebase Authentication → Users에서 UID 확인 후 Firestore에서 찾기

### 4단계: 역할 변경
1. 해당 사용자 문서 클릭
2. `role` 필드 찾기
3. 값을 `admin`으로 변경
4. **업데이트** 버튼 클릭

---

## 방법 3: 새로운 카카오 계정으로 관리자 생성

### 1단계: 카카오 로그인으로 계정 생성
1. 앱에서 카카오 로그인으로 새 계정 생성
2. 일반 사용자(user)로 자동 생성됨

### 2단계: 관리자로 승격
- 방법 1 또는 방법 2를 사용하여 역할을 `admin`으로 변경

---

## 확인 사항

### 변경 전 확인
- ✅ 사용자가 Firebase Authentication에 존재하는지 확인
- ✅ Firestore의 `users/{userId}` 문서가 존재하는지 확인
- ✅ 현재 역할이 `user`, `organizer_pending`, 또는 `organizer`인지 확인

### 변경 후 확인
- ✅ Firestore의 `users/{userId}` 문서에서 `role` 필드가 `admin`으로 변경되었는지 확인
- ✅ 앱에서 해당 계정으로 카카오 로그인하여 관리자 기능이 표시되는지 확인
- ✅ `/admin` 경로 접근 시 관리자 페이지가 표시되는지 확인
- ⚠️  주의: 관리자는 카카오 로그인을 사용하므로 `/admin/login`이 아닌 일반 로그인으로 접근해야 합니다.

---

## 주의사항

1. **관리자와 오너의 차이**
   - 관리자(admin): 카카오 로그인 사용, 공동구매 건 생성 불가
   - 오너(owner): 이메일/비밀번호 로그인, 모든 권한 + Organizer를 Admin으로 승격 가능

2. **공동구매 건 생성**
   - 관리자는 공동구매 건을 생성할 수 없습니다
   - 공동구매 건 생성이 필요하면 `organizer` 역할도 함께 부여해야 합니다
   - 또는 별도의 Organizer 계정을 사용하세요

3. **역할 변경 제한**
   - `owner` 역할은 변경할 수 없습니다 (ADMIN_OWNER_UID 환경 변수로 관리)
   - `owner`를 다른 역할로 변경하려고 하면 오류가 발생합니다

4. **즉시 반영**
   - Firestore에서 역할을 변경하면 앱을 새로고침하면 즉시 반영됩니다
   - 캐시 문제가 있다면 브라우저 캐시를 삭제하거나 시크릿 모드로 테스트하세요

---

## 문제 해결

### "사용자를 찾을 수 없습니다" 오류
- Firebase Authentication에 해당 사용자가 존재하는지 확인
- Firestore의 `users` 컬렉션에 해당 UID의 문서가 존재하는지 확인
- 카카오 로그인으로 한 번이라도 로그인한 적이 있어야 Firestore에 문서가 생성됩니다

### 역할이 변경되지 않음
- Firestore 보안 규칙 확인 (관리자 권한 필요)
- 브라우저 캐시 삭제 후 재시도
- Firebase Console에서 직접 확인

### 스크립트 실행 오류
- `.env.local` 파일에 Firebase Admin 환경 변수가 설정되어 있는지 확인
- Node.js 버전 확인 (v14 이상 권장)

### 관리자 페이지에 접근할 수 없음
- 관리자는 카카오 로그인을 사용합니다 (`/admin/login`이 아님)
- 일반 로그인 페이지(`/login`)에서 카카오 로그인을 사용하세요
- 로그인 후 `/admin` 경로로 접근하면 관리자 페이지가 표시됩니다

---

## 관리자 계정 예시

### 시나리오 1: 기존 카카오 계정을 관리자로 승격
```bash
# 이메일로 승격
node scripts/create-admin-account.js promote user@example.com

# 또는 UID로 승격
node scripts/create-admin-account.js promote abc123xyz
```

### 시나리오 2: 여러 사용자 중에서 선택
```bash
# 대화형 모드 실행
node scripts/create-admin-account.js

# 사용자 목록이 표시되면 번호 선택
```

### 시나리오 3: Firebase Console에서 직접 수정
1. Firestore → users 컬렉션
2. 사용자 문서 찾기
3. `role` 필드를 `admin`으로 변경

---

## 관련 문서

- `OWNER_ACCOUNT_CREATION_DESIGN.md`: 오너 계정 생성 가이드
- `AUTH_ARCHITECTURE.md`: 인증 아키텍처 설명
- `FIREBASE_ROLE_RESET_GUIDE.md`: 역할 초기화 가이드
