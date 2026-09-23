// src/context/StudentContext.jsx — Student auth context (parallel to AuthContext)
import { createContext, useContext, useState } from 'react'

const StudentContext = createContext(null)

export function StudentProvider({ children }) {
  const stored = (() => {
    try {
      const t = localStorage.getItem('student_token')
      const s = localStorage.getItem('student')
      return t && s ? { token: t, student: JSON.parse(s) } : null
    } catch { return null }
  })()

  const [token,   setToken]   = useState(stored?.token   || null)
  const [student, setStudent] = useState(stored?.student || null)

  const loginStudent = (tk, st) => {
    localStorage.setItem('student_token', tk)
    localStorage.setItem('student', JSON.stringify(st))
    setToken(tk)
    setStudent(st)
  }

  const logoutStudent = () => {
    localStorage.removeItem('student_token')
    localStorage.removeItem('student')
    setToken(null)
    setStudent(null)
  }

  return (
    <StudentContext.Provider value={{ token, student, loginStudent, logoutStudent, isLoggedIn: !!token }}>
      {children}
    </StudentContext.Provider>
  )
}

export const useStudent = () => useContext(StudentContext)
