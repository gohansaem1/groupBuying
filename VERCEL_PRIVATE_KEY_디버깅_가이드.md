# Vercel Firebase Private Key 디버깅 가이드

## 🔴 현재 상황
- 카카오 로그인: ✅ 성공
- 서버 응답: ❌ 500 에러
- 에러 메시지: `secretOrPrivateKey must be an asymmetric key when using RS256`

이것은 Vercel 환경 변수에서 `FIREBASE_PRIVATE_KEY`가 제대로 파싱되지 않고 있음을 의미합니다.

---

## 🔍 디버깅 방법

### 1단계: Vercel 함수 로그 확인

1. [Vercel 대시보드](https://vercel.com/dashboard) 접속
2. 프로젝트 선택: `group-buying-nine`
3. **Functions** 탭 클릭
4. `/api/auth/kakao` 함수 클릭
5. 최신 로그 확인

**확인할 내용:**
- `Firebase Admin 환경 변수가 설정되지 않았습니다` 메시지가 있는지
- `FIREBASE_PRIVATE_KEY` 값이 제대로 표시되는지
- `Firebase Admin 초기화 오류` 메시지가 있는지

---

### 2단계: Vercel 환경 변수 확인

1. Vercel 대시보드 → **Settings** → **Environment Variables**
2. `FIREBASE_PRIVATE_KEY` 찾기
3. **Edit** 클릭하여 값 확인

**확인할 사항:**
- ✅ 큰따옴표(`"`)로 시작하고 끝나는지
- ✅ `\n` 문자가 포함되어 있는지
- ✅ 앞뒤 공백이 없는지
- ✅ 전체 키가 한 줄로 되어 있는지

---

### 3단계: 환경 변수 형식 문제 해결

#### 문제 1: 큰따옴표가 없음
**현재:**
```
-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDgaoKU4QHuizrX\n...
```

**수정:**
```
"-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDgaoKU4QHuizrX\n..."
```

#### 문제 2: 실제 줄바꿈으로 변환됨
**현재:**
```
"-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDgaoKU4QHuizrX
+RMtAE1fRugKM5mX2iiAhKI7KgfIwafJaPYkqRQoooUX01MvViNhUXgWuKH2EM2M
..."
```

**수정:**
- Vercel 환경 변수는 한 줄로 입력해야 합니다
- `\n` 문자를 사용해야 합니다 (실제 줄바꿈 아님)

#### 문제 3: 앞뒤 공백
**현재:**
```
" -----BEGIN PRIVATE KEY-----\n..."
```

**수정:**
- 앞뒤 공백 제거

---

## ✅ 올바른 설정 방법

### 방법 1: .env.local에서 복사

1. `.env.local` 파일 열기
2. `FIREBASE_PRIVATE_KEY=` 뒤의 전체 값 복사 (큰따옴표 포함)
3. Vercel 환경 변수에 붙여넣기

**예시:**
```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDgaoKU4QHuizrX\n+RMtAE1fRugKM5mX2iiAhKI7KgfIwafJaPYkqRQoooUX01MvViNhUXgWuKH2EM2M\nGDairN+LT5H5I3ieaoQ7OINGxFBYf/y0PlE536ByXeWKdE0OTv8+oijvt36pu3Uk\nRp48oEhsF/7EiphDB91DrxWKbT65zYDt3lisz5yWW5nSXBVQsMn9c4N7hLFgz0v3\n+G9W2jabQw8yKEMlLVu/GE1wDzuegffyuWDEkydMlYUXnriRHKEjamzZANOg1UwY\nYOzglCNSqyttNmm+pKKHx9r4orX/MYwKS3/6d7hufadfLEJ3W1Qt1yB7RhpVCx52\nhiT9zVILAgMBAAECggEAUQrFu2QCYZXQGzxsi1zHlDe0BjMaLXdwFvFO8NS92Obu\nY9LOyPByQjZmn/MF4FtYDYXxOytT+duZjxUTbe3GELYcff8sSPEobYZ8CetNJJib\ntq+mf6Lde0+jXDuhtCAdFw5SgDcgu8Thicciz7wGS1ri+zEdyV8mrZGl0sae11PN\nMcH4W94wqA/cowI6Cwz6Y6c3Y2wjp52ms+AtpMJixzFi5l8ZEJd0tY9AYKxXivjM\nOvlRxdpuU/PwrcP/MfcL75GeLuZCZ0gTTlm2AaGTl9bwg8EO5NHtyRpCPnRRd2ww\n3xnUJiiYDY6tqsjIFXfCZbvz4cS8gH9SVBweJYBfsQKBgQDyaq4eyy0e9x8Qsb39\nB1bKsb1CiSTcMoFoQJOffs2+wTGqHDOCvJMAPDyW5AQzUgSWp0BKuI0PkrXtN0IA\nBuAFgqSkE6QeLmAMxo88nE8u1tq5yaQyXVb9stAX2XN5XK3IEzKm6jed/UPK0xyY\nHk+wQ9n6Vaa6v5daBzlhxIcdCQKBgQDs/Z8TK4Sb8w+HyZvuU0q65QWgZc4TgndQ\ncM4TKwYPEE/qJ/HAKcYNyut8DQZpTMy9iB3WuU5QbF5WTDKnqpC93gAOiIur/McD\n/vZt3qlMsJKUPrsxqMsJMHofNTkUuUxpuo8YCeohJaQ4XZDiPDs5gRsa0GQE2bJu\nPgOQGNnPcwKBgQC7Wr3l6MufogitY2Hd3D00/Pe0I8CMOrCPPVGatGsZYcEbox4g\njdPjG6sMR4ADlgEb2nmzBj1natEWXF2zHZ0oRRcwBEoUVW1AknmDs57zKXT0oCY6\nEq+39eokdJhtlLZu6n98R4rinSo26MCxxMN8DIS8mFP7AzZbizfLGxP92QKBgQCi\nJ58ylLI1qofT10TUOzWEz7Ob3ky02K4e4jB+uQ96OyUTCKXHYE3dnhymUpsybZQh\nkwMnqr9FFAEwdw6p3nEPGNldGFzJHzplJ40h/BpHGQISYSHghqf1769/rwERhwAb\nz8SdJBuI9qJ41ryNr7yuSgJrxG7LStFl0RTLAdX2tQKBgQDWmGv7xL0k99dK/YJu\nWMIjM9VTCTUkkzWix92ew6i+XSin1OLRfdKZRe7XiYhtfe/qr9hDl8eCaqsBbKFw\nRANHs5cKZaMAgoVweM+yjo/DGRAqVbW/Lqw4UIUBxf7HPYwzbR94nh5ZJbwgxTai\nMoqHQIwMupOBLp6VRoii0bUhGA==\n-----END PRIVATE KEY-----\n"
```

---

### 방법 2: Firebase Console에서 새 키 생성

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 선택
3. 프로젝트 설정 → 서비스 계정 탭
4. "새 비공개 키 만들기" 클릭
5. JSON 파일 다운로드
6. JSON 파일에서 `private_key` 값 복사
7. Vercel 환경 변수에 큰따옴표로 감싸서 입력

---

## 🔧 단계별 수정 방법

### Step 1: 기존 환경 변수 삭제
1. Vercel 대시보드 → Settings → Environment Variables
2. `FIREBASE_PRIVATE_KEY` 찾기
3. **Delete** 또는 **삭제** 버튼 클릭

### Step 2: 새로 추가
1. **Add New** 또는 **추가** 버튼 클릭
2. Key: `FIREBASE_PRIVATE_KEY`
3. Value: `.env.local` 파일에서 전체 값 복사 (큰따옴표 포함)
4. Environment: Production, Preview, Development 모두 선택
5. **Save** 클릭

### Step 3: 재배포
1. Deployments 탭
2. 최신 배포 클릭
3. **Redeploy** 클릭
4. 빌드 완료까지 대기

---

## 🐛 여전히 안 되면

### 대안 1: Vercel CLI 사용
로컬에서 Vercel CLI로 환경 변수를 설정할 수 있습니다:

```bash
# Vercel CLI 설치 (없다면)
npm i -g vercel

# 환경 변수 설정
vercel env add FIREBASE_PRIVATE_KEY production
# 프롬프트가 나오면 .env.local의 값을 붙여넣기
```

### 대안 2: 코드에서 디버깅 로그 추가
서버 코드에 로그를 추가하여 실제로 받은 값을 확인:

```typescript
console.log('FIREBASE_PRIVATE_KEY 길이:', process.env.FIREBASE_PRIVATE_KEY?.length)
console.log('FIREBASE_PRIVATE_KEY 시작:', process.env.FIREBASE_PRIVATE_KEY?.substring(0, 50))
console.log('FIREBASE_PRIVATE_KEY 끝:', process.env.FIREBASE_PRIVATE_KEY?.substring(process.env.FIREBASE_PRIVATE_KEY.length - 50))
```

---

## ✅ 최종 확인

1. ✅ Vercel 함수 로그에서 에러 메시지 확인
2. ✅ 환경 변수 값이 올바른 형식인지 확인
3. ✅ 재배포 완료
4. ✅ 다시 테스트

문제가 계속되면 Vercel 함수 로그의 전체 에러 메시지를 공유해주세요!
