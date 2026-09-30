import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import axiosClient from '../api/axiosClient'

export default function VerifyEmailPage() {
  const { key } = useParams()
  const [status, setStatus] = useState('verifying')

  useEffect(() => {
    axiosClient
      .post('/auth/registration/account-confirm-email/', { key })
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'))
  }, [key])

  return (
    <div className="min-h-screen bg-app flex items-center justify-center px-4">
      <div className="bg-card border border-line rounded-2xl p-8 shadow-xl text-center max-w-md">
        {status === 'verifying' && <p className="text-ink-muted">Verifying your email...</p>}
        {status === 'success' && (
          <>
            <p className="text-success font-medium mb-4">Email verified successfully!</p>
            <Link to="/login" className="text-brand-from hover:underline">Sign in now</Link>
          </>
        )}
        {status === 'error' && (
          <p className="text-danger">Verification failed. The link may be expired or invalid.</p>
        )}
      </div>
    </div>
  )
}