# 제주 공동구매 플랫폼 기획 문서

## 📋 프로젝트 개요

### 프로젝트명
**제주 공동구매 플랫폼 (Jeju Group Buying Platform)**

### 프로젝트 목적
제주 지역 주민들을 위한 공동구매 플랫폼으로, 진행자(Organizer)가 공동구매 건을 생성하고 참여자들이 함께 모여 더 저렴한 가격으로 상품을 구매할 수 있도록 지원합니다.

### 핵심 가치
- **합리적인 가격**: 많은 사람이 함께 모여 더 저렴하게 구매
- **간편한 참여**: 진행자가 공유한 링크로 쉽게 참여
- **진행자 지원**: 공동구매를 주도하는 진행자를 위한 다양한 기능 제공

---

## 🎯 주요 기능

### 1. 사용자 인증 및 관리

#### 1.1 카카오 로그인
- 카카오 계정으로 간편 로그인
- 자동 회원가입 (최초 로그인 시)
- 닉네임 설정 (최초 로그인 후 필수)
- 사용자 약관 동의

#### 1.2 사용자 역할 (Role)
| 역할 | 설명 | 권한 |
|------|------|------|
| **user** | 일반 사용자 | 상품 조회, 주문 생성/수정/삭제, 내 공동구매 조회 |
| **organizer_pending** | Organizer 신청 대기 중 | 일반 사용자 권한 + 신청 취소 가능 |
| **organizer** | 진행자 | 일반 사용자 권한 + 공동구매 건 생성/관리, 주문 확인 |
| **admin** | 관리자 | 모든 기능 접근 가능 (공동구매 건 생성 불가) |
| **owner** | 최고 관리자 | 모든 기능 접근 가능 + Organizer를 Admin으로 승격 가능 |

#### 1.3 Organizer 신청 프로세스
1. 관리자가 Organizer 모집 ON/OFF 제어
2. 일반 사용자가 Organizer 신청 (약관 동의 필요)
3. 관리자 승인 대기 (`organizer_pending` 상태)
4. 관리자 승인 후 `organizer` 역할 부여
5. 신청 취소 가능 (승인 전까지)

---

### 2. 상품 관리

#### 2.1 상품 정보
- **상품명**: 상품 이름
- **설명**: 상품 설명
- **정가**: 원래 가격
- **할인율**: 할인 비율 (%)
- **실제 판매가격**: 정가 × (1 - 할인율)
- **용량 정보**: 예) "500ml", "1kg"
- **대표 이미지**: 상품 대표 이미지 URL
- **상세 이미지**: 상세보기 이미지 URL 배열
- **상세 설명**: 상세보기 설명 (텍스트)
- **판매 상태**: 판매중 / 판매중지

#### 2.2 상품 관리 기능 (관리자 전용)
- 상품 생성
- 상품 수정 (정가, 할인율, 판매상태 등)
- 상품 삭제 (활성 공동구매 건에 포함된 상품은 삭제 불가)
- 상품 목록 조회 (일반 사용자는 판매중인 상품만 조회)

---

### 3. 공동구매 건 관리

#### 3.1 공동구매 건 구조
- **제목**: 공동구매 건 제목 (구분용)
- **진행자 정보**: Organizer ID, 이름
- **메뉴판**: 여러 상품을 메뉴로 구성 (GroupMenuItem[])
  - 각 메뉴 아이템: 상품 ID, 이름, 가격, 할인율, 설명, 이미지 등
- **최소 총액**: 공동구매 건 최소 달성 금액 (기본: 40,000원)
- **현재 총액**: 현재까지 주문된 총액
- **상태**: 진행중 / 달성 / 확정 / 배송중 / 완료
- **대표 이미지**: 공동구매 건 대표 이미지 URL
- **날짜 정보**: 시작일, 종료일 (주문 마감일)
- **수령 방법**: 직접 수령 / 배송 / 픽업
- **수령 장소**: 수령 장소 (선택사항)
- **배송 정보**: 배송지 주소, 상세주소, 우편번호, 공동출입문 비밀번호, 수령인 이름, 전화번호
- **배송 세부 상태**: 입금안내 / 입금확인 / 생산입력 / 배송입력 / 배송완료

#### 3.2 공동구매 건 생성 (Organizer 전용)
1. 상품 목록에서 여러 상품 선택 (메뉴판 구성)
2. 공동구매 건 제목 입력
3. 대표 이미지 업로드 (선택사항)
4. 시작일/종료일 설정
5. 수령 방법 선택 및 상세 정보 입력
6. 배송 정보 입력 (배송 선택 시)
7. 공동구매 건 생성 및 링크 공유

