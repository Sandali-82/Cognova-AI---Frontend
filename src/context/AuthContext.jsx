import { createContext, useContext, useState, useEffect } from 'react'
import axiosClient from '../api/axiosClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // Start as loading only if a token exists and needs to be validated
  const [loading, setLoading] = useState(() => !!localStorage.getItem('authToken'))

  useEffect(() => {
    // Check if a token already exists and is valid
    const token = localStorage.getItem('authToken')
    if (token) {
      axiosClient
        .get('/documents/')  // any authenticated endpoint works as a check
        .then(() => setUser({ loggedIn: true }))
        .catch(() => {
          localStorage.removeItem('authToken')
          setUser(null)
        })
        .finally(() => setLoading(false))
    }
  }, [])

  const logout = () => {
    localStorage.removeItem('authToken')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, setUser, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}