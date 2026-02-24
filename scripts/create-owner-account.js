/**
 * 오너 계정 생성 스크립트
 * 
 * Firebase Auth에 이메일/비밀번호 계정을 생성하고,
 * Firestore에 role: 'owner'로 사용자 프로필을 생성합니다.
 * 
 * 사용법:
 *   node scripts/create-owner-account.js
 * 
 * 환경 변수:
 *   - FIREBASE_PROJECT_ID
 *   - FIREBASE_CLIENT_EMAIL
 *   - FIREBASE_PRIVATE_KEY
 */

// .env.local 파일 로드
require('dotenv').config({ path: '.env.local' });

const admin = require('firebase-admin');
const readline = require('readline');

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

// 사용자 입력 받기
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createOwnerAccount() {
  console.log('\n🔐 오너 계정 생성 스크립트\n');
  console.log('⚠️  주의: 이 스크립트는 개발 환경에서만 사용하세요.');
  console.log('⚠️  프로덕션 환경에서는 Firebase Console에서 수동으로 생성하는 것을 권장합니다.\n');

  try {
    // 이메일 입력
    const email = await question('이메일을 입력하세요: ');
    if (!email || !email.includes('@')) {
      console.error('❌ 유효한 이메일 주소를 입력하세요.');
      rl.close();
      process.exit(1);
    }

    // 비밀번호 입력
    const password = await question('비밀번호를 입력하세요 (최소 6자): ');
    if (!password || password.length < 6) {
      console.error('❌ 비밀번호는 최소 6자 이상이어야 합니다.');
      rl.close();
      process.exit(1);
    }

    // 비밀번호 확인
    const passwordConfirm = await question('비밀번호를 다시 입력하세요: ');
    if (password !== passwordConfirm) {
      console.error('❌ 비밀번호가 일치하지 않습니다.');
      rl.close();
      process.exit(1);
    }

    // 표시 이름 입력
    const displayName = await question('표시 이름을 입력하세요 (선택사항): ') || '오너';

    console.log('\n📝 입력 정보:');
    console.log(`  이메일: ${email}`);
    console.log(`  표시 이름: ${displayName}`);
    console.log(`  비밀번호: ${'*'.repeat(password.length)}\n`);

    const confirm = await question('위 정보로 오너 계정을 생성하시겠습니까? (y/N): ');
    if (confirm.toLowerCase() !== 'y') {
      console.log('❌ 취소되었습니다.');
      rl.close();
      process.exit(0);
    }

    // 이메일 중복 체크 (Firestore)
    console.log('\n🔍 이메일 중복 체크 중...');
    const existingUsers = await db.collection('users')
      .where('email', '==', email)
      .get();
    
    if (!existingUsers.empty) {
      console.warn('⚠️  경고: 같은 이메일을 사용하는 사용자가 이미 존재합니다:');
      existingUsers.forEach(doc => {
        const userData = doc.data();
        console.warn(`  - UID: ${doc.id}, 역할: ${userData.role}`);
      });
      const continueAnyway = await question('\n계속하시겠습니까? (y/N): ');
      if (continueAnyway.toLowerCase() !== 'y') {
        console.log('❌ 취소되었습니다.');
        rl.close();
        process.exit(0);
      }
    }

    // Firebase Auth에 사용자 생성
    console.log('\n📦 Firebase Auth에 사용자 생성 중...');
    let user;
    try {
      user = await auth.createUser({
        email,
        password,
        displayName,
        emailVerified: false, // 이메일 인증은 수동으로 진행
      });
      console.log('✅ Firebase Auth 사용자 생성 완료:', user.uid);
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        console.error('❌ 이 이메일은 이미 Firebase Auth에 등록되어 있습니다.');
        console.error('   Firebase Console > Authentication > Users에서 확인하세요.');
        rl.close();
        process.exit(1);
      }
      throw error;
    }

    // Firestore에 사용자 프로필 생성
    console.log('📦 Firestore에 사용자 프로필 생성 중...');
    const userRef = db.collection('users').doc(user.uid);
    const userSnap = await userRef.get();
    
    if (userSnap.exists) {
      console.warn('⚠️  경고: Firestore에 이미 사용자 문서가 존재합니다.');
      const updateRole = await question('역할을 "owner"로 업데이트하시겠습니까? (y/N): ');
      if (updateRole.toLowerCase() === 'y') {
        await userRef.update({
          role: 'owner',
          email,
          displayName,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log('✅ Firestore 사용자 프로필 업데이트 완료');
      } else {
        console.log('❌ 취소되었습니다. Firestore 문서는 변경되지 않았습니다.');
        console.log('⚠️  주의: Firebase Auth 사용자는 이미 생성되었습니다.');
        rl.close();
        process.exit(1);
      }
    } else {
      await userRef.set({
        uid: user.uid,
        email,
        displayName,
        nickname: null,
        photoURL: null,
        role: 'owner',
        userAgreedToTerms: false,
        organizerAgreedToTerms: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log('✅ Firestore 사용자 프로필 생성 완료');
    }

    console.log('\n✨ 오너 계정 생성 완료!\n');
    console.log('📋 다음 단계:');
    console.log(`1. 생성된 UID: ${user.uid}`);
    console.log(`2. .env.local 파일에 다음 환경 변수를 추가하세요:`);
    console.log(`   ADMIN_OWNER_UID=${user.uid}`);
    console.log(`3. 여러 오너 계정을 허용하려면 쉼표로 구분하세요:`);
    console.log(`   ADMIN_OWNER_UID=${user.uid},another_uid_here`);
    console.log(`4. Vercel에 배포하는 경우, Vercel 대시보드에서도 환경 변수를 설정하세요.`);
    console.log(`5. 재배포 후 /admin/login에서 로그인할 수 있습니다.\n`);

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    if (error.code) {
      console.error('   에러 코드:', error.code);
    }
    process.exit(1);
  } finally {
    rl.close();
  }
}

// 스크립트 실행
createOwnerAccount()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 스크립트 실행 오류:', error);
    process.exit(1);
  });
