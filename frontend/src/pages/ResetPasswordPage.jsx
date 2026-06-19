import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, InputGroup } from 'react-bootstrap'
import { resetPassword } from '../api/users'

export default function ResetPasswordPage() {
  const { uid, token } = useParams()
  const navigate = useNavigate()

  const [fields, setFields]           = useState({ password: '', confirm: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (fields.password !== fields.confirm) {
      setError('Passwords do not match.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await resetPassword(uid, token, fields.password)
      setSuccess(true)
      setTimeout(() => navigate('/login', { replace: true }), 3000)
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Invalid or expired reset link.')
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
              <h4 className="fw-bold text-white mb-1">Reset Password</h4>
              <p className="text-white-50 small">Enter your new password below</p>
            </div>

            <Card className="border-0 shadow-lg rounded-4">
              <Card.Body className="p-4 p-sm-5">
                {success ? (
                  <div className="text-center py-2">
                    <div style={{ fontSize: 48 }} className="mb-3">✅</div>
                    <h6 className="fw-semibold mb-2">Password reset!</h6>
                    <p className="text-muted small">Redirecting you to sign in…</p>
                    <Link to="/login" className="btn btn-primary rounded-3 w-100 mt-2">Sign in now</Link>
                  </div>
                ) : (
                  <>
                    {error && (
                      <Alert variant="danger" className="rounded-3 py-2 small" dismissible onClose={() => setError('')}>
                        {error}
                      </Alert>
                    )}

                    <Form onSubmit={handleSubmit} noValidate>
                      <Form.Group className="mb-3" controlId="rp-password">
                        <Form.Label className="fw-semibold small text-secondary">New password</Form.Label>
                        <InputGroup>
                          <Form.Control
                            type={showPassword ? 'text' : 'password'}
                            placeholder="At least 8 characters"
                            value={fields.password}
                            onChange={e => setFields(f => ({ ...f, password: e.target.value }))}
                            required
                            autoFocus
                            autoComplete="new-password"
                            className="rounded-start-3 py-2"
                          />
                          <Button
                            variant="outline-secondary"
                            type="button"
                            className="rounded-end-3 px-3"
                            onClick={() => setShowPassword(v => !v)}
                            tabIndex={-1}
                          >
                            {showPassword ? '🙈' : '👁'}
                          </Button>
                        </InputGroup>
                      </Form.Group>

                      <Form.Group className="mb-4" controlId="rp-confirm">
                        <Form.Label className="fw-semibold small text-secondary">Confirm password</Form.Label>
                        <Form.Control
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Repeat new password"
                          value={fields.confirm}
                          onChange={e => setFields(f => ({ ...f, confirm: e.target.value }))}
                          required
                          autoComplete="new-password"
                          className="rounded-3 py-2"
                        />
                      </Form.Group>

                      <Button
                        variant="primary"
                        type="submit"
                        className="w-100 py-2 rounded-3 fw-semibold"
                        disabled={loading || !fields.password || !fields.confirm}
                      >
                        {loading
                          ? <><Spinner animation="border" size="sm" className="me-2" />Resetting…</>
                          : 'Reset password'}
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