#### 3.3 공동구매 건 상태 관리

**상태 전환 플로우:**
```
진행중 → 달성 (자동: currentTotal >= minimumTotal)
  ↓
달성 → 확정 (Organizer: 확인 완료 처리)
  ↓
확정 → 배송중 (Admin: 배송 시작 처리)
  ↓
배송중 → 완료 (Admin: 배송 완료 처리)
```

**역할별 권한:**
- **일반 사용자**: 주문 생성/수정/삭제 (주문완료 상태만)
- **Organizer**: 
  - 자신이 생성한 공동구매 건 조회/관리
  - 상태 변경: 달성 ↔ 확정 (확정 취소 가능)
  - 주문 확인/관리
- **Admin**: 
  - 모든 공동구매 건 조회/관리
  - 상태 변경: 확정 → 배송중 → 완료
  - 배송 세부 상태 관리
  - 공동구매 건 삭제 (확정/배송중/완료 상태는 삭제 불가)

#### 3.4 공동구매 건 조회
- **일반 사용자**: 링크로 접속하여 공동구매 건 상세 조회
- **Organizer**: 자신이 생성한 공동구매 건 목록 조회
- **Admin**: 모든 공동구매 건 목록 조회 (필터링, 정렬, 페이지네이션)

---

### 4. 주문 관리

#### 4.1 주문 정보
- **주문 ID**: 고유 식별자
- **공동구매 건 ID**: 속한 공동구매 건
- **사용자 정보**: 사용자 ID, 이름
- **상품 정보**: 상품 ID, 이름
- **주문 수량**: 주문한 수량
- **단가**: 상품 단가
- **총액**: 수량 × 단가
- **상태**: 주문완료 / 확정 / 배송중 / 완료
- **생성일/수정일**: 타임스탬프

#### 4.2 주문 생성 (일반 사용자)
- **최소 주문 금액**: 10,000원 (주문당)
- **주문 가능 상태**: 공동구매 건이 "진행중" 또는 "달성" 상태일 때만 주문 가능
- **주문 프로세스**:
  1. 공동구매 건 상세 페이지에서 상품 선택
  2. 수량 입력
  3. 주문 생성 (최소 금액 체크)
  4. 공동구매 건의 `currentTotal` 자동 업데이트
  5. 상태가 "진행중"이고 `currentTotal >= minimumTotal`이면 자동으로 "달성" 상태로 변경

#### 4.3 주문 수정/삭제
- **수정 가능 조건**: 
  - 자신의 주문
  - 상태가 "주문완료"인 경우만
  - 공동구매 건이 "진행중" 또는 "달성" 상태일 때만
- **삭제 가능 조건**: 
  - 자신의 주문
  - 상태가 "주문완료"인 경우만
  - 공동구매 건이 "진행중" 또는 "달성" 상태일 때만
- **수정/삭제 시**: 공동구매 건의 `currentTotal` 자동 업데이트

#### 4.4 주문 조회
- **일반 사용자**: 자신의 주문만 조회 (`/my-groups`)
- **Organizer**: 자신이 생성한 공동구매 건의 모든 주문 조회 (`/organizer/orders`)
- **Admin**: 모든 주문 조회 (`/admin`)

---

### 5. 수수료 관리

#### 5.1 수수료 구조
- **기본 수수료율**: 관리자가 설정하는 기본 수수료율 (기본값: 10%)
- **개별 수수료율**: 진행자별로 별도 설정 가능한 수수료율
- **우선순위**: 개별 수수료율이 설정된 경우 기본 수수료율보다 우선 적용

#### 5.2 수수료 관리 기능 (관리자 전용)
- 기본 수수료율 조회/설정
- 진행자별 개별 수수료율 조회/설정/삭제
- 진행자 목록에서 수수료율 표시 및 관리

---

### 6. 사용자 관리 (관리자 전용)

#### 6.1 사용자 조회
- 모든 사용자 목록 조회
- 역할별 필터링
- Organizer 신청 대기 중인 사용자 조회

#### 6.2 사용자 역할 관리
- Organizer 신청 승인/거부
- 사용자 역할 변경 (user ↔ organizer ↔ admin)
- Organizer를 Admin으로 승격 (Owner만 가능)

