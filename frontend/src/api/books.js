import client from './client'

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
