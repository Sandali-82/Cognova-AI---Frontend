import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import axiosClient from '../api/axiosClient'
import { AuthProvider, useAuth } from './AuthContext'

vi.mock('../api/axiosClient', () => ({ default: { get: vi.fn() } }))

function Consumer() {
  const { user, loading, logout } = useAuth()
  return (
    <div>
      <p data-testid="loading">{String(loading)}</p>
      <p data-testid="user">{user ? 'logged-in' : 'anonymous'}</p>
      <button onClick={logout}>Log out</button>
    </div>
  )
}

function setup() {
  return render(
    <AuthProvider>
      <Consumer />
    </AuthProvider>,
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
  })

  test('is not loading and has no user when there is no stored token', () => {
    setup()

    expect(screen.getByTestId('loading')).toHaveTextContent('false')
    expect(screen.getByTestId('user')).toHaveTextContent('anonymous')
    expect(axiosClient.get).not.toHaveBeenCalled()
  })

  test('validates a stored token and logs the user in', async () => {
    localStorage.setItem('authToken', 'abc')
    axiosClient.get.mockResolvedValueOnce({ data: [] })
    setup()

    expect(screen.getByTestId('loading')).toHaveTextContent('true')
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(screen.getByTestId('user')).toHaveTextContent('logged-in')
    expect(axiosClient.get).toHaveBeenCalledWith('/documents/')
    expect(localStorage.getItem('authToken')).toBe('abc')
  })

  test('removes an invalid stored token', async () => {
    localStorage.setItem('authToken', 'expired')
    axiosClient.get.mockRejectedValueOnce(new Error('401'))
    setup()

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(screen.getByTestId('user')).toHaveTextContent('anonymous')
    expect(localStorage.getItem('authToken')).toBeNull()
  })

  test('logout clears the token and the user', async () => {
    localStorage.setItem('authToken', 'abc')
    axiosClient.get.mockResolvedValueOnce({ data: [] })
    const user = userEvent.setup()
    setup()
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('logged-in'))

    await user.click(screen.getByRole('button', { name: 'Log out' }))

    expect(screen.getByTestId('user')).toHaveTextContent('anonymous')
    expect(localStorage.getItem('authToken')).toBeNull()
  })
})