export default function EnvCheckPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Environment Check</h1>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Supabase URL:</span>
            <span className={`text-sm px-2 py-1 rounded ${
              supabaseUrl ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {supabaseUrl ? '✓ Set' : '✗ Missing'}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Supabase Key:</span>
            <span className={`text-sm px-2 py-1 rounded ${
              supabaseKey ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {supabaseKey ? '✓ Set' : '✗ Missing'}
            </span>
          </div>
        </div>

        {(!supabaseUrl || !supabaseKey) && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <h3 className="text-sm font-medium text-yellow-800 mb-2">Setup Required</h3>
            <p className="text-sm text-yellow-700">
              Please configure your Supabase environment variables in Vercel:
            </p>
            <ul className="mt-2 text-xs text-yellow-600 space-y-1">
              <li>• NEXT_PUBLIC_SUPABASE_URL</li>
              <li>• NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
            </ul>
          </div>
        )}

        {supabaseUrl && supabaseKey && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800">
              ✓ Environment variables are configured correctly!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}