#### 6.3 Organizer 모집 관리
- Organizer 모집 ON/OFF 제어
- 모집이 ON일 때만 일반 사용자가 신청 가능

---

### 7. 배송 관리 (관리자 전용)

#### 7.1 배송 세부 상태 관리
- **입금안내**: 입금 안내 상태
- **입금확인**: 입금 확인 완료
- **생산입력**: 생산 정보 입력
- **배송입력**: 배송 정보 입력
- **배송완료**: 배송 완료

#### 7.2 배송 정보 관리
- 배송지 주소, 상세주소, 우편번호
- 공동출입문 비밀번호 (빌라/아파트용)
- 수령인 이름, 전화번호
- 배송 시작 시점 기록 (`shippingStartedAt`)

---

### 8. 알림 시스템

#### 8.1 알림 유형
- 상품 정보 변경 알림
- 공동구매 건 상태 변경 알림

#### 8.2 알림 관리
- 사용자는 자신의 알림만 조회 가능
- 읽음 처리 가능
- 최근 20개 알림 조회

---

## 🔒 보안 및 권한 관리

### Firestore 보안 규칙

#### 사용자 데이터
- 읽기: 자신의 데이터 또는 관리자
- 생성: 자신의 데이터만 생성 가능
- 수정: 자신의 데이터 또는 관리자
- 목록 조회: 관리자만 모든 사용자 조회 가능

#### 상품 데이터
- 읽기: 모든 로그인 사용자
- 생성/수정/삭제: 관리자만

#### 공동구매 건 데이터
- 읽기: 모든 로그인 사용자
- 생성: Organizer만
- 수정: 
  - Organizer: 자신이 생성한 건의 일부 필드만 수정 가능 (currentTotal, status 등)
  - 일반 사용자: 주문 생성 시 currentTotal 업데이트만 가능
  - Admin: 모든 필드 수정 가능
- 삭제: 관리자만 (확정/배송중/완료 상태는 삭제 불가)

#### 주문 데이터
- 읽기: 자신의 주문 또는 Organizer(자신의 그룹) 또는 Admin
- 생성: 모든 로그인 사용자
- 수정: 
  - 사용자: 자신의 주문완료 상태 주문만 수정 가능
  - Organizer: 자신의 그룹 주문 수정 가능
  - Admin: 모든 주문 수정 가능
- 삭제: 사용자(자신의 주문완료 상태) 또는 Organizer(자신의 그룹) 또는 Admin

---

## 💰 비즈니스 규칙

### 핵심 규칙
1. **최소 주문 금액**: 10,000원 (주문당)
2. **최소 공동구매 건 총액**: 40,000원
3. **결제 방식**: 수동 계좌이체 (결제 게이트웨이 없음)
4. **Organizer 역할**: 관리자 승인 필요
5. **카카오 로그인 필수**: 모든 사용자는 카카오 로그인 필수
6. **모바일 우선 UI**: 모바일 환경을 우선 고려한 반응형 디자인

### 제한 사항
- 알림 기능: 기본 알림만 제공 (푸시 알림 없음)
- 쿠폰 기능: 없음
- 포인트 기능: 없음
- 결제 게이트웨이: 없음 (수동 계좌이체만)

---

## 📱 주요 페이지 구조

### 공통 페이지
- **`/`**: 홈 페이지 (로그인 전/후 모두 접근 가능)
- **`/login`**: 로그인 페이지 (카카오 로그인, 테스트 로그인)
- **`/profile`**: 프로필 페이지 (닉네임 수정, 약관 동의)
- **`/setup-nickname`**: 닉네임 설정 페이지 (최초 로그인 시)

### 일반 사용자 페이지
- **`/products`**: 상품 목록 페이지 (판매중인 상품만 표시)
- **`/groups/[id]`**: 공동구매 건 상세 페이지 (주문 생성/수정/삭제)
- **`/my-groups`**: 내 공동구매 페이지 (내가 참여한 공동구매 건 목록)

### Organizer 페이지
- **`/organizer`**: Organizer 대시보드 (공동구매 건 생성/관리)
- **`/organizer/groups`**: 내 공동구매 건 목록
- **`/organizer/groups/[id]`**: 공동구매 건 상세 관리 페이지
- **`/organizer/orders`**: 주문 관리 페이지
- **`/organizer/my-orders`**: 내 주문 페이지
- **`/organizer/apply`**: Organizer 신청 페이지

