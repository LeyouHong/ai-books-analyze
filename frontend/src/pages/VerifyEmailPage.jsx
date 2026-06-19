import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Container, Row, Col, Card, Spinner } from 'react-bootstrap'
import { verifyEmail } from '../api/auth'
import { useAuth } from '../contexts/AuthContext'

export default function VerifyEmailPage() {
  const [params] = useSearchParams()
  const uid   = params.get('uid') ?? ''
  const token = params.get('token') ?? ''
  const { markVerified } = useAuth()

  const [status, setStatus] = useState('loading') // 'loading' | 'success' | 'error' | 'already'
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!uid || !token) {
      setStatus('error')
      setMessage('Invalid verification link.')
      return
    }
    verifyEmail(uid, token)
      .then((data) => {
        if (data.detail?.includes('already')) {
          setStatus('already')
        } else {
          setStatus('success')
          markVerified()
        }
        setMessage(data.detail)
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err.response?.data?.detail ?? 'Verification failed. The link may have expired.')
      })
  }, [uid, token])

  return (
    <div className="login-bg d-flex align-items-center justify-content-center min-vh-100">
      <Container>
        <Row className="justify-content-center">
          <Col xs={12} sm={10} md={7} lg={5} xl={4}>
            <Card className="border-0 shadow-lg rounded-4 text-center">
              <Card.Body className="p-4 p-sm-5">
                {status === 'loading' && (
                  <>
                    <Spinner animation="border" variant="primary" className="mb-3" />
                    <p className="text-muted small">Verifying your email…</p>
                  </>
                )}

                {status === 'success' && (
                  <>
                    <SuccessIcon />
                    <h5 className="fw-bold mt-3 mb-2">Email verified!</h5>
                    <p className="text-muted small mb-4">{message}</p>
                    <Link to="/login" className="btn btn-primary rounded-3 w-100">
                      Sign in to your account
                    </Link>
                  </>
                )}

                {status === 'already' && (
                  <>
                    <SuccessIcon />
                    <h5 className="fw-bold mt-3 mb-2">Already verified</h5>
                    <p className="text-muted small mb-4">{message}</p>
                    <Link to="/login" className="btn btn-primary rounded-3 w-100">
                      Sign in
                    </Link>
                  </>
                )}

                {status === 'error' && (
                  <>
                    <ErrorIcon />
                    <h5 className="fw-bold mt-3 mb-2">Verification failed</h5>
                    <p className="text-muted small mb-4">{message}</p>
                    <Link to="/register" className="btn btn-outline-primary rounded-3 w-100 mb-2">
                      Register again
                    </Link>
                    <Link to="/login" className="btn btn-link rounded-3 w-100 text-muted small">
                      Back to sign in
                    </Link>
                  </>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  )
}

function SuccessIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="56" height="56" rx="16" fill="#d1e7dd"/>
      <circle cx="28" cy="28" r="12" stroke="#198754" strokeWidth="1.8"/>
      <path d="M22 28.5l4 4 8-8" stroke="#198754" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function ErrorIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="56" height="56" rx="16" fill="#f8d7da"/>
      <circle cx="28" cy="28" r="12" stroke="#dc3545" strokeWidth="1.8"/>
      <path d="M24 24l8 8M32 24l-8 8" stroke="#dc3545" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}
