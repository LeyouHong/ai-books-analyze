import { Container, Row, Col, Card, Spinner, Alert, Button } from 'react-bootstrap'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import AppNavbar from '../components/AppNavbar'
import { getStats, triggerSentryError } from '../api/admin'

export default function DashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: getStats,
    refetchInterval: 60_000,
  })

  const sentryMutation = useMutation({
    mutationFn: triggerSentryError,
    onSuccess: () => {
      // The endpoint deliberately throws — this line should never be reached
    },
    onError: () => {
      // Expected — the endpoint is meant to error so Sentry captures it
    },
  })

  return (
    <>
      <AppNavbar />
      <Container className="py-4">
        <div className="d-flex align-items-center justify-content-between mb-4">
          <h4 className="fw-bold mb-0">Dashboard</h4>
          <Button
            variant="outline-danger"
            size="sm"
            className="rounded-3"
            disabled={sentryMutation.isPending}
            onClick={() => sentryMutation.mutate()}
          >
            {sentryMutation.isPending ? (
              <>
                <Spinner animation="border" size="sm" className="me-1" />
                Testing…
              </>
            ) : (
              'Test Sentry'
            )}
          </Button>
        </div>

        {sentryMutation.isError && (
          <Alert variant="info" className="small rounded-3">
            Error triggered successfully — check Sentry for the captured event.
          </Alert>
        )}

        {isError && (
          <Alert variant="danger" className="small rounded-3">
            Failed to load stats. Admin access required.
          </Alert>
        )}

        {isLoading ? (
          <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
        ) : data && (
          <>
            {/* Stat cards */}
            <Row className="g-3 mb-4">
              <Col xs={12} sm={4}>
                <StatCard label="Total Books" value={data.total_books} color="#0d6efd" />
              </Col>
              <Col xs={12} sm={4}>
                <StatCard label="Total Users" value={data.total_users} color="#6610f2" />
              </Col>
              <Col xs={12} sm={4}>
                <StatCard label="Active Users" value={data.active_users} color="#198754" />
              </Col>
            </Row>

            {/* Upload trend chart */}
            <Card className="border-0 shadow-sm rounded-4">
              <Card.Body className="p-4">
                <h6 className="fw-semibold mb-3 text-secondary">Books uploaded — last 7 days</h6>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={data.upload_trend} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,.1)' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="books"
                      stroke="#0d6efd"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#0d6efd' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card.Body>
            </Card>
          </>
        )}
      </Container>
    </>
  )
}

function StatCard({ label, value, color }) {
  return (
    <Card className="border-0 shadow-sm rounded-4 h-100">
      <Card.Body className="p-4">
        <p className="text-muted small mb-1">{label}</p>
        <p className="fw-bold mb-0" style={{ fontSize: 36, color }}>{value}</p>
      </Card.Body>
    </Card>
  )
}
