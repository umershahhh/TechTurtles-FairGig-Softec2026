import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null)
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('fg_access_token')
    if (!token) { setLoading(false); return }
    try {
      const u = await authApi.me()
      setUser(u)
    } catch {
      localStorage.removeItem('fg_access_token')
      localStorage.removeItem('fg_refresh_token')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUser() }, [loadUser])

  const login = async (email, password) => {
    const data = await authApi.login({ email, password })
    localStorage.setItem('fg_access_token',  data.access_token)
    localStorage.setItem('fg_refresh_token', data.refresh_token)
    setUser(data.user)
    return data.user
  }

  const register = async (payload) => {
    const data = await authApi.register(payload)
    localStorage.setItem('fg_access_token',  data.access_token)
    localStorage.setItem('fg_refresh_token', data.refresh_token)
    setUser(data.user)
    return data.user
  }

  const logout = () => {
    localStorage.removeItem('fg_access_token')
    localStorage.removeItem('fg_refresh_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, reloadUser: loadUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
