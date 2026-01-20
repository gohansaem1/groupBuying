# 테스트용 사용자 계정 생성 가이드

테스트를 위해 4개의 사용자 계정을 생성하는 방법입니다.

## 방법 1: Firestore에서 직접 생성 (간단)

### 1단계: Firebase Console 접속

1. **Firebase Console 접속**
   - https://console.firebase.google.com/ 접속
   - 프로젝트 선택 (`groupbuying-5d9c5`)

2. **Firestore Database 열기**
   - 왼쪽 메뉴에서 "Firestore Database" 클릭
   - "데이터" 탭 클릭

### 2단계: users 컬렉션 선택

1. **users 컬렉션 클릭**
   - `users` 컬렉션이 없으면 자동으로 생성됩니다

### 3단계: 테스트 사용자 문서 생성

각 사용자를 하나씩 생성합니다:

#### 사용자 1: 일반 사용자

1. **문서 추가** 클릭
2. **문서 ID**: `test_user_1` (또는 원하는 ID)
3. **필드 추가**:
   - `uid` (문자열): `test_user_1`
   - `email` (문자열): `user1@test.com`
   - `displayName` (문자열): `테스트 사용자 1`
   - `photoURL` (문자열): `https://via.placeholder.com/150` (선택사항)
   - `role` (문자열): `user`
   - `createdAt` (타임스탬프): 현재 시간
   - `updatedAt` (타임스탬프): 현재 시간
4. **저장**

#### 사용자 2: Organizer 대기 중

1. **문서 추가** 클릭
2. **문서 ID**: `test_user_2`
3. **필드 추가**:
   - `uid` (문자열): `test_user_2`
   - `email` (문자열): `user2@test.com`
   - `displayName` (문자열): `테스트 사용자 2`
   - `photoURL` (문자열): `https://via.placeholder.com/150` (선택사항)
   - `role` (문자열): `organizer_pending`
   - `createdAt` (타임스탬프): 현재 시간
   - `updatedAt` (타임스탬프): 현재 시간
4. **저장**

#### 사용자 3: Organizer

1. **문서 추가** 클릭
2. **문서 ID**: `test_user_3`
3. **필드 추가**:
   - `uid` (문자열): `test_user_3`
   - `email` (문자열): `user3@test.com`
   - `displayName` (문자열): `테스트 사용자 3`
   - `photoURL` (문자열): `https://via.placeholder.com/150` (선택사항)
   - `role` (문자열): `organizer`
   - `createdAt` (타임스탬프): 현재 시간
   - `updatedAt` (타임스탬프): 현재 시간
4. **저장**

#### 사용자 4: 관리자 (또는 일반 사용자)

1. **문서 추가** 클릭
2. **문서 ID**: `test_user_4`
3. **필드 추가**:
   - `uid` (문자열): `test_user_4`
   - `email` (문자열): `user4@test.com`
   - `displayName` (문자열): `테스트 사용자 4`
   - `photoURL` (문자열): `https://via.placeholder.com/150` (선택사항)
   - `role` (문자열): `user` (또는 `admin`으로 설정 가능)
   - `createdAt` (타임스탬프): 현재 시간
   - `updatedAt` (타임스탬프): 현재 시간
4. **저장**

## 방법 2: JSON으로 일괄 생성 (빠름)

Firebase Console에서 JSON 가져오기 기능을 사용할 수 있습니다:

1. **Firestore Database → 데이터 탭**
2. **users 컬렉션 → 가져오기** 클릭
3. 다음 JSON 내용을 복사하여 붙여넣기:

