# 📦 프로젝트 전체 요약

## 프로젝트 개요

**제주 공동구매 MVP** - Next.js 기반 공동구매 웹앱

### 기술 스택
- **프레임워크**: Next.js 14 (App Router)
- **UI**: React 18, Tailwind CSS
- **백엔드**: Firebase (Auth + Firestore)
- **인증**: 카카오 로그인
- **언어**: TypeScript

---

## 프로젝트 구조

```
groupBuying/
├── app/                          # Next.js 앱 라우터
│   ├── admin/                   # 관리자 페이지
│   │   └── page.tsx            # 관리자 대시보드
│   ├── api/                     # API 라우트
│   │   ├── auth/kakao/         # 카카오 로그인 API
│   │   └── webhooks/kakao/     # 카카오 웹훅 API
│   ├── groups/[id]/            # 그룹 상세 페이지
│   ├── login/                   # 로그인 페이지
│   ├── organizer/              # Organizer 페이지
│   │   ├── apply/              # Organizer 신청
│   │   └── page.tsx            # Organizer 대시보드
│   ├── products/               # 상품 목록 페이지
│   ├── layout.tsx              # 루트 레이아웃
│   ├── page.tsx                # 홈 페이지 (리다이렉트)
│   └── globals.css             # 전역 스타일
│
├── components/                   # 공통 컴포넌트
│   └── AuthGuard.tsx           # 인증 가드
│
├── lib/                         # 라이브러리
│   ├── firebase/               # Firebase 관련
│   │   ├── config.ts          # Firebase 설정
│   │   ├── auth.ts            # 인증 함수
│   │   ├── kakao.ts           # 카카오 로그인
│   │   ├── products.ts        # 상품 관리
│   │   ├── groups.ts          # 그룹 관리
│   │   └── admin.ts           # 관리자 기능
│   └── webhooks/              # 웹훅 처리
│       ├── kakao-verify.ts    # 웹훅 검증
│       └── kakao-handler.ts   # 웹훅 처리
│
├── firestore.rules             # Firestore 보안 규칙
├── .env.local                  # 환경 변수 (생성 필요)
└── package.json               # 프로젝트 설정
```

---

## 주요 기능

### 사용자 역할
- **user**: 일반 사용자, 상품 주문 가능
- **organizer_pending**: Organizer 신청 대기 중
- **organizer**: Organizer, 공동구매 건 생성 및 관리 가능
- **admin**: 관리자, 모든 기능 접근 가능

### 핵심 기능

1. **인증 시스템**
   - 카카오 로그인
   - 역할 기반 접근 제어
   - 웹훅을 통한 계정 상태 동기화

2. **상품 관리** (관리자)
   - 상품 추가/수정/삭제
   - 정가, 할인율 설정
   - 판매 상태 관리

3. **공동구매 건 관리** (Organizer)
   - 공동구매 건 생성
   - 링크 복사 및 공유
   - 공동구매 건 상태 관리
   - 주문 확인

4. **주문 시스템** (사용자)
   - 상품 주문 (최소 10,000원)
   - 그룹 달성 추적 (최소 40,000원)
   - 주문 상태 확인

5. **관리자 기능**
   - 사용자 역할 관리
   - Organizer 승인
   - Organizer 모집 ON/OFF
   - 배송/완료 처리

---

## 환경 변수 요약

### 필수 환경 변수

#### Firebase 클라이언트 (6개)
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

#### Firebase Admin SDK (3개)
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

#### 카카오 설정 (2개)
- `NEXT_PUBLIC_KAKAO_JS_KEY`
- `NEXT_PUBLIC_KAKAO_REST_API_KEY`

**총 11개 환경 변수 필요**

---

## 설정 파일 요약

### 문서 파일
- **`STEP_BY_STEP_SETUP.md`**: 단계별 설정 가이드 (가장 중요!)
- **`QUICK_START.md`**: 빠른 시작 가이드
- **`ENV_SETUP.md`**: 환경 변수 상세 설명
- **`FIREBASE_SETUP.md`**: Firebase 설정 가이드
- **`KAKAO_WEBHOOK_SETUP.md`**: 카카오 웹훅 설정 가이드
- **`SETUP_CHECKLIST.md`**: 전체 체크리스트

