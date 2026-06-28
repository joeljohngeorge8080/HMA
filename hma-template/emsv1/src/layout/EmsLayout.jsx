import React from 'react'
import { AppContent, AppSidebar, AppFooter, AppHeader } from '../components/index'
import { RoutesContext } from '../contexts/RoutesContext'
import emsNav from '../modules/ems/_nav'
import { emsRoutes } from '../routes/ems.routes'
import MaintenanceBanner from '../modules/ems/admin/MaintenanceBanner'

const EmsLayout = () => {
  return (
    <RoutesContext.Provider value={emsRoutes}>
      <div>
        <AppSidebar nav={emsNav} />
        <div className="wrapper d-flex flex-column min-vh-100">
          <MaintenanceBanner />
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

export default EmsLayout
