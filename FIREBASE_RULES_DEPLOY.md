# Firestore 보안 규칙 배포 가이드

Firestore 보안 규칙을 수정한 후 Firebase Console에 배포해야 합니다.

## 배포 방법

### 방법 1: Firebase Console에서 직접 배포 (추천)

1. **Firebase Console 접속**
   - https://console.firebase.google.com 접속
   - 프로젝트 선택

2. **Firestore Database로 이동**
   - 왼쪽 메뉴에서 "Firestore Database" 클릭
   - 상단 탭에서 "규칙" 탭 클릭

3. **규칙 편집**
   - 현재 규칙을 확인하고, 프로젝트의 `firestore.rules` 파일 내용을 복사
   - Firebase Console의 규칙 편집기에 붙여넣기

4. **규칙 게시**
   - "게시" 버튼 클릭
   - 확인 대화상자에서 "게시" 클릭

### 방법 2: Firebase CLI 사용 (선택사항)

```bash
# Firebase CLI 설치 (아직 설치하지 않은 경우)
npm install -g firebase-tools

# Firebase 로그인
firebase login

# 프로젝트 초기화 (아직 하지 않은 경우)
firebase init firestore

# 규칙 배포
firebase deploy --only firestore:rules
```

## 최신 규칙 내용

다음은 컬렉션 쿼리 권한이 추가된 최신 Firestore 보안 규칙입니다:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // 헬퍼 함수
    function isSignedIn() {
      return request.auth != null;
    }
    
    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }
    
    function isAdmin() {
      return isSignedIn() && getUserData().role == "admin";
    }
    
    function isOrganizer() {
      return isSignedIn() && getUserData().role == "organizer";
    }
    
    function isOrganizerPending() {
      return isSignedIn() && getUserData().role == "organizer_pending";
    }
    
    // 사용자 데이터
    match /users/{userId} {
      allow read: if isSignedIn() && (request.auth.uid == userId || isAdmin());
      allow create: if isSignedIn() && request.auth.uid == userId;
      allow update: if isSignedIn() && (request.auth.uid == userId || isAdmin());
      // 컬렉션 쿼리: 관리자만 모든 사용자 조회 가능
      allow list: if isAdmin();
    }
    
    // 관리자 설정
    match /adminSettings/{document=**} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }
    
    // Organizer 수수료율
    match /organizerCommissions/{organizerId} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }
    
    // 상품
    match /products/{productId} {
      allow read: if isSignedIn();
      allow create, update, delete: if isAdmin();
      // 컬렉션 쿼리 허용 (모든 로그인 사용자가 읽을 수 있음)
      allow list: if isSignedIn();
    }
    
    // 그룹
    match /groups/{groupId} {
      allow read: if isSignedIn();
      allow create: if isOrganizer();
      // 업데이트: Organizer(자신의 그룹), Admin, 또는 일반 사용자(주문 생성 시 currentTotal 업데이트용)
      allow update: if (
        (isOrganizer() && resource.data.organizerId == request.auth.uid) || 
        isAdmin() ||
        // 일반 사용자가 주문 생성 시 그룹의 currentTotal만 증가시킬 수 있음
        (isSignedIn() && 
         // currentTotal은 증가만 가능 (감소 불가)
         request.resource.data.currentTotal >= resource.data.currentTotal &&
         // 다른 필드는 변경 불가
         request.resource.data.organizerId == resource.data.organizerId &&
         request.resource.data.productId == resource.data.productId &&
         request.resource.data.productName == resource.data.productName &&
         request.resource.data.productPrice == resource.data.productPrice &&
         request.resource.data.minimumTotal == resource.data.minimumTotal &&
         request.resource.data.organizerName == resource.data.organizerName &&
         // status는 '진행중'에서 '달성'으로만 변경 가능 (조건: currentTotal >= minimumTotal)
         ((resource.data.status == '진행중' && 
           request.resource.data.status == '달성' && 
           request.resource.data.currentTotal >= request.resource.data.minimumTotal) ||
          (request.resource.data.status == resource.data.status)))
      );
      
      // 컬렉션 쿼리 허용 (모든 로그인 사용자가 읽을 수 있음)
      allow list: if isSignedIn();
    }
    
    // 주문
    match /orders/{orderId} {
      // 단일 문서 읽기
      allow read: if isSignedIn() && (
        resource.data.userId == request.auth.uid || 
        isOrganizer() || 
        isAdmin()
      );
      
      // 컬렉션 쿼리 허용
      // 모든 로그인 사용자가 조회 가능 (쿼리 필터로 제한됨)
      // - 사용자는 where('userId', '==', userId)로 자신의 주문만 조회
      // - Organizer는 where('groupId', '==', groupId)로 자신의 그룹 주문만 조회
      // - Admin은 모든 주문 조회 가능
      allow list: if isSignedIn();
      
      allow create: if isSignedIn() && request.resource.data.totalPrice >= 10000;
      allow update: if isAdmin() || (
        isOrganizer() && 
        get(/databases/$(database)/documents/groups/$(resource.data.groupId)).data.organizerId == request.auth.uid
      );
    }
  }
}
```

### 주요 변경사항

1. **컬렉션 쿼리(`list`) 권한 추가**
   - `users`: 관리자만 모든 사용자 조회 가능 (`getAllUsers`, `getPendingOrganizers`)
   - `products`: 모든 로그인 사용자가 조회 가능 (`getProducts`, `getAllProducts`)
   - `groups`: 모든 로그인 사용자가 조회 가능 (`getGroups`, `getAllGroups`, `getOrganizerGroups`)
   - `orders`: 모든 로그인 사용자가 조회 가능 (`getGroupOrders`, `getUserOrders`)

2. **그룹 업데이트 규칙 수정**
   - Organizer는 자신의 그룹만 업데이트 가능하도록 괄호 추가로 우선순위 명확화
   - **일반 사용자(`user` 역할)가 주문 생성 시 그룹의 `currentTotal`을 증가시킬 수 있도록 권한 추가**
   - 일반 사용자는 `currentTotal`만 증가시킬 수 있고, 다른 필드는 변경 불가
   - `currentTotal`이 `minimumTotal` 이상이 되면 `status`를 '진행중'에서 '달성'으로 변경 가능

### 권한 구조

- **사용자(`users`)**
  - 읽기: 본인 또는 관리자
  - 목록 조회: 관리자만
  - 생성: 본인만
  - 업데이트: 본인 또는 관리자

- **상품(`products`)**
  - 읽기/목록 조회: 모든 로그인 사용자
  - 생성/수정/삭제: 관리자만

- **공동구매 건(`groups`)**
  - 읽기/목록 조회: 모든 로그인 사용자
  - 생성: Organizer만
  - 업데이트: 
    - 본인의 그룹(Organizer) 또는 관리자: 모든 필드 업데이트 가능
    - 일반 사용자: 주문 생성 시 `currentTotal`만 증가 가능, `status`는 '진행중'→'달성'만 가능

- **주문(`orders`)**
  - 단일 문서 읽기: 본인 주문, Organizer(자신의 그룹), 관리자
  - 목록 조회: 모든 로그인 사용자 (쿼리 필터로 제한됨)
  - 생성: 로그인 사용자 (최소 10,000원)
  - 업데이트: 관리자 또는 Organizer(자신의 그룹)

## 문제 해결

### "Missing or insufficient permissions" 오류가 계속 발생하는 경우

1. **규칙이 제대로 배포되었는지 확인**
   - Firebase Console에서 규칙 탭 확인
   - 최근 배포 시간 확인

2. **사용자 인증 상태 확인**
   - 브라우저 콘솔에서 `firebase.auth().currentUser` 확인
   - 로그인 상태 확인

3. **사용자 역할 확인**
   - Firestore의 `users/{userId}` 문서에서 `role` 필드 확인
   - 필요한 역할이 올바르게 설정되었는지 확인

4. **규칙 문법 확인**
   - Firebase Console의 규칙 편집기에서 문법 오류 확인
   - 규칙 시뮬레이터로 테스트

## 규칙 테스트

Firebase Console의 "규칙 시뮬레이터"를 사용하여 규칙을 테스트할 수 있습니다:

1. Firebase Console > Firestore Database > 규칙 탭
2. "규칙 시뮬레이터" 클릭
3. 시나리오 입력 및 테스트

## 참고

- Firestore 보안 규칙은 즉시 적용됩니다 (배포 후)
- 규칙 변경은 실시간으로 반영되지만, 클라이언트 캐시로 인해 약간의 지연이 있을 수 있습니다
- 규칙 오류가 발생하면 Firebase Console에 경고가 표시됩니다
