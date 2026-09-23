// src/api/student.js — Student API calls
import axios from 'axios'

const api = axios.create({ baseURL: '/api', timeout: 15000 })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('student_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) {
    localStorage.removeItem('student_token')
    localStorage.removeItem('student')
    window.location.href = '/login'
  }
  return Promise.reject(err)
})

export const studentLogin    = (roll_no, password) => api.post('/student/login', { roll_no, password })
export const getStudentMe    = ()                   => api.get('/student/me')
export const getStudentSummary = ()                 => api.get('/student/my-summary')
export const getStudentAttendance = ()              => api.get('/student/my-attendance')
