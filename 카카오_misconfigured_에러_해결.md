# 카카오 "misconfigured" 에러 해결 가이드

## 🔴 현재 에러
```
error: 'misconfigured'
error_description: 'invalid android_key_hash or ios_bundle_id or web_site_url'
```

이 에러는 카카오 개발자 콘솔에서 **웹 사이트 URL**이 제대로 설정되지 않았을 때 발생합니다.

---

## ✅ 해결 방법

### 1단계: 카카오 개발자 콘솔 접속

1. [카카오 개발자 콘솔](https://developers.kakao.com/) 접속
2. 로그인 후 **내 애플리케이션** 선택
3. 해당 앱 선택

---

### 2단계: 웹 플랫폼 사이트 도메인 등록 (필수!)

#### 경로:
```
앱 설정
  └─ 플랫폼
      └─ Web 플랫폼 등록
          └─ 사이트 도메인
```

#### 단계:
1. **앱 설정** → **플랫폼** 메뉴 클릭
2. **Web 플랫폼 등록** 버튼 클릭 (이미 있으면 수정)
3. **사이트 도메인** 입력 필드에 다음 입력:
   ```
   group-buying-nine.vercel.app
   ```
   또는
   ```
   https://group-buying-nine.vercel.app
   ```
   ⚠️ **주의**: 
   - 경로(`/login` 등)는 제외하고 도메인만 입력
   - `https://`는 포함해도 되고 제외해도 됨

4. **저장** 버튼 클릭

---

### 3단계: JavaScript SDK 도메인 확인 (이미 했을 수도 있음)

1. **앱 설정** → **플랫폼** → **플랫폼 키** → **JavaScript 키**
2. **JavaScript SDK 도메인**에 다음이 등록되어 있는지 확인:
   ```
   group-buying-nine.vercel.app
   ```
3. 없다면 추가하고 저장

---

### 4단계: Redirect URI 확인 (필수!)

1. **제품 설정** → **카카오 로그인** 메뉴로 이동
2. **Redirect URI** 섹션 확인
3. 다음 URI가 등록되어 있는지 확인:
   ```
   https://group-buying-nine.vercel.app/login
   ```
   ⚠️ **중요**: 
   - `https://` 포함
   - `/login` 경로 포함
   - 정확히 일치해야 함

4. 없다면 **URI 추가** 클릭하여 추가
5. **저장** 버튼 클릭

---

## 📋 전체 설정 체크리스트

### 1. 웹 플랫폼 사이트 도메인 (필수!) ⭐
- [ ] 앱 설정 → 플랫폼 → Web 플랫폼 등록
- [ ] 사이트 도메인: `group-buying-nine.vercel.app`
- [ ] 저장 완료

### 2. JavaScript SDK 도메인 (필수!) ⭐
- [ ] 앱 설정 → 플랫폼 → 플랫폼 키 → JavaScript 키
- [ ] JavaScript SDK 도메인: `group-buying-nine.vercel.app`
- [ ] 저장 완료

### 3. Redirect URI (필수!) ⭐
- [ ] 제품 설정 → 카카오 로그인 → Redirect URI
- [ ] `https://group-buying-nine.vercel.app/login` 추가
- [ ] 저장 완료

### 4. 동의항목 (필수!)
- [ ] 제품 설정 → 카카오 로그인 → 동의항목
- [ ] 닉네임 활성화 확인

---

## 🔄 설정 후 테스트

1. **브라우저 캐시 삭제** (매우 중요!)
   - Ctrl + Shift + R (강력 새로고침)
   - 또는 시크릿 모드에서 테스트
   - 또는 브라우저 개발자 도구 → Application → Clear storage

2. 배포된 사이트 접속: `https://group-buying-nine.vercel.app/login`

3. 카카오 로그인 버튼 클릭

4. 에러가 사라졌는지 확인

---

## 🐛 여전히 에러가 발생하는 경우

### 1. 모든 설정 확인
- 웹 플랫폼 사이트 도메인 등록 확인
- JavaScript SDK 도메인 등록 확인
- Redirect URI 등록 확인
- 각각 저장 버튼을 눌렀는지 확인

### 2. 도메인 형식 확인
- ✅ 올바른 형식: `group-buying-nine.vercel.app`
- ✅ 올바른 형식: `https://group-buying-nine.vercel.app`
- ❌ 잘못된 형식: `https://group-buying-nine.vercel.app/login` (사이트 도메인에는 경로 포함 안 됨)
- ✅ Redirect URI: `https://group-buying-nine.vercel.app/login` (경로 포함)

### 3. 기존 설정 삭제 후 재등록
1. 웹 플랫폼이 있다면 삭제
2. JavaScript SDK 도메인이 있다면 삭제
3. Redirect URI가 있다면 삭제
4. 위의 단계를 다시 따라 설정

### 4. 카카오 개발자 콘솔 새로고침
- 설정 후 카카오 개발자 콘솔 페이지를 새로고침
- 등록된 도메인이 목록에 나타나는지 확인

### 5. 여러 도메인 등록
- 로컬 개발용: `http://localhost:3000` (별도로 유지)
- 배포 환경용: `group-buying-nine.vercel.app` (새로 추가)
- 각각 따로 등록

---

## 📝 참고사항

### 웹 플랫폼 사이트 도메인 vs JavaScript SDK 도메인

1. **웹 플랫폼 사이트 도메인**:
   - 일반적인 웹 도메인 등록
   - `misconfigured` 에러 해결에 필요

2. **JavaScript SDK 도메인**:
   - JavaScript SDK 사용을 위한 별도 설정
   - "등록되지 않은 플랫폼" 에러 해결에 필요

3. **둘 다 등록해야 함!**
   - 웹 플랫폼 사이트 도메인: `group-buying-nine.vercel.app`
   - JavaScript SDK 도메인: `group-buying-nine.vercel.app`
   - Redirect URI: `https://group-buying-nine.vercel.app/login`

### 도메인 형식
- **사이트 도메인**: 경로 제외, 도메인만 (`group-buying-nine.vercel.app`)
- **Redirect URI**: 전체 URL 포함 (`https://group-buying-nine.vercel.app/login`)

### 변경사항 반영
- 설정 변경 후 즉시 반영됨
- 브라우저 캐시 삭제 후 테스트 권장

---

## ✅ 최종 확인

모든 설정을 완료했다면:

1. ✅ 웹 플랫폼 사이트 도메인 등록 완료
2. ✅ JavaScript SDK 도메인 등록 완료
3. ✅ Redirect URI 등록 완료
4. ✅ 각각 저장 버튼 클릭 완료
5. ✅ 브라우저 캐시 삭제 완료
6. ✅ 다시 테스트 완료

이제 `misconfigured` 에러가 해결되어야 합니다!
