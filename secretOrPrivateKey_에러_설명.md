# "secretOrPrivateKey must be an asymmetric key" 에러 설명

## 🔴 에러 의미

```
secretOrPrivateKey must be an asymmetric key when using RS256
```

이 에러는 **Firebase Admin SDK가 Private Key를 제대로 파싱하지 못했을 때** 발생합니다.

---

## ❌ 이것은 Firebase Console 설정 문제가 아닙니다!

**중요:** 이 에러는 Firebase Console 설정 문제가 **아닙니다**. 

- ✅ Firebase Console 설정은 문제없습니다
- ✅ Firebase 프로젝트 자체는 정상입니다
- ❌ **Vercel 환경 변수에서 Private Key가 제대로 전달되지 않고 있습니다**

---

## 🔍 문제 원인

### 원인 1: Vercel 환경 변수 형식 문제

Vercel 환경 변수에서 `FIREBASE_PRIVATE_KEY`가 다음과 같은 문제가 있을 수 있습니다:

1. **큰따옴표가 없음**
   ```
   ❌ 잘못된 형식:
   -----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDgaoKU4QHuizrX\n...
   
   ✅ 올바른 형식:
   "-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDgaoKU4QHuizrX\n..."
   ```

2. **실제 줄바꿈으로 변환됨** (Vercel에서 자동 변환)
   ```
   ❌ 잘못된 형식:
   "-----BEGIN PRIVATE KEY-----
   MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDgaoKU4QHuizrX
   +RMtAE1fRugKM5mX2iiAhKI7KgfIwafJaPYkqRQoooUX01MvViNhUXgWuKH2EM2M
   ..."
   
   ✅ 올바른 형식 (한 줄):
   "-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDgaoKU4QHuizrX\n+RMtAE1fRugKM5mX2iiAhKI7KgfIwafJaPYkqRQoooUX01MvViNhUXgWuKH2EM2M\n..."
   ```

3. **앞뒤 공백**
   ```
   ❌ 잘못된 형식:
   " -----BEGIN PRIVATE KEY-----\n..."
   
   ✅ 올바른 형식:
   "-----BEGIN PRIVATE KEY-----\n..."
   ```

4. **이스케이프 문자 문제**
   - Vercel에서 `\n`이 실제 줄바꿈으로 변환되거나
   - `\\n`으로 이중 이스케이프되어 있을 수 있음

---

## ✅ 해결 방법

### 방법 1: Vercel 환경 변수 재설정 (가장 확실한 방법)

1. **Vercel 대시보드 접속**
   - [Vercel 대시보드](https://vercel.com/dashboard)
   - 프로젝트 선택: `group-buying-nine`
   - Settings → Environment Variables

2. **기존 FIREBASE_PRIVATE_KEY 삭제**
   - `FIREBASE_PRIVATE_KEY` 찾기
   - Delete 또는 삭제 버튼 클릭

3. **.env.local 파일에서 값 복사**
   - `.env.local` 파일 열기
   - `FIREBASE_PRIVATE_KEY=` 뒤의 **전체 값** 복사
   - 큰따옴표 포함하여 복사

4. **Vercel에 새로 추가**
   - Add New 클릭
   - Key: `FIREBASE_PRIVATE_KEY`
   - Value: 복사한 값 붙여넣기
   - Environment: Production, Preview, Development 모두 선택
   - Save 클릭

5. **재배포**
   - Deployments 탭
   - 최신 배포 클릭
   - Redeploy 클릭

---

### 방법 2: Vercel 함수 로그 확인

에러의 정확한 원인을 확인하려면:

1. Vercel 대시보드 → **Functions** 탭
2. `/api/auth/kakao` 함수 클릭
3. 최신 로그 확인

**확인할 내용:**
- `Firebase Admin 환경 변수가 설정되지 않았습니다` 메시지
- `Firebase Admin 초기화 오류` 메시지
- Private Key의 실제 길이와 형식

---

### 방법 3: 코드에 디버깅 로그 추가 (임시)

서버 코드에 로그를 추가하여 실제로 받은 값을 확인:

```typescript
// app/api/auth/kakao/route.ts의 initFirebaseAdmin 함수에 추가
console.log('FIREBASE_PRIVATE_KEY 존재:', !!process.env.FIREBASE_PRIVATE_KEY)
console.log('FIREBASE_PRIVATE_KEY 길이:', process.env.FIREBASE_PRIVATE_KEY?.length)
console.log('FIREBASE_PRIVATE_KEY 시작:', process.env.FIREBASE_PRIVATE_KEY?.substring(0, 50))
console.log('FIREBASE_PRIVATE_KEY 끝:', process.env.FIREBASE_PRIVATE_KEY?.substring((process.env.FIREBASE_PRIVATE_KEY?.length || 0) - 50))
```

이 로그를 Vercel 함수 로그에서 확인하면 문제를 정확히 파악할 수 있습니다.

---

## 🔍 확인 체크리스트

### Vercel 환경 변수 확인:
- [ ] `FIREBASE_PRIVATE_KEY`가 큰따옴표로 시작하고 끝나는가?
- [ ] `\n` 문자가 포함되어 있는가? (실제 줄바꿈 아님)
- [ ] 앞뒤 공백이 없는가?
- [ ] 전체 키가 한 줄로 되어 있는가?
- [ ] `.env.local` 파일의 값과 정확히 일치하는가?

### 재배포 확인:
- [ ] 환경 변수 수정 후 재배포했는가?
- [ ] 재배포가 완료되었는가?

---

## 💡 왜 로컬에서는 되고 Vercel에서는 안 될까?

### 로컬 환경 (.env.local)
- `.env.local` 파일을 직접 읽음
- 큰따옴표와 `\n`이 그대로 전달됨
- 문제없이 작동

### Vercel 환경 (환경 변수)
- 환경 변수로 설정된 값을 사용
- Vercel이 값을 파싱할 때 형식이 달라질 수 있음
- 큰따옴표가 없거나, `\n`이 실제 줄바꿈으로 변환될 수 있음
- 이로 인해 Private Key가 제대로 파싱되지 않음

---

## 📝 요약

1. **에러 의미**: Firebase Admin SDK가 Private Key를 파싱하지 못함
2. **원인**: Vercel 환경 변수에서 Private Key 형식이 잘못됨
3. **해결**: Vercel 환경 변수를 올바른 형식으로 재설정
4. **Firebase Console**: 변경할 필요 없음 ✅

---

## 🆘 여전히 안 되면

Vercel 함수 로그의 전체 에러 메시지를 공유해주시면 더 정확한 진단이 가능합니다:

1. Vercel 대시보드 → Functions → `/api/auth/kakao`
2. 최신 로그의 전체 에러 메시지 복사
3. 공유해주시면 정확한 해결 방법 제시 가능
