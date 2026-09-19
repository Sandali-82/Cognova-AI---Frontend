import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axiosClient from '../api/axiosClient'
import ReactMarkdown from 'react-markdown'
import { generateSummary } from '../api/documentsApi'
import { generateQuiz, submitQuiz } from '../api/quizzesApi'
import { processDocumentForChat, chatWithDocument } from '../api/chatApi'

export default function DocumentDetailPage() {
  const { id } = useParams()

  const [document, setDocument] = useState(null)
  const [summary, setSummary] = useState(null)
  const [quiz, setQuiz] = useState(null)
  const [answers, setAnswers] = useState({})
  const [quizResult, setQuizResult] = useState(null)
  const [chatReady, setChatReady] = useState(false)
  const [question, setQuestion] = useState('')
  const [chatHistory, setChatHistory] = useState([])
  const [loading, setLoading] = useState({})
  const [error, setError] = useState('')

  useEffect(() => {
    axiosClient.get(`/documents/`).then((res) => {
      const doc = res.data.find((d) => d.id === Number(id))
      setDocument(doc)
    })
  }, [id])

  const setBusy = (key, value) => setLoading((prev) => ({ ...prev, [key]: value }))

  const handleSummarize = async () => {
    setError('')
    setBusy('summary', true)
    try {
      const res = await generateSummary(id)
      setSummary(res.data.content)
    } catch {
      setError('Failed to generate summary')
    } finally {
      setBusy('summary', false)
    }
  }

  const handleGenerateQuiz = async () => {
    setError('')
    setBusy('quiz', true)
    setQuizResult(null)
    try {
      const res = await generateQuiz(id)
      setQuiz(res.data)
      setAnswers({})
    } catch {
      setError('Failed to generate quiz')
    } finally {
      setBusy('quiz', false)
    }
  }

  const handleSubmitQuiz = async () => {
    setError('')
    setBusy('submit', true)
    try {
      const res = await submitQuiz(quiz.id, answers)
      setQuizResult(res.data)
    } catch {
      setError('Failed to submit quiz')
    } finally {
      setBusy('submit', false)
    }
  }

  const handlePrepareChat = async () => {
    setError('')
    setBusy('chatPrep', true)
    try {
      await processDocumentForChat(id)
      setChatReady(true)
    } catch {
      setError('Failed to prepare document for chat')
    } finally {
      setBusy('chatPrep', false)
    }
  }

  const handleAskQuestion = async (e) => {
    e.preventDefault()
    if (!question.trim()) return

    setError('')
    setBusy('chat', true)
    try {
      const res = await chatWithDocument(id, question)
      setChatHistory((prev) => [...prev, { question, answer: res.data.answer }])
      setQuestion('')
    } catch {
      setError('The AI service is temporarily busy. Please try again in a moment.')
    } finally {
      setBusy('chat', false)
    }
  }

  if (!document) return <div className="p-8">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link to="/dashboard" className="text-emerald-600 text-sm hover:underline">
          &larr; Back to Dashboard
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-gray-800">{document.title}</h1>
          <p className="text-gray-500 text-sm">{document.subject || 'Uncategorized'}</p>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Summary</h2>
            <button
              onClick={handleSummarize}
              disabled={loading.summary}
              className="bg-emerald-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading.summary ? 'Generating...' : summary ? 'Regenerate' : 'Generate Summary'}
            </button>
          </div>
          {summary && (
            <div className="text-gray-700 text-sm prose prose-sm max-w-none">
              <ReactMarkdown>{summary}</ReactMarkdown>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Quiz</h2>
            <button
              onClick={handleGenerateQuiz}
              disabled={loading.quiz}
              className="bg-emerald-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading.quiz ? 'Generating...' : 'Generate Quiz'}
            </button>
          </div>

          {quiz && !quizResult && (
            <div className="space-y-4">
              {quiz.questions.map((q) => (
                <div key={q.id} className="border-t pt-3">
                  <p className="font-medium text-sm mb-2">{q.question_text}</p>
                  {['a', 'b', 'c', 'd'].map((opt) => (
                    <label key={opt} className="block text-sm mb-1">
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        value={opt}
                        checked={answers[q.id] === opt}
                        onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                        className="mr-2"
                      />
                      {q[`option_${opt}`]}
                    </label>
                  ))}
                </div>
              ))}
              <button
                onClick={handleSubmitQuiz}
                disabled={loading.submit}
                className="bg-emerald-600 text-white px-4 py-2 rounded-md text-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                {loading.submit ? 'Submitting...' : 'Submit Quiz'}
              </button>
            </div>
          )}

          {quizResult && (
            <div className="space-y-3">
              <p className="font-semibold text-emerald-700">
                Score: {quizResult.score} / {quizResult.total_questions}
              </p>
              {quizResult.feedback.map((f) => (
                <div key={f.question_id} className="border-t pt-2 text-sm">
                  <p className="font-medium">{f.question_text}</p>
                  <p className={f.is_correct ? 'text-emerald-600' : 'text-red-600'}>
                    Your answer: {f.selected_option} {f.is_correct ? '(Correct)' : `(Incorrect, correct: ${f.correct_option})`}
                  </p>
                  <p className="text-gray-500">{f.explanation}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Chat with this Document</h2>
            {!chatReady && (
              <button
                onClick={handlePrepareChat}
                disabled={loading.chatPrep}
                className="bg-emerald-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                {loading.chatPrep ? 'Preparing...' : 'Enable Chat'}
              </button>
            )}
          </div>

          {chatReady && (
            <>
              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                {chatHistory.map((msg, i) => (
                  <div key={i} className="text-sm">
                    <p className="font-medium">Q: {msg.question}</p>
                    <div className="text-gray-600 prose prose-sm max-w-none">
                      <ReactMarkdown>{msg.answer}</ReactMarkdown>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleAskQuestion} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ask a question about this document..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="flex-1 border rounded-md px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={loading.chat}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-md text-sm hover:bg-emerald-700 disabled:opacity-50"
                >
                  {loading.chat ? '...' : 'Ask'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}