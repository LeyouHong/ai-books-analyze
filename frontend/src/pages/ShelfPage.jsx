import { useState } from 'react'
import { Container, Tabs, Tab, Spinner, Badge, Row, Col, Card } from 'react-bootstrap'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import AppNavbar from '../components/AppNavbar'
import { getBooks } from '../api/books'

const TABS = [
  { key: 'reading', label: '📚 Reading' },
  { key: 'want',    label: '🔖 Want to Read' },
  { key: 'read',    label: '✅ Read' },
]

export default function ShelfPage() {
  const [activeTab, setActiveTab] = useState('reading')

  return (
    <>
      <AppNavbar />
      <Container className="py-4">
        <h4 className="fw-bold mb-4">My Shelf</h4>
        <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-4">
          {TABS.map(t => (
            <Tab key={t.key} eventKey={t.key} title={t.label}>
              <ShelfList shelf={t.key} />
            </Tab>
          ))}
        </Tabs>
      </Container>
    </>
  )
}

function ShelfList({ shelf }) {
  const { data, isLoading } = useQuery({
    queryKey: ['shelf-books', shelf],
    queryFn: () => getBooks({ shelf, page: 1 }),
  })

  const books = data?.results ?? []

  if (isLoading) {
    return <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
  }

  if (books.length === 0) {
    return <p className="text-muted text-center py-5">No books here yet.</p>
  }

  return (
    <Row xs={1} sm={2} md={3} lg={4} className="g-3">
      {books.map(book => <BookCard key={book.id} book={book} />)}
    </Row>
  )
}

function BookCard({ book }) {
  const progress = book.my_progress_page
  const totalPages = book.my_progress_total_pages
  const percent = (progress && totalPages) ? Math.min(100, Math.round((progress / totalPages) * 100)) : null

  return (
    <Col>
      <Card className="h-100 border-0 shadow-sm rounded-4 overflow-hidden">
        {/* Cover */}
        <div style={{ height: 160, background: '#f0f2f5', overflow: 'hidden', position: 'relative' }}>
          {book.image ? (
            <img src={book.image} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookPlaceholderIcon />
            </div>
          )}
          {/* Progress badge */}
          {progress && (
            <span style={{
              position: 'absolute', bottom: 8, right: 8,
              background: 'rgba(0,0,0,.65)', color: '#fff',
              fontSize: 11, padding: '2px 8px', borderRadius: 99,
            }}>
              {percent != null ? `${percent}%` : `p. ${progress}`}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {percent != null && (
          <div style={{ height: 4, background: '#e5e7eb' }}>
            <div style={{ height: '100%', width: `${percent}%`, background: '#0d6efd', transition: 'width .3s' }} />
          </div>
        )}

        <Card.Body className="p-3">
          <Link
            to={`/books/${book.id}`}
            className="fw-semibold text-decoration-none text-dark stretched-link"
            style={{ fontSize: 14 }}
          >
            {book.title}
          </Link>
          <p className="text-muted mb-1" style={{ fontSize: 12 }}>{book.author}</p>

          {/* Tags */}
          {book.tags?.length > 0 && (
            <div className="d-flex flex-wrap gap-1 mt-1">
              {book.tags.map(tag => (
                <span key={tag} className="badge text-bg-light border text-secondary" style={{ fontSize: 10, fontWeight: 400 }}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Avg rating */}
          {book.avg_rating && (
            <div className="mt-2" style={{ fontSize: 12, color: '#f59e0b' }}>
              {'★'.repeat(Math.round(book.avg_rating))}{'☆'.repeat(5 - Math.round(book.avg_rating))}
              <span className="text-muted ms-1">{book.avg_rating.toFixed(1)}</span>
            </div>
          )}
        </Card.Body>
      </Card>
    </Col>
  )
}

function BookPlaceholderIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  )
}
