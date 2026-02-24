# 오너 계정 생성 설계 문서

## 개요

오너 계정은 최고 관리자 권한을 가진 계정으로, 이메일/비밀번호 방식으로만 생성됩니다. 카카오 로그인으로는 생성할 수 없습니다.

## 현재 구조 분석

### 1. 기존 사용자 생성 흐름

#### 카카오 로그인 사용자
- **UID 형식**: `kakao_${kakaoId}` (예: `kakao_123456789`)
- **생성 위치**: `app/api/auth/kakao/callback/route.ts`
- **Firestore 초기 role**: `'user'`
- **이메일**: 카카오 계정 이메일 (있을 수도, 없을 수도 있음)

#### 테스트 사용자
- **UID 형식**: 커스텀 (예: `test_user_1`)
- **생성 위치**: `scripts/create-test-users.js`
- **Firestore role**: 설정 가능 (`'user'`, `'organizer'`, `'organizer_pending'` 등)

### 2. 오너 계정 인증 흐름

#### 로그인
- **경로**: `/admin/login`
- **방식**: 이메일/비밀번호
- **검증**: `/api/admin/sessionLogin`
  - Firebase Auth `signInWithEmailAndPassword`
  - `getIdToken()`으로 ID 토큰 획득
  - 서버에서 `verifyIdToken()` 후 UID 확인
  - `process.env.ADMIN_OWNER_UID`와 비교
  - 일치하면 세션 쿠키 발급

#### 보호
- **경로**: `/admin` 및 `/admin/*`
- **방식**: 서버 사이드 세션 쿠키 검증
- **레이아웃**: `app/(admin-protected)/admin/layout.tsx`

#### 로그아웃
- **경로**: `/api/admin/logout`
- **방식**: POST 요청으로 `admin_session` 쿠키 삭제
- **리다이렉트**: 로그아웃 후 `/admin/login`으로 이동
- **UI**: 관리자 페이지 상단에 로그아웃 버튼 표시

## 설계: 오너 계정 생성 방법

### 방법 1: 수동 생성 (권장)

#### 1.1 Firebase Console에서 직접 생성

**장점**:
- 가장 안전하고 명확함
- 비밀번호를 직접 설정 가능
- 즉시 사용 가능

**단계**:
1. Firebase Console > Authentication > Users
2. "사용자 추가" 클릭
3. 이메일/비밀번호 입력
4. 생성된 UID 복사
5. Firestore Console > `users` 컬렉션 > 해당 UID 문서 생성/수정
   ```json
   {
     "uid": "생성된_UID",
     "email": "owner@example.com",
     "displayName": "오너",
     "nickname": null,
     "photoURL": null,
     "role": "owner",
     "userAgreedToTerms": false,
     "organizerAgreedToTerms": false,
     "createdAt": "2026-02-04T00:00:00Z",
     "updatedAt": "2026-02-04T00:00:00Z"
   }
   ```
6. 환경 변수 설정: `ADMIN_OWNER_UID=생성된_UID`

### 방법 2: 스크립트 생성 (개발 환경)

#### 2.1 오너 계정 생성 스크립트

**위치**: `scripts/create-owner-account.js`

**기능**:
- Firebase Auth에 이메일/비밀번호 계정 생성
- Firestore에 `role: 'owner'`로 사용자 프로필 생성
- 생성된 UID 출력 (환경 변수 설정용)

**주의사항**:
- 개발 환경에서만 사용
- 프로덕션에서는 수동 생성 권장

### 방법 3: 관리자 API 생성 (선택사항)

#### 3.1 오너 계정 생성 API

**경로**: `/api/admin/createOwner` (또는 `/api/admin/users/createOwner`)

**보안**:
- 기존 오너 계정으로만 접근 가능
- 세션 쿠키 검증 필수
- 이메일 중복 체크
- 감사 로그 기록

**요청 본문**:
```json
{
  "email": "newowner@example.com",
  "password": "secure_password",
  "displayName": "새 오너"
}
```

