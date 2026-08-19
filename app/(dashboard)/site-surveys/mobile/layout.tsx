export default function MobileSurveyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Nested layouts COMPOSE with their parent, they do not replace it, so this
  // file cannot strip the dashboard chrome on its own however it is written.
  // The exclusion lives in app/(dashboard)/layout.tsx, which returns children
  // bare for this path. Kept as a segment boundary; add nothing here expecting
  // it to override the parent.
  return <>{children}</>
}
