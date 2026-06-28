import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Navbar,
  Nav,
  Container,
  NavDropdown,
  Badge,
  Button,
  Image,
} from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import client from '../api/client';

export default function AppNavbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await client.get('/notifications/');
      const items = Array.isArray(data) ? data : data.results || [];
      setNotifications(items);
      setUnreadCount(items.filter((n) => !n.is_read).length);
    } catch {
      // ignore notification fetch errors
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  const handleMarkRead = async () => {
    if (unreadCount === 0) return;
    try {
      await client.post('/notifications/mark-read/');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  const handleNotificationClick = (notification) => {
    if (notification.book_id) {
      navigate(`/books/${notification.book_id}`);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userInitials = (() => {
    if (!user) return '?';
    const source = user.username || user.email || '?';
    return source.charAt(0).toUpperCase();
  })();

  return (
    <Navbar
      expand="lg"
      bg={theme === 'dark' ? 'dark' : 'light'}
      variant={theme === 'dark' ? 'dark' : 'light'}
      sticky="top"
      className="shadow-sm"
    >
      <Container>
        <Navbar.Brand as={Link} to="/">
          📚 AI Books
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="main-navbar" />
        <Navbar.Collapse id="main-navbar">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/books">
              Books
            </Nav.Link>
            {user && (
              <>
                <Nav.Link as={Link} to="/shelf">
                  My Shelf
                </Nav.Link>
                <Nav.Link as={Link} to="/stats">
                  Stats
                </Nav.Link>
              </>
            )}
          </Nav>

          <Nav className="align-items-lg-center">
            {/* Dark / Light mode toggle */}
            <Button
              variant={theme === 'dark' ? 'outline-light' : 'outline-secondary'}
              size="sm"
              className="me-lg-3 my-2 my-lg-0"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </Button>

            {user ? (
              <>
                {/* Notifications */}
                <NavDropdown
                  align="end"
                  className="me-lg-2 notification-dropdown"
                  onToggle={(isOpen) => {
                    if (isOpen) handleMarkRead();
                  }}
                  title={
                    <span className="position-relative">
                      🔔
                      {unreadCount > 0 && (
                        <Badge
                          bg="danger"
                          pill
                          className="position-absolute top-0 start-100 translate-middle"
                        >
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </Badge>
                      )}
                    </span>
                  }
                  id="notification-dropdown"
                >
                  <div style={{ minWidth: 280, maxHeight: 360, overflowY: 'auto' }}>
                    <NavDropdown.Header>Notifications</NavDropdown.Header>
                    {notifications.length === 0 ? (
                      <NavDropdown.ItemText className="text-muted small">
                        No notifications yet.
                      </NavDropdown.ItemText>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <NavDropdown.Item
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={n.is_read ? '' : 'fw-bold'}
                        >
                          <div className="small">{n.message}</div>
                          <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                            {n.created_at
                              ? new Date(n.created_at).toLocaleString()
                              : ''}
                          </div>
                        </NavDropdown.Item>
                      ))
                    )}
                  </div>
                </NavDropdown>

                {/* User avatar */}
                <NavDropdown
                  align="end"
                  id="user-dropdown"
                  title={
                    user.avatar ? (
                      <Image
                        src={user.avatar}
                        roundedCircle
                        width={32}
                        height={32}
                        alt={user.username || 'User'}
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <span
                        className="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary text-white"
                        style={{ width: 32, height: 32, fontSize: '0.9rem' }}
                      >
                        {userInitials}
                      </span>
                    )
                  }
                >
                  <NavDropdown.Header>
                    {user.username || user.email}
                  </NavDropdown.Header>
                  <NavDropdown.Item as={Link} to="/profile">
                    Profile
                  </NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/dashboard">
                    Dashboard
                  </NavDropdown.Item>
                  {user.is_staff && (
                    <NavDropdown.Item as={Link} to="/admin/users">
                      Admin
                    </NavDropdown.Item>
                  )}
                  <NavDropdown.Divider />
                  <NavDropdown.Item onClick={handleLogout}>
                    Logout
                  </NavDropdown.Item>
                </NavDropdown>
              </>
            ) : (
              <>
                <Nav.Link as={Link} to="/login">
                  Login
                </Nav.Link>
                <Nav.Link as={Link} to="/register">
                  Register
                </Nav.Link>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
