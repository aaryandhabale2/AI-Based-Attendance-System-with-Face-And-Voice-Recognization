// api/attendance.js
import api from './client'

export const getChallenge = (ttl = 60) =>
  api.get('/attendance/challenge', { params: { ttl } })

export const markAttendance = (sessionId, sessionLabel, frameBlob, audioBlob, challengeId = null, challengePhrase = null) => {
  const form = new FormData()
  form.append('session_id', sessionId)
  if (sessionLabel) form.append('session_label', sessionLabel)
  form.append('frame', frameBlob, 'frame.jpg')
  form.append('audio', audioBlob, 'audio.webm')
  if (challengeId) form.append('challenge_id', challengeId)
  if (challengePhrase) form.append('challenge_phrase', challengePhrase)
  return api.post('/attendance/mark', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
  })
}

export const getTodayAttendance = (sessionId) =>
  api.get('/attendance/today', { params: { session_id: sessionId } })

export const getStudentAttendance = (studentId, params) =>
  api.get(`/attendance/student/${studentId}`, { params })

export const getFlaggedRecords = (reason) =>
  api.get('/attendance/flagged', { params: { reason: reason || undefined } })

export const exportAttendanceCSV = (params) =>
  api.get('/attendance/export', {
    params,
    responseType: 'blob',
  })
