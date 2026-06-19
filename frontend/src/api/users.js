import client from './client'

export function getMe() {
  return client.get('/users/me/')
}

export function updateMe(formData) {
  return client.patch('/users/me/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export function changePassword(oldPassword, newPassword) {
  return client.post('/users/change-password/', {
    old_password: oldPassword,
    new_password: newPassword,
  })
}

export function forgotPassword(email) {
  return client.post('/users/password-reset/', { email })
}

export function resetPassword(uid, token, newPassword) {
  return client.post('/users/password-reset/confirm/', { uid, token, new_password: newPassword })
}

export function changeEmail(email) {
  return client.post('/users/change-email/', { email })
}

export function confirmEmailChange(uid, token) {
  return client.post('/users/change-email/confirm/', { uid, token })
}
