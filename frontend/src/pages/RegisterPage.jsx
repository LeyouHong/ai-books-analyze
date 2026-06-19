import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, InputGroup } from 'react-bootstrap'
import { register } from '../api/auth'
import { useAuth } from '../contexts/AuthContext'

export default function RegisterPage() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [fields, setFields] = useState({ username: '', email: '', password: '', confirm: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) {
    navigate('/', { replace: true })
    return null
  }

  function set(key) {
    return (e) => {
      setFields((f) => ({ ...f, [key]: e.target.value }))
      setErrors((err) => ({ ...err, [key]: undefined, general: undefined }))
    }
  }

  function validate() {
    const errs = {}
    if (!fields.username.trim()) errs.username = 'Username is required.'
    if (!fields.email.trim()) errs.email = 'Email is required.'
    if (!fields.password) errs.password = 'Password is required.'
    if (fields.password && fields.password !== fields.confirm)
      errs.confirm = 'Passwords do not match.'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    setErrors({})
    try {
      await register(fields.username.trim(), fields.email.trim(), fields.password)
      navigate('/register/check-email', { state: { email: fields.email.trim() } })
    } catch (err) {
      const data = err.response?.data ?? {}
      setErrors({
        username: data.username?.[0],
        email:    data.email?.[0],
        password: data.password?.[0],
        general:  data.detail,
      })
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = fields.username && fields.email && fields.password && fields.confirm && !loading

  return (
    <div className="login-bg d-flex align-items-center justify-content-center min-vh-100">
      <Container>
        <Row className="justify-content-center">
          <Col xs={12} sm={10} md={7} lg={5} xl={4}>
            <div className="text-center mb-4">
              <div className="login-logo mb-3">
                <AppLogoIcon />
              </div>
              <h4 className="fw-bold text-white mb-1">Create an account</h4>
              <p className="text-white-50 small">We'll send you a verification email</p>
            </div>

            <Card className="border-0 shadow-lg rounded-4">
              <Card.Body className="p-4 p-sm-5">
                {errors.general && (
                  <Alert variant="danger" className="rounded-3 py-2 small" dismissible onClose={() => setErrors((e) => ({ ...e, general: undefined }))}>
                    {errors.general}
                  </Alert>
                )}

                <Form onSubmit={handleSubmit} noValidate>
                  <Form.Group className="mb-3" controlId="reg-username">
                    <Form.Label className="fw-semibold small text-secondary">Username</Form.Label>
                    <Form.Control
                      value={fields.username}
                      onChange={set('username')}
                      isInvalid={!!errors.username}
                      placeholder="Choose a username"
                      autoFocus
                      autoComplete="username"
                      className="rounded-3 py-2"
                    />
                    <Form.Control.Feedback type="invalid">{errors.username}</Form.Control.Feedback>
                  </Form.Group>

                  <Form.Group className="mb-3" controlId="reg-email">
                    <Form.Label className="fw-semibold small text-secondary">Email</Form.Label>
                    <Form.Control
                      type="email"
                      value={fields.email}
                      onChange={set('email')}
                      isInvalid={!!errors.email}
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="rounded-3 py-2"
                    />
                    <Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback>
                  </Form.Group>

                  <Form.Group className="mb-3" controlId="reg-password">
                    <Form.Label className="fw-semibold small text-secondary">Password</Form.Label>
                    <InputGroup>
                      <Form.Control
                        type={showPassword ? 'text' : 'password'}
                        value={fields.password}
                        onChange={set('password')}
                        isInvalid={!!errors.password}
                        placeholder="At least 8 characters"
                        autoComplete="new-password"
                        className="rounded-start-3 py-2"
                      />
                      <Button variant="outline-secondary" className="rounded-end-3 px-3" type="button"
                        onClick={() => setShowPassword((v) => !v)} tabIndex={-1}>
                        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </Button>
                      <Form.Control.Feedback type="invalid">{errors.password}</Form.Control.Feedback>
                    </InputGroup>
                  </Form.Group>

                  <Form.Group className="mb-4" controlId="reg-confirm">
                    <Form.Label className="fw-semibold small text-secondary">Confirm password</Form.Label>
                    <Form.Control
                      type={showPassword ? 'text' : 'password'}
                      value={fields.confirm}
                      onChange={set('confirm')}
                      isInvalid={!!errors.confirm}
                      placeholder="Repeat password"
                      autoComplete="new-password"
                      className="rounded-3 py-2"
                    />
                    <Form.Control.Feedback type="invalid">{errors.confirm}</Form.Control.Feedback>
                  </Form.Group>

                  <Button variant="primary" type="submit" className="w-100 py-2 rounded-3 fw-semibold" disabled={!canSubmit}>
                    {loading
                      ? <><Spinner animation="border" size="sm" className="me-2" />Creating account…</>
                      : 'Create account'}
                  </Button>
                </Form>

                <p className="text-center text-muted small mt-4 mb-0">
                  Already have an account?{' '}
                  <Link to="/login" className="fw-semibold">Sign in</Link>
                </p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  )
}

function AppLogoIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#0d6efd" />
      <path d="M12 36V14a2 2 0 0 1 2-2h10l8 8v16a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2Z" fill="white" opacity=".9"/>
      <path d="M24 12l8 8h-6a2 2 0 0 1-2-2v-6Z" fill="white" opacity=".6"/>
      <line x1="17" y1="22" x2="31" y2="22" stroke="#0d6efd" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="17" y1="27" x2="31" y2="27" stroke="#0d6efd" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="17" y1="32" x2="25" y2="32" stroke="#0d6efd" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
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
