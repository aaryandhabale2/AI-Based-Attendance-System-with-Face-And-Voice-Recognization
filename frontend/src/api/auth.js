// api/auth.js
import api from './client'

export const login = (username, password) =>
  api.post('/auth/login', { username, password })

export const getMe = () => api.get('/auth/me')

export const updateMe = (data) => api.patch('/auth/me', data)

export const changePassword = (data) => api.post('/auth/me/change-password', data)

export const registerFaculty = (data) => api.post('/auth/register', data)

export const listFaculty = () => api.get('/auth/faculty')

export const deactivateFaculty = (id) => api.delete(`/auth/faculty/${id}`)

