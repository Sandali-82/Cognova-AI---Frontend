import axios from 'axios'

const axiosClient = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
  withCredentials: true,  // needed for session-based auth cookies
})

// Attach the auth token to every request, if present
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Token ${token}`
  }
  return config
})

export default axiosClient