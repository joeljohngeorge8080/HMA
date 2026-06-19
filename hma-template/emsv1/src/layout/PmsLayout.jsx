import React from 'react'
import { AppContent, AppSidebar, AppFooter, AppHeader } from '../components/index'
import { RoutesContext } from '../contexts/RoutesContext'
import pmsNav from '../modules/pms/_nav'
import { pmsRoutes } from '../routes/pms.routes'

const PmsLayout = () => {
  return (
    <RoutesContext.Provider value={pmsRoutes}>
      <div>
        <AppSidebar nav={pmsNav} />
        <div className="wrapper d-flex flex-column min-vh-100">
          <AppHeader />
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
