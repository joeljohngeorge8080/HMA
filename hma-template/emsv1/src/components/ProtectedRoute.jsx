import React from 'react'
import PropTypes from 'prop-types'
import { Navigate, useLocation } from 'react-router-dom'

import useAuth from '../hooks/useAuth'
import usePermission from '../hooks/usePermission'
import useRole from '../hooks/useRole'
import { ROLE } from '../constants/roles'

const getPmsFallback = (role) => {
  if (role === ROLE.PROJECT_ASSOCIATE || role === ROLE.PROJECT_OFFICER) {
    return '/pms/pa/dashboard'
  }
  if (role === ROLE.FIELD_PERSONNEL || role === ROLE.BACKEND_TEAM) {
    // FP/BT have no pms_dashboard access — send to their section
    return '/pms/daily-reports/my-tasks'
  }
  // HR and any other non-PMS role: exit PMS to prevent infinite redirect
  return '/select-system'
}

const ProtectedRoute = ({ module, action, children }) => {
  const { isAuthenticated } = useAuth()
  const allowed = usePermission(module, action)
  const role = useRole()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!allowed) {
    const fallback = location.pathname.startsWith('/pms')
      ? getPmsFallback(role)
      : '/ems/dashboard'
    return <Navigate to={fallback} replace />
  }

  return children
}

ProtectedRoute.propTypes = {
  module: PropTypes.string.isRequired,
  action: PropTypes.oneOf(['view', 'edit']),
  children: PropTypes.node.isRequired,
}

ProtectedRoute.defaultProps = {
  action: 'view',
}

export default ProtectedRoute
