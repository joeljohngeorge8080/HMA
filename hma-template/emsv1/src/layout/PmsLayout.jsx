import React, { useState } from 'react'
import { AppContent, AppSidebar, AppFooter, AppHeader } from '../components/index'
import { RoutesContext } from '../contexts/RoutesContext'
import pmsNav from '../modules/pms/_nav'
import { pmsRoutes } from '../routes/pms.routes'
import { CButton } from '@coreui/react'

const PmsLayout = () => {
  // Simple role toggle for demonstration
  const [role, setRole] = useState('field_personnel')

  // Filter navigation based on role
  const filteredNav = pmsNav.filter(item => {
    if (role === 'field_personnel') {
      // Field Personnel should only see their section and the switch to EMS option
      return item.name === 'Field Personnel' || item.name === 'Switch to EMS'
    }
    return true // Admins see everything
  })
  return (
    <RoutesContext.Provider value={pmsRoutes}>
      <div>
        <AppSidebar nav={filteredNav} />
        <div className="wrapper d-flex flex-column min-vh-100">
          <AppHeader />
          {/* Demo Role Switcher (Can be removed in production) */}
          <div className="bg-warning-subtle p-2 border-bottom d-flex justify-content-end align-items-center shadow-sm">
            <span className="me-3 small fw-bold text-dark">Viewing As:</span>
            <CButton 
              size="sm" 
              color={role === 'admin' ? 'primary' : 'secondary'} 
              variant={role === 'admin' ? '' : 'outline'}
              className="me-2"
              onClick={() => setRole('admin')}
            >
              Administrator
            </CButton>
            <CButton 
              size="sm" 
              color={role === 'field_personnel' ? 'primary' : 'secondary'} 
              variant={role === 'field_personnel' ? '' : 'outline'}
              onClick={() => setRole('field_personnel')}
            >
              Field Personnel
            </CButton>
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
