import axios from 'axios'
import store from '../store'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = store.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// On 401, clear session and send to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('hma_token')
      store.dispatch({ type: 'set', user: null, token: null })
      // HashRouter — navigate without useNavigate (which requires a component context)
      window.location.hash = '#/login'
    }
    return Promise.reject(error)
  },
)

export default api
