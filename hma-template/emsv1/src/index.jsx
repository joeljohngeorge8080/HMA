import React from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import 'core-js'

import App from './App'
import store from './store'
import { seedLocalEmployees } from './services/seedLocalEmployees'

// Pre-populate localStorage with HMA manpower data (runs once on first load)
seedLocalEmployees()

createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <App />
  </Provider>,
)
