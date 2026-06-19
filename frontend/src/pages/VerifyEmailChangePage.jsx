import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Container, Row, Col, Card, Spinner } from 'react-bootstrap'
import { confirmEmailChange } from '../api/users'

export default function VerifyEmailChangePage() {
  const [params] = useSearchParams()
  const uid   = params.get('uid')
  const token = params.get('token')

  const [status, setStatus] = useState('loading') // loading | success | error
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!uid || !token) { setStatus('error'); setMessage('Invalid verification link.'); return }
    confirmEmailChange(uid, token)
      .then(data => { setMessage(data.detail ?? 'Email updated.'); setStatus('success') })
      .catch(err => { setMessage(err.response?.data?.detail ?? 'Link expired or invalid.'); setStatus('error') })
  }, [uid, token])

  return (
    <div className="login-bg d-flex align-items-center justify-content-center min-vh-100">
      <Container>
        <Row className="justify-content-center">
          <Col xs={12} sm={10} md={7} lg={5} xl={4}>
            <Card className="border-0 shadow-lg rounded-4">
              <Card.Body className="p-4 p-sm-5 text-center">
                {status === 'loading' && (
                  <>
                    <Spinner animation="border" variant="primary" className="mb-3" />
                    <p className="text-muted">Verifying…</p>
                  </>
                )}
                {status === 'success' && (
                  <>
                    <div style={{ fontSize: 48 }} className="mb-3">✅</div>
                    <h6 className="fw-semibold mb-2">Email updated!</h6>
                    <p className="text-muted small">{message}</p>
                    <Link to="/profile" className="btn btn-primary rounded-3 mt-2">Go to Profile</Link>
                  </>
                )}
                {status === 'error' && (
                  <>
                    <div style={{ fontSize: 48 }} className="mb-3">❌</div>
                    <h6 className="fw-semibold mb-2">Verification failed</h6>
                    <p className="text-muted small">{message}</p>
                    <Link to="/profile" className="btn btn-outline-secondary rounded-3 mt-2">Go to Profile</Link>
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
