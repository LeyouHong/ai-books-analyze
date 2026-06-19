import { useState } from 'react'
import { Modal, Button, Form, Spinner, Alert } from 'react-bootstrap'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getReviews, getMyReview, saveReview, deleteReview } from '../api/books'

export default function ReviewModal({ book, onHide }) {
  const queryClient = useQueryClient()

  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ['reviews', book.id],
    queryFn: () => getReviews(book.id),
  })

  const { data: myReview } = useQuery({
    queryKey: ['my-review', book.id],
    queryFn: () => getMyReview(book.id),
  })

  const [rating, setRating] = useState(myReview?.rating ?? 0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState(myReview?.comment ?? '')
  const [error, setError] = useState('')

  // Sync state when myReview loads (used for display)

  const effectiveRating = rating || myReview?.rating || 0
  const effectiveComment = comment !== '' ? comment : (myReview?.comment ?? '')

  const saveMutation = useMutation({
    mutationFn: () => saveReview(book.id, { rating: effectiveRating, comment: effectiveComment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', book.id] })
      queryClient.invalidateQueries({ queryKey: ['my-review', book.id] })
      queryClient.invalidateQueries({ queryKey: ['books'] })
      setError('')
    },
    onError: (err) => setError(err.response?.data?.detail ?? 'Failed to save.'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteReview(book.id),
    onSuccess: () => {
      setRating(0)
      setComment('')
      queryClient.invalidateQueries({ queryKey: ['reviews', book.id] })
      queryClient.invalidateQueries({ queryKey: ['my-review', book.id] })
      queryClient.invalidateQueries({ queryKey: ['books'] })
    },
  })

  const displayRating = hovered || rating || myReview?.rating || 0

  function handleRatingClick(r) {
    setRating(r)
    setComment((c) => c || myReview?.comment || '')
  }

  return (
    <Modal show onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title className="fs-6 fw-bold">Reviews — {book.title}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* My Review section */}
        <div className="mb-4 p-3 rounded-3" style={{ background: '#f8f9fa' }}>
          <p className="small fw-semibold text-secondary mb-2">Your rating</p>

          {error && <Alert variant="danger" className="small py-2 rounded-3">{error}</Alert>}

          <div className="d-flex gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', fontSize: 28 }}
                onMouseEnter={() => setHovered(s)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => handleRatingClick(s)}
              >
                <span style={{ color: s <= displayRating ? '#f59e0b' : '#d1d5db' }}>★</span>
              </button>
            ))}
            {(rating || myReview?.rating) > 0 && (
              <span className="text-muted small align-self-center ms-1">
                {rating || myReview?.rating} / 5
              </span>
            )}
          </div>

          <Form.Control
            as="textarea"
            rows={3}
            placeholder="Write a short review… (optional)"
            value={effectiveComment}
            onChange={(e) => setComment(e.target.value)}
            className="rounded-3 mb-3"
          />

          <div className="d-flex gap-2">
            <Button
              variant="primary"
              size="sm"
              className="rounded-3 px-3"
              disabled={!effectiveRating || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending
                ? <><Spinner animation="border" size="sm" className="me-1" />Saving…</>
                : myReview?.rating ? 'Update review' : 'Submit review'}
            </Button>
            {myReview?.rating && (
              <Button
                variant="outline-danger"
                size="sm"
                className="rounded-3 px-3"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate()}
              >
                Delete
              </Button>
            )}
          </div>
        </div>

        {/* All reviews */}
        <p className="small fw-semibold text-secondary mb-2">All reviews ({reviews.length})</p>

        {reviewsLoading ? (
          <div className="text-center py-3"><Spinner animation="border" variant="primary" size="sm" /></div>
        ) : reviews.length === 0 ? (
          <p className="text-muted small text-center py-3">No reviews yet. Be the first!</p>
        ) : (
          <div className="d-flex flex-column gap-2">
            {reviews.map((r) => (
              <div key={r.id} className="p-3 rounded-3 border">
                <div className="d-flex align-items-center justify-content-between mb-1">
                  <span className="fw-semibold small">{r.username}</span>
                  <div>
                    {[1,2,3,4,5].map((s) => (
                      <span key={s} style={{ color: s <= r.rating ? '#f59e0b' : '#d1d5db', fontSize: 14 }}>★</span>
                    ))}
                  </div>
                </div>
                {r.comment && <p className="small text-muted mb-1">{r.comment}</p>}
                <p className="text-muted mb-0" style={{ fontSize: 11 }}>
                  {new Date(r.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="outline-secondary" className="rounded-3" onClick={onHide}>Close</Button>
      </Modal.Footer>
    </Modal>
  )
}
