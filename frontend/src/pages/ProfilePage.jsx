import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Container, Row, Col, Card, Button, Alert, Spinner, Badge, Form, InputGroup } from 'react-bootstrap'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMe, updateMe, changePassword, changeEmail } from '../api/users'
import { useAuth } from '../contexts/AuthContext'
import AppNavbar from '../components/AppNavbar'

export default function ProfilePage() {
  const { saveAuth } = useAuth()
  const queryClient = useQueryClient()
  const fileInputRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const { data: me, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
  })

  const mutation = useMutation({
    mutationFn: updateMe,
    onSuccess: (updated) => {
      queryClient.setQueryData(['me'], updated)
      // Sync username/email back to AuthContext if changed
      saveAuth({
        access: localStorage.getItem('access_token'),
        refresh: localStorage.getItem('refresh_token'),
        username: updated.username,
        email: updated.email,
      })
      setSelectedFile(null)
      setPreview(null)
      setSuccessMsg('Avatar updated successfully.')
      setErrorMsg('')
    },
    onError: (err) => {
      const msg = err.response?.data?.avatar?.[0] ?? err.response?.data?.detail ?? 'Upload failed.'
      setErrorMsg(msg)
      setSuccessMsg('')
    },
  })

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setPreview(URL.createObjectURL(file))
    setSuccessMsg('')
    setErrorMsg('')
  }

  function handleSave() {
    if (!selectedFile) return
    const form = new FormData()
    form.append('avatar', selectedFile)
    mutation.mutate(form)
  }

  function handleDiscard() {
    setSelectedFile(null)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    fileInputRef.current.value = ''
  }

  const avatarSrc = preview ?? me?.avatar ?? null

  return (
    <>
      <AppNavbar />
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col xs={12} md={8} lg={6}>
            <h4 className="fw-bold mb-4">Profile</h4>

            {successMsg && (
              <Alert variant="success" dismissible onClose={() => setSuccessMsg('')} className="rounded-3 small">
                {successMsg}
              </Alert>
            )}
            {errorMsg && (
              <Alert variant="danger" dismissible onClose={() => setErrorMsg('')} className="rounded-3 small">
                {errorMsg}
              </Alert>
            )}

            <Card className="border-0 shadow-sm rounded-4">
              <Card.Body className="p-4">
                {isLoading ? (
                  <div className="text-center py-4">
                    <Spinner animation="border" variant="primary" />
                  </div>
                ) : (
                  <>
                    {/* Avatar section */}
                    <div className="d-flex flex-column align-items-center mb-4">
                      <div className="position-relative mb-3">
                        <AvatarDisplay src={avatarSrc} username={me?.username} size={110} />
                        <button
                          className="avatar-edit-btn"
                          onClick={() => fileInputRef.current.click()}
                          aria-label="Change avatar"
                          title="Change avatar"
                        >
                          <CameraIcon />
                        </button>
                      </div>
                      <p className="text-muted small mb-0">
                        JPG, PNG or GIF · max 5 MB
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="d-none"
                        onChange={handleFileChange}
                      />
                    </div>

                    {/* Save / Discard when a file is selected */}
                    {selectedFile && (
                      <div className="d-flex gap-2 justify-content-center mb-4">
                        <Button
                          variant="primary"
                          className="rounded-3 px-4"
                          onClick={handleSave}
                          disabled={mutation.isPending}
                        >
                          {mutation.isPending ? (
                            <><Spinner animation="border" size="sm" className="me-2" />Saving…</>
                          ) : 'Save avatar'}
                        </Button>
                        <Button variant="outline-secondary" className="rounded-3 px-4" onClick={handleDiscard}>
                          Discard
                        </Button>
                      </div>
                    )}

                    <hr className="my-3" />

                    {/* User info */}
                    <dl className="row mb-0 small">
                      <dt className="col-4 text-secondary fw-normal">Username</dt>
                      <dd className="col-8 fw-semibold mb-2">{me?.username}</dd>

                      <dt className="col-4 text-secondary fw-normal">Email</dt>
                      <dd className="col-8 fw-semibold mb-2">{me?.email || <span className="text-muted">—</span>}</dd>

                      <dt className="col-4 text-secondary fw-normal">Role</dt>
                      <dd className="col-8 mb-0">
                        {me?.is_staff
                          ? <Badge bg="warning" text="dark">Admin</Badge>
                          : <Badge bg="secondary">User</Badge>}
                      </dd>
                    </dl>
                  </>
                )}
              </Card.Body>
            </Card>

            <ChangePasswordCard />
            <ChangeEmailCard currentEmail={me?.email} />
          </Col>
        </Row>
      </Container>
    </>
  )
}

