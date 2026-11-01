import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import axiosClient from '../api/axiosClient'
import VerifyEmailPage from './VerifyEmailPage'

vi.mock('../api/axiosClient', () => ({ default: { post: vi.fn() } }))

function setup() {
  render(
    <MemoryRouter initialEntries={['/verify-email/abc123']}>
      <Routes>
        <Route path="/verify-email/:key" element={<VerifyEmailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  test('shows a verifying message while the request is pending', () => {
    axiosClient.post.mockReturnValueOnce(new Promise(() => {})) // never resolves
    setup()

    expect(screen.getByText('Verifying your email...')).toBeInTheDocument()
  })

  test('sends the key from the URL to the backend', async () => {
    axiosClient.post.mockResolvedValueOnce({})
    setup()

    await screen.findByText('Email verified successfully!')
    expect(axiosClient.post).toHaveBeenCalledWith(
      '/auth/registration/account-confirm-email/',
      { key: 'abc123' },
    )
  })

  test('shows a success message with a link to sign in', async () => {
    axiosClient.post.mockResolvedValueOnce({})
    setup()

    expect(await screen.findByText('Email verified successfully!')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign in now' })).toHaveAttribute('href', '/login')
  })

  test('shows an error and no sign-in link when verification fails', async () => {
    axiosClient.post.mockRejectedValueOnce(new Error('invalid key'))
    setup()

    expect(
      await screen.findByText('Verification failed. The link may be expired or invalid.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Sign in now' })).not.toBeInTheDocument()
  })
})