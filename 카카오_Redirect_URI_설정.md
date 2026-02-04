# 카카오 로그인 Redirect URI 설정 가이드

팝업에서 로그인을 완료했는데도 콜백이 호출되지 않는 경우, **Redirect URI 설정** 문제일 가능성이 높습니다.

---

## 문제 원인

카카오 SDK v1.43.6은 팝업 방식입니다:
1. 팝업이 열림
2. 사용자가 팝업에서 로그인 완료
3. 카카오가 **설정된 Redirect URI로 리다이렉트**
4. **Redirect URI가 현재 페이지와 일치해야** 콜백(`success`)이 호출됨

만약 Redirect URI가 현재 페이지와 다르면, 팝업이 다른 페이지로 이동하면서 원래 페이지의 콜백이 호출되지 않습니다.

---

## 해결 방법

### 1. 카카오 개발자 콘솔에서 Redirect URI 설정

1. [카카오 개발자 콘솔](https://developers.kakao.com/) 접속
2. **내 애플리케이션** → 앱 선택
3. **카카오 로그인** 탭 클릭
4. **Redirect URI 등록** 섹션에서 다음을 추가:
   ```
   http://localhost:3000/login
   http://127.0.0.1:3000/login
   ```
   (프로덕션에서는 실제 도메인 사용)

5. **저장** 클릭

---

### 2. 사이트 도메인도 확인

1. **앱 설정** → **플랫폼** 탭
2. **웹 플랫폼** 등록 확인
3. **사이트 도메인**에 다음 추가:
   ```
   http://localhost:3000
   http://127.0.0.1:3000
   ```

---

## 중요 사항

### Redirect URI는 정확히 일치해야 함

- ✅ `http://localhost:3000/login` (정확히 일치)
- ❌ `http://localhost:3000/` (다름)
- ❌ `http://localhost:3000` (다름)
- ❌ `https://localhost:3000/login` (프로토콜 다름)

### 여러 Redirect URI 등록 가능

개발/프로덕션 환경을 모두 지원하려면:
```
http://localhost:3000/login
http://127.0.0.1:3000/login
https://yourdomain.com/login
```

---

## 설정 후 확인

1. 카카오 개발자 콘솔에서 Redirect URI 저장
2. 서버 재시작 (`npm run dev` 중지 후 다시 시작)
3. 브라우저 새로고침 (Ctrl + F5)
4. 카카오 로그인 버튼 클릭
5. 팝업에서 로그인 완료
6. 콜백이 호출되는지 확인

---

## 여전히 안 되면

1. 브라우저 콘솔(F12)에서 **Network** 탭 확인
   - 팝업이 닫힌 후 어떤 요청이 발생하는지 확인
   - Redirect URI로 리다이렉트되는지 확인

2. 팝업이 닫힌 후 **현재 페이지 URL** 확인
   - URL이 변경되었는지 확인
   - URL 파라미터에 `code`나 `access_token`이 있는지 확인

3. 카카오 개발자 콘솔에서 **Redirect URI가 정확히 일치**하는지 다시 확인

---

## 참고

카카오 SDK v1.43.6의 `Auth.login()`은:
- 팝업 방식: 팝업이 열리고, 로그인 완료 후 Redirect URI로 리다이렉트
- 콜백 호출: Redirect URI가 현재 페이지와 일치할 때만 `success` 콜백 호출

따라서 **Redirect URI를 현재 페이지(`/login`)로 설정**하는 것이 중요합니다.
