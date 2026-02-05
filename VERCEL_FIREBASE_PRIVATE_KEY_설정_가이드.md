# Vercel Firebase Private Key 설정 가이드

## 🔴 현재 에러
```
secretOrPrivateKey must be an asymmetric key when using RS256
Failed to load resource: the server responded with a status of 500
```

이 에러는 Vercel 환경 변수에서 `FIREBASE_PRIVATE_KEY`가 제대로 설정되지 않았을 때 발생합니다.

---

## ✅ 해결 방법: Vercel에 FIREBASE_PRIVATE_KEY 올바르게 설정

### 1단계: .env.local 파일에서 Private Key 확인

`.env.local` 파일을 열고 `FIREBASE_PRIVATE_KEY` 값을 확인하세요:

```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDgaoKU4QHuizrX\n+RMtAE1fRugKM5mX2iiAhKI7KgfIwafJaPYkqRQoooUX01MvViNhUXgWuKH2EM2M\nGDairN+LT5H5I3ieaoQ7OINGxFBYf/y0PlE536ByXeWKdE0OTv8+oijvt36pu3Uk\nRp48oEhsF/7EiphDB91DrxWKbT65zYDt3lisz5yWW5nSXBVQsMn9c4N7hLFgz0v3\n+G9W2jabQw8yKEMlLVu/GE1wDzuegffyuWDEkydMlYUXnriRHKEjamzZANOg1UwY\nYOzglCNSqyttNmm+pKKHx9r4orX/MYwKS3/6d7hufadfLEJ3W1Qt1yB7RhpVCx52\nhiT9zVILAgMBAAECggEAUQrFu2QCYZXQGzxsi1zHlDe0BjMaLXdwFvFO8NS92Obu\nY9LOyPByQjZmn/MF4FtYDYXxOytT+duZjxUTbe3GELYcff8sSPEobYZ8CetNJJib\ntq+mf6Lde0+jXDuhtCAdFw5SgDcgu8Thicciz7wGS1ri+zEdyV8mrZGl0sae11PN\nMcH4W94wqA/cowI6Cwz6Y6c3Y2wjp52ms+AtpMJixzFi5l8ZEJd0tY9AYKxXivjM\nOvlRxdpuU/PwrcP/MfcL75GeLuZCZ0gTTlm2AaGTl9bwg8EO5NHtyRpCPnRRd2ww\n3xnUJiiYDY6tqsjIFXfCZbvz4cS8gH9SVBweJYBfsQKBgQDyaq4eyy0e9x8Qsb39\nB1bKsb1CiSTcMoFoQJOffs2+wTGqHDOCvJMAPDyW5AQzUgSWp0BKuI0PkrXtN0IA\nBuAFgqSkE6QeLmAMxo88nE8u1tq5yaQyXVb9stAX2XN5XK3IEzKm6jed/UPK0xyY\nHk+wQ9n6Vaa6v5daBzlhxIcdCQKBgQDs/Z8TK4Sb8w+HyZvuU0q65QWgZc4TgndQ\ncM4TKwYPEE/qJ/HAKcYNyut8DQZpTMy9iB3WuU5QbF5WTDKnqpC93gAOiIur/McD\n/vZt3qlMsJKUPrsxqMsJMHofNTkUuUxpuo8YCeohJaQ4XZDiPDs5gRsa0GQE2bJu\nPgOQGNnPcwKBgQC7Wr3l6MufogitY2Hd3D00/Pe0I8CMOrCPPVGatGsZYcEbox4g\njdPjG6sMR4ADlgEb2nmzBj1natEWXF2zHZ0oRRcwBEoUVW1AknmDs57zKXT0oCY6\nEq+39eokdJhtlLZu6n98R4rinSo26MCxxMN8DIS8mFP7AzZbizfLGxP92QKBgQCi\nJ58ylLI1qofT10TUOzWEz7Ob3ky02K4e4jB+uQ96OyUTCKXHYE3dnhymUpsybZQh\nkwMnqr9FFAEwdw6p3nEPGNldGFzJHzplJ40h/BpHGQISYSHghqf1769/rwERhwAb\nz8SdJBuI9qJ41ryNr7yuSgJrxG7LStFl0RTLAdX2tQKBgQDWmGv7xL0k99dK/YJu\nWMIjM9VTCTUkkzWix92ew6i+XSin1OLRfdKZRe7XiYhtfe/qr9hDl8eCaqsBbKFw\nRANHs5cKZaMAgoVweM+yjo/DGRAqVbW/Lqw4UIUBxf7HPYwzbR94nh5ZJbwgxTai\nMoqHQIwMupOBLp6VRoii0bUhGA==\n-----END PRIVATE KEY-----\n"
```

