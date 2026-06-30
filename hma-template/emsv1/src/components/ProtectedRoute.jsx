import React from 'react'
import PropTypes from 'prop-types'
import { Navigate } from 'react-router-dom'
import { CAlert } from '@coreui/react'

import useAuth from '../hooks/useAuth'
import usePermission from '../hooks/usePermission'
import useRole from '../hooks/useRole'
import { ROLE } from '../constants/roles'

const ProtectedRoute = ({ module, action, children }) => {
  const { isAuthenticated } = useAuth()
  const allowed = usePermission(module, action)
  const role = useRole()

  const getPmsFallback = (role) => {
    if (role === ROLE.PROJECT_ASSOCIATE || role === ROLE.PROJECT_OFFICER) {
      return '/pms/pa/dashboard'
    }
    if (role === ROLE.BACKEND_TEAM) {
      return '/pms/settlements'
    }
    if (role === ROLE.PROJECT_COORDINATOR) {
      return '/pms/pa/dashboard'
    }
    if (role === ROLE.FIELD_PERSONNEL) {
      return '/pms/daily-reports/personnel-log'
    }
    return '/pms/dashboard'
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!allowed) {
    return (
      <CAlert color="danger" className="mt-4">
        <h4 className="alert-heading">No Access</h4>
        <p className="mb-0">
          You do not have permission to view this screen (current role: {role}).
        </p>
      </CAlert>
    )
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
