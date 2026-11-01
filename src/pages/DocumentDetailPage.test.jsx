import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import toast from 'react-hot-toast'
import axiosClient from '../api/axiosClient'
import { generateSummary } from '../api/documentsApi'
import { generateQuiz, submitQuiz } from '../api/quizzesApi'
import { chatWithDocument, processDocumentForChat } from '../api/chatApi'
import DocumentDetailPage from './DocumentDetailPage'

vi.mock('../api/axiosClient', () => ({ default: { get: vi.fn() } }))
vi.mock('../api/documentsApi', () => ({ generateSummary: vi.fn() }))
vi.mock('../api/quizzesApi', () => ({
  generateQuiz: vi.fn(),
  submitQuiz: vi.fn(),
}))
vi.mock('../api/chatApi', () => ({
  processDocumentForChat: vi.fn(),
  chatWithDocument: vi.fn(),
}))
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

const DOCUMENTS = [
  { id: 5, title: 'Biology Notes', subject: 'Science' },
  { id: 6, title: 'Other Notes', subject: null },
]

const QUIZ = {
  id: 11,
  questions: [
    {
      id: 1,
      question_text: 'What is the powerhouse of the cell?',
      option_a: 'Mitochondria',
      option_b: 'Nucleus',
      option_c: 'Ribosome',
      option_d: 'Golgi body',
    },
    {
      id: 2,
      question_text: 'Which gas do plants absorb?',
      option_a: 'Oxygen',
      option_b: 'Nitrogen',
      option_c: 'Carbon dioxide',
      option_d: 'Helium',
    },
  ],
}

const QUIZ_RESULT = {
  score: 1,
  total_questions: 2,
  feedback: [
    {
      question_id: 1,
      question_text: 'What is the powerhouse of the cell?',
      selected_option: 'a',
      correct_option: 'a',
      is_correct: true,
      explanation: 'Mitochondria produce ATP.',
    },
    {
      question_id: 2,
      question_text: 'Which gas do plants absorb?',
      selected_option: 'b',
      correct_option: 'c',
      is_correct: false,
      explanation: 'Plants absorb carbon dioxide.',
    },
  ],
}

const CHAT_PLACEHOLDER = 'Ask a question about this document...'

