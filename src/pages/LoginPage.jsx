export default function LoginPage() {
  const handleGoogleLogin = () => {
    // Redirect to Django backend's Google OAuth login
    window.location.href = 'http://127.0.0.1:8000/accounts/google/login/'
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Cognova AI</h1>
        <p className="text-gray-500 mb-6">AI-powered study companion</p>
        <button
          onClick={handleGoogleLogin}
          className="bg-bg-emerald-600 text-white px-6 py-2 rounded-md hover:bg-emerald-700 transition"
        >
          Continue with Google
        </button>
      </div>
    </div>
  )
}