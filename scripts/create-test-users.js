/**
 * 테스트 사용자 생성 스크립트
 * 
 * Firestore에 테스트용 사용자 4명을 생성합니다.
 */

// .env.local 파일 로드
require('dotenv').config({ path: '.env.local' });

const admin = require('firebase-admin');

// 환경 변수에서 Firebase Admin 설정 가져오기
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('❌ Firebase Admin 환경 변수가 설정되지 않았습니다.');
  console.error('필수 환경 변수:');
  console.error('  - FIREBASE_PROJECT_ID');
  console.error('  - FIREBASE_CLIENT_EMAIL');
  console.error('  - FIREBASE_PRIVATE_KEY');
  console.error('\n.env.local 파일을 확인하세요.');
  process.exit(1);
}

// Firebase Admin 초기화
try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
  console.log('✅ Firebase Admin 초기화 성공:', projectId);
} catch (error) {
  console.error('❌ Firebase Admin 초기화 오류:', error);
  process.exit(1);
}

const db = admin.firestore();
const auth = admin.auth();

const testUsers = [
  {
    uid: 'test_user_1',
    email: 'user1@test.com',
    displayName: '테스트 사용자 1',
    photoURL: 'https://via.placeholder.com/150',
    role: 'user',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    uid: 'test_user_2',
    email: 'user2@test.com',
    displayName: '테스트 사용자 2',
    photoURL: 'https://via.placeholder.com/150',
    role: 'organizer_pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    uid: 'test_user_3',
    email: 'user3@test.com',
    displayName: '테스트 사용자 3',
    photoURL: 'https://via.placeholder.com/150',
    role: 'organizer',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    uid: 'test_user_4',
    email: 'user4@test.com',
    displayName: '테스트 사용자 4',
    photoURL: 'https://via.placeholder.com/150',
    role: 'user',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
];

async function createTestUsers() {
  console.log('\n📝 테스트 사용자 생성 시작...\n');

  for (const userData of testUsers) {
    try {
      // Firestore에 사용자 문서 생성
      await db.collection('users').doc(userData.uid).set(userData);
      console.log(`✅ Firestore 사용자 생성: ${userData.uid} (${userData.role})`);

      // Firebase Authentication에 사용자 생성 (없으면)
      try {
        await auth.getUser(userData.uid);
        console.log(`   ℹ️  Firebase Auth 사용자 이미 존재: ${userData.uid}`);
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          const createUserData = {
            uid: userData.uid,
            email: userData.email,
            displayName: userData.displayName,
            photoURL: userData.photoURL,
          };
          await auth.createUser(createUserData);
          console.log(`✅ Firebase Auth 사용자 생성: ${userData.uid}`);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error(`❌ 사용자 생성 실패 (${userData.uid}):`, error.message);
    }
  }

  console.log('\n✨ 모든 테스트 사용자 생성 완료!\n');
  console.log('생성된 사용자:');
  testUsers.forEach(user => {
    console.log(`  - ${user.uid}: ${user.displayName} (${user.role})`);
  });
  console.log('\n💡 테스트 로그인 사용 방법:');
  console.log('  1. http://localhost:3000/login 접속');
  console.log('  2. "테스트 로그인 →" 클릭');
  console.log('  3. 사용자 ID 입력 (예: test_user_1)');
  console.log('  4. "테스트 로그인" 클릭\n');
}

// 스크립트 실행
createTestUsers()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 스크립트 실행 오류:', error);
    process.exit(1);
  });

