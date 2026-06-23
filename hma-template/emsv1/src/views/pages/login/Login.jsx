import React, { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate, useLocation } from 'react-router-dom'
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

import { loginApi } from '../../../services/auth'

const Login = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  const devMode = import.meta.env.DEV || import.meta.env.VITE_DEV_LOGIN === 'true'
  const [employeeId, setEmployeeId] = useState(devMode ? 'DEV001' : '')
  const [password, setPassword] = useState(devMode ? 'dev' : '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForgotMsg, setShowForgotMsg] = useState(false)

  const from = location.state?.from?.pathname || '/select-system'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await loginApi(employeeId, password)
      localStorage.setItem('hma_token', data.access_token)
      if (data.access_token.startsWith('dev-')) {
        localStorage.setItem('hma_dev_user', JSON.stringify(data.user))
      }
      dispatch({ type: 'set', user: data.user, token: data.access_token })
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-body-tertiary min-vh-100 d-flex flex-row align-items-center">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={5} lg={4}>
            <CCard className="p-4">
              <CCardBody>
                <CForm onSubmit={handleSubmit}>
                  <h2 className="fw-bold mb-0">HMA IEMS</h2>
                  <p className="text-body-secondary mb-4">Internal Enterprise Management System</p>

                  {error && (
                    <CAlert color="danger" dismissible onClose={() => setError('')}>
                      {error}
                    </CAlert>
                  )}

                  {showForgotMsg && (
                    <CAlert color="info" dismissible onClose={() => setShowForgotMsg(false)}>
                      Contact your HR administrator to reset your password.
                    </CAlert>
                  )}

                  <CInputGroup className="mb-3">
                    <CInputGroupText>
                      <CIcon icon={cilUser} />
                    </CInputGroupText>
                    <CFormInput
                      id="employee_id"
                      placeholder="Employee ID"
                      autoComplete="username"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      required
                    />
                  </CInputGroup>

                  <CInputGroup className="mb-4">
                    <CInputGroupText>
                      <CIcon icon={cilLockLocked} />
                    </CInputGroupText>
                    <CFormInput
                      type="password"
                      placeholder="Password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </CInputGroup>

                  <CRow className="align-items-center">
                    <CCol xs={6}>
                      <CButton color="primary" type="submit" className="px-4" disabled={loading}>
                        {loading && <CSpinner size="sm" className="me-2" />}
                        Login
                      </CButton>
                    </CCol>
                    <CCol xs={6} className="text-end">
                      <CButton
                        color="link"
                        className="px-0"
                        type="button"
                        onClick={() => setShowForgotMsg(true)}
                      >
                        Forgot password?
                      </CButton>
                    </CCol>
                  </CRow>
                </CForm>

                {devMode && (
                  <>
                    <hr />
                    <p className="text-body-secondary small mb-2">
                      Dev mode — ID: DEV001–DEV005, Password: <code>dev</code>
                    </p>
                    <div className="d-grid gap-2">
                      {[
                        { role: 'CEO',               id: 'DEV001',     name: 'Dev CEO' },
                        { role: 'Heads',             id: 'DEV002',     name: 'Dev Head' },
                        { role: 'HR',                id: 'DEV003',     name: 'Dev HR' },
                        { role: 'Finance',           id: 'DEV004',     name: 'Dev Finance' },
                        { role: 'Project Associate', id: 'DEV_PA_001', name: 'Dev Project Associate', redirect: '/pms/pa/dashboard' },
                        { role: 'Project Officer',   id: 'DEV005',     name: 'Dev Project Officer' },
                        { role: 'Field Personnel',   id: 'DEV006',     name: 'Dev Field Personnel' },
                      ].map(({ role, id, name, redirect }) => (
                        <CButton
                          key={role}
                          color="secondary"
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={() => {
                            const devToken = `dev-token-${id}`
                            localStorage.setItem('hma_token', devToken)
                            localStorage.setItem('hma_dev_user', JSON.stringify({ employee_id: id, full_name: name, role }))
                            dispatch({
                              type: 'set',
                              user: { employee_id: id, full_name: name, role },
                              token: devToken,
                            })
                            navigate(redirect || '/select-system')
                          }}
                        >
                          {role}
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
  )
}

export default Login