**중요 포인트:**
- 큰따옴표(`"`)로 감싸져 있음
- `\n` 문자가 포함되어 있음
- `-----BEGIN PRIVATE KEY-----` 부터 `-----END PRIVATE KEY-----` 까지 전체

---

### 2단계: Vercel 대시보드에서 환경 변수 설정

1. [Vercel 대시보드](https://vercel.com/dashboard) 접속
2. 프로젝트 선택: `group-buying-nine`
3. **Settings** 탭 클릭
4. 왼쪽 메뉴에서 **Environment Variables** 클릭

---

### 3단계: FIREBASE_PRIVATE_KEY 수정 또는 추가

#### 기존에 있다면:
1. `FIREBASE_PRIVATE_KEY` 찾기
2. **Edit** 또는 **수정** 버튼 클릭
3. 아래의 올바른 형식으로 수정

#### 없다면:
1. **Add New** 또는 **추가** 버튼 클릭
2. Key: `FIREBASE_PRIVATE_KEY` 입력
3. Value: 아래 값을 복사하여 붙여넣기

---

### 4단계: 올바른 형식으로 입력

#### ✅ 올바른 형식 (큰따옴표 포함, \n 포함):

```
"-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDgaoKU4QHuizrX\n+RMtAE1fRugKM5mX2iiAhKI7KgfIwafJaPYkqRQoooUX01MvViNhUXgWuKH2EM2M\nGDairN+LT5H5I3ieaoQ7OINGxFBYf/y0PlE536ByXeWKdE0OTv8+oijvt36pu3Uk\nRp48oEhsF/7EiphDB91DrxWKbT65zYDt3lisz5yWW5nSXBVQsMn9c4N7hLFgz0v3\n+G9W2jabQw8yKEMlLVu/GE1wDzuegffyuWDEkydMlYUXnriRHKEjamzZANOg1UwY\nYOzglCNSqyttNmm+pKKHx9r4orX/MYwKS3/6d7hufadfLEJ3W1Qt1yB7RhpVCx52\nhiT9zVILAgMBAAECggEAUQrFu2QCYZXQGzxsi1zHlDe0BjMaLXdwFvFO8NS92Obu\nY9LOyPByQjZmn/MF4FtYDYXxOytT+duZjxUTbe3GELYcff8sSPEobYZ8CetNJJib\ntq+mf6Lde0+jXDuhtCAdFw5SgDcgu8Thicciz7wGS1ri+zEdyV8mrZGl0sae11PN\nMcH4W94wqA/cowI6Cwz6Y6c3Y2wjp52ms+AtpMJixzFi5l8ZEJd0tY9AYKxXivjM\nOvlRxdpuU/PwrcP/MfcL75GeLuZCZ0gTTlm2AaGTl9bwg8EO5NHtyRpCPnRRd2ww\n3xnUJiiYDY6tqsjIFXfCZbvz4cS8gH9SVBweJYBfsQKBgQDyaq4eyy0e9x8Qsb39\nB1bKsb1CiSTcMoFoQJOffs2+wTGqHDOCvJMAPDyW5AQzUgSWp0BKuI0PkrXtN0IA\nBuAFgqSkE6QeLmAMxo88nE8u1tq5yaQyXVb9stAX2XN5XK3IEzKm6jed/UPK0xyY\nHk+wQ9n6Vaa6v5daBzlhxIcdCQKBgQDs/Z8TK4Sb8w+HyZvuU0q65QWgZc4TgndQ\ncM4TKwYPEE/qJ/HAKcYNyut8DQZpTMy9iB3WuU5QbF5WTDKnqpC93gAOiIur/McD\n/vZt3qlMsJKUPrsxqMsJMHofNTkUuUxpuo8YCeohJaQ4XZDiPDs5gRsa0GQE2bJu\nPgOQGNnPcwKBgQC7Wr3l6MufogitY2Hd3D00/Pe0I8CMOrCPPVGatGsZYcEbox4g\njdPjG6sMR4ADlgEb2nmzBj1natEWXF2zHZ0oRRcwBEoUVW1AknmDs57zKXT0oCY6\nEq+39eokdJhtlLZu6n98R4rinSo26MCxxMN8DIS8mFP7AzZbizfLGxP92QKBgQCi\nJ58ylLI1qofT10TUOzWEz7Ob3ky02K4e4jB+uQ96OyUTCKXHYE3dnhymUpsybZQh\nkwMnqr9FFAEwdw6p3nEPGNldGFzJHzplJ40h/BpHGQISYSHghqf1769/rwERhwAb\nz8SdJBuI9qJ41ryNr7yuSgJrxG7LStFl0RTLAdX2tQKBgQDWmGv7xL0k99dK/YJu\nWMIjM9VTCTUkkzWix92ew6i+XSin1OLRfdKZRe7XiYhtfe/qr9hDl8eCaqsBbKFw\nRANHs5cKZaMAgoVweM+yjo/DGRAqVbW/Lqw4UIUBxf7HPYwzbR94nh5ZJbwgxTai\nMoqHQIwMupOBLp6VRoii0bUhGA==\n-----END PRIVATE KEY-----\n"
```

**주의사항:**
- ✅ 큰따옴표(`"`)로 시작하고 끝나야 함
- ✅ `\n` 문자를 그대로 유지 (실제 줄바꿈으로 변환하지 않음)
- ✅ 앞뒤 공백 없음
- ✅ 전체 키를 한 번에 복사

4. **Environment** 선택: **Production**, **Preview**, **Development** 모두 선택 (또는 Production만)
5. **Save** 또는 **저장** 버튼 클릭

---

### 5단계: 재배포

환경 변수를 수정했다면 **반드시 재배포**해야 합니다:

1. Vercel 대시보드 → **Deployments** 탭
2. 최신 배포 클릭
3. **Redeploy** 버튼 클릭
4. 빌드 완료까지 대기 (약 2-3분)

---

## ❌ 잘못된 형식들

### 잘못된 형식 1: 큰따옴표 없음
```
-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDgaoKU4QHuizrX\n...
```
❌ 큰따옴표가 없으면 환경 변수가 제대로 파싱되지 않습니다.

### 잘못된 형식 2: 실제 줄바꿈으로 변환됨
```
"-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDgaoKU4QHuizrX
+RMtAE1fRugKM5mX2iiAhKI7KgfIwafJaPYkqRQoooUX01MvViNhUXgWuKH2EM2M
..."
```
❌ 실제 줄바꿈이 있으면 Vercel에서 제대로 처리되지 않을 수 있습니다.

### 잘못된 형식 3: 앞뒤 공백
```
" -----BEGIN PRIVATE KEY-----\n..."
```
❌ 앞뒤 공백이 있으면 파싱 에러가 발생할 수 있습니다.

---

## ✅ 확인 방법

재배포 후:

1. 배포된 사이트 접속: `https://group-buying-nine.vercel.app/login`
2. 카카오 로그인 버튼 클릭
3. 로그인 시도
4. 브라우저 콘솔(F12)에서 에러 확인
5. Vercel 함수 로그 확인:
   - Vercel 대시보드 → Functions
   - `/api/auth/kakao` 함수 로그 확인
   - `secretOrPrivateKey` 에러가 사라졌는지 확인

---

## 🐛 여전히 에러가 발생하는 경우

### 1. Vercel 함수 로그 확인
- Vercel 대시보드 → Functions → `/api/auth/kakao`
- 에러 메시지 확인
- `FIREBASE_PRIVATE_KEY` 관련 에러가 있는지 확인

### 2. 환경 변수 값 확인
- Vercel 대시보드 → Settings → Environment Variables
- `FIREBASE_PRIVATE_KEY` 값 확인
- 큰따옴표로 시작하고 끝나는지 확인
- `\n` 문자가 포함되어 있는지 확인

### 3. 기존 값 삭제 후 재추가
1. `FIREBASE_PRIVATE_KEY` 삭제
2. `.env.local` 파일에서 값 복사
3. 다시 추가 (큰따옴표 포함)
4. 재배포

### 4. Firebase Console에서 새 키 생성
1. Firebase Console → 프로젝트 설정 → 서비스 계정
2. "새 비공개 키 만들기" 클릭
3. 새 JSON 파일 다운로드
4. `private_key` 값 복사
5. Vercel에 다시 설정

---

## 📝 참고사항

1. **큰따옴표 필수**: `FIREBASE_PRIVATE_KEY`는 반드시 큰따옴표로 감싸야 합니다.

2. **\n 문자**: `\n`은 실제 줄바꿈이 아니라 문자열 `\n`입니다.

3. **재배포 필수**: 환경 변수 수정 후 반드시 재배포해야 합니다.

4. **로컬 vs Vercel**: 
   - 로컬: `.env.local` 파일 사용
   - Vercel: 대시보드에서 환경 변수 설정

5. **보안**: Private Key는 절대 Git에 커밋하지 마세요!

---

## ✅ 최종 체크리스트

- [ ] `.env.local` 파일에서 `FIREBASE_PRIVATE_KEY` 값 확인
- [ ] Vercel 대시보드에서 `FIREBASE_PRIVATE_KEY` 환경 변수 확인
- [ ] 큰따옴표로 감싸져 있는지 확인
- [ ] `\n` 문자가 포함되어 있는지 확인
- [ ] 앞뒤 공백이 없는지 확인
- [ ] 저장 버튼 클릭 완료
- [ ] 재배포 완료
- [ ] 다시 테스트 완료

이제 `secretOrPrivateKey` 에러가 해결되어야 합니다!
