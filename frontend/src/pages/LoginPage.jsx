import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, InputGroup } from 'react-bootstrap'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { login } from '../api/auth'

export default function LoginPage() {
  const { saveAuth, isAuthenticated } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const from = location.state?.from?.pathname || '/'

  // Already logged in — send away
  if (isAuthenticated) {
    navigate(from, { replace: true })
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await login(username, password)
      queryClient.clear()
      saveAuth(data)
      navigate(from, { replace: true })
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(detail || 'Invalid credentials. Please try again.')
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
              <div className="login-logo mb-3">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="48" height="48" rx="12" fill="#0d6efd" />
                  <path d="M12 36V14a2 2 0 0 1 2-2h10l8 8v16a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2Z" fill="white" opacity=".9"/>
                  <path d="M24 12l8 8h-6a2 2 0 0 1-2-2v-6Z" fill="white" opacity=".6"/>
                  <line x1="17" y1="22" x2="31" y2="22" stroke="#0d6efd" strokeWidth="1.8" strokeLinecap="round"/>
                  <line x1="17" y1="27" x2="31" y2="27" stroke="#0d6efd" strokeWidth="1.8" strokeLinecap="round"/>
                  <line x1="17" y1="32" x2="25" y2="32" stroke="#0d6efd" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </div>
              <h4 className="fw-bold text-white mb-1">AI Books Analyze</h4>
              <p className="text-white-50 small">Sign in to your account</p>
            </div>

            <Card className="border-0 shadow-lg rounded-4">
              <Card.Body className="p-4 p-sm-5">
                {error && (
                  <Alert variant="danger" className="rounded-3 py-2 small" dismissible onClose={() => setError('')}>
                    {error}
                  </Alert>
                )}

                <Form onSubmit={handleSubmit} noValidate>
                  <Form.Group className="mb-3" controlId="username">
                    <Form.Label className="fw-semibold small text-secondary">Username</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      autoFocus
                      autoComplete="username"
                      className="rounded-3 py-2"
                    />
                  </Form.Group>

                  <Form.Group className="mb-4" controlId="password">
                    <Form.Label className="fw-semibold small text-secondary">Password</Form.Label>
                    <InputGroup>
                      <Form.Control
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        className="rounded-start-3 py-2"
                      />
                      <Button
                        variant="outline-secondary"
                        className="rounded-end-3 px-3"
                        onClick={() => setShowPassword((v) => !v)}
                        tabIndex={-1}
                        type="button"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <EyeOffIcon />
                        ) : (
                          <EyeIcon />
                        )}
                      </Button>
                    </InputGroup>
                  </Form.Group>

                  <Button
                    variant="primary"
                    type="submit"
                    className="w-100 py-2 rounded-3 fw-semibold"
                    disabled={loading || !username || !password}
                  >
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Signing in…
                      </>
                    ) : (
                      'Sign in'
                    )}
                  </Button>
                </Form>

                <p className="text-center text-muted small mt-3 mb-1">
                  <Link to="/forgot-password" className="fw-semibold">Forgot your password?</Link>
                </p>
                <p className="text-center text-muted small mb-0">
                  Don't have an account?{' '}
                  <Link to="/register" className="fw-semibold">Sign up</Link>
                </p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  )
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}
