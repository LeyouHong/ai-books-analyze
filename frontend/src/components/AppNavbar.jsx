import { Link, useNavigate } from 'react-router-dom';
import { Navbar, Nav, Container, NavDropdown } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import Icon from './Icon';

export default function AppNavbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/login');
    }
  };

  // Avatar toggle: person icon + username
  const avatarToggle = (
    <span className="d-inline-flex align-items-center gap-2">
      <Icon name="person" size={20} />
      {user?.username || 'Account'}
    </span>
  );

  return (
    <Navbar bg="dark" variant="dark" expand="lg" sticky="top">
      <Container>
        <Navbar.Brand as={Link} to="/">
          AI Books Analyze
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="main-navbar" />
        <Navbar.Collapse id="main-navbar">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/books">
              Books
            </Nav.Link>
            <Nav.Link as={Link} to="/shelf">
              My Shelf
            </Nav.Link>
            <Nav.Link as={Link} to="/dashboard">
              Dashboard
            </Nav.Link>
          </Nav>

          {user ? (
            <Nav>
              <NavDropdown title={avatarToggle} id="user-dropdown" align="end">
                {/* Profile item with person-gear icon */}
                <NavDropdown.Item as={Link} to="/profile">
                  <Icon name="person-gear" className="me-2" />
                  Profile
                </NavDropdown.Item>
                <NavDropdown.Divider />
                {/* Sign out item with sign-out icon */}
                <NavDropdown.Item onClick={handleLogout}>
                  <Icon name="sign-out" className="me-2" />
                  Sign out
                </NavDropdown.Item>
              </NavDropdown>
            </Nav>
          ) : (
            <Nav>
              <Nav.Link as={Link} to="/login">
                Log in
              </Nav.Link>
              <Nav.Link as={Link} to="/register">
                Register
              </Nav.Link>
            </Nav>
          )}
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
