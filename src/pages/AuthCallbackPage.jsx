import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axiosClient from '../api/axiosClient'
import { useAuth } from '../context/AuthContext'

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const { setUser } = useAuth()

  useEffect(() => {
    axiosClient
      .get('/auth/token/', { withCredentials: true })
      .then((response) => {
        localStorage.setItem('authToken', response.data.token)
        setUser({ loggedIn: true, username: response.data.username })
        navigate('/dashboard')
      })
      .catch(() => {
        navigate('/login')
      })
  }, [navigate, setUser])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Signing you in...</p>
    </div>
  )
}