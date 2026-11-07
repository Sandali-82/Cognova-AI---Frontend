import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axiosClient from '../api/axiosClient'
import toast from 'react-hot-toast'

export default function SignupPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password1, setPassword1] = useState('')
  const [password2, setPassword2] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignup = async (e) => {
    e.preventDefault()
    setError('')

    if (!username.trim() || !email.trim() || !password1 || !password2) {
      setError('All fields are required')
      return
    }
    if (password1 !== password2) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      await axiosClient.post('/auth/register/', { username, email, password1, password2 })
      toast.success('Account created! Check your email to verify your account.')
      navigate('/login')
    } catch (err) {
      const data = err.response?.data
      const message = data?.username?.[0] || data?.email?.[0] || data?.password1?.[0] || data?.non_field_errors?.[0] || 'Signup failed. Please try again.'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-app flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src="/cognova-logo-dark.png"
            alt="Cognova AI"
            className="h-40 w-auto mx-auto mb-4"
          />
        </div>

        <div className="bg-card border border-line rounded-2xl p-8 shadow-xl">
          <h2 className="text-xl font-semibold text-ink mb-1">Create an account</h2>
          <p className="text-ink-muted text-sm mb-6">Start your smarter study journey</p>

          {error && <p className="text-danger text-sm mb-4">{error}</p>}

          <form onSubmit={handleSignup} className="space-y-3 mb-4">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-app border border-line text-ink placeholder:text-ink-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-to"
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-app border border-line text-ink placeholder:text-ink-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-to"
            />
            <input
              type="password"
              placeholder="Password"
              value={password1}
              onChange={(e) => setPassword1(e.target.value)}
              className="w-full bg-app border border-line text-ink placeholder:text-ink-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-to"
            />
            <input
              type="password"
              placeholder="Confirm Password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              className="w-full bg-app border border-line text-ink placeholder:text-ink-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-to"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-brand font-medium px-4 py-3 rounded-xl hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>

          <p className="text-ink-muted text-sm text-center mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-from hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}