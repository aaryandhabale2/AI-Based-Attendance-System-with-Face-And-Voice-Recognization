// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [faculty, setFaculty] = useState(() => {
    const stored = localStorage.getItem('faculty')
    return stored ? JSON.parse(stored) : null
  })
  const [token, setToken] = useState(() => localStorage.getItem('token'))

  const login = (tokenVal, facultyData) => {
    localStorage.setItem('token', tokenVal)
    localStorage.setItem('faculty', JSON.stringify(facultyData))
    setToken(tokenVal)
    setFaculty(facultyData)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('faculty')
    setToken(null)
    setFaculty(null)
  }

  return (
    <AuthContext.Provider value={{ faculty, token, login, logout, isLoggedIn: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