### 관리자 페이지
- **`/admin`**: 관리자 대시보드
  - **상품 관리 탭**: 상품 CRUD
  - **공동구매 건 관리 탭**: 모든 공동구매 건 조회/관리
  - **사용자 관리 탭**: 사용자 조회/역할 변경, Organizer 승인
  - **설정 탭**: Organizer 모집 ON/OFF, 기본 수수료율 설정
  - **배송 관리 탭**: 배송 세부 상태 관리, 엑셀 다운로드

---

## 🛠 기술 스택

### 프론트엔드
- **Next.js 16.1.4**: React 프레임워크 (App Router)
- **React 18.2.0**: UI 라이브러리
- **TypeScript 5**: 타입 안정성
- **Tailwind CSS 3.3.0**: 스타일링
- **카카오 JavaScript SDK v1.43.6**: 카카오 로그인

### 백엔드
- **Firebase Authentication**: 사용자 인증
- **Firebase Firestore**: 데이터베이스
- **Firebase Admin SDK**: 서버 사이드 관리 기능
- **Next.js API Routes**: 서버 사이드 API 엔드포인트

### 배포 및 인프라
- **Vercel**: 배포 플랫폼
- **Firebase Console**: Firebase 프로젝트 관리
- **카카오 개발자 콘솔**: 카카오 로그인 설정

### 개발 도구
- **Webpack**: 번들러 (Turbopack 대신 사용)
- **ESLint**: 코드 린팅
- **PostCSS**: CSS 처리
- **XLSX**: 엑셀 파일 생성/읽기

---

## 📊 데이터 모델

