import client from './client'

const apiBase = import.meta.env.VITE_API_BASE_URL ?? ''

// ── SSE streaming helper ───────────────────────────────────────────────────────

async function* _readSSE(body) {
  const reader  = body.getReader()
  const decoder = new TextDecoder()
  let buffer    = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() // keep incomplete last line

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') return
      try {
        const parsed = JSON.parse(data)
        if (parsed.error) throw new Error(parsed.error)
        if (parsed.chunk) yield parsed.chunk
      } catch (e) {
        if (e.message !== 'Unexpected end of JSON input') throw e
      }
    }
  }
}

async function* _streamPost(url, body) {
  const token = localStorage.getItem('access_token')
  const res   = await fetch(`${apiBase}/api${url}`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? `Request failed (${res.status})`)
  }
  yield* _readSSE(res.body)
}

// ── Chat API ───────────────────────────────────────────────────────────────────

export function getBookChatHistory(bookId) {
  return client.get(`/books/${bookId}/chat/`)
}

export function clearBookChatHistory(bookId) {
  return client.delete(`/books/${bookId}/chat/`)
}

export function streamBookChat(bookId, message) {
  return _streamPost(`/books/${bookId}/chat/`, { message })
}

export function streamRecommendations(message) {
  return _streamPost('/chat/recommend/', { message })
}

export function getBooks({ page = 1, search = '', ordering = '-created_at', tag = null, shelf = null } = {}) {
  return client.get('/books/', {
    params: { page, search, ordering, ...(tag ? { tag } : {}), ...(shelf ? { shelf } : {}) },
  })
}

export function getBook(id) {
  return client.get(`/books/${id}/`)
}

export function createBook(formData, onUploadProgress) {
  return client.post('/books/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  })
}

export function updateBook(id, formData, onUploadProgress) {
  return client.patch(`/books/${id}/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  })
}

export function deleteBook(id) {
  return client.delete(`/books/${id}/`)
}

export function getProgress(bookId) {
  return client.get(`/books/${bookId}/progress/`)
}

export function saveProgress(bookId, page, totalPages) {
  return client.put(`/books/${bookId}/progress/`, {
    page,
    ...(totalPages ? { total_pages: totalPages } : {}),
  })
}

export function getMyStats() {
  return client.get('/stats/me/')
}

export function getBookAnalysis(bookId) {
  return client.get(`/books/${bookId}/analysis/`)
}

export function generateBookAnalysis(bookId) {
  return client.post(`/books/${bookId}/analysis/`)
}

export function analyzePdf(pdfFile, onProgress) {
  const form = new FormData()
  form.append('pdf', pdfFile)
  return client.post('/books/analyze-pdf/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress,
  })
}

export function getTags() {
  return client.get('/tags/')
}

export function getReviews(bookId) {
  return client.get(`/books/${bookId}/reviews/`)
}

export function getMyReview(bookId) {
  return client.get(`/books/${bookId}/my-review/`)
}

export function saveReview(bookId, { rating, comment }) {
  return client.post(`/books/${bookId}/my-review/`, { rating, comment })
}

export function deleteReview(bookId) {
  return client.delete(`/books/${bookId}/my-review/`)
}

export function setShelf(bookId, shelfStatus) {
  return client.post(`/books/${bookId}/shelf/`, { status: shelfStatus })
}

export function removeFromShelf(bookId) {
  return client.delete(`/books/${bookId}/shelf/`)
}

export function followTag(tagId) {
  return client.post(`/tags/${tagId}/follow/`)
}

export function unfollowTag(tagId) {
  return client.delete(`/tags/${tagId}/follow/`)
}

export function getNotifications() {
  return client.get('/notifications/')
}

export function markNotificationsRead(ids) {
  return client.post('/notifications/mark-read/', { ids })
}
