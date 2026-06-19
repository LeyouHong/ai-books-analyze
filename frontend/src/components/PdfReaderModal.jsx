import { useState, useEffect, useCallback, useRef } from 'react'
import { Button, Spinner } from 'react-bootstrap'
import { Document, Page, pdfjs } from 'react-pdf'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getProgress, saveProgress } from '../api/books'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export default function PdfReaderModal({ book, onHide }) {
  const [numPages, setNumPages] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [outline, setOutline] = useState([])

  const containerRef = useRef(null)
  const [containerWidth, setContainerWidth] = useState(800)
  const saveTimerRef = useRef(null)
  const currentPageRef = useRef(1)
  const numPagesRef = useRef(null)

  // ── Load progress ───────────────────────────────────────────────────────────
  const { data: progressData } = useQuery({
    queryKey: ['progress', book.id],
    queryFn: () => getProgress(book.id),
    enabled: !!book.pdf,
  })

  useEffect(() => {
    if (progressData?.page) {
      setCurrentPage(progressData.page)
      currentPageRef.current = progressData.page
    }
  }, [progressData])

  // ── Save progress (debounced) ───────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: ({ page, totalPages }) => saveProgress(book.id, page, totalPages),
  })

  const debouncedSave = useCallback((page) => {
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(
      () => saveMutation.mutate({ page, totalPages: numPagesRef.current }),
      800,
    )
  }, [])

  useEffect(() => () => clearTimeout(saveTimerRef.current), [])

  // ── goTo ───────────────────────────────────────────────────────────────────
  const goTo = useCallback((page) => {
    const clamped = Math.max(1, Math.min(page, numPagesRef.current ?? 1))
    currentPageRef.current = clamped
    setCurrentPage(clamped)
    debouncedSave(clamped)
  }, [debouncedSave])

  // ── Keyboard navigation ────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault()
        goTo(currentPageRef.current + 1)
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        goTo(currentPageRef.current - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goTo])

  // ── Container width ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      setContainerWidth(Math.floor(entries[0].contentRect.width))
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // ── PDF load ───────────────────────────────────────────────────────────────
  async function onDocumentLoadSuccess(pdf) {
    numPagesRef.current = pdf.numPages
    setNumPages(pdf.numPages)
    try {
      const raw = await pdf.getOutline()
      setOutline(await resolveOutline(pdf, raw || []))
    } catch { /* outline optional */ }
  }

  const baseWidth = Math.min(containerWidth - 32, 860)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1055, display: 'flex', flexDirection: 'column', background: '#2d2d3d' }}>

      {/* ── Header bar ─────────────────────────────────────────────────────── */}
      <div style={{ background: '#1e1e2e', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, borderBottom: '1px solid #333' }}>

        <Button variant="outline-light" size="sm" className="rounded-3 flex-shrink-0" onClick={onHide}>← Back</Button>

        {/* TOC toggle — show whenever PDF is loaded */}
        {numPages && (
          <Button
            size="sm"
            variant={sidebarOpen ? 'secondary' : 'outline-secondary'}
            className="rounded-3 flex-shrink-0"
            title={outline.length > 0 ? 'Toggle Table of Contents' : 'Toggle Page List'}
            onClick={() => setSidebarOpen(v => !v)}
          >
            ☰
          </Button>
        )}

        <div className="text-white text-truncate flex-grow-1 small fw-semibold">
          {book.title}
          {book.author && <span className="fw-normal text-white-50 ms-2">{book.author}</span>}
        </div>

        {/* Save indicator */}
        {saveMutation.isPending && <span style={{ fontSize: 11, color: '#aaa', flexShrink: 0 }}>saving…</span>}
        {!saveMutation.isPending && saveMutation.isSuccess && <span style={{ fontSize: 11, color: '#6ee7b7', flexShrink: 0 }}>saved</span>}

        {/* Page controls */}
        <div className="d-flex align-items-center gap-1 flex-shrink-0">
          <Button variant="outline-light" size="sm" className="rounded-3 px-2" disabled={currentPage <= 1} onClick={() => goTo(currentPage - 1)}>‹</Button>
          <span className="text-white small" style={{ minWidth: 80, textAlign: 'center' }}>
            {numPages ? `${currentPage} / ${numPages}` : '—'}
          </span>
          <Button variant="outline-light" size="sm" className="rounded-3 px-2" disabled={!numPages || currentPage >= numPages} onClick={() => goTo(currentPage + 1)}>›</Button>
        </div>

        {/* Zoom controls */}
        <div className="d-flex align-items-center gap-1 flex-shrink-0 ms-1">
          <Button variant="outline-light" size="sm" className="rounded-3 px-2" title="Zoom out" onClick={() => setScale(s => Math.max(0.5, +(s - 0.1).toFixed(1)))}>−</Button>
          <span className="text-white small" style={{ minWidth: 42, textAlign: 'center' }}>{Math.round(scale * 100)}%</span>
          <Button variant="outline-light" size="sm" className="rounded-3 px-2" title="Zoom in" onClick={() => setScale(s => Math.min(3.0, +(s + 0.1).toFixed(1)))}>+</Button>
          <Button variant="outline-secondary" size="sm" className="rounded-3 px-2 ms-1" title="Reset zoom" onClick={() => setScale(1.0)}>⊙</Button>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Sidebar TOC or page list */}
        {sidebarOpen && numPages && (
          <div style={{
            width: 260, background: '#1a1a2e', overflowY: 'auto',
            borderRight: '1px solid #333', flexShrink: 0, paddingTop: 10,
          }}>
            {outline.length > 0 ? (
              <>
                <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#555', margin: '0 16px 6px' }}>Contents</p>
                {outline.map((item, i) => (
                  <OutlineItem key={i} item={item} currentPage={currentPage} onJump={goTo} depth={0} />
                ))}
              </>
            ) : (
              <PagesSidebar numPages={numPages} currentPage={currentPage} onJump={goTo} />
            )}
          </div>
        )}

        {/* PDF area */}
        <div
          ref={containerRef}
          style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px', gap: 16 }}
        >
          {!book.pdf ? (
            <p style={{ color: '#888', marginTop: 80 }}>No PDF attached to this book.</p>
          ) : (
            <Document
              file={book.pdf}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div style={{ color: '#aaa', textAlign: 'center', marginTop: 80 }}>
                  <Spinner animation="border" variant="light" className="mb-3" />
                  <div>Loading PDF…</div>
                </div>
              }
              error={<p style={{ color: '#f87171', marginTop: 80 }}>Failed to load PDF. Please try again.</p>}
            >
              <Page
                pageNumber={currentPage}
                width={baseWidth * scale}
                renderTextLayer
                renderAnnotationLayer
                className="shadow"
              />
            </Document>
          )}

          {numPages && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Button variant="outline-light" size="sm" className="rounded-3" disabled={currentPage <= 1} onClick={() => goTo(currentPage - 1)}>← Prev</Button>
              <span style={{ color: '#888', fontSize: 13 }}>{currentPage} / {numPages}</span>
              <Button variant="outline-light" size="sm" className="rounded-3" disabled={currentPage >= numPages} onClick={() => goTo(currentPage + 1)}>Next →</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async function resolveOutline(pdf, outline) {
  return Promise.all(outline.map(async item => {
    let page = null
    try {
      let dest = item.dest
      if (typeof dest === 'string') dest = await pdf.getDestination(dest)
      if (Array.isArray(dest) && dest[0]) {
        page = (await pdf.getPageIndex(dest[0])) + 1
      }
    } catch { /* ignore unresolvable dest */ }
    return { ...item, page, items: await resolveOutline(pdf, item.items || []) }
  }))
}

function PagesSidebar({ numPages, currentPage, onJump }) {
  const activeRef = useRef(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' })
  }, [currentPage])

  return (
    <>
      <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#555', margin: '0 16px 6px' }}>Pages</p>
      {Array.from({ length: numPages }, (_, i) => i + 1).map(page => {
        const isActive = page === currentPage
        return (
          <div
            key={page}
            ref={isActive ? activeRef : null}
            onClick={() => onJump(page)}
            style={{
              padding: '5px 16px',
              background: isActive ? '#2d2d5a' : 'transparent',
              borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
              color: isActive ? '#93c5fd' : '#bbb',
              cursor: 'pointer',
              fontSize: 13,
              lineHeight: 1.4,
            }}
          >
            Page {page}
          </div>
        )
      })}
    </>
  )
}

