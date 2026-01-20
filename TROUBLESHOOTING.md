# 문제 해결 가이드

## 자주 발생하는 문제와 해결 방법

### 1. Next.js Turbopack 오류

**오류 메시지:**
```
ERROR: This build is using Turbopack, with a `webpack` config and no `turbopack` config.
```

**해결 방법:**
- `next.config.js`에서 `webpack` 설정 제거
- `turbopack: {}` 추가 (이미 수정됨)

**또는 명시적으로 webpack 사용:**
```bash
npm run dev -- --webpack
```

### 2. 카카오 SDK 로드 타임아웃

**원인:**
- 환경 변수 `NEXT_PUBLIC_KAKAO_JS_KEY`가 설정되지 않음
- 카카오 SDK 스크립트가 로드되지 않음

**해결 방법:**
1. `.env.local` 파일에 `NEXT_PUBLIC_KAKAO_JS_KEY` 추가
2. 개발 서버 재시작
3. 브라우저 새로고침

**개발 중에는:**
- 카카오 SDK 없이도 Google 로그인으로 테스트 가능
- SDK 로드 오류는 무시하고 진행 가능

### 3. React 경고 (setState in render)

**오류 메시지:**
```
Warning: Cannot update a component while rendering a different component
```

**해결 방법:**
- `router.push()` 호출을 `useEffect` 안으로 이동 (이미 수정됨)

### 4. 포트가 이미 사용 중

**오류 메시지:**
```
Port 3000 is in use, trying 3001 instead.
```

**해결 방법:**
- 다른 포트 사용 (자동으로 3001 사용)
- 또는 포트 3000을 사용하는 프로세스 종료

### 5. 환경 변수가 적용되지 않음

**해결 방법:**
1. `.env.local` 파일이 프로젝트 루트에 있는지 확인
2. 변수명 앞에 `NEXT_PUBLIC_` 접두사 확인
3. 개발 서버 재시작 (`Ctrl+C` 후 `npm run dev`)

### 6. Firebase 연결 오류

**해결 방법:**
1. Firebase Console에서 프로젝트 확인
2. `.env.local`의 Firebase 설정 값 확인
3. Firestore 데이터베이스가 생성되었는지 확인

### 7. TypeScript 오류

**해결 방법:**
- `tsconfig.json`이 자동으로 업데이트됨 (Next.js 16)
- 개발 서버 재시작

---

## 개발 서버 재시작 방법

```bash
# 1. 현재 실행 중인 서버 중지
Ctrl + C

# 2. 다시 시작
npm run dev
```

---

## 체크리스트

문제가 발생하면 다음을 확인하세요:

- [ ] `.env.local` 파일이 프로젝트 루트에 있음
- [ ] 환경 변수 값이 올바르게 입력됨
- [ ] 개발 서버가 재시작됨
- [ ] 브라우저 캐시 삭제 (Ctrl+Shift+R)
- [ ] Node.js 버전 확인 (`node --version`)
- [ ] 패키지 설치 완료 (`npm install`)

