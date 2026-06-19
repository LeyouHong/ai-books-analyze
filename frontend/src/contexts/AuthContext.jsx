import { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

function loadFromStorage() {
  try {
    const user = localStorage.getItem('user')
    const access = localStorage.getItem('access_token')
    if (access && user) {
      return { user: JSON.parse(user), accessToken: access }
    }
  } catch {
    // ignore malformed storage
  }
  return { user: null, accessToken: null }
}

export function AuthProvider({ children }) {
  const [{ user, accessToken }, setAuth] = useState(loadFromStorage)

  const saveAuth = useCallback((data) => {
    const { access, refresh, username, email, is_active = true } = data
    const userInfo = { username, email, is_active }
    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)
    localStorage.setItem('user', JSON.stringify(userInfo))
    setAuth({ user: userInfo, accessToken: access })
  }, [])

  const markVerified = useCallback(() => {
    setAuth((prev) => {
      const updated = { ...prev.user, is_active: true }
      localStorage.setItem('user', JSON.stringify(updated))
      return { ...prev, user: updated }
    })
  }, [])

  const clearAuth = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    setAuth({ user: null, accessToken: null })
  }, [])

  return (
    <AuthContext.Provider value={{ user, accessToken, saveAuth, clearAuth, markVerified, isAuthenticated: !!accessToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
