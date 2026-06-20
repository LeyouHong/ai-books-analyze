import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Container, Row, Col, Badge, Button, Spinner, Alert, Dropdown, ProgressBar } from 'react-bootstrap'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AppNavbar from '../components/AppNavbar'
import PdfReaderModal from '../components/PdfReaderModal'
import ReviewModal from '../components/ReviewModal'
import BookChat from '../components/BookChat'
import { getBook, getReviews, setShelf, removeFromShelf, getBookAnalysis, generateBookAnalysis } from '../api/books'
import { getMe } from '../api/users'

const SHELF_LABELS = { want: 'Want to Read', reading: 'Reading', read: 'Read' }
const SHELF_ICONS  = { want: '🔖', reading: '📚', read: '✅' }
const SHELF_COLORS = { want: 'info', reading: 'warning', read: 'success' }

export default function BookDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showReader, setShowReader] = useState(false)
  const [showReview, setShowReview] = useState(false)

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe })
  const { data: book, isLoading, isError } = useQuery({
    queryKey: ['book', id],
    queryFn: () => getBook(id),
  })
  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews', Number(id)],
    queryFn: () => getReviews(id),
    enabled: !!id,
  })

  const shelfMutation = useMutation({
    mutationFn: ({ status }) => status ? setShelf(id, status) : removeFromShelf(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book', id] })
      queryClient.invalidateQueries({ queryKey: ['books'] })
      queryClient.invalidateQueries({ queryKey: ['shelf-books'] })
    },
  })

  if (isLoading) {
    return (
      <>
        <AppNavbar />
        <div className="text-center py-5 mt-5"><Spinner animation="border" variant="primary" /></div>
      </>
    )
  }

  if (isError || !book) {
    return (
      <>
        <AppNavbar />
        <Container className="py-5">
          <Alert variant="danger" className="rounded-3">Book not found.</Alert>
          <Button variant="link" onClick={() => navigate('/books')}>← Back to Books</Button>
        </Container>
      </>
    )
  }

  const avgRating = book.avg_rating
  const shelf = book.my_shelf_status
  const progress = book.my_progress_page

  return (
    <>
      <AppNavbar />
      <Container className="py-4" style={{ maxWidth: 900 }}>
        {/* Back */}
        <Button variant="link" className="ps-0 mb-3 text-muted" onClick={() => navigate(-1)}>
          ← Back
        </Button>

        <Row className="g-4">
          {/* Cover */}
          <Col xs={12} sm="auto">
            <div style={{ width: 160, flexShrink: 0 }}>
              {book.image ? (
                <img
                  src={book.image} alt={book.title}
                  style={{ width: 160, height: 220, objectFit: 'cover', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,.15)' }}
                />
              ) : (
                <div style={{ width: 160, height: 220, borderRadius: 8, background: '#f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BookPlaceholderIcon />
                </div>
              )}
            </div>
          </Col>

          {/* Info */}
          <Col>
            <h3 className="fw-bold mb-1">{book.title}</h3>
            <p className="text-muted mb-2">{book.author}</p>

            {/* Tags */}
            {book.tags?.length > 0 && (
              <div className="d-flex flex-wrap gap-1 mb-3">
                {book.tags.map(tag => (
                  <span key={tag} className="badge text-bg-light border text-secondary" style={{ fontWeight: 400 }}>{tag}</span>
                ))}
              </div>
            )}

            {/* Rating */}
            {avgRating && (
              <div className="d-flex align-items-center gap-2 mb-3">
                <span style={{ color: '#f59e0b', fontSize: 18 }}>
                  {'★'.repeat(Math.round(avgRating))}{'☆'.repeat(5 - Math.round(avgRating))}
                </span>
                <span className="text-muted small">{avgRating.toFixed(1)} · {book.review_count} review{book.review_count !== 1 ? 's' : ''}</span>
              </div>
            )}

            {/* Reading progress */}
            {progress && (
              <p className="text-muted small mb-3">Last read: page {progress}</p>
            )}

            {/* Actions */}
            <div className="d-flex flex-wrap gap-2 mb-3">
              {book.pdf && (
                <Button variant="primary" className="rounded-3" onClick={() => setShowReader(true)}>
                  📖 Read Book
                </Button>
              )}
              <Button variant="outline-secondary" className="rounded-3" onClick={() => setShowReview(true)}>
                ★ Reviews ({book.review_count ?? 0})
              </Button>

              {/* Shelf dropdown */}
              <Dropdown>
                <Dropdown.Toggle
                  variant={shelf ? SHELF_COLORS[shelf] : 'outline-secondary'}
                  className="rounded-3"
                >
                  {shelf ? `${SHELF_ICONS[shelf]} ${SHELF_LABELS[shelf]}` : '+ Add to shelf'}
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  {Object.entries(SHELF_LABELS).map(([key, label]) => (
                    <Dropdown.Item
                      key={key}
                      active={shelf === key}
                      onClick={() => shelfMutation.mutate({ status: key })}
                    >
                      {SHELF_ICONS[key]} {label}
                    </Dropdown.Item>
                  ))}
                  {shelf && (
                    <>
                      <Dropdown.Divider />
                      <Dropdown.Item className="text-muted" onClick={() => shelfMutation.mutate({ status: null })}>
                        ✕ Remove from shelf
                      </Dropdown.Item>
                    </>
                  )}
                </Dropdown.Menu>
              </Dropdown>
            </div>

            <p className="text-muted small mb-0">
              Added by <strong>{book.created_by ?? '—'}</strong> · {new Date(book.created_at).toLocaleDateString()}
            </p>
          </Col>
        </Row>

        {/* Description */}
        {book.description && (
          <div className="mt-4 p-4 rounded-4 border" style={{ background: '#fafafa' }}>
            <h6 className="fw-semibold text-secondary mb-2">Description</h6>
            <p className="mb-0" style={{ whiteSpace: 'pre-line' }}>{book.description}</p>
          </div>
        )}

        {/* AI Analysis */}
        <AiAnalysisSection bookId={id} hasPdf={!!book.pdf} />

        {/* AI Chat */}
        <BookChat bookId={id} bookTitle={book.title} />

        {/* Reviews */}
        <div className="mt-4">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h5 className="fw-bold mb-0">Reviews</h5>
            <Button variant="outline-primary" size="sm" className="rounded-3" onClick={() => setShowReview(true)}>
              Write a review
            </Button>
          </div>

          {reviews.length === 0 ? (
            <p className="text-muted small">No reviews yet. Be the first!</p>
          ) : (
            <div className="d-flex flex-column gap-3">
              {reviews.map(r => (
                <div key={r.id} className="p-3 rounded-4 border">
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <span className="fw-semibold small">{r.username}</span>
                    <span style={{ color: '#f59e0b' }}>
                      {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                    </span>
                  </div>
                  {r.comment && <p className="small text-muted mb-1">{r.comment}</p>}
                  <p className="mb-0 text-muted" style={{ fontSize: 11 }}>
                    {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </Container>

      {showReader && <PdfReaderModal book={book} onHide={() => setShowReader(false)} />}
      {showReview && <ReviewModal book={book} onHide={() => setShowReview(false)} />}
    </>
  )
}

function AiAnalysisSection({ bookId, hasPdf }) {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['book-analysis', bookId],
    queryFn: () => getBookAnalysis(bookId),
    // Poll every 3 s while the backend is still running the analysis
    refetchInterval: (query) =>
      query.state.data?.status === 'pending' ? 3000 : false,
  })

  const generate = useMutation({
    mutationFn: () => generateBookAnalysis(bookId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['book-analysis', bookId] }),
  })

  const status   = data?.status ?? null
  const analysis = data?.data   ?? null
  const isPending = generate.isPending || status === 'pending'
  const hasResult = status === 'done' && analysis

  return (
    <div className="mt-4 rounded-4 border overflow-hidden">
      {/* Header */}
      <div
        className="px-4 py-3 d-flex align-items-center justify-content-between"
        style={{ background: 'linear-gradient(90deg,#0d6efd15,#6610f215)', borderBottom: '1px solid #dee2e6' }}
      >
        <div className="d-flex align-items-center gap-2">
          <span style={{ fontSize: 18 }}>🤖</span>
          <span className="fw-semibold">AI Analysis</span>
          {hasResult && (
            <span className="badge text-bg-primary ms-1" style={{ fontSize: 10, fontWeight: 400 }}>
              claude-sonnet
            </span>
          )}
        </div>
        {hasResult && (
          <Button
            variant="outline-secondary"
            size="sm"
            className="rounded-3"
            onClick={() => generate.mutate()}
            disabled={isPending}
          >
            {isPending ? <Spinner animation="border" size="sm" /> : '↻ Regenerate'}
          </Button>
        )}
      </div>

      <div className="p-4" style={{ background: 'var(--bs-body-bg)' }}>
        {isLoading ? (
          <div className="text-center py-3"><Spinner animation="border" variant="primary" size="sm" /></div>
        ) : isPending ? (
          <div className="py-3">
            <div className="d-flex align-items-center gap-2 mb-2">
              <Spinner animation="border" size="sm" variant="primary" />
              <span className="small text-muted">Claude is reading the book…</span>
            </div>
            <ProgressBar animated now={100} variant="primary" style={{ height: 3 }} />
          </div>
        ) : status === 'error' ? (
          <Alert variant="danger" className="small rounded-3 py-2 mb-0">
            Analysis failed. Please try again.
            <Button
              variant="link"
              size="sm"
              className="p-0 ms-2"
              onClick={() => generate.mutate()}
            >
              Retry
            </Button>
          </Alert>
        ) : !hasResult ? (
          <div className="text-center py-4">
            <p className="text-muted small mb-3">
              {hasPdf
                ? 'Generate an AI-powered deep analysis of this book — themes, key takeaways, writing style, and more.'
                : "Generate an AI-powered analysis based on the book's metadata and description."}
            </p>
            <Button
              variant="primary"
              className="rounded-3 d-inline-flex align-items-center gap-2"
              onClick={() => generate.mutate()}
            >
              <SparkleIcon /> Generate Analysis
            </Button>
          </div>
        ) : (
          <AnalysisContent analysis={analysis} updatedAt={data?.updated_at} />
        )}
      </div>
    </div>
  )
}

function AnalysisContent({ analysis, updatedAt }) {
  const DIFFICULTY_COLOR = { Beginner: 'success', Intermediate: 'warning', Advanced: 'danger' }
  const diff = analysis.difficulty?.split(' ')[0] ?? ''

  return (
    <div>
      {/* Badges row */}
      <div className="d-flex flex-wrap gap-2 mb-4">
        {diff && (
          <span className={`badge text-bg-${DIFFICULTY_COLOR[diff] ?? 'secondary'}`}>
            {analysis.difficulty}
          </span>
        )}
        {analysis.target_audience && (
          <span className="badge text-bg-light border text-secondary fw-normal">
            👥 {analysis.target_audience}
          </span>
        )}
      </div>

      {/* Summary */}
      {analysis.summary && (
        <Section title="Summary">
          <p className="mb-0 small" style={{ whiteSpace: 'pre-line', lineHeight: 1.8 }}>
            {analysis.summary}
          </p>
        </Section>
      )}

      <div className="row g-3 mt-1">
        {/* Key themes */}
        {analysis.key_themes?.length > 0 && (
          <div className="col-md-6">
            <Section title="🎯 Key Themes">
              <ul className="mb-0 ps-3">
                {analysis.key_themes.map((t, i) => (
                  <li key={i} className="small mb-1">{t}</li>
                ))}
              </ul>
            </Section>
          </div>
        )}

        {/* Key takeaways */}
        {analysis.key_takeaways?.length > 0 && (
          <div className="col-md-6">
            <Section title="💡 Key Takeaways">
              <ul className="mb-0 ps-3">
                {analysis.key_takeaways.map((t, i) => (
                  <li key={i} className="small mb-1">{t}</li>
                ))}
              </ul>
            </Section>
          </div>
        )}
      </div>

      {/* Writing style */}
      {analysis.writing_style && (
        <Section title="✍️ Writing Style" className="mt-3">
          <p className="mb-0 small">{analysis.writing_style}</p>
        </Section>
      )}

      {/* Notable quote */}
      {analysis.notable_quote && (
        <blockquote
          className="mt-3 ps-3 mb-0"
          style={{ borderLeft: '3px solid #0d6efd', fontStyle: 'italic' }}
        >
          <p className="mb-0 small text-muted">"{analysis.notable_quote}"</p>
        </blockquote>
      )}

      {updatedAt && (
        <p className="mb-0 text-muted mt-3" style={{ fontSize: 11 }}>
          Generated {new Date(updatedAt).toLocaleString()}
        </p>
      )}
    </div>
  )
}

function Section({ title, children, className = '' }) {
  return (
    <div className={`rounded-3 p-3 ${className}`} style={{ background: 'var(--bs-tertiary-bg, #f8f9fa)' }}>
      <p className="fw-semibold small text-secondary mb-2">{title}</p>
      {children}
    </div>
  )
}

function SparkleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
    </svg>
  )
}

function BookPlaceholderIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  )
}
