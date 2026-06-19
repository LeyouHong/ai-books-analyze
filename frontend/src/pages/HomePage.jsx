import { Container, Row, Col, Card, Spinner, Button } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import AppNavbar from '../components/AppNavbar'
import VerificationBanner from '../components/VerificationBanner'
import { getBooks } from '../api/books'

export default function HomePage() {
  const { user } = useAuth()

  const { data: allBooks }     = useQuery({ queryKey: ['books', 1, '', null], queryFn: () => getBooks({ page: 1 }) })
  const { data: reading }      = useQuery({ queryKey: ['shelf-books', 'reading'], queryFn: () => getBooks({ shelf: 'reading', page: 1 }) })
  const { data: wantBooks }    = useQuery({ queryKey: ['shelf-books', 'want'],    queryFn: () => getBooks({ shelf: 'want',    page: 1 }) })
  const { data: readBooks }    = useQuery({ queryKey: ['shelf-books', 'read'],    queryFn: () => getBooks({ shelf: 'read',    page: 1 }) })

  const readingList  = reading?.results  ?? []
  const totalBooks   = allBooks?.count   ?? null
  const wantCount    = wantBooks?.count  ?? 0
  const readingCount = reading?.count    ?? 0
  const readCount    = readBooks?.count  ?? 0

  // greeting by hour
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <>
      <AppNavbar />
      {user?.is_active === false && <VerificationBanner email={user.email} />}

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0d6efd 0%, #6610f2 100%)',
        color: '#fff',
        padding: '56px 0 48px',
      }}>
        <Container>
          <p className="mb-1 opacity-75" style={{ fontSize: 15 }}>{greeting},</p>
          <h1 className="fw-bold mb-2" style={{ fontSize: 'clamp(28px, 5vw, 42px)' }}>
            {user?.username} 👋
          </h1>
          <p className="mb-4 opacity-75" style={{ maxWidth: 480, lineHeight: 1.6 }}>
            Your personal reading space. Track what you're reading, discover new books, and never lose your place.
          </p>
          <div className="d-flex flex-wrap gap-2">
            <Button as={Link} to="/books" variant="light" className="rounded-3 fw-semibold px-4">
              Browse Books
            </Button>
            <Button as={Link} to="/shelf" variant="outline-light" className="rounded-3 px-4">
              My Shelf
            </Button>
          </div>
        </Container>
      </div>

      <Container className="py-5">

        {/* ── Stats row ─────────────────────────────────────────────────── */}
        <Row className="g-3 mb-5">
          <Col xs={6} md={3}>
            <StatCard icon="📚" label="Total Books" value={totalBooks} color="#0d6efd" />
          </Col>
          <Col xs={6} md={3}>
            <StatCard icon="📖" label="Reading" value={readingCount} color="#f59e0b" />
          </Col>
          <Col xs={6} md={3}>
            <StatCard icon="🔖" label="Want to Read" value={wantCount} color="#6610f2" />
          </Col>
          <Col xs={6} md={3}>
            <StatCard icon="✅" label="Finished" value={readCount} color="#198754" />
          </Col>
        </Row>

        {/* ── Continue Reading ──────────────────────────────────────────── */}
        {readingList.length > 0 && (
          <section className="mb-5">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="fw-bold mb-0">Continue Reading</h5>
              <Link to="/shelf" className="small text-muted text-decoration-none">View all →</Link>
            </div>
            <Row className="g-3">
              {readingList.slice(0, 4).map(book => (
                <Col key={book.id} xs={12} sm={6} md={3}>
                  <ReadingCard book={book} />
                </Col>
              ))}
            </Row>
          </section>
        )}

        {/* ── Quick actions ─────────────────────────────────────────────── */}
        <section>
          <h5 className="fw-bold mb-3">Quick Actions</h5>
          <Row className="g-3">
            <Col xs={12} sm={6} md={4}>
              <ActionCard
                to="/books"
                icon="🔍"
                title="Browse Books"
                desc="Search and filter the full library"
                color="#0d6efd"
              />
            </Col>
            <Col xs={12} sm={6} md={4}>
              <ActionCard
                to="/shelf"
                icon="📚"
                title="My Shelf"
                desc="See your reading lists and progress"
                color="#6610f2"
              />
            </Col>
            <Col xs={12} sm={6} md={4}>
              <ActionCard
                to="/profile"
                icon="👤"
                title="Profile"
                desc="Update avatar and account settings"
                color="#198754"
              />
            </Col>
          </Row>
        </section>
      </Container>
    </>
  )
}

function StatCard({ icon, label, value, color }) {
  return (
    <Card className="border-0 shadow-sm rounded-4 h-100">
      <Card.Body className="p-3 d-flex align-items-center gap-3">
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: color + '18',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, flexShrink: 0,
        }}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-muted mb-0" style={{ fontSize: 12 }}>{label}</p>
          <div className="fw-bold mb-0" style={{ fontSize: 22, color, lineHeight: 1.2 }}>
            {value === null ? <Spinner animation="border" size="sm" /> : value}
          </div>
        </div>
      </Card.Body>
    </Card>
  )
}

function ReadingCard({ book }) {
  return (
    <Card as={Link} to={`/books/${book.id}`} className="border-0 shadow-sm rounded-4 h-100 text-decoration-none text-dark overflow-hidden" style={{ cursor: 'pointer' }}>
      <div style={{ height: 140, background: '#f0f2f5', overflow: 'hidden', position: 'relative' }}>
        {book.image
          ? <img src={book.image} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>📖</div>
        }
        {book.my_progress_page && (
          <span style={{
            position: 'absolute', bottom: 8, right: 8,
            background: 'rgba(0,0,0,.6)', color: '#fff',
            fontSize: 11, padding: '2px 8px', borderRadius: 99,
          }}>
            p. {book.my_progress_page}
          </span>
        )}
      </div>
      <Card.Body className="p-3">
        <p className="fw-semibold mb-0 text-truncate" style={{ fontSize: 14 }}>{book.title}</p>
        <p className="text-muted mb-0" style={{ fontSize: 12 }}>{book.author}</p>
      </Card.Body>
    </Card>
  )
}

function ActionCard({ to, icon, title, desc, color }) {
  return (
    <Card as={Link} to={to} className="border-0 shadow-sm rounded-4 h-100 text-decoration-none text-dark" style={{ transition: 'transform .15s, box-shadow .15s' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,.1)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
    >
      <Card.Body className="p-4">
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: color + '18',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, marginBottom: 14,
        }}>
          {icon}
        </div>
        <p className="fw-semibold mb-1">{title}</p>
        <p className="text-muted small mb-0">{desc}</p>
      </Card.Body>
    </Card>
  )
}
