// api/attendance.js
import api from './client'

export const markAttendance = (sessionId, sessionLabel, frameBlob, audioBlob) => {
  const form = new FormData()
  form.append('session_id', sessionId)
  if (sessionLabel) form.append('session_label', sessionLabel)
  form.append('frame', frameBlob, 'frame.jpg')
  form.append('audio', audioBlob, 'audio.webm')
  return api.post('/attendance/mark', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
  })
}

export const getTodayAttendance = (sessionId) =>
  api.get('/attendance/today', { params: { session_id: sessionId } })

export const getStudentAttendance = (studentId, params) =>
  api.get(`/attendance/student/${studentId}`, { params })

export const getFlaggedRecords = () => api.get('/attendance/flagged')

export const exportAttendanceCSV = (params) =>
  api.get('/attendance/export', {
    params,
    responseType: 'blob',
  })
