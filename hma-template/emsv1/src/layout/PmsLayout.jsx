import React, { useState } from 'react'
import { AppContent, AppSidebar, AppFooter, AppHeader } from '../components/index'
import { RoutesContext } from '../contexts/RoutesContext'
import pmsNav from '../modules/pms/_nav'
import { pmsRoutes } from '../routes/pms.routes'
import { CButton, CBadge } from '@coreui/react'

const ROLES = [
  { key: 'admin', label: 'Administrator', color: 'primary' },
  { key: 'project_officer', label: 'Project Officer', color: 'success' },
  { key: 'field_personnel', label: 'Field Personnel', color: 'warning' },
]

const PmsLayout = () => {
  const [role, setRole] = useState('field_personnel')

  // Filter navigation based on role
  const filteredNav = pmsNav.filter(item => {
    if (role === 'field_personnel') {
      // Field Personnel only see their own section
      return item.name === 'Field Personnel' || item.name === 'Switch to EMS'
    }
    if (role === 'project_officer') {
      // Project Officers see Daily Reports (Admin) and shared items, but NOT Field Personnel self-service
      return item.name !== 'Field Personnel'
    }
    return true // Admins see everything
  })

  const currentRole = ROLES.find(r => r.key === role)

  return (
    <RoutesContext.Provider value={pmsRoutes}>
      <div>
        <AppSidebar nav={filteredNav} />
        <div className="wrapper d-flex flex-column min-vh-100">
          <AppHeader />
          {/* Demo Role Switcher */}
          <div className="bg-body-secondary border-bottom d-flex justify-content-end align-items-center px-3 py-2 gap-2 shadow-sm" style={{ fontSize: '0.8rem' }}>
            <span className="fw-semibold text-body-secondary me-1">Viewing As:</span>
            <CBadge color={currentRole.color} className="me-2 px-2 py-1" style={{ fontSize: '0.75rem' }}>
              {currentRole.label}
            </CBadge>
            {ROLES.map(r => (
              <CButton
                key={r.key}
                size="sm"
                color={r.color}
                variant={role === r.key ? '' : 'outline'}
                onClick={() => setRole(r.key)}
                style={{ fontSize: '0.75rem', padding: '2px 10px' }}
              >
                {r.label}
              </CButton>
            ))}
          </div>
          <div className="body flex-grow-1">
            <AppContent />
          </div>
          <AppFooter />
        </div>
      </div>
    </RoutesContext.Provider>
  )
}

export default PmsLayout

