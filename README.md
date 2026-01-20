# 제주 공동구매 MVP

Next.js 기반 공동구매 웹앱

## 기술 스택
- Next.js (App Router)
- React
- Tailwind CSS
- Firebase (Auth + Firestore)
- 카카오 로그인

## 시작하기

### 빠른 시작

1. **환경 변수 파일 생성**
   - 프로젝트 루트에 `.env.local` 파일 생성
   - `QUICK_START.md` 또는 `STEP_BY_STEP_SETUP.md` 참고

2. **개발 서버 실행**
   ```bash
   npm install
   npm run dev
   ```

3. **브라우저 접속**
   - http://localhost:3000 접속

### 상세 설정 가이드

- **`STEP_BY_STEP_SETUP.md`**: 차근차근 단계별 설정 가이드 (추천!)
- **`QUICK_START.md`**: 빠른 시작 가이드
- **`ENV_SETUP.md`**: 환경 변수 상세 설명

## 주요 기능

### 사용자 역할
- **user**: 일반 사용자, 상품 주문 가능
- **organizer_pending**: Organizer 신청 대기 중
- **organizer**: Organizer, 그룹 생성 및 관리 가능
- **admin**: 관리자, 모든 기능 접근 가능

### 핵심 비즈니스 규칙
1. 모든 사용자는 카카오 로그인 필수
2. Organizer 역할은 관리자 승인 필요
3. 관리자가 Organizer 모집 ON/OFF 제어 가능
4. 최소 주문 금액: 10,000원
5. 최소 공동구매 건 총액: 40,000원
6. 수동 계좌이체 (결제 게이트웨이 없음)
7. 알림, 쿠폰, 포인트 기능 없음
8. 모바일 우선 UI

### 전체 플로우
1. 관리자가 상품 설정 (정가, 할인율, 판매상태)
2. 사용자가 Organizer 신청 → 관리자 승인
3. Organizer가 공동구매 건 생성 및 링크 공유
4. 사용자가 링크로 접속하여 로그인
5. 사용자가 주문 (최소 10,000원)
6. 공동구매 건 총액이 40,000원 달성
7. Organizer가 확인 완료 처리
8. 관리자가 배송/완료 처리

## Firebase 설정

1. Firebase Console에서 프로젝트 생성
2. Authentication에서 카카오 로그인 활성화 (또는 Custom Token 방식 사용)
3. Firestore 데이터베이스 생성
4. `firestore.rules` 파일을 Firebase Console에 배포

## 카카오 로그인 설정

현재는 개발용으로 Google 로그인을 사용하고 있습니다. 실제 카카오 로그인을 구현하려면:

1. 카카오 개발자 콘솔에서 앱 등록
2. `lib/firebase/kakao.ts`의 구현을 완료
3. `app/api/auth/kakao/route.ts`의 서버 로직 구현
4. Firebase Admin SDK 설정

## 카카오 웹훅 설정

카카오 로그인 사용자의 계정 상태 변경 시 자동으로 알림을 받는 웹훅 기능을 사용할 수 있습니다.

자세한 내용은 `KAKAO_WEBHOOK_SETUP.md` 파일을 참고하세요.

