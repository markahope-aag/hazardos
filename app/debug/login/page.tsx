import { LoginDebugComponent } from '@/components/debug/login-debug'

export default function LoginDebugPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Login Debug</h1>
          <p className="text-gray-600 mt-2">
            Diagnose login loading issues
          </p>
        </div>
        <LoginDebugComponent />
      </div>
    </div>
  )
}