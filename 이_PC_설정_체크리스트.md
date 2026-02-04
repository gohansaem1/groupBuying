# 이 PC에서 설정하기 체크리스트

새 컴퓨터에서 Cursor를 설치한 뒤 프로젝트를 세팅할 때 따라할 목록입니다.

---

## 1. Cursor 설정

### 1-1. 한국어 언어 팩 설치
1. Cursor에서 **Ctrl + Shift + X** (확장 탭 열기)
2. 검색창에 **Korean** 입력
3. **Korean Language Pack for Visual Studio Code** 설치
4. 설치 후 **다시 로드** 또는 Cursor 재시작 → 메뉴가 한국어로 변경됨

### 1-2. 프로젝트용 확장 (선택)
- **ESLint** – 코드 린트
- **Tailwind CSS IntelliSense** – Tailwind 자동완성
- **Prettier** – 코드 포맷터

---

## 2. 프로젝트 환경 설정

### 2-1. 의존성 설치 (이미 했다면 생략)
```bash
cd c:\code\groupBuying
npm install
```

### 2-2. 환경 변수 파일 만들기
1. 프로젝트 루트에 `.env.local` 파일 생성
2. `env.local.example` 내용을 복사한 뒤, 아래 값들을 **본인 Firebase/카카오 값**으로 채우기

**필수 (Firebase):**
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

**카카오 로그인 사용 시:**
- `NEXT_PUBLIC_KAKAO_JS_KEY`
- `NEXT_PUBLIC_KAKAO_REST_API_KEY`

값 가져오는 방법: `QUICK_START.md` 또는 `STEP_BY_STEP_SETUP.md` 참고.

---

## 3. 실행 확인

```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속해서 화면이 뜨면 설정 완료입니다.

---

## 4. 문제 발생 시

### Turbopack 패닉 / "시스템 리소스가 부족" (os error 1450)
Turbopack이 메모리 부족으로 죽으면 `npm run dev`가 웹팩으로 실행되도록 이미 설정해 두었습니다. 그래도 같은 오류가 나면:
- 다른 프로그램(브라우저 탭, Cursor 등)을 줄여서 메모리 여유를 두거나
- PC 재부팅 후 `npm run dev` 다시 실행해 보세요.

### "스크립트를 실행할 수 없습니다" (PowerShell 실행 정책 오류)
PowerShell에서 `npm run dev` 시 스크립트 실행이 막히면, **cmd**로 실행하세요.

- **방법 1** – 터미널에서: `cmd /c "cd /d c:\code\groupBuying && npm run dev"`
- **방법 2** – Cursor에서 터미널 종류 변경: 터미널 우측 **▼** → **Command Prompt** 선택 후 `npm run dev`

실행 정책을 바꿀 수 있다면 (관리자/그룹 정책 제한 없을 때):  
PowerShell(관리자)에서 `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

### 기타
- **Node 버전**: Node 18 이상 권장 (`node -v`로 확인)
- **상세 설정**: `STEP_BY_STEP_SETUP.md`
- **환경 변수 설명**: `ENV_SETUP.md`