```json
{
  "test_user_1": {
    "uid": "test_user_1",
    "email": "user1@test.com",
    "displayName": "테스트 사용자 1",
    "photoURL": "https://via.placeholder.com/150",
    "role": "user",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  },
  "test_user_2": {
    "uid": "test_user_2",
    "email": "user2@test.com",
    "displayName": "테스트 사용자 2",
    "photoURL": "https://via.placeholder.com/150",
    "role": "organizer_pending",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  },
  "test_user_3": {
    "uid": "test_user_3",
    "email": "user3@test.com",
    "displayName": "테스트 사용자 3",
    "photoURL": "https://via.placeholder.com/150",
    "role": "organizer",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  },
  "test_user_4": {
    "uid": "test_user_4",
    "email": "user4@test.com",
    "displayName": "테스트 사용자 4",
    "photoURL": "https://via.placeholder.com/150",
    "role": "user",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

## 방법 3: 스크립트로 생성 (고급)

프로젝트 루트에 `scripts/create-test-users.js` 파일을 만들어 실행할 수 있습니다:

```javascript
// scripts/create-test-users.js
const admin = require('firebase-admin');
const serviceAccount = require('../path-to-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const testUsers = [
  {
    uid: 'test_user_1',
    email: 'user1@test.com',
    displayName: '테스트 사용자 1',
    photoURL: 'https://via.placeholder.com/150',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    uid: 'test_user_2',
    email: 'user2@test.com',
    displayName: '테스트 사용자 2',
    photoURL: 'https://via.placeholder.com/150',
    role: 'organizer_pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    uid: 'test_user_3',
    email: 'user3@test.com',
    displayName: '테스트 사용자 3',
    photoURL: 'https://via.placeholder.com/150',
    role: 'organizer',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    uid: 'test_user_4',
    email: 'user4@test.com',
    displayName: '테스트 사용자 4',
    photoURL: 'https://via.placeholder.com/150',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

async function createTestUsers() {
  for (const user of testUsers) {
    await db.collection('users').doc(user.uid).set(user);
    console.log(`Created user: ${user.uid} (${user.role})`);
  }
  console.log('All test users created!');
}

createTestUsers().then(() => process.exit(0));
```

## 테스트 사용자 목록

| 사용자 ID | 이메일 | 이름 | 역할 |
|---------|--------|------|------|
| test_user_1 | user1@test.com | 테스트 사용자 1 | user (일반 사용자) |
| test_user_2 | user2@test.com | 테스트 사용자 2 | organizer_pending (승인 대기) |
| test_user_3 | user3@test.com | 테스트 사용자 3 | organizer (Organizer) |
| test_user_4 | user4@test.com | 테스트 사용자 4 | user (일반 사용자) |

## 주의사항

### Firebase Authentication 사용자 생성

Firestore에만 문서를 생성하면, 실제 로그인은 할 수 없습니다. Firebase Authentication에도 사용자를 생성해야 합니다:

1. **Firebase Console → Authentication → Users**
2. **사용자 추가** 클릭
3. **UID**: `test_user_1` (또는 각 사용자 ID)
4. **이메일**: `user1@test.com`
5. **비밀번호**: 임시 비밀번호 설정 (실제로는 사용하지 않음)
6. **사용자 추가** 클릭

**참고**: 이 프로젝트는 Custom Token을 사용하므로, 실제 로그인은 카카오 로그인을 통해서만 가능합니다. Firestore 문서만 생성해도 관리자 페이지에서 사용자 목록을 볼 수 있습니다.

## 확인

1. **관리자 페이지 접속**
   - http://localhost:3000/admin 접속
   - "사용자 관리" 탭 클릭
   - 생성한 테스트 사용자들이 보이는지 확인

2. **역할 확인**
   - 각 사용자의 역할이 올바르게 설정되었는지 확인
   - 역할 변경 기능 테스트

## 빠른 체크리스트

- [ ] Firebase Console 접속
- [ ] Firestore Database → 데이터 탭
- [ ] users 컬렉션 선택
- [ ] test_user_1 문서 생성 (role: user)
- [ ] test_user_2 문서 생성 (role: organizer_pending)
- [ ] test_user_3 문서 생성 (role: organizer)
- [ ] test_user_4 문서 생성 (role: user)
- [ ] 관리자 페이지에서 확인

