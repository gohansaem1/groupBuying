# 카카오 JavaScript SDK 도메인 등록 가이드

## 🔴 문제 원인
"등록되지 않은 플랫폼" 에러는 **JavaScript SDK 도메인**을 등록하지 않아서 발생합니다.

카카오 개발자 콘솔에는 두 가지 도메인 설정이 있습니다:
1. **웹 플랫폼 사이트 도메인** (일반적인 웹 도메인)
2. **JavaScript SDK 도메인** (JavaScript SDK 사용을 위한 별도 설정) ← **이것을 등록해야 함!**

---

## ✅ 해결 방법: JavaScript SDK 도메인 등록

### 1단계: 카카오 개발자 콘솔 접속

1. [카카오 개발자 콘솔](https://developers.kakao.com/) 접속
2. 로그인 후 **내 애플리케이션** 선택
3. 해당 앱 선택

---

### 2단계: 플랫폼 키 → JavaScript 키 메뉴로 이동

#### 경로 1: 왼쪽 사이드바에서
```
앱 설정
  └─ 플랫폼
      └─ 플랫폼 키
          └─ JavaScript 키
              └─ JavaScript SDK 도메인  ← 여기!
```

#### 경로 2: 직접 찾기
1. **앱 설정** → **플랫폼** 메뉴 클릭
2. **플랫폼 키** 섹션 찾기
3. **JavaScript 키** 섹션 클릭
4. **JavaScript SDK 도메인** 입력 필드 찾기

---

### 3단계: JavaScript SDK 도메인 등록

1. **JavaScript SDK 도메인** 입력 필드 찾기
2. 다음 도메인 입력:
   ```
   group-buying-nine.vercel.app
   ```
   또는
   ```
   https://group-buying-nine.vercel.app
   ```
   ⚠️ **주의**: 
   - 경로(`/login` 등)는 제외하고 도메인만 입력
   - `https://`는 포함해도 되고 제외해도 됨 (자동으로 처리됨)

3. **추가** 또는 **등록** 버튼 클릭
4. **저장** 버튼 클릭

---

### 4단계: 여러 도메인 등록 (필요시)

로컬 개발과 배포 환경을 모두 사용한다면:

1. **로컬 개발용**:
   ```
   http://localhost:3000
   ```
   또는
   ```
   localhost:3000
   ```

2. **배포 환경용**:
   ```
   group-buying-nine.vercel.app
   ```

**각각 따로 등록:**
- 첫 번째: `http://localhost:3000` 입력 → 추가
- 두 번째: `group-buying-nine.vercel.app` 입력 → 추가
- 저장 클릭

---

## 📋 전체 설정 체크리스트

### 1. 웹 플랫폼 사이트 도메인 (선택사항, 있으면 좋음)
- [ ] 앱 설정 → 플랫폼 → Web 플랫폼 등록
- [ ] 사이트 도메인: `group-buying-nine.vercel.app`

### 2. JavaScript SDK 도메인 (필수!) ⭐
- [ ] 앱 설정 → 플랫폼 → 플랫폼 키 → JavaScript 키
- [ ] JavaScript SDK 도메인: `group-buying-nine.vercel.app`
- [ ] 저장 완료

### 3. Redirect URI (필수)
- [ ] 제품 설정 → 카카오 로그인 → Redirect URI
- [ ] `https://group-buying-nine.vercel.app/login` 추가
- [ ] 저장 완료

---

## 🎯 정확한 위치 찾기

### JavaScript SDK 도메인 설정 화면의 특징

JavaScript SDK 도메인 설정 화면에는 다음과 같은 내용이 표시됩니다:

- **JavaScript 키** 섹션:
  - JavaScript 키 값 표시
  - **JavaScript SDK 도메인** 입력 필드
  - "추가" 또는 "등록" 버튼
  - 등록된 도메인 목록

- **안내 문구**:
  - "Kakao SDK for JavaScript를 사용하기 위해 필요한 웹사이트 도메인은 [플랫폼 키] > [JavaScript 키]의 [JavaScript SDK 도메인]에서 등록할 수 있습니다."

---

## 🔄 설정 후 테스트

1. **브라우저 캐시 삭제** (중요!)
   - Ctrl + Shift + R (강력 새로고침)
   - 또는 시크릿 모드에서 테스트

2. 배포된 사이트 접속: `https://group-buying-nine.vercel.app/login`

3. 카카오 로그인 버튼 클릭

4. 에러가 사라졌는지 확인

---

## 🐛 여전히 에러가 발생하는 경우

### 1. 도메인 형식 확인
- ✅ 올바른 형식: `group-buying-nine.vercel.app`
- ✅ 올바른 형식: `https://group-buying-nine.vercel.app`
- ❌ 잘못된 형식: `https://group-buying-nine.vercel.app/login` (경로 포함)

### 2. 저장 확인
- JavaScript SDK 도메인 입력 후 **반드시 저장 버튼 클릭**
- 페이지를 새로고침하여 등록된 도메인이 목록에 나타나는지 확인

### 3. 여러 도메인 등록
- 로컬 개발용과 배포용을 모두 등록해야 할 수 있음
- 각각 따로 등록

### 4. 브라우저 캐시
- 설정 변경 후 브라우저 캐시를 완전히 삭제
- 시크릿 모드에서 테스트

---

## 📝 참고사항

1. **JavaScript SDK 도메인 vs 웹 플랫폼 사이트 도메인**:
   - 웹 플랫폼 사이트 도메인: 일반적인 웹 도메인 등록
   - JavaScript SDK 도메인: JavaScript SDK 사용을 위한 별도 설정 (필수!)

2. **도메인 형식**:
   - 경로(`/login` 등)는 자동으로 제외됨
   - `https://`는 포함해도 되고 제외해도 됨

3. **변경사항 반영**:
   - 설정 변경 후 즉시 반영됨
   - 브라우저 캐시 삭제 후 테스트 권장

4. **로컬 개발 환경**:
   - 로컬 개발 시: `http://localhost:3000` 등록 필요
   - 배포 환경: `group-buying-nine.vercel.app` 등록 필요
   - 각각 따로 등록 가능

---

## ✅ 최종 확인

JavaScript SDK 도메인을 등록했다면:

1. ✅ JavaScript SDK 도메인 목록에 `group-buying-nine.vercel.app`이 표시됨
2. ✅ 저장 버튼을 클릭했음
3. ✅ 브라우저 캐시를 삭제했음
4. ✅ 다시 테스트했음

이제 "등록되지 않은 플랫폼" 에러가 해결되어야 합니다!
