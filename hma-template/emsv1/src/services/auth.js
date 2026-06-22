import api from './api'

export const loginApi = (employee_id, password) =>
  api.post('/auth/login', { employee_id, password })

export const getMeApi = () => api.get('/auth/me')

// Swallows errors — client-side logout always succeeds regardless of server response
export const logoutApi = () => api.post('/auth/logout').catch(() => {})
