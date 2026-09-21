// api/enrollment.js
import api from './client'

export const createStudent = (data) => api.post('/enroll/student', data)

export const listStudents = (params) => api.get('/enroll/students', { params })

export const getStudent = (id) => api.get(`/enroll/students/${id}`)

export const updateStudent = (id, data) => api.put(`/enroll/students/${id}`, data)

export const deleteStudent = (id) => api.delete(`/enroll/students/${id}`)

export const enrollFace = (studentId, frames) => {
  const form = new FormData()
  frames.forEach((blob, i) => form.append('frames', blob, `frame_${i}.jpg`))
  return api.post(`/enroll/${studentId}/face`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  })
}

export const enrollVoice = (studentId, samples) => {
  const form = new FormData()
  samples.forEach((blob, i) => form.append('samples', blob, `sample_${i}.webm`))
  return api.post(`/enroll/${studentId}/voice`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  })
}

export const completeEnrollment = (studentId) =>
  api.post(`/enroll/${studentId}/complete`)
