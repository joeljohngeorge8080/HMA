import React, { useEffect, useState } from 'react'
import { AppContent, AppSidebar, AppFooter, AppHeader } from '../components/index'
import { RoutesContext } from '../contexts/RoutesContext'
import emsNav from '../modules/ems/_nav'
import { emsRoutes } from '../routes/ems.routes'
import MaintenanceBanner from '../modules/ems/admin/MaintenanceBanner'
import MaintenancePage from '../modules/ems/admin/MaintenancePage'
import FloatingCalculator from '../components/FloatingCalculator'
import { localAdminSettings } from '../services/localAdminSettings'
import useRole from '../hooks/useRole'
import { ROLE } from '../constants/roles'

const EmsLayout = () => {
  const role = useRole()
  const [maintenance, setMaintenance] = useState(() => localAdminSettings.get())

  useEffect(() => {
    const id = setInterval(() => setMaintenance(localAdminSettings.get()), 2000)
    return () => clearInterval(id)
  }, [])

  // Non-admin users see the maintenance page when mode is active
  if (maintenance.maintenance_mode && role !== ROLE.ADMIN) {
    return <MaintenancePage message={maintenance.maintenance_message} />
  }

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
        <FloatingCalculator />
      </div>
    </RoutesContext.Provider>
  )
}

export default EmsLayout
