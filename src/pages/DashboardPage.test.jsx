import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import toast from 'react-hot-toast'
import { getDocuments, uploadDocument } from '../api/documentsApi'
import DashboardPage from './DashboardPage'

const { mockLogout } = vi.hoisted(() => ({ mockLogout: vi.fn() }))

vi.mock('../api/documentsApi', () => ({
  getDocuments: vi.fn(),
  uploadDocument: vi.fn(),
}))
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ logout: mockLogout }),
}))
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

const MB = 1024 * 1024

function renderPage() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  )
}

// Renders the page and waits until the document list has loaded
async function setup({ documents = [], userOptions } = {}) {
  getDocuments.mockResolvedValue({ data: documents })
  const user = userEvent.setup(userOptions)
  const { container } = renderPage()
  await screen.findByText(
    documents.length ? documents[0].title : 'No documents uploaded yet.',
  )
  return { user, container }
}

const fileInput = (container) => container.querySelector('input[type="file"]')
const pdf = (name = 'notes.pdf') =>
  new File(['%PDF-1.4'], name, { type: 'application/pdf' })

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  test('shows an empty state when there are no documents', async () => {
    await setup()

    expect(screen.getByText('No documents uploaded yet.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Upload a Document' })).toBeInTheDocument()
  })

  test('lists documents as links to their detail pages', async () => {
    await setup({
      documents: [
        { id: 1, title: 'Biology Notes', subject: 'Science' },
        { id: 2, title: 'Chem Notes', subject: null },
      ],
    })

    expect(screen.getByRole('link', { name: /Biology Notes/ })).toHaveAttribute('href', '/documents/1')
    expect(screen.getByRole('link', { name: /Chem Notes/ })).toHaveAttribute('href', '/documents/2')
    expect(screen.getByText('Science')).toBeInTheDocument()
    expect(screen.getByText('Uncategorized')).toBeInTheDocument()
  })

  test('shows an error when the documents cannot be loaded', async () => {
    getDocuments.mockRejectedValue(new Error('Network Error'))
    renderPage()

    expect(await screen.findByText('Failed to load documents')).toBeInTheDocument()
  })

  test('has a link to the analytics page', async () => {
    await setup()

    expect(screen.getByRole('link', { name: 'Analytics' })).toHaveAttribute('href', '/analytics')
  })

  test('logs out when the logout button is clicked', async () => {
    const { user } = await setup()

    await user.click(screen.getByRole('button', { name: 'Logout' }))

    expect(mockLogout).toHaveBeenCalledTimes(1)
  })

  test('requires a title', async () => {
    const { user } = await setup()

    await user.click(screen.getByRole('button', { name: 'Upload' }))

    expect(screen.getByText('Title is required')).toBeInTheDocument()
    expect(uploadDocument).not.toHaveBeenCalled()
  })

  test('requires a file', async () => {
    const { user } = await setup()

    await user.type(screen.getByPlaceholderText('Title'), 'Biology')
    await user.click(screen.getByRole('button', { name: 'Upload' }))

    expect(screen.getByText('Please select a PDF file')).toBeInTheDocument()
    expect(uploadDocument).not.toHaveBeenCalled()
  })

  test('rejects a file that is not a PDF', async () => {
    // applyAccept: false lets the test pick a .txt file despite accept="application/pdf"
    const { user, container } = await setup({ userOptions: { applyAccept: false } })

    await user.type(screen.getByPlaceholderText('Title'), 'Biology')
    await user.upload(
      fileInput(container),
      new File(['hi'], 'notes.txt', { type: 'text/plain' }),
    )
    await user.click(screen.getByRole('button', { name: 'Upload' }))

    expect(screen.getByText('Only PDF files are supported')).toBeInTheDocument()
    expect(uploadDocument).not.toHaveBeenCalled()
  })

  test('rejects a file larger than 10MB', async () => {
    const { user, container } = await setup()
    const bigFile = pdf('big.pdf')
    Object.defineProperty(bigFile, 'size', { value: 10 * MB + 1 })

    await user.type(screen.getByPlaceholderText('Title'), 'Biology')
    await user.upload(fileInput(container), bigFile)
    await user.click(screen.getByRole('button', { name: 'Upload' }))

    expect(screen.getByText('File size must not exceed 10MB')).toBeInTheDocument()
    expect(uploadDocument).not.toHaveBeenCalled()
  })

  test('uploads a document, reloads the list and clears the form', async () => {
    uploadDocument.mockResolvedValueOnce({})
    const { user, container } = await setup()

    await user.type(screen.getByPlaceholderText('Title'), 'Biology')
    await user.type(screen.getByPlaceholderText('Subject (optional, e.g. Biology)'), 'Science')
    await user.upload(fileInput(container), pdf('notes.pdf'))
    await user.click(screen.getByRole('button', { name: 'Upload' }))

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Document uploaded successfully!'),
    )
    const formData = uploadDocument.mock.calls[0][0]
    expect(formData.get('title')).toBe('Biology')
    expect(formData.get('subject')).toBe('Science')
    expect(formData.get('file').name).toBe('notes.pdf')
    expect(getDocuments).toHaveBeenCalledTimes(2) // initial load + reload after upload
    expect(screen.getByPlaceholderText('Title')).toHaveValue('')
    expect(screen.getByPlaceholderText('Subject (optional, e.g. Biology)')).toHaveValue('')
  })

  test('disables the upload button while uploading', async () => {
    uploadDocument.mockReturnValueOnce(new Promise(() => {})) // never resolves
    const { user, container } = await setup()

    await user.type(screen.getByPlaceholderText('Title'), 'Biology')
    await user.upload(fileInput(container), pdf())
    await user.click(screen.getByRole('button', { name: 'Upload' }))

    expect(await screen.findByRole('button', { name: 'Uploading...' })).toBeDisabled()
  })

  test('shows the validation error returned by the backend', async () => {
    uploadDocument.mockRejectedValueOnce({
      response: { data: { file: ['This file is not a readable PDF.'] } },
    })
    const { user, container } = await setup()

    await user.type(screen.getByPlaceholderText('Title'), 'Biology')
    await user.upload(fileInput(container), pdf())
    await user.click(screen.getByRole('button', { name: 'Upload' }))

    expect(await screen.findByText('This file is not a readable PDF.')).toBeInTheDocument()
    expect(toast.error).toHaveBeenCalledWith('This file is not a readable PDF.')
  })

  test('falls back to a generic message when the upload error has no details', async () => {
    uploadDocument.mockRejectedValueOnce(new Error('Network Error'))
    const { user, container } = await setup()

    await user.type(screen.getByPlaceholderText('Title'), 'Biology')
    await user.upload(fileInput(container), pdf())
    await user.click(screen.getByRole('button', { name: 'Upload' }))

    expect(await screen.findByText('Upload failed. Please try again.')).toBeInTheDocument()
  })
})