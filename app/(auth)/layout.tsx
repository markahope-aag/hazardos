export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-gray-50">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary">HazardOS</h1>
            <p className="text-gray-600 mt-2">
              Environmental Remediation Management
            </p>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}