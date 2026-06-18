import React, { Suspense, useEffect, useState } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'

import { CSpinner, useColorModes } from '@coreui/react'
import './scss/style.scss'

import useAuth from './hooks/useAuth'
import { getMeApi } from './services/auth'

// Containers
const DefaultLayout = React.lazy(() => import('./layout/DefaultLayout'))

// Pages
const Login = React.lazy(() => import('./views/pages/login/Login'))
const Page404 = React.lazy(() => import('./views/pages/page404/Page404'))
const Page500 = React.lazy(() => import('./views/pages/page500/Page500'))

// Separate component so useLocation is available inside HashRouter
const AppRoutes = () => {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  return (
    <Routes>
      <Route
        exact
        path="/login"
        name="Login Page"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route exact path="/404" name="Page 404" element={<Page404 />} />
      <Route exact path="/500" name="Page 500" element={<Page500 />} />
      <Route
        path="*"
        name="Home"
        element={
          isAuthenticated ? (
            <DefaultLayout />
          ) : (
            <Navigate to="/login" state={{ from: location }} replace />
          )
        }
      />
    </Routes>
  )
}

const App = () => {
  const { isColorModeSet, setColorMode } = useColorModes('coreui-free-react-admin-template-theme')
  const storedTheme = useSelector((state) => state.theme)
  const token = useSelector((state) => state.token)
  const dispatch = useDispatch()
  // True only when a stored token needs to be validated via /auth/me
  const [isInitializing, setIsInitializing] = useState(() => Boolean(token))

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.href.split('?')[1])
    const theme = urlParams.get('theme') && urlParams.get('theme').match(/^[A-Za-z0-9\s]+/)[0]
    if (theme) {
      setColorMode(theme)
    }
    if (isColorModeSet()) {
      return
    }
    setColorMode(storedTheme)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Rehydrate user from stored token on app startup
  useEffect(() => {
    if (!token) return
    getMeApi()
      .then(({ data }) => dispatch({ type: 'set', user: data }))
      .catch(() => {
        localStorage.removeItem('hma_token')
        dispatch({ type: 'set', user: null, token: null })
      })
      .finally(() => setIsInitializing(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (isInitializing) {
    return (
      <div className="pt-3 text-center">
        <CSpinner color="primary" variant="grow" />
      </div>
    )
  }

  return (
    <HashRouter>
      <Suspense
        fallback={
          <div className="pt-3 text-center">
            <CSpinner color="primary" variant="grow" />
          </div>
        }
      >
        <AppRoutes />
      </Suspense>
    </HashRouter>
  )
}

export default App
