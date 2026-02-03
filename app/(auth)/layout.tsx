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
            <div className="flex justify-center mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logos/logo-vertical-color.png"
                alt="HazardOS"
                style={{ height: '140px', width: 'auto' }}
              />
            </div>
            <p className="text-gray-600 text-sm">
              Environmental Remediation Management
            </p>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}