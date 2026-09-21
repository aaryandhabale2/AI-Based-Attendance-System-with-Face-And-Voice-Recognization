// api/alerts.js
import api from './client'

export const getAlerts = (limit = 50) =>
  api.get('/alerts', { params: { limit } })

export const getStudentAlerts = (studentId) =>
  api.get(`/alerts/student/${studentId}`)

export const triggerAlerts = (className) =>
  api.post('/alerts/trigger', null, { params: { class_name: className } })