function renderPage(id = 5) {
  return render(
    <MemoryRouter initialEntries={[`/documents/${id}`]}>
      <Routes>
        <Route path="/documents/:id" element={<DocumentDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

// Renders the page and waits until the document has loaded
async function setup() {
  axiosClient.get.mockResolvedValue({ data: DOCUMENTS })
  const user = userEvent.setup()
  renderPage()
  await screen.findByRole('heading', { name: 'Biology Notes' })
  return user
}

async function generateQuizAndWait(user) {
  generateQuiz.mockResolvedValue({ data: QUIZ })
  await user.click(screen.getByRole('button', { name: 'Generate Quiz' }))
  await screen.findByText('What is the powerhouse of the cell?')
}

async function enableChat(user) {
  processDocumentForChat.mockResolvedValueOnce({})
  await user.click(screen.getByRole('button', { name: 'Enable Chat' }))
  return screen.findByPlaceholderText(CHAT_PLACEHOLDER)
}

async function askQuestion(user, input, question) {
  await user.type(input, question)
  await user.click(screen.getByRole('button', { name: 'Ask' }))
}

describe('DocumentDetailPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('document header', () => {
    test('shows a loading message until the document arrives', () => {
      axiosClient.get.mockReturnValueOnce(new Promise(() => {})) // never resolves
      renderPage()

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    test('shows the title and subject of the document from the URL', async () => {
      await setup()

      expect(screen.getByRole('heading', { name: 'Biology Notes' })).toBeInTheDocument()
      expect(screen.getByText('Science')).toBeInTheDocument()
      expect(screen.queryByText('Other Notes')).not.toBeInTheDocument()
      expect(screen.getByRole('link', { name: /Back to Dashboard/ })).toHaveAttribute(
        'href',
        '/dashboard',
      )
    })

        test('shows a not-found message when the document does not exist', async () => {
      axiosClient.get.mockResolvedValueOnce({ data: DOCUMENTS })
      renderPage(999)

      expect(await screen.findByText('Document not found')).toBeInTheDocument()
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
      expect(screen.getByRole('link', { name: /Back to Dashboard/ })).toHaveAttribute(
        'href',
        '/dashboard',
      )
    })

    test('shows an error when the documents cannot be loaded', async () => {
      axiosClient.get.mockRejectedValueOnce(new Error('Network Error'))
      renderPage()

      expect(await screen.findByText('Failed to load document')).toBeInTheDocument()
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })
  })

  describe('summary', () => {
    test('generates and shows a summary', async () => {
      generateSummary.mockResolvedValueOnce({
        data: { content: 'Key idea: mitochondria make ATP.' },
      })
      const user = await setup()

      await user.click(screen.getByRole('button', { name: 'Generate Summary' }))

      expect(await screen.findByText('Key idea: mitochondria make ATP.')).toBeInTheDocument()
      expect(generateSummary).toHaveBeenCalledWith('5')
      expect(toast.success).toHaveBeenCalledWith('Summary generated!')
      expect(screen.getByRole('button', { name: 'Regenerate' })).toBeInTheDocument()
    })

    test('shows an error when the summary cannot be generated', async () => {
      generateSummary.mockRejectedValueOnce(new Error('502'))
      const user = await setup()

      await user.click(screen.getByRole('button', { name: 'Generate Summary' }))

      expect(await screen.findByText('Failed to generate summary')).toBeInTheDocument()
      expect(toast.error).toHaveBeenCalledWith('Failed to generate summary')
      expect(screen.getByRole('button', { name: 'Generate Summary' })).toBeInTheDocument()
    })

    test('disables the button while the summary is generating', async () => {
      generateSummary.mockReturnValueOnce(new Promise(() => {})) // never resolves
      const user = await setup()

      await user.click(screen.getByRole('button', { name: 'Generate Summary' }))

      expect(await screen.findByRole('button', { name: 'Generating...' })).toBeDisabled()
    })
  })

  describe('quiz', () => {
    test('generates a quiz and shows every question with four options', async () => {
      const user = await setup()

      await generateQuizAndWait(user)

      expect(generateQuiz).toHaveBeenCalledWith('5')
      expect(toast.success).toHaveBeenCalledWith('Quiz generated!')
      expect(screen.getByText('Which gas do plants absorb?')).toBeInTheDocument()
      expect(screen.getAllByRole('radio')).toHaveLength(8)
      expect(screen.getByRole('button', { name: 'Submit Quiz' })).toBeInTheDocument()
    })

    test('submits the selected answers and shows the score with feedback', async () => {
      submitQuiz.mockResolvedValueOnce({ data: QUIZ_RESULT })
      const user = await setup()
      await generateQuizAndWait(user)

      await user.click(screen.getByLabelText('Mitochondria')) // question 1 -> a
      await user.click(screen.getByLabelText('Nitrogen')) // question 2 -> b
      await user.click(screen.getByRole('button', { name: 'Submit Quiz' }))

      expect(await screen.findByText('Score: 1 / 2')).toBeInTheDocument()
      expect(submitQuiz).toHaveBeenCalledWith(11, { 1: 'a', 2: 'b' })
      expect(toast.success).toHaveBeenCalledWith('Score: 1/2')
      expect(screen.getByText(/Your answer: a \(Correct\)/)).toBeInTheDocument()
      expect(screen.getByText(/Your answer: b \(Incorrect, correct: c\)/)).toBeInTheDocument()
      expect(screen.getByText('Mitochondria produce ATP.')).toBeInTheDocument()
      expect(screen.getByText('Plants absorb carbon dioxide.')).toBeInTheDocument()
      expect(screen.queryAllByRole('radio')).toHaveLength(0) // the form is replaced by the result
    })

    test('submits only the questions that were answered', async () => {
      submitQuiz.mockResolvedValueOnce({ data: QUIZ_RESULT })
      const user = await setup()
      await generateQuizAndWait(user)

      await user.click(screen.getByLabelText('Mitochondria'))
      await user.click(screen.getByRole('button', { name: 'Submit Quiz' }))

      await screen.findByText('Score: 1 / 2')
      expect(submitQuiz).toHaveBeenCalledWith(11, { 1: 'a' })
    })

    test('shows an error when the quiz cannot be generated', async () => {
      generateQuiz.mockRejectedValueOnce(new Error('502'))
      const user = await setup()

      await user.click(screen.getByRole('button', { name: 'Generate Quiz' }))

      expect(await screen.findByText('Failed to generate quiz')).toBeInTheDocument()
      expect(toast.error).toHaveBeenCalledWith('Failed to generate quiz')
      expect(screen.queryByRole('button', { name: 'Submit Quiz' })).not.toBeInTheDocument()
    })

    test('keeps the questions on screen when submitting fails', async () => {
      submitQuiz.mockRejectedValueOnce(new Error('500'))
      const user = await setup()
      await generateQuizAndWait(user)

      await user.click(screen.getByLabelText('Mitochondria'))
      await user.click(screen.getByRole('button', { name: 'Submit Quiz' }))

      expect(await screen.findByText('Failed to submit quiz')).toBeInTheDocument()
      expect(toast.error).toHaveBeenCalledWith('Failed to submit quiz')
      expect(screen.getByText('What is the powerhouse of the cell?')).toBeInTheDocument()
      expect(screen.queryByText(/Score:/)).not.toBeInTheDocument()
    })

    test('generating a new quiz clears the previous result and answers', async () => {
      submitQuiz.mockResolvedValueOnce({ data: QUIZ_RESULT })
      const user = await setup()
      await generateQuizAndWait(user)
      await user.click(screen.getByLabelText('Mitochondria'))
      await user.click(screen.getByRole('button', { name: 'Submit Quiz' }))
      await screen.findByText('Score: 1 / 2')

      await user.click(screen.getByRole('button', { name: 'Generate Quiz' }))

      await waitFor(() => expect(screen.queryByText(/Score:/)).not.toBeInTheDocument())
      const radios = await screen.findAllByRole('radio')
      expect(radios).toHaveLength(8)
      expect(radios.every((radio) => !radio.checked)).toBe(true)
    })
  })

  describe('chat', () => {
    test('hides the chat input until chat is enabled', async () => {
      await setup()

      expect(screen.getByRole('button', { name: 'Enable Chat' })).toBeInTheDocument()
      expect(screen.queryByPlaceholderText(CHAT_PLACEHOLDER)).not.toBeInTheDocument()
    })

    test('prepares the document and shows the chat input', async () => {
      const user = await setup()

      await enableChat(user)

      expect(processDocumentForChat).toHaveBeenCalledWith('5')
      expect(toast.success).toHaveBeenCalledWith('Chat is ready!')
      expect(screen.queryByRole('button', { name: 'Enable Chat' })).not.toBeInTheDocument()
    })

    test('shows an error when the document cannot be prepared for chat', async () => {
      processDocumentForChat.mockRejectedValueOnce(new Error('500'))
      const user = await setup()

      await user.click(screen.getByRole('button', { name: 'Enable Chat' }))

      expect(
        await screen.findByText('Failed to prepare document for chat'),
      ).toBeInTheDocument()
      expect(screen.queryByPlaceholderText(CHAT_PLACEHOLDER)).not.toBeInTheDocument()
    })

    test('sends a trimmed question, shows the answer and clears the input', async () => {
      chatWithDocument.mockResolvedValueOnce({
        data: { answer: 'A cell is the basic unit of life.' },
      })
      const user = await setup()
      const input = await enableChat(user)

      await askQuestion(user, input, '  What is a cell?  ')

      expect(await screen.findByText('A cell is the basic unit of life.')).toBeInTheDocument()
      expect(chatWithDocument).toHaveBeenCalledWith('5', 'What is a cell?')
      expect(screen.getByText('Q: What is a cell?')).toBeInTheDocument()
      expect(input).toHaveValue('')
    })

    test('keeps earlier questions in the history', async () => {
      chatWithDocument
        .mockResolvedValueOnce({ data: { answer: 'First answer' } })
        .mockResolvedValueOnce({ data: { answer: 'Second answer' } })
      const user = await setup()
      const input = await enableChat(user)

      await askQuestion(user, input, 'First?')
      await screen.findByText('First answer')
      await askQuestion(user, input, 'Second?')
      await screen.findByText('Second answer')

      expect(screen.getByText('Q: First?')).toBeInTheDocument()
      expect(screen.getByText('Q: Second?')).toBeInTheDocument()
    })

    test('ignores empty and whitespace-only questions', async () => {
      const user = await setup()
      const input = await enableChat(user)

      await user.click(screen.getByRole('button', { name: 'Ask' }))
      await askQuestion(user, input, '   ')

      expect(chatWithDocument).not.toHaveBeenCalled()
    })

    test('rejects a question longer than 500 characters', async () => {
      const user = await setup()
      const input = await enableChat(user)

      await user.click(input)
      await user.paste('x'.repeat(501))
      await user.click(screen.getByRole('button', { name: 'Ask' }))

      expect(screen.getByText('Question must be under 500 characters')).toBeInTheDocument()
      expect(chatWithDocument).not.toHaveBeenCalled()
    })

    test('accepts a question of exactly 500 characters', async () => {
      chatWithDocument.mockResolvedValueOnce({ data: { answer: 'ok' } })
      const user = await setup()
      const input = await enableChat(user)

      await user.click(input)
      await user.paste('x'.repeat(500))
      await user.click(screen.getByRole('button', { name: 'Ask' }))

      await screen.findByText('ok')
      expect(chatWithDocument).toHaveBeenCalledWith('5', 'x'.repeat(500))
    })

    test('shows the error message returned by the backend', async () => {
      chatWithDocument.mockRejectedValueOnce({
        response: { data: { error: 'Failed to generate an answer. Please try again.' } },
      })
      const user = await setup()
      const input = await enableChat(user)

      await askQuestion(user, input, 'What is a cell?')

      expect(
        await screen.findByText('Failed to generate an answer. Please try again.'),
      ).toBeInTheDocument()
      expect(screen.queryByText(/^Q:/)).not.toBeInTheDocument() // nothing added to the history
    })

    test('falls back to a generic message when the chat error has no details', async () => {
      chatWithDocument.mockRejectedValueOnce(new Error('Network Error'))
      const user = await setup()
      const input = await enableChat(user)

      await askQuestion(user, input, 'What is a cell?')

      expect(await screen.findByText('Failed to get an answer')).toBeInTheDocument()
    })

    test('disables the ask button while waiting for an answer', async () => {
      chatWithDocument.mockReturnValueOnce(new Promise(() => {})) // never resolves
      const user = await setup()
      const input = await enableChat(user)

      await askQuestion(user, input, 'What is a cell?')

      expect(await screen.findByRole('button', { name: '...' })).toBeDisabled()
    })
  })
})