**응답**:
```json
{
  "uid": "생성된_UID",
  "email": "newowner@example.com",
  "message": "오너 계정이 생성되었습니다. ADMIN_OWNER_UID 환경 변수를 업데이트하세요."
}
```

## 기존 로직과의 충돌 분석

### 1. 이메일 중복 문제

#### 문제점
- 카카오 로그인 사용자가 `user@example.com`으로 가입
- 오너 계정도 `user@example.com`으로 생성 가능
- Firebase Auth는 다른 UID를 부여하므로 기술적으로 가능
- 하지만 사용자 혼란 가능성

#### 해결 방안
- **권장**: 오너 계정은 전용 이메일 도메인 사용 (예: `owner@yourcompany.com`)
- **대안**: 오너 계정 생성 시 이메일 중복 체크
  - Firestore `users` 컬렉션에서 이메일 검색
  - 중복 발견 시 경고 또는 거부

### 2. UID 형식 불일치

#### 문제점
- 카카오 사용자: `kakao_${kakaoId}` (예: `kakao_123456789`)
- 오너 계정: 자동 생성 UID (예: `abc123def456ghi789`)
- UID 형식이 다르므로 혼동 가능

#### 해결 방안
- **현재 구조 유지**: UID 형식이 달라도 문제 없음
- **문서화**: 오너 계정 UID는 `ADMIN_OWNER_UID` 환경 변수로 관리

### 3. Firestore 보안 규칙

#### 현재 규칙
```javascript
match /users/{userId} {
  allow read: if isSignedIn() && (request.auth.uid == userId || isAdmin());
  allow create: if isSignedIn() && request.auth.uid == userId;
  allow update: if isSignedIn() && (request.auth.uid == userId || isAdmin());
  allow list: if isAdmin();
}
```

#### 충돌 가능성
- 오너 계정 생성 시 `role: 'owner'`로 설정해야 함
- 하지만 `allow create`는 본인만 가능 (`request.auth.uid == userId`)
- 오너 계정 생성 시 본인 UID로 생성하므로 문제 없음

#### 해결 방안
- **현재 규칙 유지**: 오너 계정 생성 시 본인 UID로 생성하므로 문제 없음
- **서버 사이드 생성**: API로 생성 시 서버에서 Firestore 직접 작성 (보안 규칙 우회)

### 4. 카카오 로그인 콜백과의 충돌

#### 문제점
- 카카오 로그인 콜백에서 자동으로 사용자 생성
- 같은 이메일로 오너 계정이 이미 있으면?
- 카카오 로그인은 `kakao_${id}` UID로 생성되므로 충돌 없음

#### 해결 방안
- **현재 구조 유지**: UID가 다르므로 충돌 없음
- **추가 검증**: 카카오 로그인 콜백에서 이메일 중복 체크 (선택사항)

### 5. 역할 변경 로직

#### 현재 구조
- `lib/firebase/admin.ts`의 `updateUserRole()` 함수
- 관리자만 역할 변경 가능
- 오너는 `admin` 역할도 가짐

#### 충돌 가능성
- 오너 계정을 일반 사용자로 변경하면?
- `ADMIN_OWNER_UID`와 불일치 발생
- 관리자 페이지 접근 불가

#### 해결 방안
- **역할 변경 제한**: 오너 역할은 변경 불가능하도록 제한
- **UI에서 제외**: 관리자 페이지에서 오너 역할 변경 옵션 숨김
- **서버 사이드 검증**: 역할 변경 API에서 오너 역할 변경 거부

## 권장 구현 방안

### 1단계: 수동 생성 가이드 문서화 ✅
- Firebase Console에서 수동 생성 방법 문서화
- Firestore 설정 방법 문서화
- 환경 변수 설정 방법 문서화

