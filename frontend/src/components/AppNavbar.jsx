import { useRef, useEffect, useState } from 'react'
import { Navbar, Nav, NavDropdown, Container, Badge } from 'react-bootstrap'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { getMe } from '../api/users'
import { markNotificationsRead } from '../api/books'
import { AvatarDisplay } from '../pages/ProfilePage'

export default function AppNavbar() {
  const { user, clearAuth } = useAuth()
  const { isDark, toggle } = useTheme()
  const navigate = useNavigate()
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const bellRef = useRef(null)

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe })

  useEffect(() => {
    if (!user) return
    let es = null
    let reconnectTimer = null

    function connect() {
      const token = localStorage.getItem('access_token')
      if (!token) return
      es = new EventSource(`${import.meta.env.VITE_API_BASE_URL ?? ''}/api/notifications/stream/?token=${encodeURIComponent(token)}`)
      es.addEventListener('init', (e) => {
        setNotifications(JSON.parse(e.data))
      })
      es.addEventListener('notification', (e) => {
        setNotifications(prev => [JSON.parse(e.data), ...prev].slice(0, 30))
      })
      es.onerror = () => {
        es.close()
        reconnectTimer = setTimeout(connect, 5000)
      }
    }

    connect()
    return () => {
      es?.close()
      clearTimeout(reconnectTimer)
    }
  }, [user])

  const unread = notifications.filter(n => !n.is_read)

  const markRead = useMutation({
    mutationFn: (ids) => markNotificationsRead(ids),
    onSuccess: (_, ids) => {
      setNotifications(prev =>
        prev.map(n => ids.includes(n.id) ? { ...n, is_read: true } : n)
      )
    },
  })

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (bellRef.current && !bellRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleBellClick() {
    setNotifOpen(v => !v)
    if (unread.length > 0) markRead.mutate(unread.map(n => n.id))
  }

  function handleNotifClick(n) {
    setNotifOpen(false)
    if (n.book_id) navigate(`/books/${n.book_id}`)
  }

  function handleLogout() {
    clearAuth()
    navigate('/login', { replace: true })
  }

  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="shadow-sm">
      <Container>
        <Navbar.Brand as={Link} to="/" className="fw-bold">
          <BookIcon className="me-2" />
          AI Books Analyze
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="main-nav" />
        <Navbar.Collapse id="main-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/">Home</Nav.Link>
            <Nav.Link as={Link} to="/books">Books</Nav.Link>
            <Nav.Link as={Link} to="/shelf">My Shelf</Nav.Link>
            <Nav.Link as={Link} to="/stats">Stats</Nav.Link>
            {me?.is_staff && (
              <>
                <Nav.Link as={Link} to="/dashboard">Dashboard</Nav.Link>
                <Nav.Link as={Link} to="/admin/users">Users</Nav.Link>
              </>
            )}
          </Nav>

          <Nav className="align-items-center gap-1">
            {/* Dark mode toggle */}
            <button
              onClick={toggle}
              className="icon-btn text-white-50 me-1"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{ fontSize: 18 }}
            >
              {isDark ? '☀️' : '🌙'}
            </button>

            {/* Notification bell */}
            <div ref={bellRef} style={{ position: 'relative' }}>
              <button
                onClick={handleBellClick}
                className="icon-btn text-white-50 me-1"
                style={{ position: 'relative' }}
                title="Notifications"
              >
                <BellIcon />
                {unread.length > 0 && (
                  <span style={{
                    position: 'absolute', top: 1, right: 1,
                    background: '#ef4444', color: '#fff',
                    fontSize: 10, fontWeight: 700,
                    width: 16, height: 16, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    lineHeight: 1,
                  }}>
                    {unread.length > 9 ? '9+' : unread.length}
                  </span>
                )}
              </button>

              {/* Notification dropdown */}
              {notifOpen && (
                <div style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                  width: 320, maxHeight: 400, overflowY: 'auto',
                  background: isDark ? '#1e1e2e' : '#fff',
                  border: `1px solid ${isDark ? '#333' : '#dee2e6'}`,
                  borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,.2)',
                  zIndex: 1050,
                }}>
                  <div style={{ padding: '10px 14px 8px', borderBottom: `1px solid ${isDark ? '#333' : '#f0f2f5'}` }}>
                    <span className="fw-semibold small">Notifications</span>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="text-muted small text-center py-4 mb-0">No notifications yet.</p>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => handleNotifClick(n)}
                        style={{
                          padding: '10px 14px',
                          cursor: n.book_id ? 'pointer' : 'default',
                          background: !n.is_read ? (isDark ? '#1a2540' : '#eff6ff') : 'transparent',
                          borderBottom: `1px solid ${isDark ? '#222' : '#f0f2f5'}`,
                          transition: 'background .15s',
                        }}
                      >
                        <p className="mb-0 small">{n.message}</p>
                        <p className="mb-0 text-muted" style={{ fontSize: 11 }}>
                          {new Date(n.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* User dropdown */}
            <NavDropdown
              align="end"
              title={
                <span className="d-inline-flex align-items-center gap-2">
                  <AvatarDisplay src={me?.avatar ?? null} username={user?.username} size={30} />
                  <span className="d-none d-sm-inline">{user?.username}</span>
                </span>
              }
            >
              <NavDropdown.ItemText className="small text-muted px-3">{user?.email}</NavDropdown.ItemText>
              <NavDropdown.Divider />
              <NavDropdown.Item as={Link} to="/profile">Profile &amp; Avatar</NavDropdown.Item>
              <NavDropdown.Divider />
              <NavDropdown.Item onClick={handleLogout} className="text-danger">Sign out</NavDropdown.Item>
            </NavDropdown>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  )
}

function BookIcon({ className }) {
  return (
    <svg width="22" height="22" viewBox="0 0 48 48" fill="none" className={className} style={{ marginBottom: 2 }} xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#0d6efd"/>
      <path d="M12 36V14a2 2 0 0 1 2-2h10l8 8v16a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2Z" fill="white" opacity=".9"/>
      <path d="M24 12l8 8h-6a2 2 0 0 1-2-2v-6Z" fill="white" opacity=".6"/>
      <line x1="17" y1="22" x2="31" y2="22" stroke="#0d6efd" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="17" y1="27" x2="31" y2="27" stroke="#0d6efd" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="17" y1="32" x2="25" y2="32" stroke="#0d6efd" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  )
}
