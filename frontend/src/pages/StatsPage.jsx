import { useRef } from 'react'
import { Container, Row, Col, Card, Spinner, Badge } from 'react-bootstrap'
import { useQuery } from '@tanstack/react-query'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import html2canvas from 'html2canvas'
import AppNavbar from '../components/AppNavbar'
import { getMyStats } from '../api/books'
import { getMe } from '../api/users'

const YEAR = new Date().getFullYear()
const RATING_COLORS = ['#f87171', '#fb923c', '#facc15', '#4ade80', '#22d3ee']

export default function StatsPage() {
  const summaryRef = useRef(null)
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe })
  const { data: stats, isLoading } = useQuery({ queryKey: ['my-stats'], queryFn: getMyStats })

  async function handleDownload() {
    if (!summaryRef.current) return
    const canvas = await html2canvas(summaryRef.current, { scale: 2, useCORS: true })
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `my-${YEAR}-reading-summary.png`
    a.click()
  }

  if (isLoading) {
    return (
      <>
        <AppNavbar />
        <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
      </>
    )
  }

  const totalRead    = stats?.shelf_counts?.read    ?? 0
  const totalReading = stats?.shelf_counts?.reading ?? 0
  const totalWant    = stats?.shelf_counts?.want    ?? 0
  const totalPages   = stats?.total_pages_read ?? 0
  const avgRating    = stats?.avg_rating_given
  const totalReviews = stats?.total_reviews ?? 0
  const topTags      = stats?.top_tags ?? []

  // Rating distribution for pie chart
  const ratingData = [1, 2, 3, 4, 5]
    .map(r => ({ name: `${r}★`, value: stats?.rating_distribution?.[r] ?? 0 }))
    .filter(d => d.value > 0)

  return (
    <>
      <AppNavbar />
      <Container className="py-4">
        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
          <h4 className="fw-bold mb-0">My Reading Stats</h4>
          <button
            onClick={handleDownload}
            className="btn btn-outline-primary btn-sm rounded-3"
          >
            📥 Download {YEAR} Summary
          </button>
        </div>

        {/* Summary cards */}
        <Row xs={2} md={4} className="g-3 mb-4">
          <StatCard label="Books Read" value={totalRead} icon="✅" color="#22c55e" />
          <StatCard label="Currently Reading" value={totalReading} icon="📚" color="#3b82f6" />
          <StatCard label="Want to Read" value={totalWant} icon="🔖" color="#f59e0b" />
          <StatCard label="Pages Read" value={totalPages.toLocaleString()} icon="📄" color="#8b5cf6" />
        </Row>

        <Row className="g-3 mb-4">
          <StatCard label="Reviews Written" value={totalReviews} icon="⭐" color="#f59e0b" />
          <StatCard
            label="Avg Rating Given"
            value={avgRating != null ? `${avgRating} / 5` : '—'}
            icon="🌟" color="#f59e0b"
          />
          {topTags.slice(0, 2).map((t, i) => (
            <Col key={i} xs={6} md={3}>
              <Card className="border-0 shadow-sm rounded-4 h-100 text-center p-3">
                <div style={{ fontSize: 28 }}>🏷️</div>
                <div className="fw-bold mt-1" style={{ fontSize: 20 }}>{t.name}</div>
                <div className="text-muted small">{t.n} book{t.n !== 1 ? 's' : ''} read</div>
              </Card>
            </Col>
          ))}
        </Row>

        {/* Pie chart + Summary card side by side */}
        <Row className="g-3 mb-2 align-items-stretch">
          <Col md={5}>
            <Card className="border-0 shadow-sm rounded-4 p-4 h-100">
              <h6 className="fw-semibold mb-3">My Rating Distribution</h6>
              {ratingData.length === 0 ? (
                <p className="text-muted small">No reviews yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={ratingData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={88}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {ratingData.map((entry, i) => (
                        <Cell key={i} fill={RATING_COLORS[parseInt(entry.name) - 1]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, name) => [v, name]} />
                    <Legend iconType="circle" iconSize={10} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>
          </Col>

          <Col md={7} className="d-flex flex-column">
            <h6 className="fw-semibold mb-2">{YEAR} Reading Summary Card</h6>
            <div
              ref={summaryRef}
              style={{
                background: 'linear-gradient(135deg, #0d6efd 0%, #6610f2 100%)',
                borderRadius: 20, padding: '28px 28px', color: '#fff',
                fontFamily: 'system-ui, sans-serif', flex: 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{
                  width: 46, height: 46, borderRadius: '50%',
                  background: 'rgba(255,255,255,.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, fontWeight: 700,
                }}>
                  {me?.username?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{me?.username}</div>
                  <div style={{ opacity: .7, fontSize: 12 }}>My {YEAR} Reading Year</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                <SummaryBlock value={totalRead} label="Books Finished" />
                <SummaryBlock value={totalPages.toLocaleString()} label="Pages Read" />
                <SummaryBlock value={totalReviews} label="Reviews Written" />
                <SummaryBlock value={avgRating != null ? `${avgRating}★` : '—'} label="Avg Rating" />
              </div>

              {topTags.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ opacity: .7, fontSize: 11, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
                    Favourite genres
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {topTags.map(t => (
                      <span key={t.name} style={{
                        background: 'rgba(255,255,255,.2)', borderRadius: 99,
                        padding: '3px 10px', fontSize: 11, fontWeight: 500,
                      }}>
                        {t.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ opacity: .5, fontSize: 10, textAlign: 'right' }}>AI Books Analyze · {YEAR}</div>
            </div>
            <p className="text-muted small mt-2 mb-0">
              Click "Download {YEAR} Summary" to save as an image.
            </p>
          </Col>
        </Row>
      </Container>
    </>
  )
}

function StatCard({ label, value, icon, color }) {
  return (
    <Col>
      <Card className="border-0 shadow-sm rounded-4 h-100 text-center p-3">
        <div style={{ fontSize: 28 }}>{icon}</div>
        <div className="fw-bold mt-1" style={{ fontSize: 24, color }}>{value}</div>
        <div className="text-muted small">{label}</div>
      </Card>
    </Col>
  )
}

function SummaryBlock({ value, label }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,.15)', borderRadius: 12, padding: '16px 18px',
    }}>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 12, opacity: .75, marginTop: 2 }}>{label}</div>
    </div>
  )
}

