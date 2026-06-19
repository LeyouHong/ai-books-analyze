import axios from 'axios'

const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// --- token refresh state ---
let isRefreshing = false
let failedQueue = []   // requests waiting while a refresh is in-flight

function processQueue(error, token = null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)))
  failedQueue = []
}

function clearAuth() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
}

// --- request interceptor: attach Bearer token ---
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// --- response interceptor: refresh on 401 ---
client.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const original = error.config

    // Only attempt refresh on 401, once per request, and not for the refresh call itself
    if (error.response?.status !== 401 || original._retry || original.url === '/token/refresh/') {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      // Another refresh is already running — queue this request until it resolves
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      })
        .then((token) => {
          original.headers.Authorization = `Bearer ${token}`
          return client(original)
        })
        .catch((err) => Promise.reject(err))
    }

    original._retry = true
    isRefreshing = true

    const refreshToken = localStorage.getItem('refresh_token')

    if (!refreshToken) {
      clearAuth()
      window.location.href = '/login'
      return Promise.reject(error)
    }

    try {
      const { data } = await axios.post('/api/token/refresh/', { refresh: refreshToken })
      const newAccess = data.access

      localStorage.setItem('access_token', newAccess)
      client.defaults.headers.common.Authorization = `Bearer ${newAccess}`

      processQueue(null, newAccess)

      original.headers.Authorization = `Bearer ${newAccess}`
      return client(original)
    } catch (refreshError) {
      processQueue(refreshError, null)
      clearAuth()
      window.location.href = '/login'
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)

export default client
