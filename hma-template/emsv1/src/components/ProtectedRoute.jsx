import React from 'react'
import PropTypes from 'prop-types'
import { Navigate, useLocation } from 'react-router-dom'

import useAuth from '../hooks/useAuth'
import usePermission from '../hooks/usePermission'

const ProtectedRoute = ({ module, action, children }) => {
  const { isAuthenticated } = useAuth()
  const allowed = usePermission(module, action)
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!allowed) {
    const fallback = location.pathname.startsWith('/pms') ? '/pms/dashboard' : '/ems/dashboard'
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
