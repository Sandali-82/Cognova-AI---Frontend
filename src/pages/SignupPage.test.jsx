import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import toast from 'react-hot-toast'
import axiosClient from '../api/axiosClient'
import SignupPage from './SignupPage'

const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }))

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
}))
vi.mock('../api/axiosClient', () => ({ default: { post: vi.fn() } }))
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

function setup() {
  const user = userEvent.setup()
  render(
    <MemoryRouter>
      <SignupPage />
    </MemoryRouter>,
  )
  return user
}

async function fillForm(
  user,
  { username = 'irushika', email = 'a@b.com', password1 = 'pass12345', password2 = 'pass12345' } = {},
) {
  await user.type(screen.getByPlaceholderText('Username'), username)
  await user.type(screen.getByPlaceholderText('Email'), email)
  await user.type(screen.getByPlaceholderText('Password'), password1)
  await user.type(screen.getByPlaceholderText('Confirm Password'), password2)
}

describe('SignupPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  test('renders the form and a link to the login page', () => {
    setup()

    expect(screen.getByRole('heading', { name: 'Create an account' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login')
  })

  test('requires every field', async () => {
    const user = setup()
    await user.type(screen.getByPlaceholderText('Username'), 'irushika')
    await user.click(screen.getByRole('button', { name: 'Sign Up' }))

    expect(screen.getByText('All fields are required')).toBeInTheDocument()
    expect(axiosClient.post).not.toHaveBeenCalled()
  })

  test('rejects mismatched passwords without calling the API', async () => {
    const user = setup()

    await fillForm(user, { password2: 'different123' })
    await user.click(screen.getByRole('button', { name: 'Sign Up' }))

    expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    expect(axiosClient.post).not.toHaveBeenCalled()
  })

  test('registers the user and goes to the login page', async () => {
    axiosClient.post.mockResolvedValueOnce({ data: {} })
    const user = setup()

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: 'Sign Up' }))

    expect(axiosClient.post).toHaveBeenCalledWith('/auth/register/', {
      username: 'irushika',
      email: 'a@b.com',
      password1: 'pass12345',
      password2: 'pass12345',
    })
    expect(toast.success).toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })

  test('shows the first backend validation error', async () => {
    axiosClient.post.mockRejectedValueOnce({
      response: { data: { email: ['A user is already registered with this email address.'] } },
    })
    const user = setup()

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: 'Sign Up' }))

    expect(
      await screen.findByText('A user is already registered with this email address.'),
    ).toBeInTheDocument()
    expect(toast.error).toHaveBeenCalled()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  test('falls back to a generic message when the error has no details', async () => {
    axiosClient.post.mockRejectedValueOnce(new Error('Network Error'))
    const user = setup()

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: 'Sign Up' }))

    expect(await screen.findByText('Signup failed. Please try again.')).toBeInTheDocument()
  })

  test('disables the button while the request is in progress', async () => {
    axiosClient.post.mockReturnValueOnce(new Promise(() => {})) // never resolves
    const user = setup()

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: 'Sign Up' }))

    expect(await screen.findByRole('button', { name: 'Creating account...' })).toBeDisabled()
  })
})