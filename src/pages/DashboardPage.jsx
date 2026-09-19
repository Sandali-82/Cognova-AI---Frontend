import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getDocuments, uploadDocument } from '../api/documentsApi'
import { useAuth } from '../context/AuthContext'

export default function DashboardPage() {
  const { logout } = useAuth()
  const [documents, setDocuments] = useState([])
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const loadDocuments = () => {
    getDocuments()
      .then((res) => setDocuments(res.data))
      .catch(() => setError('Failed to load documents'))
  }

  useEffect(() => {
    loadDocuments()
  }, [])

  const handleUpload = async (e) => {
    e.preventDefault()
    setError('')

    if (!title.trim() || !file) {
      setError('Title and file are required')
      return
    }

    const formData = new FormData()
    formData.append('title', title)
    formData.append('subject', subject)
    formData.append('file', file)

    setUploading(true)
    try {
      await uploadDocument(formData)
      setTitle('')
      setSubject('')
      setFile(null)
      loadDocuments()
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Cognova AI</h1>
          <div className="flex gap-4 items-center">
            <Link to="/analytics" className="text-sm text-emerald-600 hover:underline">
              Analytics
            </Link>
            <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-700">
              Logout
            </button>
          </div>
        </div>

        <form onSubmit={handleUpload} className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <h2 className="text-lg font-semibold mb-4">Upload a Document</h2>

          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded-md px-3 py-2 mb-3"
          />
          <input
            type="text"
            placeholder="Subject (optional, e.g. Biology)"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full border rounded-md px-3 py-2 mb-3"
          />
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files[0])}
            className="w-full mb-4"
          />

          <button
            type="submit"
            disabled={uploading}
            className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </form>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Your Documents</h2>
          {documents.length === 0 ? (
            <p className="text-gray-500 text-sm">No documents uploaded yet.</p>
          ) : (
            <ul className="space-y-2">
            {documents.map((doc) => (
              <li key={doc.id} className="border rounded-md p-3">
                <Link to={`/documents/${doc.id}`} className="block">
                  <p className="font-medium text-emerald-700 hover:underline">{doc.title}</p>
                  <p className="text-sm text-gray-500">{doc.subject || 'Uncategorized'}</p>
                </Link>
              </li>
            ))}
          </ul>
          )}
        </div>
      </div>
    </div>
  )
}