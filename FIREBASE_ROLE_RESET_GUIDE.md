# Firebase 사용자 역할 초기화 가이드

이전에 카카오 계정이 관리자(admin) 역할이었던 경우, 일반 사용자(user)로 변경하는 방법입니다.

## 방법 1: Firebase Console에서 직접 수정 (가장 간단)

### 1단계: Firebase Console 접속
1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 선택

### 2단계: Firestore Database로 이동
1. 왼쪽 메뉴에서 **Firestore Database** 클릭
2. **users** 컬렉션 클릭

### 3단계: 사용자 문서 찾기
- 방법 A: UID로 찾기
  - 카카오 계정의 UID를 알고 있다면 해당 문서 ID로 검색
- 방법 B: 이메일로 찾기
  - 각 문서를 열어서 `email` 필드 확인
  - 또는 Firebase Authentication에서 UID 확인 후 Firestore에서 찾기

### 4단계: 역할 변경
1. 해당 사용자 문서 클릭
2. `role` 필드 찾기
3. 값이 `admin`인 경우 `user`로 변경
4. **업데이트** 버튼 클릭

### 5단계: 확인
- 변경 후 앱에서 해당 계정으로 로그인하여 일반 사용자 화면이 표시되는지 확인

---

## 방법 2: 스크립트 사용 (자동화)

### 1단계: 스크립트 실행
```bash
# UID로 실행
node scripts/reset-user-role.js <사용자UID>

# 이메일로 실행
node scripts/reset-user-role.js user@example.com
```

### 2단계: 확인
- 스크립트가 역할 변경을 완료하면 성공 메시지가 표시됩니다.

---

## 방법 3: Firebase Authentication에서 UID 확인 후 수정

### 1단계: UID 확인
1. Firebase Console → **Authentication** → **Users** 탭
2. 카카오 계정 찾기 (이메일 또는 표시 이름으로 검색)
3. UID 복사

### 2단계: Firestore에서 수정
1. Firestore Database → **users** 컬렉션
2. 복사한 UID로 문서 검색
3. `role` 필드를 `admin`에서 `user`로 변경

---

## 확인 사항

### 변경 전 확인
- ✅ 사용자의 현재 역할이 `admin`인지 확인
- ✅ 변경할 사용자의 UID 또는 이메일 확인

### 변경 후 확인
- ✅ Firestore의 `users/{userId}` 문서에서 `role` 필드가 `user`로 변경되었는지 확인
- ✅ 앱에서 해당 계정으로 로그인하여 일반 사용자 화면이 표시되는지 확인
- ✅ `/admin` 경로 접근 시 로그인 페이지로 리다이렉트되는지 확인

---

## 주의사항

1. **owner 역할은 변경 불가**
   - `owner` 역할은 `ADMIN_OWNER_UID` 환경 변수로 관리됩니다.
   - 스크립트로 변경하려고 하면 오류가 발생합니다.

2. **역할 변경 후 즉시 반영**
   - Firestore에서 역할을 변경하면 앱을 새로고침하면 즉시 반영됩니다.
   - 캐시 문제가 있다면 브라우저 캐시를 삭제하거나 시크릿 모드로 테스트하세요.

3. **여러 계정 변경**
   - 여러 계정의 역할을 변경해야 한다면 스크립트를 반복 실행하거나
   - Firebase Console에서 여러 문서를 일괄 수정할 수 있습니다.

---

## 문제 해결

### "사용자를 찾을 수 없습니다" 오류
- Firebase Authentication에 해당 사용자가 존재하는지 확인
- Firestore의 `users` 컬렉션에 해당 UID의 문서가 존재하는지 확인

### 역할이 변경되지 않음
- Firestore 보안 규칙 확인 (관리자 권한 필요)
- 브라우저 캐시 삭제 후 재시도
- Firebase Console에서 직접 확인

### 스크립트 실행 오류
- `.env.local` 파일에 Firebase Admin 환경 변수가 설정되어 있는지 확인
- Node.js 버전 확인 (v14 이상 권장)
