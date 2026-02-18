/**
 * 관리자 로그인 페이지 레이아웃
 * 
 * 동적 렌더링을 강제하여 캐시 문제를 방지합니다.
 */

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
