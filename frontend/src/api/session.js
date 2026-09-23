// api/session.js — API client for teacher attendance sessions
import api from './client'

export const createSession = (data) =>
  api.post('/sessions/create', data)

export const getActiveSessions = () =>
  api.get('/sessions/active')

export const getSession = (sessionId) =>
  api.get(`/sessions/${encodeURIComponent(sessionId)}`)

export const endSession = (sessionId) =>
  api.post(`/sessions/${encodeURIComponent(sessionId)}/end`)
