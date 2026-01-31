export default function MobileSurveyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Override the dashboard layout for mobile surveys
  // This gives us a full-screen experience without the sidebar/header
  return <>{children}</>
}
