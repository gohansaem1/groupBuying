/**
 * 관리자 계정 생성/승격 스크립트
 * 
 * 기존 카카오 계정을 관리자(admin)로 승격하거나,
 * 새로운 관리자 계정을 생성합니다.
 * 
 * 사용법:
 *   1. 기존 사용자를 관리자로 승격:
 *      node scripts/create-admin-account.js promote <사용자UID 또는 이메일>
 * 
 *   2. 대화형 모드 (기존 사용자 목록에서 선택):
 *      node scripts/create-admin-account.js
 * 
 * 환경 변수:
 *   - FIREBASE_PROJECT_ID
 *   - FIREBASE_CLIENT_EMAIL
 *   - FIREBASE_PRIVATE_KEY
 */

require('dotenv').config({ path: '.env.local' })
const admin = require('firebase-admin')
const readline = require('readline')

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
    console.error('\n.env.local 파일을 확인하세요.')
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
const auth = admin.auth()

// 사용자 입력 받기
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(query) {
  return new Promise(resolve => rl.question(query, resolve))
}

async function promoteUserToAdmin(userIdentifier) {
  try {
    let userId = userIdentifier
    let userEmail = null

    // 이메일 형식인지 확인
    if (userIdentifier.includes('@')) {
      userEmail = userIdentifier
      // 이메일로 사용자 찾기
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

    // 이미 admin 또는 owner 역할이면 변경 불필요
    if (currentRole === 'admin' || currentRole === 'owner') {
      console.log(`\n✅ 이미 ${currentRole} 역할입니다. 변경할 필요가 없습니다.`)
      process.exit(0)
    }

    // owner 역할은 변경 불가
    if (currentRole === 'owner') {
      console.error('\n❌ 오류: owner 역할은 변경할 수 없습니다.')
      console.error('   owner 역할은 ADMIN_OWNER_UID 환경 변수로 관리됩니다.')
      process.exit(1)
    }

    // 역할 변경 확인
    console.log(`\n⚠️  역할을 '${currentRole}'에서 'admin'으로 변경하시겠습니까?`)
    console.log('   관리자는 다음 권한을 가집니다:')
    console.log('   - 모든 사용자 조회 및 역할 변경')
    console.log('   - 상품 관리')
    console.log('   - 공동구매 건 관리')
    console.log('   - 진행자 승인/거부')
    console.log('   - Organizer 모집 ON/OFF 설정')
    console.log('   - 수수료율 설정')
    console.log('   ⚠️  단, 공동구매 건 생성은 불가능합니다 (Organizer만 가능)')

    const confirm = await question('\n계속하시겠습니까? (y/N): ')
    if (confirm.toLowerCase() !== 'y') {
      console.log('❌ 취소되었습니다.')
      rl.close()
      process.exit(0)
    }

    console.log('\n🔄 역할 변경 중...')

    await userRef.update({
      role: 'admin',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    console.log('\n✅ 역할 변경 완료!')
    console.log(`   ${currentRole} → admin`)
    console.log('\n📝 변경 사항:')
    console.log('   - 사용자가 관리자(admin) 역할로 변경되었습니다.')
    console.log('   - 관리자 페이지(/admin)에 접근할 수 있습니다.')
    console.log('   - 카카오 로그인으로 관리자 기능을 사용할 수 있습니다.')
    console.log('   ⚠️  주의: 관리자는 공동구매 건을 생성할 수 없습니다.')
    console.log('   ⚠️  공동구매 건 생성이 필요하면 organizer 역할도 함께 부여해야 합니다.')

    rl.close()
    process.exit(0)
  } catch (error) {
    console.error('\n❌ 오류 발생:', error.message)
    console.error(error)
    rl.close()
    process.exit(1)
  }
}

async function listUsers() {
  try {
    console.log('\n📋 사용자 목록 조회 중...\n')
    
    const usersSnapshot = await db.collection('users').get()
    
    if (usersSnapshot.empty) {
      console.log('❌ 사용자가 없습니다.')
      rl.close()
      process.exit(0)
    }

    const users = []
    usersSnapshot.forEach(doc => {
      const data = doc.data()
      users.push({
        uid: doc.id,
        email: data.email || '없음',
        nickname: data.nickname || data.displayName || '없음',
        role: data.role || 'user'
      })
    })

    // 역할별로 정렬 (user → organizer_pending → organizer → admin → owner)
    const roleOrder = { 'user': 1, 'organizer_pending': 2, 'organizer': 3, 'admin': 4, 'owner': 5 }
    users.sort((a, b) => {
      const orderA = roleOrder[a.role] || 0
      const orderB = roleOrder[b.role] || 0
      if (orderA !== orderB) return orderA - orderB
      return a.email.localeCompare(b.email)
    })

    console.log('사용자 목록:')
    console.log('─'.repeat(80))
    users.forEach((user, index) => {
      const roleEmoji = {
        'user': '👤',
        'organizer_pending': '⏳',
        'organizer': '👨‍💼',
        'admin': '👑',
        'owner': '🔐'
      }[user.role] || '❓'
      
      console.log(`${index + 1}. ${roleEmoji} ${user.email}`)
      console.log(`   닉네임: ${user.nickname}`)
      console.log(`   역할: ${user.role}`)
      console.log(`   UID: ${user.uid}`)
      console.log('')
    })
    console.log('─'.repeat(80))

    const selectedIndex = await question('\n관리자로 승격할 사용자 번호를 입력하세요 (취소: 0): ')
    const index = parseInt(selectedIndex) - 1

    if (isNaN(index) || index < 0 || index >= users.length) {
      console.log('❌ 취소되었습니다.')
      rl.close()
      process.exit(0)
    }

    const selectedUser = users[index]
    await promoteUserToAdmin(selectedUser.uid)

  } catch (error) {
    console.error('\n❌ 오류 발생:', error.message)
    console.error(error)
    rl.close()
    process.exit(1)
  }
}

// 메인 함수
async function main() {
  const args = process.argv.slice(2)
  const command = args[0]
  const userIdentifier = args[1]

  console.log('\n👑 관리자 계정 생성/승격 스크립트\n')

  if (command === 'promote' && userIdentifier) {
    // 직접 승격 모드
    await promoteUserToAdmin(userIdentifier)
  } else if (command === 'promote' && !userIdentifier) {
    console.error('❌ 사용법: node scripts/create-admin-account.js promote <사용자UID 또는 이메일>')
    console.error('\n예시:')
    console.error('  node scripts/create-admin-account.js promote abc123xyz')
    console.error('  node scripts/create-admin-account.js promote user@example.com')
    rl.close()
    process.exit(1)
  } else {
    // 대화형 모드: 사용자 목록에서 선택
    await listUsers()
  }
}

// 스크립트 실행
main().catch((error) => {
  console.error('❌ 스크립트 실행 오류:', error)
  rl.close()
  process.exit(1)
})
