/**
 * ProtectedRoute Component
 *
 * Route guard that combines authentication and module-level RBAC.
 * - Not authenticated        → redirect to /login
 * - Authenticated, no access  → redirect to /dashboard
 * - Otherwise                 → render children
 *
 * NOTE: Created in Phase 0 but not yet wired into the router. Phase 1
 * introduces real login and wraps protected routes with this component.
 *
 * @component
 */

import React from 'react'
import PropTypes from 'prop-types'
import { Navigate } from 'react-router-dom'

import useAuth from '../hooks/useAuth'
import usePermission from '../hooks/usePermission'

const ProtectedRoute = ({ module, action, children }) => {
  const { isAuthenticated } = useAuth()
  const allowed = usePermission(module, action)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!allowed) {
    return <Navigate to="/dashboard" replace />
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
