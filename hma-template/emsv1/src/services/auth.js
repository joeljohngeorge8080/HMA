import api from './api'

const DEV_USERS = {
  DEV001: { employee_id: 'DEV001', full_name: 'Dev CEO',             role: 'CEO',            google_email: 'ceo@hma.dev' },
  DEV002: { employee_id: 'DEV002', full_name: 'Dev Head',            role: 'Heads',          google_email: 'head@hma.dev' },
  DEV003: { employee_id: 'DEV003', full_name: 'Dev HR',              role: 'HR',             google_email: 'hr@hma.dev' },
  DEV004: { employee_id: 'DEV004', full_name: 'Dev Finance',         role: 'Finance',        google_email: 'finance@hma.dev' },
  DEV005: { employee_id: 'DEV005', full_name: 'Dev Project Officer', role: 'Project Officer',google_email: 'po@hma.dev' },
  DEV009: { employee_id: 'THLL2408', full_name: 'Titu S Jayan',      role: 'Employee',       google_email: 'dev009@hma.dev' },
}

const isDevMode = () => import.meta.env.DEV || import.meta.env.VITE_DEV_LOGIN === 'true'

/**
 * Called after Google returns a credential (ID token).
 * In production, sends the token to the backend for verification.
 * In dev mode, bypasses Google entirely and returns a fake session.
 */
export const loginWithGoogle = (credential) => {
  if (isDevMode() && credential?.startsWith('dev-bypass-')) {
    const roleKey = credential.replace('dev-bypass-', '')
    const user = DEV_USERS[roleKey]
    if (user) {
      return Promise.resolve({
        data: { access_token: `dev-token-${roleKey}`, user },
      })
    }
  }
  return api.post('/auth/google', { credential })
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
