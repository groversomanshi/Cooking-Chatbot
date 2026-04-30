'use client'
import { createClient } from '@/utils/supabase/client'

export default function LoginPage() {
  const supabase = createClient()

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    })
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
      <div className="p-8 bg-white shadow-xl rounded-2xl text-center max-w-md w-full">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Cooking-Chatbot</h1>
        <p className="text-gray-600 mb-8">Log in to start detecting ingredients and managing your kitchen.</p>
        <button 
          onClick={handleLogin} 
          className="flex items-center justify-center gap-3 w-full py-3 px-4 bg-white text-gray-700 font-semibold border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors shadow-sm"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          Continue with Google
        </button>
      </div>
    </div>
  )
}
