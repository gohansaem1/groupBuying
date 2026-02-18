# Firebase Authorized Domains 설정 가이드

## 개요

Firebase Authentication을 사용하는 애플리케이션은 보안을 위해 **Authorized domains**에 도메인을 등록해야 합니다. 도메인이 등록되지 않으면 다음과 같은 문제가 발생할 수 있습니다:

- `permission-denied` 에러
- `unauthenticated` 에러
- Firebase Auth 로그인 실패
- Firestore 접근 권한 오류

## 설정 방법

### 1. Firebase Console 접속

1. [Firebase Console](https://console.firebase.google.com/)에 접속
2. 프로젝트 선택

### 2. Authentication 설정

1. 왼쪽 메뉴에서 **Authentication** 클릭
2. 상단 탭에서 **Settings** 클릭
3. **Authorized domains** 섹션으로 스크롤

### 3. 도메인 추가

**Authorized domains** 목록에 다음 도메인들을 추가:

#### 로컬 개발 환경
- `localhost` (기본적으로 이미 등록되어 있음)
- `127.0.0.1` (필요한 경우)

#### 프로덕션 환경
- 배포 도메인 (예: `group-buying-nine.vercel.app`)
- 커스텀 도메인 (예: `yourdomain.com`, `www.yourdomain.com`)

#### Vercel 배포 시
- `*.vercel.app` (와일드카드는 지원되지 않으므로 각 도메인을 개별 등록)
- 실제 배포된 도메인 (예: `group-buying-nine.vercel.app`)

### 4. 도메인 추가 절차

1. **Authorized domains** 섹션에서 **Add domain** 버튼 클릭
2. 도메인 입력 (예: `group-buying-nine.vercel.app`)
3. **Add** 클릭
4. 도메인이 목록에 추가됨

## 확인 방법

### 콘솔에서 확인
- Firebase Console > Authentication > Settings > Authorized domains
- 등록된 도메인 목록 확인

### 애플리케이션에서 확인
- 배포된 사이트에서 로그인 시도
- 브라우저 개발자 도구 콘솔에서 에러 확인
- `permission-denied` 또는 `unauthenticated` 에러가 발생하지 않으면 정상

## 문제 해결

### `permission-denied` 에러 발생 시

1. **도메인 등록 확인**
   - Firebase Console에서 현재 도메인이 등록되어 있는지 확인
   - 대소문자 구분 없이 정확히 일치해야 함

2. **Firestore 보안 규칙 확인**
   - Firebase Console > Firestore Database > Rules
   - 인증된 사용자만 접근 가능하도록 설정되어 있는지 확인

3. **환경 변수 확인**
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`이 올바른 값인지 확인
   - Firebase Console > Project Settings > General에서 확인

### `unauthenticated` 에러 발생 시

1. **Authorized domains 확인**
   - 현재 도메인이 목록에 있는지 확인
   - 도메인 앞뒤 공백이 없는지 확인

2. **브라우저 캐시 확인**
   - 브라우저 캐시 및 쿠키 삭제
   - 시크릿 모드에서 테스트

### Vercel 배포 후 문제 발생 시

1. **프로덕션 도메인 등록**
   - Vercel에서 제공하는 도메인을 Authorized domains에 추가
   - 예: `your-project.vercel.app`

2. **환경 변수 확인**
   - Vercel 대시보드에서 `NEXT_PUBLIC_FIREBASE_*` 환경 변수가 설정되어 있는지 확인

3. **재배포**
   - 환경 변수 변경 후 재배포 필요할 수 있음

## 주의사항

- **와일드카드 미지원**: `*.vercel.app` 같은 와일드카드는 사용할 수 없습니다. 각 도메인을 개별 등록해야 합니다.
- **프로토콜 불필요**: `https://` 같은 프로토콜은 포함하지 않습니다. 도메인만 입력합니다.
- **포트 번호**: 로컬 개발 시 포트 번호는 포함하지 않습니다. `localhost`만 등록하면 됩니다.
- **서브도메인**: `www.example.com`과 `example.com`은 별도로 등록해야 합니다.

## 관련 문서

- [Firebase Authentication - Authorized Domains](https://firebase.google.com/docs/auth/web/domain-restriction)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)

## 문의

문제가 지속되면 다음을 확인하세요:
1. Firebase Console > Authentication > Settings > Authorized domains
2. Vercel 대시보드 > Settings > Environment Variables
3. 브라우저 개발자 도구 > Console (에러 메시지 확인)
