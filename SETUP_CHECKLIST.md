# 설정 체크리스트

## Firebase 설정

- [ ] Firebase Console에서 프로젝트 생성
- [ ] 웹 앱 추가 및 SDK 설정 정보 복사
- [ ] `.env.local` 파일 생성 및 Firebase 설정 추가
- [ ] Firestore 데이터베이스 생성 (프로덕션 모드)
- [ ] Firestore 보안 규칙 배포 (`firestore.rules` 내용 복사)
- [ ] Firebase Admin SDK 서비스 계정 키 생성 및 `.env.local`에 추가

## 카카오 로그인 설정

- [ ] 카카오 개발자 콘솔에서 앱 등록
- [ ] JavaScript 키 복사 및 `.env.local`에 `NEXT_PUBLIC_KAKAO_JS_KEY` 추가
- [ ] 카카오 로그인 활성화
- [ ] Redirect URI 등록:
  - 개발: `http://localhost:3000`
  - 프로덕션: `https://your-domain.com`
- [ ] 동의항목 설정 (닉네임, 프로필 사진 필수)

## 초기 데이터 설정

- [ ] 첫 관리자 계정 생성 (Firestore `users` 컬렉션에 `role: "admin"` 설정)
- [ ] 테스트 상품 추가 (관리자 페이지에서)
- [ ] Organizer 모집 설정 (관리자 페이지 → 설정 탭)

## 테스트

- [ ] 개발 서버 실행: `npm run dev`
- [ ] 카카오 로그인 테스트
- [ ] 관리자 페이지 접근 테스트
- [ ] 상품 생성 테스트
- [ ] Organizer 신청 테스트
- [ ] 그룹 생성 테스트
- [ ] 주문 테스트

## 배포 준비

- [ ] 프로덕션 환경 변수 설정
- [ ] Firebase Hosting 또는 Vercel 배포
- [ ] 카카오 Redirect URI 프로덕션 도메인 추가
- [ ] Firestore 보안 규칙 최종 확인

