import React, { Suspense, useEffect, useState } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'

import { CSpinner, useColorModes } from '@coreui/react'
import './scss/style.scss'

import useAuth from './hooks/useAuth'
import { getMeApi } from './services/auth'

const EmsLayout = React.lazy(() => import('./layout/EmsLayout'))
const PmsLayout = React.lazy(() => import('./layout/PmsLayout'))
const Login = React.lazy(() => import('./views/pages/login/Login'))
const SystemSelection = React.lazy(() => import('./views/pages/system-selection/SystemSelection'))
const Page404 = React.lazy(() => import('./views/pages/page404/Page404'))
const Page500 = React.lazy(() => import('./views/pages/page500/Page500'))

const AppRoutes = () => {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  return (
    <Routes>
      <Route
        exact
        path="/login"
        name="Login Page"
        element={isAuthenticated ? <Navigate to="/select-system" replace /> : <Login />}
      />
      <Route exact path="/404" name="Page 404" element={<Page404 />} />
      <Route exact path="/500" name="Page 500" element={<Page500 />} />
      <Route
        exact
        path="/select-system"
        element={
          isAuthenticated ? (
            <SystemSelection />
          ) : (
            <Navigate to="/login" state={{ from: location }} replace />
          )
        }
      />
      <Route
        path="/ems/*"
        element={
          isAuthenticated ? (
            <EmsLayout />
          ) : (
            <Navigate to="/login" state={{ from: location }} replace />
          )
        }
      />
      <Route
        path="/pms/*"
        element={
          isAuthenticated ? (
            <PmsLayout />
          ) : (
            <Navigate to="/login" state={{ from: location }} replace />
          )
        }
      />
      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? '/select-system' : '/login'} replace />}
      />
    </Routes>
  )
}

const App = () => {
  const { isColorModeSet, setColorMode } = useColorModes('coreui-free-react-admin-template-theme')
  const storedTheme = useSelector((state) => state.theme)
  const token = useSelector((state) => state.token)
  const dispatch = useDispatch()
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

  useEffect(() => {
    if (!token) return

    // Dev tokens are never sent to the real API — restore user from localStorage
    if (token.startsWith('dev-')) {
      try {
        const savedUser = JSON.parse(localStorage.getItem('hma_dev_user'))
        if (savedUser) {
          dispatch({ type: 'set', user: savedUser })
        } else {
          // No saved user — clear the stale dev token
          localStorage.removeItem('hma_token')
          dispatch({ type: 'set', user: null, token: null })
        }
      } catch {
        dispatch({ type: 'set', user: null, token: null })
      }
      setIsInitializing(false)
      return
    }

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
