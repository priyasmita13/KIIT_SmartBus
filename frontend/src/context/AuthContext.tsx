import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

export type UserRole = 'STUDENT' | 'DRIVER' | 'ADMIN'

export type AuthUser = {
  id: string
  email: string
  name: string
  role: UserRole
}

type AuthContextType = {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ user: AuthUser; accessToken: string }>
  logout: () => void
  setUserFromData: (user: AuthUser, accessToken: string) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = sessionStorage.getItem('accessToken')
    const userData = sessionStorage.getItem('user')
    if (token && userData) {
      try {
        setUser(JSON.parse(userData))
      } catch {
        sessionStorage.removeItem('accessToken')
        sessionStorage.removeItem('user')
      }
    }
    setLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    const res = await axios.post(`${API}/api/auth/login`, { email, password }, { withCredentials: true })
    const { user: userData, accessToken } = res.data
    sessionStorage.setItem('accessToken', accessToken)
    sessionStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    return res.data
  }

  const logout = () => {
    axios.post(`${API}/api/auth/logout`, {}, { withCredentials: true }).catch(() => {})
    sessionStorage.removeItem('accessToken')
    sessionStorage.removeItem('user')
    setUser(null)
  }

  // Used after OTP verification to set user state without calling login endpoint again
  const setUserFromData = (userData: AuthUser, accessToken: string) => {
    sessionStorage.setItem('accessToken', accessToken)
    sessionStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUserFromData }}>
      {children}
    </AuthContext.Provider>
  )
}
