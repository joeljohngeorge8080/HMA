import React from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { GoogleOAuthProvider } from '@react-oauth/google'
import 'core-js'

import App from './App'
import store from './store'
import { seedLocalEmployees, applySalary20000Migration } from './services/seedLocalEmployees'

// Pre-populate localStorage with HMA manpower data (runs once on first load)
seedLocalEmployees()
applySalary20000Migration()

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

createRoot(document.getElementById('root')).render(
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <Provider store={store}>
      <App />
    </Provider>
  </GoogleOAuthProvider>,
)
