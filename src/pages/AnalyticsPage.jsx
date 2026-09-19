import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getAnalyticsDashboard } from '../api/analyticsApi'
import {LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,BarChart, Bar,} from 'recharts'

export default function AnalyticsPage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getAnalyticsDashboard()
      .then((res) => setData(res.data))
      .catch(() => setError('Failed to load analytics'))
  }, [])

  if (error) return <div className="p-8 text-red-600">{error}</div>
  if (!data) return <div className="p-8">Loading...</div>

  const { overall_stats, score_trend, subject_performance } = data

  const trendData = score_trend.map((item, index) => ({
    name: `Quiz ${index + 1}`,
    percentage: item.percentage,
  }))

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link to="/dashboard" className="text-emerald-600 text-sm hover:underline">
          &larr; Back to Dashboard
        </Link>

        <h1 className="text-2xl font-bold text-gray-800">Analytics Dashboard</h1>

        {/* Overall Stats */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Overview</h2>
          {overall_stats.total_attempts === 0 ? (
            <p className="text-gray-500 text-sm">No quiz attempts yet. Take a quiz to see your stats!</p>
          ) : (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-emerald-600">{overall_stats.total_attempts}</p>
                <p className="text-sm text-gray-500">Total Attempts</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{overall_stats.average_percentage}%</p>
                <p className="text-sm text-gray-500">Average Score</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{overall_stats.best_quiz?.percentage}%</p>
                <p className="text-sm text-gray-500">Best Quiz</p>
              </div>
            </div>
          )}
        </div>

        {/* Score Trend */}
        {score_trend.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Score Trend</h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis domain={[0, 100]} fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="percentage" stroke="#059669" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Subject Performance */}
        {subject_performance.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Focus Areas (Weakest First)</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={subject_performance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="subject" fontSize={12} />
                <YAxis domain={[0, 100]} fontSize={12} />
                <Tooltip />
                <Bar dataKey="average_percentage" fill="#059669" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}