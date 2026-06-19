import { useState, useEffect, useRef } from 'react'
import { Modal, Button, Form, Row, Col, Spinner, Alert } from 'react-bootstrap'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateBook } from '../api/books'

export default function BookEditModal({ book, onHide }) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef(null)

  const [title, setTitle] = useState(book.title)
  const [author, setAuthor] = useState(book.author)
  const [description, setDescription] = useState(book.description)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(book.image ?? null)
  const [error, setError] = useState('')

  useEffect(() => {
    setTitle(book.title)
    setAuthor(book.author)
    setDescription(book.description)
    setImageFile(null)
    setImagePreview(book.image ?? null)
    setError('')
  }, [book])

  const mutation = useMutation({
    mutationFn: (formData) => updateBook(book.id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
      onHide()
    },
    onError: (err) => {
      const data = err.response?.data
      const msg = data?.title?.[0] ?? data?.author?.[0] ?? data?.detail ?? 'Failed to save changes.'
      setError(msg)
    },
  })

  function handleImageChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const form = new FormData()
    form.append('title', title)
    form.append('author', author)
    form.append('description', description)
    if (imageFile) form.append('image', imageFile)
    mutation.mutate(form)
  }

  return (
    <Modal show onHide={onHide} centered size="lg">
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title className="fs-6 fw-bold">Edit Book</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {error && (
            <Alert variant="danger" className="small rounded-3 py-2" dismissible onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <Row className="g-3">
            {/* Cover image */}
            <Col xs={12} sm="auto" className="d-flex flex-column align-items-center">
              <div
                className="book-cover-preview rounded-3 overflow-hidden mb-2"
                style={{ width: 100, height: 140, background: '#f0f2f5', cursor: 'pointer', flexShrink: 0 }}
                onClick={() => fileInputRef.current.click()}
                title="Click to change cover"
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div className="d-flex align-items-center justify-content-center h-100 text-secondary">
                    <BookPlaceholderIcon />
                  </div>
                )}
              </div>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm rounded-3"
                onClick={() => fileInputRef.current.click()}
              >
                Change cover
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="d-none" onChange={handleImageChange} />
            </Col>

            {/* Fields */}
            <Col>
              <Form.Group className="mb-3" controlId="edit-title">
                <Form.Label className="small fw-semibold text-secondary">Title</Form.Label>
                <Form.Control
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="rounded-3"
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="edit-author">
                <Form.Label className="small fw-semibold text-secondary">Author</Form.Label>
                <Form.Control
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  required
                  className="rounded-3"
                />
              </Form.Group>

              <Form.Group controlId="edit-description">
                <Form.Label className="small fw-semibold text-secondary">Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="rounded-3"
                />
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="outline-secondary" className="rounded-3" onClick={onHide} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" className="rounded-3 px-4" disabled={mutation.isPending}>
            {mutation.isPending ? <><Spinner animation="border" size="sm" className="me-2" />Saving…</> : 'Save changes'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}

function BookPlaceholderIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  )
}
