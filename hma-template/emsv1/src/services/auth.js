import api from './api'

const DEV_USERS = {
  DEV001: { employee_id: 'DEV001', full_name: 'Dev CEO', role: 'CEO' },
  DEV002: { employee_id: 'DEV002', full_name: 'Dev Head', role: 'Heads' },
  DEV003: { employee_id: 'DEV003', full_name: 'Dev HR', role: 'HR' },
  DEV004: { employee_id: 'DEV004', full_name: 'Dev Finance', role: 'Finance' },
  DEV005: { employee_id: 'DEV005', full_name: 'Dev Project Officer', role: 'Project Officer' },
}

const isDevMode = () => import.meta.env.DEV || import.meta.env.VITE_DEV_LOGIN === 'true'

export const loginApi = (employee_id, password) => {
  if (isDevMode() && DEV_USERS[employee_id] && password === 'dev') {
    return Promise.resolve({
      data: {
        access_token: `dev-token-${employee_id}`,
        user: DEV_USERS[employee_id],
      },
    })
  }
  return api.post('/auth/login', { employee_id, password })
}

export const getMeApi = () => {
  const token = localStorage.getItem('hma_token')
  if (isDevMode() && token?.startsWith('dev-token-')) {
    const user = DEV_USERS[token.replace('dev-token-', '')]
    return user
      ? Promise.resolve({ data: user })
      : Promise.reject(new Error('Invalid dev token'))
  }
  return api.get('/auth/me')
}

// Swallows errors — client-side logout always succeeds regardless of server response
export const logoutApi = () => api.post('/auth/logout').catch(() => {})