### Users Collection
```typescript
{
  uid: string                    // Firebase Auth UID
  email?: string                 // 이메일 (카카오에서 제공 시)
  displayName?: string           // 표시 이름
  nickname: string               // 닉네임 (필수)
  role: 'user' | 'organizer_pending' | 'organizer' | 'admin' | 'owner'
  userAgreedToTerms?: boolean    // 사용자 약관 동의 여부
  organizerAgreedToTerms?: boolean // Organizer 약관 동의 여부
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Products Collection
```typescript
{
  id: string
  name: string                   // 상품명
  description: string            // 설명
  listPrice: number             // 정가
  discountRate: number          // 할인율 (%)
  saleStatus: '판매중' | '판매중지'
  capacity?: string              // 용량 정보
  imageUrl?: string             // 대표 이미지 URL
  detailImages?: string[]       // 상세 이미지 URL 배열
  detailDescription?: string    // 상세 설명
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Groups Collection
```typescript
{
  id: string
  title: string                  // 공동구매 건 제목
  organizerId: string           // 진행자 ID
  organizerName: string         // 진행자 이름
  menuItems: GroupMenuItem[]     // 메뉴판 (여러 상품)
  minimumTotal: number          // 최소 총액 (40,000원)
  currentTotal: number          // 현재 총액
  status: '진행중' | '달성' | '확정' | '배송중' | '완료'
  imageUrl?: string             // 대표 이미지 URL
  startDate?: Timestamp         // 시작일
  endDate?: Timestamp           // 종료일 (주문 마감일)
  deliveryMethod?: string       // 수령방법
  deliveryDescription?: string // 수령방법 상세 설명
  deliveryLocation?: string     // 수령 장소
  deliveryAddress?: string     // 배송지 주소
  deliveryAddressDetail?: string // 배송지 상세주소
  deliveryPostcode?: string     // 우편번호
  deliveryBuildingPassword?: string // 공동출입문 비밀번호
  deliveryName?: string         // 수령인 이름
  deliveryPhone?: string        // 수령인 전화번호
  deliveryDetailStatus?: '입금안내' | '입금확인' | '생산입력' | '배송입력' | '배송완료'
  shippingStartedAt?: Timestamp // 배송 시작 시점
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Orders Collection
```typescript
{
  id: string
  groupId: string               // 공동구매 건 ID
  userId: string                // 사용자 ID
  userName: string              // 사용자 이름
  productId: string             // 상품 ID
  productName: string           // 상품 이름
  quantity: number              // 수량
  unitPrice: number             // 단가
  totalPrice: number            // 총액 (quantity × unitPrice)
  status: '주문완료' | '확정' | '배송중' | '완료'
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### AdminSettings Collection
```typescript
{
  organizerRecruitmentEnabled: boolean  // Organizer 모집 ON/OFF
  defaultCommissionRate?: number        // 기본 수수료율 (%)
  updatedAt: Timestamp
}
```

### OrganizerCommissions Collection
```typescript
{
  organizerId: string           // 진행자 ID
  rate: number                  // 수수료율 (%)
}
```

---

## 🔄 주요 플로우

### 1. 사용자 가입 및 로그인 플로우
```
1. 사용자가 카카오 로그인 클릭
2. 카카오 로그인 팝업에서 로그인 완료
3. 서버에서 Firebase Custom Token 생성
4. Firebase Authentication으로 로그인
5. 사용자 프로필 생성/업데이트
6. 닉네임이 없으면 닉네임 설정 페이지로 리다이렉트
7. 약관 동의 확인 (필요 시)
8. 홈 페이지로 이동
```

### 2. Organizer 신청 플로우
```
1. 관리자가 Organizer 모집 ON 설정
2. 일반 사용자가 Organizer 신청 페이지 접속
3. Organizer 약관 동의
4. 신청 완료 (role: 'organizer_pending')
5. 관리자가 신청 승인
6. role이 'organizer'로 변경
7. Organizer 기능 사용 가능
```

### 3. 공동구매 건 생성 플로우
```
1. Organizer가 Organizer 페이지 접속
2. 상품 목록에서 여러 상품 선택 (메뉴판 구성)
3. 공동구매 건 정보 입력 (제목, 날짜, 수령 방법 등)
4. 공동구매 건 생성
5. 생성된 공동구매 건 링크 공유
```

### 4. 주문 생성 플로우
```
1. 사용자가 공동구매 건 링크로 접속
2. 로그인 (필요 시)
3. 상품 선택 및 수량 입력
4. 주문 생성 (최소 10,000원 체크)
5. 공동구매 건의 currentTotal 업데이트
6. currentTotal >= minimumTotal이면 상태를 "달성"으로 변경
```

### 5. 공동구매 건 완료 플로우
```
1. 공동구매 건 상태: "달성"
2. Organizer가 확인 완료 처리 → 상태: "확정"
3. Admin이 배송 시작 처리 → 상태: "배송중"
4. Admin이 배송 완료 처리 → 상태: "완료"
```

---

## 🎨 UI/UX 특징

### 디자인 원칙
- **모바일 우선**: 모바일 환경을 우선 고려한 반응형 디자인
- **간결한 UI**: 불필요한 요소 제거, 핵심 기능에 집중
- **명확한 상태 표시**: 공동구매 건 상태, 주문 상태 등을 명확하게 표시
- **직관적인 네비게이션**: 역할별로 필요한 기능에 쉽게 접근 가능

### 주요 컴포넌트
- **NavigationHeader**: 상단 네비게이션 바 (로그인 상태, 역할별 메뉴)
- **AuthGuard**: 인증 및 권한 체크 컴포넌트
- **TermsAgreementModal**: 약관 동의 모달
- **OrganizerTermsAgreementModal**: Organizer 약관 동의 모달
- **ProfileModal**: 프로필 수정 모달
- **ImageUpload**: 이미지 업로드 컴포넌트

---

## 📈 향후 개선 사항

### 단기 개선 사항
- [ ] 푸시 알림 기능 추가
- [ ] 결제 게이트웨이 연동 (PG사 연동)
- [ ] 주문 취소/환불 기능
- [ ] 리뷰/평가 기능

### 중기 개선 사항
- [ ] 쿠폰 시스템
- [ ] 포인트 시스템
- [ ] 추천 상품 기능
- [ ] 검색 기능 강화

### 장기 개선 사항
- [ ] 모바일 앱 개발 (React Native)
- [ ] AI 기반 상품 추천
- [ ] 소셜 기능 강화 (공유, 좋아요 등)
- [ ] 다국어 지원

---

## 📝 참고 문서

- **`README.md`**: 프로젝트 기본 정보
- **`STEP_BY_STEP_SETUP.md`**: 단계별 설정 가이드
- **`QUICK_START.md`**: 빠른 시작 가이드
- **`ENV_SETUP.md`**: 환경 변수 설정 가이드
- **`FIREBASE_SETUP.md`**: Firebase 설정 가이드
- **`KAKAO_PLATFORM_SETUP.md`**: 카카오 플랫폼 설정 가이드
- **`VERCEL_배포_가이드.md`**: Vercel 배포 가이드

---

## 📞 문의 및 지원

프로젝트 관련 문의사항이나 버그 리포트는 GitHub Issues를 통해 제출해주세요.

---

**문서 작성일**: 2026년 2월 4일  
**최종 업데이트**: 2026년 2월 4일  
**버전**: 1.0.0
