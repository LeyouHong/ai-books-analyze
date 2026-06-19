import { useState } from 'react'
import {
  Container, Table, Spinner, Alert, Badge,
  Form, InputGroup, Button, Pagination, Dropdown,
} from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getBooks, deleteBook, getTags, setShelf, removeFromShelf, followTag, unfollowTag } from '../api/books'
import { getMe } from '../api/users'
import AppNavbar from '../components/AppNavbar'
import BookFormModal from '../components/BookFormModal'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import PdfReaderModal from '../components/PdfReaderModal'
import ReviewModal from '../components/ReviewModal'

const PAGE_SIZE = 4

const SORT_OPTIONS = [
  { value: '-created_at', label: 'Newest first' },
  { value: 'created_at',  label: 'Oldest first' },
  { value: '-avg_rating', label: 'Highest rated' },
  { value: '-review_count', label: 'Most reviews' },
]

const SHELF_LABELS = {
  want: 'Want to Read',
  reading: 'Reading',
  read: 'Read',
}

const SHELF_COLORS = {
  want: 'info',
  reading: 'warning',
  read: 'success',
}

const SHELF_ICONS = {
  want: '🔖',
  reading: '📚',
  read: '✅',
}

export default function BooksPage() {
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [activeTag, setActiveTag] = useState(null)
  const [ordering, setOrdering] = useState('-created_at')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingBook, setEditingBook] = useState(null)
  const [deletingBook, setDeletingBook] = useState(null)
  const [readingBook, setReadingBook] = useState(null)
  const [reviewBook, setReviewBook] = useState(null)

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe })
  const { data: tagsData = [] } = useQuery({ queryKey: ['tags'], queryFn: getTags })

  const { data, isLoading, isError } = useQuery({
    queryKey: ['books', page, search, activeTag, ordering],
    queryFn: () => getBooks({ page, search, tag: activeTag, ordering }),
    placeholderData: (prev) => prev,
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteBook(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['books'] }); setDeletingBook(null) },
  })

  const shelfMutation = useMutation({
    mutationFn: ({ bookId, status }) =>
      status ? setShelf(bookId, status) : removeFromShelf(bookId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['books'] }),
  })

  const tagFollowMutation = useMutation({
    mutationFn: ({ id, followed }) => followed ? unfollowTag(id) : followTag(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tags'] }),
  })

  function canEdit(book) {
    return me?.is_staff || book.created_by === me?.username
  }

  function handleSearch(e) {
    e.preventDefault()
    setPage(1)
    setSearch(searchInput)
  }

  function handleClearSearch() {
    setSearchInput('')
    setSearch('')
    setPage(1)
  }

  function handleTagClick(tag) {
    setActiveTag((t) => (t === tag ? null : tag))
    setPage(1)
  }

  const books = data?.results ?? []
  const totalPages = data ? Math.ceil(data.count / PAGE_SIZE) : 1

  return (
    <>
      <AppNavbar />

      <Container className="py-4">
        {/* Header */}
        <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-3">
          <h4 className="fw-bold mb-0">Books</h4>

          <div className="d-flex align-items-center gap-2 flex-grow-1 justify-content-end flex-wrap">
            {/* Search bar */}
            <Form onSubmit={handleSearch} className="flex-grow-1" style={{ maxWidth: 480, minWidth: 200 }}>
              <InputGroup>
                <InputGroup.Text
                  className="border-end-0"
                  style={{ borderRadius: '10px 0 0 10px', color: '#adb5bd' }}
                >
                  <SearchIcon />
                </InputGroup.Text>
                <Form.Control
                  placeholder="Search by title, author…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="border-start-0 border-end-0 ps-0"
                  style={{ boxShadow: 'none' }}
                />
                {search && (
                  <Button
                    variant="link"
                    type="button"
                    className="border border-start-0 border-end-0 text-muted px-2"
                    style={{ textDecoration: 'none', background: '#fff' }}
                    onClick={handleClearSearch}
                    title="Clear"
                  >
                    ✕
                  </Button>
                )}
                <Button
                  variant="primary"
                  type="submit"
                  style={{ borderRadius: '0 10px 10px 0', paddingLeft: 20, paddingRight: 20 }}
                >
                  Search
                </Button>
              </InputGroup>
            </Form>

            <Button variant="primary" className="rounded-3 flex-shrink-0" onClick={() => setShowAddModal(true)}>
              + Add Book
            </Button>
          </div>
        </div>

        {/* Tag filter chips + sort */}
        <div className="d-flex align-items-start justify-content-between gap-2 mb-3 flex-wrap">
          {/* Tags */}
          {tagsData.length > 0 && (
            <div className="d-flex flex-wrap gap-2 flex-grow-1">
              {tagsData.map((t) => (
                <div key={t.id} className="d-inline-flex align-items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleTagClick(t.name)}
                    className={`badge rounded-pill px-3 py-2 border-0 ${activeTag === t.name ? 'text-bg-primary' : 'text-bg-secondary bg-opacity-10 text-secondary'}`}
                    style={{ cursor: 'pointer', fontSize: 12 }}
                  >
                    {t.name}
                  </button>
                  <button
                    type="button"
                    title={t.is_followed ? 'Unfollow tag' : 'Follow tag'}
                    onClick={() => tagFollowMutation.mutate({ id: t.id, followed: t.is_followed })}
                    style={{ background: 'none', border: 'none', padding: '1px 2px', cursor: 'pointer', fontSize: 13, lineHeight: 1, color: t.is_followed ? '#f59e0b' : '#adb5bd' }}
                  >
                    {t.is_followed ? '★' : '☆'}
                  </button>
                </div>
              ))}
              {activeTag && (
                <button
                  type="button"
                  onClick={() => setActiveTag(null)}
                  className="badge rounded-pill px-3 py-2 border-0 text-bg-danger"
                  style={{ cursor: 'pointer', fontSize: 12 }}
                >
                  ✕ Clear
                </button>
              )}
            </div>
          )}

          {/* Sort dropdown */}
          <Dropdown align="end" className="flex-shrink-0">
            <Dropdown.Toggle variant="outline-secondary" size="sm" className="rounded-3">
              {SORT_OPTIONS.find(o => o.value === ordering)?.label ?? 'Sort'}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              {SORT_OPTIONS.map(o => (
                <Dropdown.Item key={o.value} active={ordering === o.value} onClick={() => { setOrdering(o.value); setPage(1) }}>
                  {o.label}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        </div>

        {isError && (
          <Alert variant="danger" className="small rounded-3">Failed to load books.</Alert>
        )}

        {/* Desktop table — hidden on mobile */}
        <div className="d-none d-md-block table-responsive rounded-3 shadow-sm border">
          <Table hover className="mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th style={{ width: 56 }}></th>
                <th>Title</th>
                <th>Author</th>
                <th>Rating</th>
                <th>Shelf</th>
                <th>Added by</th>
                <th>Date</th>
                <th style={{ width: 48 }}></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="text-center py-5"><Spinner animation="border" variant="primary" /></td></tr>
              ) : books.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-5 text-muted small">
                    {search ? `No books found for "${search}".` : activeTag ? `No books tagged "${activeTag}".` : 'No books yet.'}
                  </td>
                </tr>
              ) : (
                books.map((book) => (
                  <tr key={book.id}>
                    {/* Cover */}
                    <td>
                      {book.image ? (
                        <img src={book.image} alt={book.title}
                          style={{ width: 38, height: 52, objectFit: 'cover', borderRadius: 4, border: '1px solid #dee2e6' }} />
                      ) : (
                        <div style={{ width: 38, height: 52, borderRadius: 4, background: '#f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <BookIcon />
                        </div>
                      )}
                    </td>

                    <td>
                      <Link to={`/books/${book.id}`} className="fw-semibold text-decoration-none" style={{ color: 'var(--bs-body-color)' }}>
                        {book.title}
                      </Link>
                      {book.description && (
                        <div className="text-muted small text-truncate" style={{ maxWidth: 240 }}>{book.description}</div>
                      )}
                      {book.tags?.length > 0 && (
                        <div className="d-flex flex-wrap gap-1 mt-1">
                          {book.tags.map((tag) => (
                            <span key={tag} className="badge text-bg-light text-secondary border" style={{ fontSize: 11, fontWeight: 400 }}>{tag}</span>
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="text-nowrap">{book.author}</td>

                    <td className="text-nowrap">
                      <button
                        type="button"
                        className="btn btn-link p-0 text-decoration-none text-reset d-flex align-items-center gap-1"
                        title="View / write review"
                        onClick={() => setReviewBook(book)}
                      >
                        <StarDisplay rating={book.avg_rating} />
                        {book.review_count > 0 && (
                          <span className="text-muted" style={{ fontSize: 11 }}>({book.review_count})</span>
                        )}
                      </button>
                    </td>

                    <td>
                      <ShelfDropdown book={book} shelfMutation={shelfMutation} />
                    </td>

                    <td>
                      <Badge bg={book.created_by === me?.username ? 'primary' : 'secondary'} className="fw-normal">
                        {book.created_by ?? '—'}
                      </Badge>
                    </td>

                    <td className="text-muted small text-nowrap">
                      {new Date(book.created_at).toLocaleDateString()}
                    </td>

                    <td>
                      <Dropdown align="end">
                        <Dropdown.Toggle
                          as="button"
                          className="icon-btn text-secondary"
                          style={{ background: 'none', border: 'none' }}
                          bsPrefix="no-caret"
                        >
                          <DotsIcon />
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                          {book.pdf && (
                            <Dropdown.Item onClick={() => setReadingBook(book)}>
                              📖 Read Book
                            </Dropdown.Item>
                          )}
                          {canEdit(book) && (
                            <>
                              <Dropdown.Divider />
                              <Dropdown.Item onClick={() => setEditingBook(book)}>
                                ✏️ Edit
                              </Dropdown.Item>
                              <Dropdown.Item className="text-danger" onClick={() => setDeletingBook(book)}>
                                🗑 Delete
                              </Dropdown.Item>
                            </>
                          )}
                        </Dropdown.Menu>
                      </Dropdown>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>

        {/* Mobile card grid — shown only on small screens */}
        <div className="d-md-none">
          {isLoading ? (
            <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
          ) : books.length === 0 ? (
            <p className="text-center text-muted small py-5">
              {search ? `No books found for "${search}".` : activeTag ? `No books tagged "${activeTag}".` : 'No books yet.'}
            </p>
          ) : (
            <div className="d-flex flex-column gap-3">
              {books.map((book) => (
                <div key={book.id} className="rounded-3 border shadow-sm overflow-hidden" style={{ background: 'var(--bs-body-bg)' }}>
                  <div className="d-flex gap-3 p-3">
                    {/* Cover */}
                    <div className="flex-shrink-0">
                      {book.image ? (
                        <img src={book.image} alt={book.title}
                          style={{ width: 60, height: 84, objectFit: 'cover', borderRadius: 6, border: '1px solid #dee2e6' }} />
                      ) : (
                        <div style={{ width: 60, height: 84, borderRadius: 6, background: '#f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <BookIcon />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-grow-1 min-w-0">
                      <div className="d-flex align-items-start justify-content-between gap-2">
                        <div className="min-w-0">
                          <Link to={`/books/${book.id}`} className="fw-semibold text-decoration-none" style={{ color: 'var(--bs-body-color)' }}>
                            {book.title}
                          </Link>
                          <div className="text-muted small">{book.author}</div>
                        </div>
                        {/* Three-dot menu */}
                        <Dropdown align="end" className="flex-shrink-0">
                          <Dropdown.Toggle
                            as="button"
                            className="icon-btn text-secondary"
                            style={{ background: 'none', border: 'none' }}
                            bsPrefix="no-caret"
                          >
                            <DotsIcon />
                          </Dropdown.Toggle>
                          <Dropdown.Menu>
                            {book.pdf && (
                              <Dropdown.Item onClick={() => setReadingBook(book)}>
                                📖 Read Book
                              </Dropdown.Item>
                            )}
                            {canEdit(book) && (
                              <>
                                <Dropdown.Divider />
                                <Dropdown.Item onClick={() => setEditingBook(book)}>✏️ Edit</Dropdown.Item>
                                <Dropdown.Item className="text-danger" onClick={() => setDeletingBook(book)}>🗑 Delete</Dropdown.Item>
                              </>
                            )}
                          </Dropdown.Menu>
                        </Dropdown>
                      </div>

                      {/* Tags */}
                      {book.tags?.length > 0 && (
                        <div className="d-flex flex-wrap gap-1 mt-1">
                          {book.tags.map((tag) => (
                            <span key={tag} className="badge text-bg-light text-secondary border" style={{ fontSize: 10, fontWeight: 400 }}>{tag}</span>
                          ))}
                        </div>
                      )}

                      {/* Rating */}
                      <button
                        type="button"
                        className="btn btn-link p-0 text-decoration-none text-reset d-flex align-items-center gap-1 mt-1"
                        onClick={() => setReviewBook(book)}
                      >
                        <StarDisplay rating={book.avg_rating} />
                        {book.review_count > 0 && (
                          <span className="text-muted" style={{ fontSize: 11 }}>({book.review_count})</span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Shelf selector at bottom */}
                  <div className="px-3 pb-3">
                    <ShelfDropdown book={book} shelfMutation={shelfMutation} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="d-flex justify-content-between align-items-center mt-3">
            <span className="text-muted small">
              {data?.count} book{data?.count !== 1 ? 's' : ''} · page {page} of {totalPages}
            </span>
            <Pagination size="sm" className="mb-0">
              <Pagination.Prev disabled={page === 1} onClick={() => setPage((p) => p - 1)} />
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Pagination.Item key={p} active={p === page} onClick={() => setPage(p)}>{p}</Pagination.Item>
              ))}
              <Pagination.Next disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} />
            </Pagination>
          </div>
        )}
      </Container>

      {showAddModal && <BookFormModal onHide={() => setShowAddModal(false)} />}
      {editingBook && <BookFormModal book={editingBook} onHide={() => setEditingBook(null)} />}
      {deletingBook && (
        <ConfirmDeleteModal
          title="Delete book"
          body={`"${deletingBook.title}" will be permanently deleted.`}
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(deletingBook.id)}
          onHide={() => setDeletingBook(null)}
        />
      )}
      {readingBook && <PdfReaderModal book={readingBook} onHide={() => setReadingBook(null)} />}
      {reviewBook && <ReviewModal book={reviewBook} onHide={() => setReviewBook(null)} />}
    </>
  )
}

function ShelfDropdown({ book, shelfMutation, size }) {
  return (
    <Dropdown>
      <Dropdown.Toggle
        size={size ?? 'sm'}
        variant={book.my_shelf_status ? SHELF_COLORS[book.my_shelf_status] : 'outline-secondary'}
        className="rounded-3"
        style={{ fontSize: 12, whiteSpace: 'nowrap' }}
      >
        {book.my_shelf_status
          ? `${SHELF_ICONS[book.my_shelf_status]} ${SHELF_LABELS[book.my_shelf_status]}`
          : '+ Add to shelf'}
      </Dropdown.Toggle>
      <Dropdown.Menu>
        {Object.entries(SHELF_LABELS).map(([key, label]) => (
          <Dropdown.Item
            key={key}
            active={book.my_shelf_status === key}
            onClick={() => shelfMutation.mutate({ bookId: book.id, status: key })}
          >
            {SHELF_ICONS[key]} {label}
          </Dropdown.Item>
        ))}
        {book.my_shelf_status && (
          <>
            <Dropdown.Divider />
            <Dropdown.Item
              className="text-muted"
              onClick={() => shelfMutation.mutate({ bookId: book.id, status: null })}
            >
              ✕ Remove from shelf
            </Dropdown.Item>
          </>
        )}
      </Dropdown.Menu>
    </Dropdown>
  )
}

function StarDisplay({ rating }) {
  const r = rating ?? 0
  return (
    <span>
      {[1,2,3,4,5].map((s) => (
        <span key={s} style={{ color: s <= Math.round(r) ? '#f59e0b' : '#d1d5db', fontSize: 13 }}>★</span>
      ))}
      {r > 0 && <span className="text-muted ms-1" style={{ fontSize: 12 }}>{r.toFixed(1)}</span>}
    </span>
  )
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}

function DotsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
    </svg>
  )
}

function BookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#adb5bd" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  )
}
