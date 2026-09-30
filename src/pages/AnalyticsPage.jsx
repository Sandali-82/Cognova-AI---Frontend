import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getAnalyticsDashboard } from '../api/analyticsApi'
import {LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,BarChart, Bar,} from 'recharts'
import { chartColors } from '../theme'

const tooltipStyles = {
  contentStyle: {
    backgroundColor: chartColors.tooltipBg,
    border: `1px solid ${chartColors.tooltipBorder}`,
    borderRadius: '6px',
  },
  labelStyle: { color: chartColors.tooltipText },
  itemStyle: { color: chartColors.tooltipText },
}

export default function AnalyticsPage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getAnalyticsDashboard()
      .then((res) => setData(res.data))
      .catch(() => setError('Failed to load analytics'))
  }, [])

  if (error) return <div className="p-8 text-danger">{error}</div>
  if (!data) return <div className="p-8">Loading...</div>

  const { overall_stats, score_trend, subject_performance } = data

  const trendData = score_trend.map((item, index) => ({
    name: `Quiz ${index + 1}`,
    percentage: item.percentage,
  }))

  return (
    <div className="min-h-screen bg-app p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link to="/dashboard" className="text-brand-from text-sm hover:underline">
          &larr; Back to Dashboard
        </Link>

        <h1 className="text-2xl font-bold text-ink">Analytics Dashboard</h1>

        {/* Overall Stats */}
        <div className="bg-card border border-line p-6 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Overview</h2>
          {overall_stats.total_attempts === 0 ? (
            <p className="text-ink-muted text-sm">No quiz attempts yet. Take a quiz to see your stats!</p>
          ) : (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-brand-from">{overall_stats.total_attempts}</p>
                <p className="text-sm text-ink-muted">Total Attempts</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-from">{overall_stats.average_percentage}%</p>
                <p className="text-sm text-ink-muted">Average Score</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-from">{overall_stats.best_quiz?.percentage}%</p>
                <p className="text-sm text-ink-muted">Best Quiz</p>
              </div>
            </div>
          )}
        </div>

        {/* Score Trend */}
        {score_trend.length > 0 && (
          <div className="bg-card border border-line p-6 rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Score Trend</h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                <XAxis dataKey="name" fontSize={12} stroke={chartColors.axis} tick={{ fill: chartColors.axis }} />
                <YAxis domain={[0, 100]} fontSize={12} stroke={chartColors.axis} tick={{ fill: chartColors.axis }} />
                <Tooltip {...tooltipStyles} />
                <Line type="monotone" dataKey="percentage" stroke={chartColors.line} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Subject Performance */}
        {subject_performance.length > 0 && (
          <div className="bg-card border border-line p-6 rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Focus Areas (Weakest First)</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={subject_performance}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                <XAxis dataKey="subject" fontSize={12} stroke={chartColors.axis} tick={{ fill: chartColors.axis }} />
                <YAxis domain={[0, 100]} fontSize={12} stroke={chartColors.axis} tick={{ fill: chartColors.axis }} />
                <Tooltip {...tooltipStyles} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="average_percentage" fill={chartColors.bar} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}