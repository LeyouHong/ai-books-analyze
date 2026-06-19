import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Container, Row, Col, Card, Button, Alert, Spinner } from 'react-bootstrap'
import { resendVerification } from '../api/auth'

const COOLDOWN = 60 // seconds

export default function CheckEmailPage() {
  const { state } = useLocation()
  const email = state?.email ?? ''

  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [sentCount, setSentCount] = useState(0)  // how many times sent (0 = never)
  const [cooldown, setCooldown]   = useState(0)  // seconds remaining

  const timerRef = useRef(null)

  function startCooldown() {
    setCooldown(COOLDOWN)
  }

  // Tick the countdown every second
  useEffect(() => {
    if (cooldown <= 0) return
    timerRef.current = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timerRef.current)
  }, [cooldown])

  async function handleResend() {
    if (!email || loading || cooldown > 0) return
    setLoading(true)
    setError('')
    try {
      await resendVerification(email)
      setSentCount((n) => n + 1)
      startCooldown()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const canResend = email && !loading && cooldown === 0

  return (
    <div className="login-bg d-flex align-items-center justify-content-center min-vh-100">
      <Container>
        <Row className="justify-content-center">
          <Col xs={12} sm={10} md={7} lg={5} xl={4}>
            <Card className="border-0 shadow-lg rounded-4 text-center">
              <Card.Body className="p-4 p-sm-5">
                <div className="mb-4">
                  <EmailIcon />
                </div>

                <h5 className="fw-bold mb-2">Check your email</h5>
                <p className="text-muted small mb-4">
                  We sent a verification link to{' '}
                  {email ? <strong>{email}</strong> : 'your email address'}.
                  Click it to activate your account.
                </p>

                {error && (
                  <Alert variant="danger" className="small rounded-3 py-2" dismissible onClose={() => setError('')}>
                    {error}
                  </Alert>
                )}

                {sentCount > 0 && cooldown > 0 && (
                  <Alert variant="success" className="small rounded-3 py-2 mb-3">
                    Verification email resent!
                  </Alert>
                )}

                {email && (
                  <>
                    <Button
                      variant={canResend ? 'outline-primary' : 'outline-secondary'}
                      className="rounded-3 w-100 mb-2"
                      onClick={handleResend}
                      disabled={!canResend}
                    >
                      {loading ? (
                        <><Spinner animation="border" size="sm" className="me-2" />Resending…</>
                      ) : cooldown > 0 ? (
                        <span className="d-inline-flex align-items-center gap-2">
                          <CountdownRing seconds={cooldown} total={COOLDOWN} />
                          Resend in {cooldown}s
                        </span>
                      ) : (
                        sentCount > 0 ? 'Resend again' : 'Resend verification email'
                      )}
                    </Button>

                    {cooldown > 0 && (
                      <p className="text-muted" style={{ fontSize: 12 }}>
                        Didn't receive it? Check your spam folder.
                      </p>
                    )}
                  </>
                )}

                <p className="text-muted small mb-0 mt-2">
                  <Link to="/login" className="fw-semibold">Back to sign in</Link>
                </p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  )
}

function CountdownRing({ seconds, total }) {
  const size = 18
  const stroke = 2
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const progress = circumference - (seconds / total) * circumference

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#dee2e6" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="#6c757d"
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={progress}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.9s linear' }}
      />
    </svg>
  )
}

function EmailIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="56" height="56" rx="16" fill="#e7f1ff"/>
      <rect x="12" y="18" width="32" height="22" rx="3" stroke="#0d6efd" strokeWidth="1.8"/>
      <path d="M12 21l16 11 16-11" stroke="#0d6efd" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}
