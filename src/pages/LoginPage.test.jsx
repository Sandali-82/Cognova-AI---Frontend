import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import toast from 'react-hot-toast'
import axiosClient from '../api/axiosClient'
import LoginPage from './LoginPage'

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
vi.mock('../api/axiosClient', () => ({ default: { post: vi.fn() } }))
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

function setup() {
  const user = userEvent.setup()
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  )
  return user
}

async function fillAndSubmit(user, email = 'a@b.com', password = 'secret123') {
  await user.type(screen.getByPlaceholderText('Email'), email)
  await user.type(screen.getByPlaceholderText('Password'), password)
  await user.click(screen.getByRole('button', { name: 'Sign In' }))
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
  })

  test('renders the form and a link to the signup page', () => {
    setup()

    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/signup')
  })

  test('shows an error when both fields are empty', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(screen.getByText('Email and password are required')).toBeInTheDocument()
    expect(axiosClient.post).not.toHaveBeenCalled()
  })

  test('shows an error when the password is missing', async () => {
    const user = setup()
    await user.type(screen.getByPlaceholderText('Email'), 'a@b.com')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(screen.getByText('Email and password are required')).toBeInTheDocument()
    expect(axiosClient.post).not.toHaveBeenCalled()
  })

  test('stores the token and goes to the dashboard on success', async () => {
    axiosClient.post.mockResolvedValueOnce({ data: { key: 'token-123' } })
    const user = setup()

    await fillAndSubmit(user)

    expect(axiosClient.post).toHaveBeenCalledWith('/auth/login/', {
      email: 'a@b.com',
      password: 'secret123',
    })
    expect(localStorage.getItem('authToken')).toBe('token-123')
    expect(mockSetUser).toHaveBeenCalledWith({ loggedIn: true })
    expect(toast.success).toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
  })

  test('shows the backend error message on a failed login', async () => {
    axiosClient.post.mockRejectedValueOnce({
      response: { data: { non_field_errors: ['Unable to log in with provided credentials.'] } },
    })
    const user = setup()

    await fillAndSubmit(user, 'a@b.com', 'wrong-password')

    expect(
      await screen.findByText('Unable to log in with provided credentials.'),
    ).toBeInTheDocument()
    expect(toast.error).toHaveBeenCalledWith('Unable to log in with provided credentials.')
    expect(localStorage.getItem('authToken')).toBeNull()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  test('falls back to a generic message when the error has no details', async () => {
    axiosClient.post.mockRejectedValueOnce(new Error('Network Error'))
    const user = setup()

    await fillAndSubmit(user)

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument()
  })

  test('disables the button while the request is in progress', async () => {
    axiosClient.post.mockReturnValueOnce(new Promise(() => {})) // never resolves
    const user = setup()

    await fillAndSubmit(user)

    expect(await screen.findByRole('button', { name: 'Signing in...' })).toBeDisabled()
  })
})