import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('yukthi_user')
      if (stored) setUser(JSON.parse(stored))
    } catch {}
    setLoading(false)
  }, [])

  const login = async (username, password) => {
    const { data, error } = await supabase.rpc('login_judge', {
      p_username: username.trim().toLowerCase(),
      p_password: password,
    })
    if (error) throw new Error('Authentication service error: ' + error.message)
    if (!data || data.length === 0) throw new Error('Invalid credentials or account is locked')
    const userData = data[0]
    setUser(userData)
    sessionStorage.setItem('yukthi_user', JSON.stringify(userData))
    return userData
  }

  const logout = () => {
    setUser(null)
    sessionStorage.removeItem('yukthi_user')
  }

  // Refresh user from DB (e.g. after lock status changes)
  const refreshUser = async () => {
    if (!user?.id) return
    const { data } = await supabase.from('judges').select('*').eq('id', user.id).single()
    if (data) {
      setUser(data)
      sessionStorage.setItem('yukthi_user', JSON.stringify(data))
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