### 2단계: 생성 스크립트 작성 (개발 환경)
- `scripts/create-owner-account.js` 작성
- 이메일/비밀번호 입력 받기
- Firebase Auth 계정 생성
- Firestore 프로필 생성 (`role: 'owner'`)
- 생성된 UID 출력

### 3단계: 역할 변경 보호
- `updateUserRole()` 함수에서 오너 역할 변경 거부
- 관리자 페이지 UI에서 오너 역할 변경 옵션 제거

### 4단계: 오너 계정 생성 API (선택사항)
- 기존 오너 계정으로만 접근 가능
- 이메일 중복 체크
- 감사 로그 기록

## 기존 코드 충돌 지점 및 수정 필요사항

### 1. `lib/firebase/admin.ts` - `updateUserRole()` 함수

**현재 코드**:
```typescript
export async function updateUserRole(userId: string, role: 'user' | 'organizer_pending' | 'organizer' | 'admin' | 'owner'): Promise<void> {
  const userRef = doc(db, 'users', userId)
  await updateDoc(userRef, {
    role,
    updatedAt: serverTimestamp(),
  })
}
```

**문제점**:
- 오너 역할을 다른 역할로 변경 가능
- 일반 사용자를 오너로 변경 가능
- `ADMIN_OWNER_UID`와 불일치 발생 가능

**수정 필요**:
```typescript
export async function updateUserRole(userId: string, role: 'user' | 'organizer_pending' | 'organizer' | 'admin' | 'owner'): Promise<void> {
  // 기존 사용자 역할 확인
  const userRef = doc(db, 'users', userId)
  const userSnap = await getDoc(userRef)
  
  if (!userSnap.exists()) {
    throw new Error('사용자를 찾을 수 없습니다.')
  }
  
  const currentRole = userSnap.data().role
  
  // 오너 역할 변경 방지
  if (currentRole === 'owner') {
    throw new Error('오너 역할은 변경할 수 없습니다.')
  }
  
  // 일반 사용자를 오너로 변경 방지
  if (role === 'owner') {
    throw new Error('오너 역할은 직접 생성해야 합니다. ADMIN_OWNER_UID 환경 변수를 확인하세요.')
  }
  
  await updateDoc(userRef, {
    role,
    updatedAt: serverTimestamp(),
  })
}
```

### 2. `app/(admin-protected)/admin/page.tsx` - 역할 변경 UI

**현재 코드**:
```typescript
// 오너가 변경할 수 있는 역할 목록
const getAvailableRolesForOwner = (): UserRole[] => {
  return ['user', 'organizer', 'admin']  // 'owner' 이미 제외됨 ✅
}

// UI에서 오너 역할 변경 옵션 숨김
{user.role !== 'organizer_pending' && user.role !== 'owner' && isAdmin && (
  // 역할 변경 UI
)}
```

**상태**: ✅ 이미 올바르게 구현됨
- 오너 역할 변경 UI는 숨겨져 있음
- `getAvailableRolesForOwner()`에서 `'owner'` 옵션 제외됨

**추가 권장사항**:
- 서버 사이드 검증 추가 (`updateUserRole()` 함수에서)

### 3. 카카오 로그인 콜백 - 이메일 중복 체크 (선택사항)

**현재 코드**: `app/api/auth/kakao/callback/route.ts`
- 이메일 중복 체크 없음
- 같은 이메일로 오너 계정이 있어도 카카오 로그인 가능 (다른 UID)

**권장사항**:
- 현재 구조 유지 (UID가 다르므로 충돌 없음)
- 필요시 경고 로그만 추가

## 구현 체크리스트

- [x] 오너 계정 생성 가이드 문서 작성
- [x] `scripts/create-owner-account.js` 스크립트 작성
- [x] `updateUserRole()` 함수에 오너 역할 변경 방지 로직 추가
- [x] `getAvailableRoles()` 함수에서 `'owner'` 옵션 제거 확인 (이미 구현됨)
- [ ] 이메일 중복 체크 로직 추가 (선택사항, 스크립트에 포함됨)
- [ ] 오너 계정 생성 API 작성 (선택사항)
- [ ] 감사 로그 기록 (선택사항)

