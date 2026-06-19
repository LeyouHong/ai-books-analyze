import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap'
import { forgotPassword } from '../api/users'

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await forgotPassword(email)
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-bg d-flex align-items-center justify-content-center min-vh-100">
      <Container>
        <Row className="justify-content-center">
          <Col xs={12} sm={10} md={7} lg={5} xl={4}>
            <div className="text-center mb-4">
              <h4 className="fw-bold text-white mb-1">Forgot Password</h4>
              <p className="text-white-50 small">Enter your email to receive a reset link</p>
            </div>

            <Card className="border-0 shadow-lg rounded-4">
              <Card.Body className="p-4 p-sm-5">
                {sent ? (
                  <div className="text-center py-2">
                    <div style={{ fontSize: 48 }} className="mb-3">📬</div>
                    <h6 className="fw-semibold mb-2">Check your email</h6>
                    <p className="text-muted small">
                      If <strong>{email}</strong> is registered, we've sent a password reset link.
                    </p>
                    <Link to="/login" className="btn btn-primary rounded-3 w-100 mt-2">Back to Sign in</Link>
                  </div>
                ) : (
                  <>
                    {error && (
                      <Alert variant="danger" className="rounded-3 py-2 small" dismissible onClose={() => setError('')}>
                        {error}
                      </Alert>
                    )}
                    <Form onSubmit={handleSubmit} noValidate>
                      <Form.Group className="mb-4" controlId="reset-email">
                        <Form.Label className="fw-semibold small text-secondary">Email address</Form.Label>
                        <Form.Control
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          required
                          autoFocus
                          className="rounded-3 py-2"
                        />
                      </Form.Group>
                      <Button
                        variant="primary"
                        type="submit"
                        className="w-100 py-2 rounded-3 fw-semibold"
                        disabled={loading || !email}
                      >
                        {loading ? <><Spinner animation="border" size="sm" className="me-2" />Sending…</> : 'Send reset link'}
                      </Button>
                    </Form>
                    <p className="text-center text-muted small mt-4 mb-0">
                      <Link to="/login" className="fw-semibold">Back to Sign in</Link>
                    </p>
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