function ChangePasswordCard() {
  const [open, setOpen] = useState(false)
  const [fields, setFields] = useState({ old: '', new: '', confirm: '' })
  const [showPasswords, setShowPasswords] = useState(false)
  const [errors, setErrors] = useState({})
  const [success, setSuccess] = useState('')

  const mutation = useMutation({
    mutationFn: () => changePassword(fields.old, fields.new),
    onSuccess: () => {
      setSuccess('Password changed successfully.')
      setFields({ old: '', new: '', confirm: '' })
      setErrors({})
      setOpen(false)
    },
    onError: (err) => {
      const data = err.response?.data ?? {}
      setErrors({
        old: data.old_password?.[0],
        new: data.new_password?.[0],
        general: data.detail,
      })
      setSuccess('')
    },
  })

  function set(key) {
    return (e) => {
      setFields((f) => ({ ...f, [key]: e.target.value }))
      setErrors((e) => ({ ...e, [key]: undefined, general: undefined }))
      setSuccess('')
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = {}
    if (!fields.old) errs.old = 'Required.'
    if (!fields.new) errs.new = 'Required.'
    if (fields.new && fields.new !== fields.confirm) errs.confirm = 'Passwords do not match.'
    if (Object.keys(errs).length) { setErrors(errs); return }
    mutation.mutate()
  }

  return (
    <Card className="border-0 shadow-sm rounded-4 mt-4">
      <Card.Body className="p-4">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h6 className="fw-bold mb-0">Change Password</h6>
          <Button
            variant={open ? 'outline-secondary' : 'outline-primary'}
            size="sm"
            className="rounded-3"
            onClick={() => { setOpen(v => !v); setErrors({}); setSuccess('') }}
          >
            {open ? 'Cancel' : 'Change password'}
          </Button>
        </div>

        {success && <Alert variant="success" className="small rounded-3 py-2 mb-0" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

        {open && (
          <>
            {errors.general && <Alert variant="danger" className="small rounded-3 py-2">{errors.general}</Alert>}

            <Form onSubmit={handleSubmit} noValidate>
              <Form.Group className="mb-3" controlId="old-password">
                <Form.Label className="small fw-semibold text-secondary">Current password</Form.Label>
                <InputGroup>
                  <Form.Control
                    type={showPasswords ? 'text' : 'password'}
                    value={fields.old}
                    onChange={set('old')}
                    isInvalid={!!errors.old}
                    autoComplete="current-password"
                    className="rounded-start-3 py-2"
                  />
                  <Button variant="outline-secondary" type="button" className="rounded-end-3 px-3"
                    onClick={() => setShowPasswords(v => !v)} tabIndex={-1}>
                    {showPasswords ? <EyeOffIcon /> : <EyeIcon />}
                  </Button>
                  <Form.Control.Feedback type="invalid">{errors.old}</Form.Control.Feedback>
                </InputGroup>
              </Form.Group>

              <Form.Group className="mb-3" controlId="new-password">
                <Form.Label className="small fw-semibold text-secondary">New password</Form.Label>
                <Form.Control
                  type={showPasswords ? 'text' : 'password'}
                  value={fields.new}
                  onChange={set('new')}
                  isInvalid={!!errors.new}
                  autoComplete="new-password"
                  className="rounded-3 py-2"
                />
                <Form.Control.Feedback type="invalid">{errors.new}</Form.Control.Feedback>
              </Form.Group>

              <Form.Group className="mb-4" controlId="confirm-password">
                <Form.Label className="small fw-semibold text-secondary">Confirm new password</Form.Label>
                <Form.Control
                  type={showPasswords ? 'text' : 'password'}
                  value={fields.confirm}
                  onChange={set('confirm')}
                  isInvalid={!!errors.confirm}
                  autoComplete="new-password"
                  className="rounded-3 py-2"
                />
                <Form.Control.Feedback type="invalid">{errors.confirm}</Form.Control.Feedback>
              </Form.Group>

              <Button
                variant="primary"
                type="submit"
                className="rounded-3 px-4"
                disabled={mutation.isPending || !fields.old || !fields.new || !fields.confirm}
              >
                {mutation.isPending
                  ? <><Spinner animation="border" size="sm" className="me-2" />Saving…</>
                  : 'Update password'}
              </Button>
            </Form>
          </>
        )}
      </Card.Body>
    </Card>
  )
}

function ChangeEmailCard({ currentEmail }) {
  const [open, setOpen]       = useState(false)
  const [email, setEmail]     = useState('')
  const [success, setSuccess] = useState('')
  const [error, setError]     = useState('')

  const mutation = useMutation({
    mutationFn: () => changeEmail(email),
    onSuccess: (data) => {
      setSuccess(data.detail ?? 'Verification email sent.')
      setEmail('')
      setOpen(false)
      setError('')
    },
    onError: (err) => {
      setError(err.response?.data?.detail ?? 'Failed to send verification.')
      setSuccess('')
    },
  })

  function handleSubmit(e) {
    e.preventDefault()
    if (!email) return
    mutation.mutate()
  }

  return (
    <Card className="border-0 shadow-sm rounded-4 mt-4">
      <Card.Body className="p-4">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div>
            <h6 className="fw-bold mb-0">Change Email</h6>
            <p className="text-muted small mb-0 mt-1">Current: {currentEmail || '—'}</p>
          </div>
          <Button
            variant={open ? 'outline-secondary' : 'outline-primary'}
            size="sm"
            className="rounded-3"
            onClick={() => { setOpen(v => !v); setError(''); setSuccess('') }}
          >
            {open ? 'Cancel' : 'Change email'}
          </Button>
        </div>

        {success && <Alert variant="success" className="small rounded-3 py-2" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

        {open && (
          <>
            {error && <Alert variant="danger" className="small rounded-3 py-2">{error}</Alert>}
            <Form onSubmit={handleSubmit} noValidate>
              <Form.Group className="mb-3" controlId="new-email">
                <Form.Label className="small fw-semibold text-secondary">New email address</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="rounded-3 py-2"
                  autoFocus
                />
              </Form.Group>
              <Button
                variant="primary"
                type="submit"
                className="rounded-3 px-4"
                disabled={mutation.isPending || !email}
              >
                {mutation.isPending
                  ? <><Spinner animation="border" size="sm" className="me-2" />Sending…</>
                  : 'Send verification'}
              </Button>
            </Form>
            <p className="text-muted small mt-2 mb-0">
              A verification link will be sent to your new address.
            </p>
          </>
        )}
      </Card.Body>
    </Card>
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

export function AvatarDisplay({ src, username, size = 40 }) {
  const fontSize = Math.round(size * 0.38)
  if (src) {
    return (
      <img
        src={src}
        alt={username}
        width={size}
        height={size}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '2px solid #dee2e6' }}
      />
    )
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #0d6efd, #6610f2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize,
        fontWeight: 700,
        color: '#fff',
        flexShrink: 0,
      }}
    >
      {username?.[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

function CameraIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  )
}
