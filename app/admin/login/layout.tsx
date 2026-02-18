/**
 * 관리자 로그인 페이지 레이아웃
 * 
 * /admin/login은 세션 검증 없이 접근 가능해야 하므로
 * 별도의 layout을 사용하여 검증을 건너뜁니다.
 */

export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 검증 없이 바로 렌더링
  return <>{children}</>
}
