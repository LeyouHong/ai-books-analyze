import axios from 'axios'

// Plain axios — no auth header needed for these public endpoints
export async function login(username, password) {
  const { data } = await axios.post('/api/token/', { username, password })
  return data
}

export async function register(username, email, password) {
  const { data } = await axios.post('/api/users/register/', { username, email, password })
  return data
}

export async function verifyEmail(uid, token) {
  const { data } = await axios.post('/api/users/verify-email/', { uid, token })
  return data
}

export async function resendVerification(email) {
  const { data } = await axios.post('/api/users/resend-verification/', { email })
  return data
}
