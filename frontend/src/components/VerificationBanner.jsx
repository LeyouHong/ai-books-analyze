import { useState, useEffect, useRef } from 'react'
import { Alert, Button, Spinner } from 'react-bootstrap'
import { resendVerification } from '../api/auth'

const COOLDOWN = 60

export default function VerificationBanner({ email }) {
  const [loading, setLoading]   = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [sent, setSent]         = useState(false)
  const [error, setError]       = useState('')
  const timerRef = useRef(null)

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
      setSent(true)
      setCooldown(COOLDOWN)
    } catch {
      setError('Failed to resend. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const canResend = !loading && cooldown === 0

  return (
    <Alert
      variant="warning"
      className="rounded-0 mb-0 py-2 border-0 border-bottom"
      style={{ borderLeft: '4px solid #ffc107' }}
    >
      <div className="container d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2 small">
          <WarningIcon />
          <span>
            Your email address is not verified.{' '}
            {email && <span className="text-muted">({email})</span>}
            {' '}Please check your inbox and click the verification link.
          </span>
        </div>

        <div className="d-flex align-items-center gap-2 flex-shrink-0">
          {error && <span className="text-danger small">{error}</span>}
          {sent && cooldown > 0 && <span className="text-success small">Sent!</span>}

          <Button
            size="sm"
            variant={canResend ? 'warning' : 'outline-secondary'}
            className="rounded-3 fw-semibold"
            style={{ minWidth: 160 }}
            onClick={handleResend}
            disabled={!canResend}
          >
            {loading ? (
              <><Spinner animation="border" size="sm" className="me-1" />Sending…</>
            ) : cooldown > 0 ? (
              <span className="d-inline-flex align-items-center gap-2">
                <CountdownRing seconds={cooldown} total={COOLDOWN} />
                Resend in {cooldown}s
              </span>
            ) : (
              sent ? 'Resend again' : 'Resend verification email'
            )}
          </Button>
        </div>
      </div>
    </Alert>
  )
}

function CountdownRing({ seconds, total }) {
  const size = 16
  const stroke = 2
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference - (seconds / total) * circumference
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke}
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.9s linear' }} />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: '#856404' }}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
}