## 보안 고려사항

1. **비밀번호 정책**:
   - 최소 8자 이상
   - 영문, 숫자, 특수문자 조합 권장
   - Firebase Console에서 정책 설정 가능

2. **환경 변수 보호**:
   - `ADMIN_OWNER_UID`는 서버 사이드에서만 사용
   - 클라이언트에 노출되지 않음
   - Vercel 대시보드에서 안전하게 관리

3. **세션 쿠키**:
   - HTTP-only, Secure 쿠키 사용
   - 만료 시간 설정 (기본 7일)
   - 환경 변수 `ADMIN_SESSION_EXPIRES_DAYS`로 조정 가능

4. **감사 로그**:
   - 오너 계정 생성/변경 시 감사 로그 기록 권장
   - `auditLogs` 컬렉션에 기록

## 구현 완료 사항

### ✅ 완료된 작업

1. **설계 문서 작성**: `OWNER_ACCOUNT_CREATION_DESIGN.md`
2. **오너 계정 생성 스크립트**: `scripts/create-owner-account.js`
   - 이메일/비밀번호 입력 받기
   - Firebase Auth 계정 생성
   - Firestore 프로필 생성 (`role: 'owner'`)
   - 이메일 중복 체크
   - 생성된 UID 출력
3. **역할 변경 보호**: `lib/firebase/admin.ts`의 `updateUserRole()` 함수
   - 오너 역할을 다른 역할로 변경 방지
   - 일반 사용자를 오너로 변경 방지
4. **UI 확인**: 관리자 페이지에서 오너 역할 변경 옵션 이미 제외됨

### ⚠️ 기존 로직과의 충돌 해결

1. **이메일 중복**: 
   - UID가 다르므로 기술적으로 충돌 없음
   - 스크립트에서 경고 메시지 표시
   - 권장: 오너 계정은 전용 이메일 도메인 사용

2. **역할 변경 보호**:
   - 서버 사이드 검증 추가 완료
   - 클라이언트 사이드 UI는 이미 보호됨

3. **카카오 로그인과의 충돌**:
   - UID 형식이 다르므로 충돌 없음 (`kakao_${id}` vs 자동 생성 UID)
   - 현재 구조 유지

## 문제 해결

### 오너 계정 생성 후 로그인 불가

1. **UID 확인**:
   - Firebase Console > Authentication > Users에서 UID 확인
   - `ADMIN_OWNER_UID` 환경 변수와 일치하는지 확인

2. **Firestore 역할 확인**:
   - Firestore Console > `users` 컬렉션 > 해당 UID 문서 확인
   - `role` 필드가 `'owner'`인지 확인

3. **환경 변수 확인**:
   - Vercel 대시보드에서 `ADMIN_OWNER_UID` 확인
   - 재배포 필요할 수 있음

### 이메일 중복 문제

1. **Firestore 검색**:
   ```javascript
   // Firestore Console에서 쿼리
   db.collection('users').where('email', '==', 'owner@example.com').get()
   ```

2. **해결 방법**:
   - 다른 이메일 사용
   - 기존 사용자 삭제 (주의: 데이터 손실 가능)
   - 기존 사용자 이메일 변경

### 역할 변경 오류

**에러 메시지**: "오너 역할은 변경할 수 없습니다."

**원인**: `updateUserRole()` 함수에서 오너 역할 변경을 방지하도록 수정됨

**해결**: 오너 계정은 `ADMIN_OWNER_UID` 환경 변수로만 관리됨

## 참고 자료

- [Firebase Authentication 문서](https://firebase.google.com/docs/auth)
- [Firestore 보안 규칙](https://firebase.google.com/docs/firestore/security/get-started)
- [AUTH_ARCHITECTURE.md](./AUTH_ARCHITECTURE.md)
