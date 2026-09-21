// api/dashboard.js
import api from './client'

export const getDashboardStats = () => api.get('/dashboard/stats')

export const getAttendanceTrend = (weeks, className) =>
  api.get('/dashboard/trend', { params: { weeks, class_name: className } })

export const getClassSummary = () => api.get('/dashboard/classes')

export const getStudentTable = (params) =>
  api.get('/dashboard/students', { params })

export const getAtRiskStudents = () => api.get('/dashboard/at-risk')
