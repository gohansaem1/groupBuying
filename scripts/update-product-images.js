/**
 * 상품 이미지 URL 업데이트 스크립트
 * 
 * Firestore에 등록된 상품에 이미지 URL을 추가합니다.
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
  console.log('✅ Firebase Admin 초기화 완료');
} catch (error) {
  console.error('❌ Firebase Admin 초기화 실패:', error.message);
  process.exit(1);
}

const db = admin.firestore();

/**
 * 상품 이미지 URL 매핑
 * 
 * 상품 ID 또는 상품명을 키로 하고, 이미지 URL을 값으로 설정합니다.
 * 상품명으로 매핑할 경우, 정확히 일치하는 상품을 찾습니다.
 */
const productImageMap = {
  // 예시: 상품 ID로 매핑
  // 'productId1': 'https://example.com/image1.jpg',
  // 'productId2': 'https://example.com/image2.jpg',
  
  // 예시: 상품명으로 매핑 (더 직관적)
  // '제주 감귤': 'https://example.com/jeju-orange.jpg',
  // '제주 한라봉': 'https://example.com/jeju-hallabong.jpg',
  
  // 여기에 실제 상품 정보를 입력하세요
  // 예시:
  // '상품명1': 'https://example.com/image1.jpg',
  // '상품명2': 'https://example.com/image2.jpg',
};

/**
 * 모든 상품 조회
 */
async function getAllProducts() {
  try {
    const productsRef = db.collection('products');
    const snapshot = await productsRef.get();
    
    const products = [];
    snapshot.forEach(doc => {
      products.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    
    return products;
  } catch (error) {
    console.error('❌ 상품 조회 실패:', error);
    throw error;
  }
}

/**
 * 상품 이미지 업데이트
 */
async function updateProductImages() {
  try {
    console.log('\n📦 등록된 상품 목록 조회 중...');
    const products = await getAllProducts();
    
    if (products.length === 0) {
      console.log('⚠️  등록된 상품이 없습니다.');
      return;
    }
    
    console.log(`\n✅ 총 ${products.length}개의 상품을 찾았습니다:\n`);
    products.forEach((product, index) => {
      console.log(`${index + 1}. [${product.id}] ${product.name || '이름 없음'}`);
      if (product.imageUrl) {
        console.log(`   이미지: ${product.imageUrl}`);
      } else {
        console.log(`   이미지: 없음`);
      }
    });
    
    // 매핑이 비어있으면 안내 메시지 출력
    if (Object.keys(productImageMap).length === 0) {
      console.log('\n⚠️  productImageMap이 비어있습니다.');
      console.log('스크립트 파일에서 productImageMap을 수정하여 상품 이미지 URL을 설정하세요.');
      console.log('\n예시:');
      console.log('const productImageMap = {');
      console.log("  '제주 감귤': 'https://example.com/jeju-orange.jpg',");
      console.log("  '제주 한라봉': 'https://example.com/jeju-hallabong.jpg',");
      console.log('};');
      return;
    }
    
    console.log('\n🔄 상품 이미지 업데이트 시작...\n');
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const product of products) {
      let imageUrl = null;
      
      // 상품 ID로 먼저 찾기
      if (productImageMap[product.id]) {
        imageUrl = productImageMap[product.id];
      }
      // 상품명으로 찾기
      else if (product.name && productImageMap[product.name]) {
        imageUrl = productImageMap[product.name];
      }
      
      if (imageUrl) {
        try {
          await db.collection('products').doc(product.id).update({
            imageUrl: imageUrl,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log(`✅ [${product.id}] ${product.name || '이름 없음'}`);
          console.log(`   이미지 URL 추가: ${imageUrl}`);
          updatedCount++;
        } catch (error) {
          console.error(`❌ [${product.id}] ${product.name || '이름 없음'} 업데이트 실패:`, error.message);
        }
      } else {
        console.log(`⏭️  [${product.id}] ${product.name || '이름 없음'} - 매핑 없음 (건너뜀)`);
        skippedCount++;
      }
    }
    
    console.log('\n📊 업데이트 완료:');
    console.log(`   ✅ 업데이트됨: ${updatedCount}개`);
    console.log(`   ⏭️  건너뜀: ${skippedCount}개`);
    console.log(`   📦 전체: ${products.length}개`);
    
  } catch (error) {
    console.error('❌ 업데이트 중 오류 발생:', error);
    throw error;
  }
}

// 스크립트 실행
updateProductImages()
  .then(() => {
    console.log('\n✅ 스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });



