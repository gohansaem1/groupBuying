/**
 * 사용자 역할 초기화 스크립트
 * 
 * 특정 사용자의 역할을 'user'로 변경합니다.
 * 이전에 admin 역할이었던 카카오 계정을 일반 사용자로 변경할 때 사용합니다.
 * 
 * 사용법:
 *   node scripts/reset-user-role.js <사용자UID 또는 이메일>
 * 
 * 예시:
 *   node scripts/reset-user-role.js abc123xyz
 *   node scripts/reset-user-role.js user@example.com
 */

require('dotenv').config({ path: '.env.local' })
const admin = require('firebase-admin')

// Firebase Admin 초기화
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  let privateKey = process.env.FIREBASE_PRIVATE_KEY

  if (!projectId || !clientEmail || !privateKey) {
    console.error('❌ Firebase Admin 환경 변수가 설정되지 않았습니다.')
    console.error('필수 환경 변수:')
    console.error('  - FIREBASE_PROJECT_ID')
    console.error('  - FIREBASE_CLIENT_EMAIL')
    console.error('  - FIREBASE_PRIVATE_KEY')
    process.exit(1)
  }

  // Private Key 처리
  privateKey = privateKey.replace(/^["']|["']$/g, '')
  privateKey = privateKey.replace(/\\n/g, '\n')

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    })
    console.log('✅ Firebase Admin 초기화 완료')
  } catch (error) {
    console.error('❌ Firebase Admin 초기화 실패:', error.message)
    process.exit(1)
  }
}

const db = admin.firestore()

async function resetUserRole(userIdentifier) {
  try {
    let userId = userIdentifier
    let userEmail = null

    // 이메일 형식인지 확인
    if (userIdentifier.includes('@')) {
      userEmail = userIdentifier
      // 이메일로 사용자 찾기
      const auth = admin.auth()
      try {
        const user = await auth.getUserByEmail(userEmail)
        userId = user.uid
        console.log(`✅ 사용자 찾음: ${userEmail} (UID: ${userId})`)
      } catch (error) {
        console.error(`❌ 이메일로 사용자를 찾을 수 없습니다: ${userEmail}`)
        console.error('   Firebase Authentication에서 해당 이메일의 사용자가 존재하는지 확인하세요.')
        process.exit(1)
      }
    }

    // Firestore에서 사용자 문서 가져오기
    const userRef = db.collection('users').doc(userId)
    const userDoc = await userRef.get()

    if (!userDoc.exists) {
      console.error(`❌ Firestore에서 사용자 문서를 찾을 수 없습니다: ${userId}`)
      console.error('   users 컬렉션에 해당 UID의 문서가 존재하는지 확인하세요.')
      process.exit(1)
    }

    const userData = userDoc.data()
    const currentRole = userData.role

    console.log('\n📋 현재 사용자 정보:')
    console.log(`   UID: ${userId}`)
    console.log(`   이메일: ${userData.email || '없음'}`)
    console.log(`   닉네임: ${userData.nickname || userData.displayName || '없음'}`)
    console.log(`   현재 역할: ${currentRole}`)

    // 이미 user 역할이면 변경 불필요
    if (currentRole === 'user') {
      console.log('\n✅ 이미 일반 사용자(user) 역할입니다. 변경할 필요가 없습니다.')
      process.exit(0)
    }

    // owner 역할은 변경 불가
    if (currentRole === 'owner') {
      console.error('\n❌ 오류: owner 역할은 변경할 수 없습니다.')
      console.error('   owner 역할은 ADMIN_OWNER_UID 환경 변수로 관리됩니다.')
      process.exit(1)
    }

    // 역할 변경 확인
    console.log(`\n⚠️  역할을 '${currentRole}'에서 'user'로 변경하시겠습니까?`)
    console.log('   이 작업은 되돌릴 수 없습니다.')

    // 확인을 위해 잠시 대기 (실제로는 readline을 사용할 수 있지만, 스크립트 실행 시 확인 메시지로 충분)
    console.log('\n🔄 역할 변경 중...')

    await userRef.update({
      role: 'user',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    console.log('\n✅ 역할 변경 완료!')
    console.log(`   ${currentRole} → user`)
    console.log('\n📝 변경 사항:')
    console.log('   - 사용자가 일반 사용자(user) 역할로 변경되었습니다.')
    console.log('   - 관리자 페이지(/admin)에 접근할 수 없습니다.')
    console.log('   - 일반 사용자 홈 화면이 표시됩니다.')

    process.exit(0)
  } catch (error) {
    console.error('\n❌ 오류 발생:', error.message)
    console.error(error)
    process.exit(1)
  }
}

// 명령줄 인자 확인
const userIdentifier = process.argv[2]

if (!userIdentifier) {
  console.error('❌ 사용법: node scripts/reset-user-role.js <사용자UID 또는 이메일>')
  console.error('\n예시:')
  console.error('  node scripts/reset-user-role.js abc123xyz')
  console.error('  node scripts/reset-user-role.js user@example.com')
  process.exit(1)
}

// 스크립트 실행
resetUserRole(userIdentifier)