function OutlineItem({ item, currentPage, onJump, depth }) {
  const [expanded, setExpanded] = useState(depth < 1)
  const isActive = item.page != null && item.page === currentPage
  const hasChildren = item.items?.length > 0

  return (
    <div>
      <div
        onClick={() => item.page && onJump(item.page)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: `5px 16px 5px ${16 + depth * 14}px`,
          background: isActive ? '#2d2d5a' : 'transparent',
          borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
          color: isActive ? '#93c5fd' : '#bbb',
          cursor: item.page ? 'pointer' : 'default',
          fontSize: 13,
          lineHeight: 1.4,
        }}
      >
        {hasChildren ? (
          <span
            style={{ fontSize: 9, color: '#666', flexShrink: 0, userSelect: 'none', cursor: 'pointer' }}
            onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
          >
            {expanded ? '▼' : '▶'}
          </span>
        ) : (
          <span style={{ width: 9, flexShrink: 0 }} />
        )}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{item.title}</span>
        {item.page && (
          <span style={{ fontSize: 11, color: '#555', flexShrink: 0, marginLeft: 4 }}>{item.page}</span>
        )}
      </div>
      {expanded && hasChildren && item.items.map((child, i) => (
        <OutlineItem key={i} item={child} currentPage={currentPage} onJump={onJump} depth={depth + 1} />
      ))}
    </div>
  )
}
