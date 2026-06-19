import { useState, useRef } from 'react'
import { Modal, Button, Form, Row, Col, Spinner, Alert, ProgressBar } from 'react-bootstrap'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createBook, updateBook, getTags, analyzePdf } from '../api/books'

const EMPTY = { title: '', author: '', description: '' }

export default function BookFormModal({ book = null, onHide }) {
  const isEdit = !!book
  const queryClient = useQueryClient()

  const coverInputRef = useRef(null)
  const pdfInputRef = useRef(null)

  const [fields, setFields] = useState(
    isEdit ? { title: book.title, author: book.author, description: book.description } : EMPTY,
  )
  const [selectedTags, setSelectedTags] = useState(isEdit ? (book.tags ?? []) : [])
  const [customTag, setCustomTag] = useState('')
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(isEdit ? (book.image ?? null) : null)
  const [pdfFile, setPdfFile] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeProgress, setAnalyzeProgress] = useState(0)  // upload % during analysis
  const [analyzeError, setAnalyzeError] = useState('')
  const [aiCoverB64, setAiCoverB64] = useState(null)         // base64 data URL from AI
  const [error, setError] = useState('')

  const { data: availableTags = [] } = useQuery({ queryKey: ['tags'], queryFn: getTags })

  const mutation = useMutation({
    mutationFn: (formData) =>
      isEdit
        ? updateBook(book.id, formData, onUploadProgress)
        : createBook(formData, onUploadProgress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
      onHide()
    },
    onError: (err) => {
      const data = err.response?.data
      const msg =
        data?.title?.[0] ?? data?.author?.[0] ?? data?.pdf?.[0] ?? data?.detail ?? 'Failed to save.'
      setError(msg)
      setUploadProgress(0)
    },
  })

  function onUploadProgress(e) {
    if (e.total) setUploadProgress(Math.round((e.loaded * 100) / e.total))
  }

  function set(key) {
    return (e) => setFields((f) => ({ ...f, [key]: e.target.value }))
  }

  function handleCoverChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
    setAiCoverB64(null)   // manual choice overrides AI cover
  }

  function handlePdfChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPdfFile(file)
    setAnalyzeError('')
    setAiCoverB64(null)
  }

  async function handleAnalyze() {
    if (!pdfFile) return
    setAnalyzing(true)
    setAnalyzeError('')
    setAnalyzeProgress(0)
    try {
      const result = await analyzePdf(pdfFile, (e) => {
        if (e.total) setAnalyzeProgress(Math.round((e.loaded * 100) / e.total))
      })
      const { title, author, description, tags, cover_image } = result
      if (title)       setFields(f => ({ ...f, title: title || f.title }))
      if (author)      setFields(f => ({ ...f, author: author || f.author }))
      if (description) setFields(f => ({ ...f, description: description || f.description }))
      if (tags?.length) {
        setSelectedTags(prev => {
          const merged = [...new Set([...prev, ...tags])]
          return merged
        })
      }
      if (cover_image && !coverFile) {
        // Only auto-set cover if user hasn't manually chosen one
        setAiCoverB64(cover_image)
        setCoverPreview(cover_image)
      }
    } catch (err) {
      setAnalyzeError(err.response?.data?.detail ?? 'Analysis failed. Please check your API key.')
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!isEdit && !pdfFile) {
      setError('Please select a PDF file.')
      return
    }
    setError('')
    setUploadProgress(0)

    const form = new FormData()
    form.append('title', fields.title)
    form.append('author', fields.author)
    form.append('description', fields.description)
    selectedTags.forEach((tag) => form.append('tags', tag))
    if (coverFile) {
      form.append('image', coverFile)
    } else if (aiCoverB64) {
      // Convert base64 data URL → Blob → File
      const res  = await fetch(aiCoverB64)
      const blob = await res.blob()
      form.append('image', new File([blob], 'cover.png', { type: 'image/png' }))
    }
    if (pdfFile) form.append('pdf', pdfFile)

    mutation.mutate(form)
  }

  const uploading = mutation.isPending

  return (
    <Modal show onHide={onHide} centered size="lg">
      <Form onSubmit={handleSubmit} noValidate>
        <Modal.Header closeButton>
          <Modal.Title className="fs-6 fw-bold">{isEdit ? 'Edit Book' : 'Add New Book'}</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {error && (
            <Alert variant="danger" className="small rounded-3 py-2" dismissible onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <Row className="g-3">
            {/* Cover image picker */}
            <Col xs={12} sm="auto" className="d-flex flex-column align-items-center">
              <div
                className="rounded-3 overflow-hidden mb-2"
                style={{ width: 100, height: 140, background: '#f0f2f5', cursor: 'pointer', flexShrink: 0, border: '2px dashed #dee2e6' }}
                onClick={() => coverInputRef.current.click()}
                title="Click to pick cover image"
              >
                {coverPreview ? (
                  <img src={coverPreview} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div className="d-flex flex-column align-items-center justify-content-center h-100 text-secondary gap-1">
                    <ImageIcon />
                    <span style={{ fontSize: 10 }}>Cover image</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm rounded-3"
                onClick={() => coverInputRef.current.click()}
              >
                {coverPreview ? 'Change' : 'Add cover'}
              </button>
              <input ref={coverInputRef} type="file" accept="image/*" className="d-none" onChange={handleCoverChange} />
            </Col>

            {/* Text fields */}
            <Col>
              <Form.Group className="mb-3" controlId="book-title">
                <Form.Label className="small fw-semibold text-secondary">Title <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  value={fields.title}
                  onChange={set('title')}
                  required
                  placeholder="Book title"
                  className="rounded-3"
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="book-author">
                <Form.Label className="small fw-semibold text-secondary">Author <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  value={fields.author}
                  onChange={set('author')}
                  required
                  placeholder="Author name"
                  className="rounded-3"
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="book-description">
                <Form.Label className="small fw-semibold text-secondary">Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={fields.description}
                  onChange={set('description')}
                  placeholder="Short description…"
                  className="rounded-3"
                />
              </Form.Group>

              {/* Tags */}
              <Form.Group controlId="book-tags">
                <Form.Label className="small fw-semibold text-secondary">Tags</Form.Label>
                <div className="d-flex flex-wrap gap-1 mb-2">
                  {availableTags.map((t) => {
                    const active = selectedTags.includes(t.name)
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTags((prev) =>
                          active ? prev.filter((x) => x !== t.name) : [...prev, t.name]
                        )}
                        className={`badge rounded-pill px-2 py-1 border-0 ${active ? 'text-bg-primary' : 'text-bg-light text-secondary'}`}
                        style={{ cursor: 'pointer', fontSize: 12 }}
                      >
                        {active ? '✓ ' : ''}{t.name}
                      </button>
                    )
                  })}
                </div>
                <div className="d-flex gap-2">
                  <Form.Control
                    size="sm"
                    placeholder="Add custom tag…"
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const t = customTag.trim()
                        if (t && !selectedTags.includes(t)) setSelectedTags((p) => [...p, t])
                        setCustomTag('')
                      }
                    }}
                    className="rounded-3"
                  />
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    type="button"
                    className="rounded-3 flex-shrink-0"
                    onClick={() => {
                      const t = customTag.trim()
                      if (t && !selectedTags.includes(t)) setSelectedTags((p) => [...p, t])
                      setCustomTag('')
                    }}
                  >
                    Add
                  </Button>
                </div>
                {selectedTags.length > 0 && (
                  <div className="d-flex flex-wrap gap-1 mt-2">
                    {selectedTags.map((tag) => (
                      <span key={tag} className="badge text-bg-primary d-inline-flex align-items-center gap-1" style={{ fontSize: 12 }}>
                        {tag}
                        <button
                          type="button"
                          style={{ background: 'none', border: 'none', padding: 0, lineHeight: 1, color: 'inherit', cursor: 'pointer' }}
                          onClick={() => setSelectedTags((p) => p.filter((x) => x !== tag))}
                        >×</button>
                      </span>
                    ))}
                  </div>
                )}
              </Form.Group>
            </Col>
          </Row>

          {/* PDF picker */}
          <div
            className="mt-3 rounded-3 p-3 d-flex align-items-center gap-3"
            style={{ background: '#f8f9fa', border: '2px dashed #dee2e6', cursor: 'pointer' }}
            onClick={() => pdfInputRef.current.click()}
          >
            <PdfIcon />
            <div className="flex-grow-1 overflow-hidden">
              {pdfFile ? (
                <>
                  <div className="fw-semibold small text-truncate">{pdfFile.name}</div>
                  <div className="text-muted" style={{ fontSize: 12 }}>
                    {(pdfFile.size / 1024 / 1024).toFixed(2)} MB · click to change
                  </div>
                </>
              ) : isEdit && book.pdf ? (
                <>
                  <div className="fw-semibold small text-truncate">{book.pdf.split('/').pop()}</div>
                  <div className="text-muted" style={{ fontSize: 12 }}>Current PDF · click to replace</div>
                </>
              ) : (
                <>
                  <div className="fw-semibold small">Click to upload PDF <span className="text-danger">*</span></div>
                  <div className="text-muted" style={{ fontSize: 12 }}>PDF files only</div>
                </>
              )}
            </div>
            <Button variant="outline-primary" size="sm" className="rounded-3 flex-shrink-0" type="button"
              onClick={(e) => { e.stopPropagation(); pdfInputRef.current.click() }}>
              Browse
            </Button>
            <input ref={pdfInputRef} type="file" accept="application/pdf" className="d-none" onChange={handlePdfChange} />
          </div>

          {/* AI Analyze button — shown when a PDF is selected */}
          {(pdfFile || (isEdit && book.pdf)) && (
            <div className="mt-2">
              {analyzeError && (
                <Alert variant="warning" className="small rounded-3 py-2 mb-2" dismissible onClose={() => setAnalyzeError('')}>
                  {analyzeError}
                </Alert>
              )}
              <Button
                variant="outline-secondary"
                size="sm"
                type="button"
                className="rounded-3 d-flex align-items-center gap-2"
                onClick={handleAnalyze}
                disabled={analyzing || uploading}
              >
                {analyzing ? (
                  <>
                    <Spinner animation="border" size="sm" />
                    {analyzeProgress > 0 && analyzeProgress < 100
                      ? `Uploading ${analyzeProgress}%…`
                      : 'Analyzing with AI…'}
                  </>
                ) : (
                  <><SparkleIcon /> Auto-fill with AI</>
                )}
              </Button>
              {analyzing && (
                <p className="text-muted small mt-1 mb-0">
                  Sending PDF to Claude for analysis — this may take a few seconds.
                </p>
              )}
            </div>
          )}

          {/* Upload progress */}
          {uploading && uploadProgress > 0 && (
            <ProgressBar
              now={uploadProgress}
              label={`${uploadProgress}%`}
              className="mt-3 rounded-3"
              style={{ height: 8 }}
              animated
            />
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="outline-secondary" className="rounded-3" onClick={onHide} disabled={uploading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            className="rounded-3 px-4"
            disabled={uploading || !fields.title || !fields.author || (!isEdit && !pdfFile)}
          >
            {uploading ? (
              <><Spinner animation="border" size="sm" className="me-2" />{uploadProgress > 0 ? `Uploading ${uploadProgress}%…` : 'Saving…'}</>
            ) : isEdit ? 'Save changes' : 'Add book'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}

function ImageIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  )
}

function SparkleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
    </svg>
  )
}

function PdfIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="#dc3545" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 2v6h6" stroke="#dc3545" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <text x="4" y="20" fontSize="5.5" fontWeight="700" fill="#dc3545" fontFamily="sans-serif">PDF</text>
    </svg>
  )
}
