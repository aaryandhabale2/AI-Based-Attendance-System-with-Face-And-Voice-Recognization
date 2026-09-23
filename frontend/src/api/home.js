// src/api/home.js — Home dashboard API calls
import api from './client'

export const getHomeSummary   = ()           => api.get('/home/summary')
export const getHomeTrend     = (days = 7)   => api.get('/home/trend', { params: { days } })
export const getHomeSubjects  = (className)  => api.get('/home/subjects', { params: className ? { class_name: className } : {} })
export const getHomeSchedule  = ()           => api.get('/home/schedule')
export const getHomeActivity  = (limit = 10) => api.get('/home/activity', { params: { limit } })
export const getHomeReport    = ()           => api.get('/home/report')
