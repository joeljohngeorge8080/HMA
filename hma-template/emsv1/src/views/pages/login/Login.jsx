import React, { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate, useLocation } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CContainer,
  CForm,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CRow,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilLockLocked, cilUser } from '@coreui/icons'

import { loginWithGoogle } from '../../../services/auth'
import api from '../../../services/api'
import Lightfall from './Lightfall'

const Login = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  const [employeeId, setEmployeeId] = useState('')
  const [password, setPassword] = useState('')
  const [loadingPass, setLoadingPass] = useState(false)
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [error, setError] = useState('')

  const from = location.state?.from?.pathname || '/select-system'

  const storeSession = (data) => {
    localStorage.setItem('hma_token', data.access_token)
    dispatch({ type: 'set', user: data.user, token: data.access_token })
    navigate(from, { replace: true })
  }

  // ── Password login ──────────────────────────────────────────────────────────

  const handlePasswordLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoadingPass(true)
    try {
      const { data } = await api.post('/auth/login', { employee_id: employeeId, password })
      storeSession(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid employee ID or password.')
    } finally {
      setLoadingPass(false)
    }
  }

  // ── Google login ────────────────────────────────────────────────────────────

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('')
    setLoadingGoogle(true)
    try {
      const { data } = await loginWithGoogle(credentialResponse.credential)
      storeSession(data)
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          'Google login failed. Your account may not be registered — contact HR.',
      )
    } finally {
      setLoadingGoogle(false)
    }
  }

  const handleGoogleError = () => {
    setError('Google sign-in was cancelled or failed. Please try again.')
  }

  // ── Dev quick-login ─────────────────────────────────────────────────────────

  const handleDevLogin = (key, user, redirect) => {
    const devToken = `dev-token-${key}`
    localStorage.setItem('hma_token', devToken)
    localStorage.setItem('hma_dev_user', JSON.stringify(user))
    dispatch({ type: 'set', user, token: devToken })
    navigate(redirect || '/select-system')
  }

  const isLoading = loadingPass || loadingGoogle

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>

      {/* ── Lightfall background ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
        <Lightfall
          colors={['#A6C8FF', '#5227FF', '#FF9FFC']}
          backgroundColor="#0A29FF"
          speed={0.5}
          streakCount={2}
          streakWidth={1}
          streakLength={1}
          glow={1}
          density={0.6}
          twinkle={1}
          zoom={3}
          backgroundGlow={0.5}
          opacity={1}
          mouseInteraction
          mouseStrength={0.5}
          mouseRadius={1}
        />
      </div>

      {/* ── Login card ── */}
      <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={5} lg={4}>
            <CCard className="p-4" style={{ backdropFilter: 'blur(12px)', background: 'rgba(255,255,255,0.92)' }}>
              <CCardBody>
                <h2 className="fw-bold mb-0">HMA IEMS</h2>
                <p className="text-body-secondary mb-4">Internal Enterprise Management System</p>

                {error && (
                  <CAlert color="danger" dismissible onClose={() => setError('')} className="mb-3">
                    {error}
                  </CAlert>
                )}

                {/* ── Employee ID + Password ── */}
                <CForm onSubmit={handlePasswordLogin}>
                  <CInputGroup className="mb-3">
                    <CInputGroupText>
                      <CIcon icon={cilUser} />
                    </CInputGroupText>
                    <CFormInput
                      placeholder="Employee ID"
                      autoComplete="username"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </CInputGroup>

                  <CInputGroup className="mb-3">
                    <CInputGroupText>
                      <CIcon icon={cilLockLocked} />
                    </CInputGroupText>
                    <CFormInput
                      type="password"
                      placeholder="Password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </CInputGroup>

                  <div className="d-grid mb-3">
                    <CButton color="primary" type="submit" disabled={isLoading}>
                      {loadingPass && <CSpinner size="sm" className="me-2" />}
                      Login
                    </CButton>
                  </div>
                </CForm>

                {/* ── Divider ── */}
                <div className="d-flex align-items-center gap-2 mb-3">
                  <hr className="flex-grow-1 my-0" />
                  <span className="text-body-secondary small">or</span>
                  <hr className="flex-grow-1 my-0" />
                </div>

                {/* ── Google Sign-In ── */}
                {loadingGoogle ? (
                  <div className="d-flex align-items-center justify-content-center gap-2 py-1">
                    <CSpinner size="sm" />
                    <span className="text-body-secondary small">Signing in with Google…</span>
                  </div>
                ) : (
                  <div className="d-flex justify-content-center">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={handleGoogleError}
                      useOneTap={false}
                      theme="outline"
                      size="large"
                      text="signin_with"
                      disabled={isLoading}
                    />
                  </div>
                )}

                {/* ── Dev shortcuts ── */}
                {import.meta.env.DEV && (
                  <>
                    <hr className="mt-4" />
                    <p className="text-body-secondary small mb-2">Dev quick-login</p>
                    <div className="d-grid gap-2">
                      {[
                        { label: 'CEO',               key: 'DEV001',     role: 'CEO',               name: 'Dev CEO' },
                        { label: 'Heads',             key: 'DEV002',     role: 'Heads',             name: 'Dev Head' },
                        { label: 'HR',                key: 'DEV003',     role: 'HR',                name: 'Dev HR' },
                        { label: 'Finance',           key: 'DEV004',     role: 'Finance',           name: 'Dev Finance' },
                        { label: 'Project Associate', key: 'DEV_PA_001', role: 'Project Associate', name: 'Dev Project Associate', redirect: '/pms/pa/dashboard' },
                        { label: 'Project Officer',   key: 'DEV005',     role: 'Project Officer',   name: 'Dev Project Officer' },
                        { label: 'Field Personnel',   key: 'DEV006',     role: 'Field Personnel',   name: 'Dev Field Personnel' },
                        { label: 'Employee',          key: 'DEV007',     role: 'Employee',          name: 'Dev Employee' },
                      ].map(({ label, key, role, name, redirect }) => (
                        <CButton
                          key={key}
                          color="secondary"
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={() =>
                            handleDevLogin(
                              key,
                              { employee_id: key, full_name: name, role, google_email: `${key.toLowerCase()}@hma.dev` },
                              redirect,
                            )
                          }
                        >
                          {label}
                        </CButton>
                      ))}
                    </div>
                  </>
                )}
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CContainer>
      </div>
    </div>
  )
}

export default Login
