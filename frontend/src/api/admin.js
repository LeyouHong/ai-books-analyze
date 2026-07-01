import client from './client'

export function getStats() {
  return client.get('/admin/stats/')
}

export function getAdminUsers({ search = '', page = 1 } = {}) {
  return client.get('/users/admin/users/', { params: { search, page } })
}

export function toggleUserActive(userId) {
  return client.post(`/users/admin/users/${userId}/toggle/`)
}

export function triggerSentryError() {
  return client.post('/users/admin/sentry-test/')
}
