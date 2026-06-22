import React from 'react'
import PropTypes from 'prop-types'
import { Navigate, useLocation } from 'react-router-dom'

import useAuth from '../hooks/useAuth'
import usePermission from '../hooks/usePermission'
import useRole from '../hooks/useRole'
import { ROLE } from '../constants/roles'

/**
 * Returns the appropriate dashboard fallback for a given role.
 * Project Associate and Project Officer have dedicated dashboards
 * instead of the generic /pms/dashboard placeholder.
 */
const getPmsFallback = (role) => {
  if (role === ROLE.PROJECT_ASSOCIATE || role === ROLE.PROJECT_OFFICER) {
    return '/pms/pa/dashboard'
  }
  return '/pms/dashboard'
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
