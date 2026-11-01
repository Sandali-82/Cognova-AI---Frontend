import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import axiosClient from '../api/axiosClient'
import AuthCallbackPage from './AuthCallbackPage'

const { mockNavigate, mockSetUser } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockSetUser: vi.fn(),
}))

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
}))
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ setUser: mockSetUser }),
}))
vi.mock('../api/axiosClient', () => ({ default: { get: vi.fn() } }))

describe('AuthCallbackPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
  })

  test('shows a signing-in message while the token is requested', () => {
    axiosClient.get.mockReturnValueOnce(new Promise(() => {})) // never resolves
    render(<AuthCallbackPage />)

    expect(screen.getByText('Signing you in...')).toBeInTheDocument()
  })

  test('stores the token, sets the user and goes to the dashboard', async () => {
    axiosClient.get.mockResolvedValueOnce({
      data: { token: 'tok-1', username: 'irushika' },
    })
    render(<AuthCallbackPage />)

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard'))
    expect(axiosClient.get).toHaveBeenCalledWith('/auth/token/', { withCredentials: true })
    expect(localStorage.getItem('authToken')).toBe('tok-1')
    expect(mockSetUser).toHaveBeenCalledWith({ loggedIn: true, username: 'irushika' })
  })

  test('goes back to the login page when the token request fails', async () => {
    axiosClient.get.mockRejectedValueOnce(new Error('403'))
    render(<AuthCallbackPage />)

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/login'))
    expect(localStorage.getItem('authToken')).toBeNull()
    expect(mockSetUser).not.toHaveBeenCalled()
  })
})