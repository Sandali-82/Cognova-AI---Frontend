import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { getAnalyticsDashboard } from '../api/analyticsApi'
import AnalyticsPage from './AnalyticsPage'

vi.mock('../api/analyticsApi', () => ({ getAnalyticsDashboard: vi.fn() }))

// jsdom cannot lay out SVG charts, so render simple stand-ins that expose the data they receive
vi.mock('recharts', async () => {
  const { createElement: h } = await import('react')
  const passthrough = ({ children }) => h('div', null, children)
  const chart = (testId) =>
    ({ data, children }) =>
      h('div', { 'data-testid': testId, 'data-points': JSON.stringify(data) }, children)
  const empty = () => null
  return {
    ResponsiveContainer: passthrough,
    LineChart: chart('line-chart'),
    BarChart: chart('bar-chart'),
    Line: empty,
    Bar: empty,
    XAxis: empty,
    YAxis: empty,
    CartesianGrid: empty,
    Tooltip: empty,
  }
})

const FULL_DATA = {
  overall_stats: {
    total_attempts: 3,
    average_percentage: 66.7,
    best_quiz: { quiz_title: 'Cells Quiz', percentage: 100 },
    weakest_quiz: { quiz_title: 'Forces Quiz', percentage: 50 },
  },
  score_trend: [{ percentage: 50 }, { percentage: 100 }],
  subject_performance: [
    { subject: 'Physics', average_percentage: 40 },
    { subject: 'Biology', average_percentage: 80 },
  ],
}

const EMPTY_DATA = {
  overall_stats: {
    total_attempts: 0,
    average_percentage: 0,
    best_quiz: null,
    weakest_quiz: null,
  },
  score_trend: [],
  subject_performance: [],
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AnalyticsPage />
    </MemoryRouter>,
  )
}

const chartData = (testId) =>
  JSON.parse(screen.getByTestId(testId).getAttribute('data-points'))

describe('AnalyticsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  test('shows a loading message until the data arrives', () => {
    getAnalyticsDashboard.mockReturnValueOnce(new Promise(() => {})) // never resolves
    renderPage()

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  test('shows an error when the analytics cannot be loaded', async () => {
    getAnalyticsDashboard.mockRejectedValueOnce(new Error('Network Error'))
    renderPage()

    expect(await screen.findByText('Failed to load analytics')).toBeInTheDocument()
  })

  test('shows a hint and no charts when there are no quiz attempts', async () => {
    getAnalyticsDashboard.mockResolvedValueOnce({ data: EMPTY_DATA })
    renderPage()

    expect(
      await screen.findByText('No quiz attempts yet. Take a quiz to see your stats!'),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument()
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Score Trend' })).not.toBeInTheDocument()
  })

  test('shows the overview numbers', async () => {
    getAnalyticsDashboard.mockResolvedValueOnce({ data: FULL_DATA })
    renderPage()

    const attempts = await screen.findByText('Total Attempts')
    expect(attempts.previousElementSibling).toHaveTextContent('3')
    expect(screen.getByText('Average Score').previousElementSibling).toHaveTextContent('66.7%')
    expect(screen.getByText('Best Quiz').previousElementSibling).toHaveTextContent('100%')
  })

  test('labels the score trend points as Quiz 1, Quiz 2, ...', async () => {
    getAnalyticsDashboard.mockResolvedValueOnce({ data: FULL_DATA })
    renderPage()

    await screen.findByRole('heading', { name: 'Score Trend' })
    expect(chartData('line-chart')).toEqual([
      { name: 'Quiz 1', percentage: 50 },
      { name: 'Quiz 2', percentage: 100 },
    ])
  })

  test('passes the subject performance to the bar chart in the order received', async () => {
    getAnalyticsDashboard.mockResolvedValueOnce({ data: FULL_DATA })
    renderPage()

    await screen.findByRole('heading', { name: 'Focus Areas (Weakest First)' })
    expect(chartData('bar-chart')).toEqual(FULL_DATA.subject_performance)
  })

  test('hides the subject chart when there is no subject data', async () => {
    getAnalyticsDashboard.mockResolvedValueOnce({
      data: { ...FULL_DATA, subject_performance: [] },
    })
    renderPage()

    expect(await screen.findByTestId('line-chart')).toBeInTheDocument()
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Focus Areas (Weakest First)' }),
    ).not.toBeInTheDocument()
  })

  test('has a link back to the dashboard', async () => {
    getAnalyticsDashboard.mockResolvedValueOnce({ data: FULL_DATA })
    renderPage()

    expect(await screen.findByRole('link', { name: /Back to Dashboard/ })).toHaveAttribute(
      'href',
      '/dashboard',
    )
  })
})