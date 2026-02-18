# 인증 아키텍처 문서

## 개요

이 프로젝트는 두 가지 인증 방식을 사용합니다:

1. **일반 사용자 인증**: Firebase Auth (카카오 로그인) + 클라이언트 사이드 `AuthGuard`
2. **오너(관리자) 인증**: 이메일/비밀번호 + 서버 사이드 세션 쿠키 (`admin_session`)

## 오너(관리자) 인증 구조

### 1. 로그인 페이지: `/admin/login`

- **위치**: `app/admin/login/page.tsx`
- **보호**: 가드 없음, 항상 접근 가능
- **기능**: 이메일/비밀번호 입력 폼
- **흐름**:
  1. 사용자가 이메일/비밀번호 입력
  2. `signInWithEmailAndPassword`로 Firebase Auth 로그인
  3. `getIdToken()`으로 ID 토큰 획득
  4. `/api/admin/sessionLogin`에 ID 토큰 전송
  5. 서버에서 UID 검증 후 세션 쿠키 발급
  6. `/admin`으로 리다이렉트

### 2. 보호된 관리자 페이지: `/admin` 및 `/admin/*`

- **위치**: `app/(admin-protected)/admin/`
- **보호 방식**: 서버 사이드 세션 쿠키 검증
- **레이아웃**: `app/(admin-protected)/admin/layout.tsx`
  - `export const runtime = 'nodejs'`
  - `export const dynamic = 'force-dynamic'`
  - `export const revalidate = 0`
- **검증 로직**:
  1. `cookies().get('admin_session')`로 세션 쿠키 확인
  2. 쿠키가 없으면 즉시 `/admin/login`으로 리다이렉트
  3. Firebase Admin SDK로 `verifySessionCookie()` 실행
  4. 검증 실패 시 `/admin/login?error=session_invalid`로 리다이렉트
  5. 검증 성공 시 `children` 렌더링

### 3. 세션 로그인 API: `/api/admin/sessionLogin`

- **위치**: `app/api/admin/sessionLogin/route.ts`
- **메서드**: `POST`
- **요청 본문**: `{ idToken: string }`
- **처리 흐름**:
  1. Firebase Admin SDK로 ID 토큰 검증 (`verifyIdToken`)
  2. UID 추출
  3. `process.env.ADMIN_OWNER_UID`와 비교
  4. UID가 일치하면 세션 쿠키 생성 (`createSessionCookie`)
  5. HTTP-only, Secure 쿠키로 설정하여 응답 반환

### 4. 환경 변수

- `ADMIN_OWNER_UID`: 오너 계정의 Firebase UID (콤마로 구분된 리스트 지원)
- `ADMIN_SESSION_EXPIRES_DAYS`: 세션 만료 일수 (기본값: 7일)

### 5. Middleware

- **위치**: `middleware.ts`
- **기능**: `/admin/*` 경로에서 `admin_session` 쿠키 존재 여부만 확인
- **예외**: `/admin/login`, `/admin/logout`, `/api/*`는 통과
- **주의**: 실제 검증은 서버 컴포넌트에서 수행 (Edge Runtime 제약)

## 일반 사용자 인증 구조

### 1. AuthGuard 컴포넌트

- **위치**: `components/AuthGuard.tsx`
- **사용 범위**: 일반 사용자 페이지에서만 사용
- **제외 경로**: `/admin`으로 시작하는 모든 경로는 자동 제외
- **기능**:
  - Firebase Auth 상태 확인
  - 사용자 프로필 로드
  - 역할 기반 접근 제어
  - 미인증 시 `/login`으로 리다이렉트

### 2. 사용 예시

```tsx
// 일반 사용자 페이지
<AuthGuard allowedRoles={['user', 'organizer', 'organizer_pending']}>
  {/* 페이지 콘텐츠 */}
</AuthGuard>
```

### 3. 역할

- `user`: 일반 사용자
- `organizer_pending`: 진행자 신청 대기 중
- `organizer`: 진행자
- `owner`: 오너 (일반 사용자 페이지에서는 사용하지 않음)
- `admin`: 관리자 (일반 사용자 페이지에서는 사용하지 않음)

## Route Group 구조

```
app/
├── layout.tsx                    # 전역 레이아웃 (AuthGuard 없음)
├── page.tsx                      # 홈 페이지 (AuthGuard 없음)
├── admin/
│   └── login/
│       ├── layout.tsx            # 로그인 페이지 레이아웃
│       └── page.tsx              # 로그인 페이지 (public)
└── (admin-protected)/
    └── admin/
        ├── layout.tsx            # 관리자 보호 레이아웃 (세션 쿠키 검증)
        └── page.tsx              # 관리자 대시보드
```

## 보안 고려사항

1. **오너 인증**:
   - 클라이언트 사이드 `AuthGuard` 사용 안 함
   - 서버 사이드 세션 쿠키 검증만 사용
   - UID는 환경 변수로 관리 (배포 시 변경 가능)

2. **일반 사용자 인증**:
   - Firebase Auth 상태 기반
   - 클라이언트 사이드에서 역할 확인
   - `/admin` 경로는 자동 제외

3. **세션 쿠키**:
   - HTTP-only: JavaScript 접근 불가
   - Secure: HTTPS에서만 전송 (프로덕션)
   - SameSite=Lax: CSRF 보호

## 문제 해결

### 무한 로딩/리다이렉트 문제

1. **원인**: `AuthGuard`가 `/admin` 경로에서도 실행되거나, 전역 레이아웃에서 사용됨
2. **해결**: 
   - `/admin` 경로는 Route Group으로 분리
   - `AuthGuard`에서 `/admin` 경로 자동 제외
   - 전역 레이아웃에서 `AuthGuard` 제거

### 세션 쿠키 검증 실패

1. **원인**: 환경 변수 누락 또는 UID 불일치
2. **해결**:
   - `ADMIN_OWNER_UID` 환경 변수 확인
   - Firebase Console에서 실제 UID 확인
   - Vercel 대시보드에서 환경 변수 재설정 후 재배포

## 변경 이력

- 2026-02-04: 오너 인증을 서버 사이드 세션 쿠키 기반으로 통일
- 2026-02-04: `/admin` 경로에서 `AuthGuard` 제거
- 2026-02-04: Route Group 구조로 재배치
