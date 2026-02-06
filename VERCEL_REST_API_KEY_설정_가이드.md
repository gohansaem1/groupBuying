# Vercel REST API 키 설정 가이드

## 문제

에러 메시지: "REST API 키가 잘못되었습니다. 환경 변수를 확인하세요."

이 에러는 Vercel 환경 변수에 REST API 키가 설정되지 않았거나 잘못되었을 때 발생합니다.

---

## 해결 방법

### 1. 카카오 개발자 콘솔에서 REST API 키 확인

1. [카카오 개발자 콘솔](https://developers.kakao.com/) 접속
2. **내 애플리케이션** → 앱 선택
3. **앱 설정** → **일반** 탭
4. **앱 키** 섹션에서 **REST API 키** 확인
   - 예: `5bdf04b7ab4847db2e230b2a37fbc0e2`

⚠️ **중요**: JavaScript 키와 REST API 키는 **다릅니다**!
- JavaScript 키: `f168b7e3d360eca1f86c3ff0d80e30a3` (클라이언트용)
- REST API 키: `5bdf04b7ab4847db2e230b2a37fbc0e2` (서버용, 토큰 교환에 필요)

---

### 2. Vercel 환경 변수 설정

1. **Vercel 대시보드** 접속
   - https://vercel.com/dashboard
2. 프로젝트 선택 (`group-buying-nine`)
3. **Settings** 탭 클릭
4. **Environment Variables** 섹션으로 이동
5. 다음 환경 변수 확인/추가:

#### 필수 환경 변수

**`NEXT_PUBLIC_KAKAO_REST_API_KEY`**
- Key: `NEXT_PUBLIC_KAKAO_REST_API_KEY`
- Value: 카카오 개발자 콘솔에서 복사한 **REST API 키**
- Environment: Production, Preview, Development 모두 선택
- 예: `5bdf04b7ab4847db2e230b2a37fbc0e2`

**`NEXT_PUBLIC_KAKAO_JS_KEY`** (이미 있을 수 있음)
- Key: `NEXT_PUBLIC_KAKAO_JS_KEY`
- Value: 카카오 개발자 콘솔에서 복사한 **JavaScript 키**
- Environment: Production, Preview, Development 모두 선택
- 예: `f168b7e3d360eca1f86c3ff0d80e30a3`

---

### 3. 환경 변수 추가 방법

1. **Add New** 버튼 클릭
2. **Key** 입력: `NEXT_PUBLIC_KAKAO_REST_API_KEY`
3. **Value** 입력: REST API 키 (카카오 개발자 콘솔에서 복사)
4. **Environment** 선택:
   - ✅ Production
   - ✅ Preview
   - ✅ Development
5. **Save** 클릭

---

### 4. 재배포

환경 변수를 추가/수정한 후:

1. **자동 재배포**: Vercel이 자동으로 재배포를 시작할 수 있습니다
2. **수동 재배포**: 
   - Deployments 탭으로 이동
   - 최신 배포의 **...** 메뉴 클릭
   - **Redeploy** 선택

---

### 5. 확인 방법

재배포 후:

1. 브라우저를 완전히 닫고 다시 열기 (또는 시크릿 모드)
2. `https://group-buying-nine.vercel.app/login` 접속
3. 카카오 로그인 버튼 클릭
4. 카카오 웹 로그인 화면이 표시되는지 확인
5. 로그인 완료 후 정상적으로 처리되는지 확인

---

## 현재 설정 확인

### 로컬 환경 (`.env.local`)

```env
NEXT_PUBLIC_KAKAO_JS_KEY=f168b7e3d360eca1f86c3ff0d80e30a3
NEXT_PUBLIC_KAKAO_REST_API_KEY=5bdf04b7ab4847db2e230b2a37fbc0e2
```

### Vercel 환경 변수 (확인 필요)

다음 환경 변수들이 설정되어 있어야 합니다:
- ✅ `NEXT_PUBLIC_KAKAO_JS_KEY` = `f168b7e3d360eca1f86c3ff0d80e30a3`
- ✅ `NEXT_PUBLIC_KAKAO_REST_API_KEY` = `5bdf04b7ab4847db2e230b2a37fbc0e2` ← **이것이 중요!**

---

## 체크리스트

- [ ] 카카오 개발자 콘솔에서 REST API 키 확인 완료
- [ ] Vercel 환경 변수에 `NEXT_PUBLIC_KAKAO_REST_API_KEY` 추가 완료
- [ ] REST API 키 값이 카카오 개발자 콘솔의 값과 일치함
- [ ] 환경 변수 저장 완료
- [ ] 재배포 완료
- [ ] 브라우저를 완전히 닫고 다시 열었음
- [ ] 다시 로그인 시도

---

## 참고

- **JavaScript 키**와 **REST API 키**는 다릅니다
- 토큰 교환에는 **REST API 키**가 필요합니다
- 환경 변수 이름은 정확히 `NEXT_PUBLIC_KAKAO_REST_API_KEY`여야 합니다
- 환경 변수 변경 후에는 **재배포**가 필요합니다