### 설정 파일
- **`firestore.rules`**: Firestore 보안 규칙
- **`env.local.example`**: 환경 변수 예시
- **`.env.local`**: 실제 환경 변수 (생성 필요)

---

## 주요 페이지

### 사용자 페이지
- `/login` - 로그인 페이지
- `/products` - 상품 목록
- `/groups/[id]` - 그룹 상세 및 주문

### Organizer 페이지
- `/organizer` - Organizer 대시보드
- `/organizer/apply` - Organizer 신청

### 관리자 페이지
- `/admin` - 관리자 대시보드
  - 상품 관리 탭
  - 공동구매 건 관리 탭
  - 사용자 관리 탭
  - 설정 탭

---

## API 엔드포인트

### 인증
- `POST /api/auth/kakao` - 카카오 로그인 처리

### 웹훅
- `POST /api/webhooks/kakao` - 카카오 웹훅 수신
- `GET /api/webhooks/kakao` - 웹훅 엔드포인트 정보

---

## 데이터베이스 구조

### Firestore 컬렉션

1. **users** - 사용자 정보
   - uid, email, displayName, photoURL
   - role (user/organizer_pending/organizer/admin)
   - accountStatus (웹훅 관련)

2. **products** - 상품 정보
   - name, description
   - listPrice (정가)
   - discountRate (할인율)
   - saleStatus (판매중/판매중지)

3. **groups** - 그룹 정보
   - organizerId, productId
   - minimumTotal (40,000원)
   - currentTotal (현재 총액)
   - status (진행중/달성/확인완료/배송중/완료)

4. **orders** - 주문 정보
   - groupId, userId
   - quantity, unitPrice, totalPrice
   - status (주문완료/확인완료/배송중/완료)

5. **adminSettings** - 관리자 설정
   - organizerRecruitmentEnabled

6. **organizerCommissions** - Organizer 수수료율
   - organizerId, commissionRate

---

## 비즈니스 규칙

1. ✅ 모든 사용자는 카카오 로그인 필수
2. ✅ Organizer 역할은 관리자 승인 필요
3. ✅ 관리자가 Organizer 모집 ON/OFF 제어 가능
4. ✅ 최소 주문 금액: 10,000원
5. ✅ 최소 그룹 총액: 40,000원
6. ✅ 수동 계좌이체 (결제 게이트웨이 없음)
7. ✅ 알림, 쿠폰, 포인트 기능 없음
8. ✅ 모바일 우선 UI

---

## 전체 플로우

```
1. 관리자가 상품 설정
   ↓
2. 사용자가 Organizer 신청
   ↓
3. 관리자가 Organizer 승인
   ↓
4. Organizer가 공동구매 건 생성 및 링크 공유
   ↓
5. 사용자가 링크로 접속하여 로그인
   ↓
6. 사용자가 주문 (최소 10,000원)
   ↓
7. 공동구매 건 총액이 40,000원 달성
   ↓
8. Organizer가 확인 완료 처리
   ↓
9. 관리자가 배송/완료 처리
```

---

## 다음 단계

1. **설정 완료**
   - `STEP_BY_STEP_SETUP.md` 따라하기
   - 환경 변수 입력
   - Firebase 설정
   - 카카오 설정

2. **테스트**
   - 로그인 테스트
   - 상품 추가 테스트
   - 그룹 생성 테스트
   - 주문 테스트

3. **프로덕션 배포**
   - Vercel 또는 Firebase Hosting
   - 환경 변수 설정
   - 도메인 연결

---

## 문제 해결

### 자주 발생하는 문제

1. **환경 변수 오류**
   - `.env.local` 파일 확인
   - 값에 따옴표, 공백 확인
   - 개발 서버 재시작

2. **Firebase 연결 오류**
   - Firebase 프로젝트 확인
   - 환경 변수 값 확인
   - Firestore 규칙 확인

3. **카카오 로그인 오류**
   - 카카오 개발자 콘솔 설정 확인
   - Redirect URI 확인
   - JavaScript 키 확인

---

## 참고 자료

- [Next.js 문서](https://nextjs.org/docs)
- [Firebase 문서](https://firebase.google.com/docs)
- [카카오 개발자 문서](https://developers.kakao.com/docs)

