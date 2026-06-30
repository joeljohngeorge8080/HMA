import React, { useEffect, useState } from 'react'
import { AppContent, AppSidebar, AppFooter, AppHeader } from '../components/index'
import { RoutesContext } from '../contexts/RoutesContext'
import pmsNav from '../modules/pms/_nav'
import { pmsRoutes } from '../routes/pms.routes'
import FloatingCalculator from '../components/FloatingCalculator'
import MaintenancePage from '../modules/ems/admin/MaintenancePage'
import { localAdminSettings } from '../services/localAdminSettings'
import useRole from '../hooks/useRole'
import { ROLE } from '../constants/roles'

const ROLE_NAV_MAP = {
  [ROLE.ADMIN]: (nav) => nav,
  [ROLE.PROJECT_ASSOCIATE]: (nav) =>
    nav.filter(
      (item) =>
        item.name === 'Project Associate' ||
        item.name === 'Switch to EMS' ||
        item.name === 'Dashboard',
    ),
  [ROLE.PROJECT_OFFICER]: (nav) =>
    nav.filter((item) => item.name !== 'Field Personnel' && item.name !== 'Project Associate'),
  [ROLE.PROJECT_COORDINATOR]: (nav) =>
    nav.filter((item) => item.name !== 'Field Personnel' && item.name !== 'Project Associate'),
  [ROLE.FIELD_PERSONNEL]: (nav) =>
    nav.filter((item) => item.name === 'Field Personnel' || item.name === 'Switch to EMS'),
}

const PmsLayout = () => {
  const role = useRole()
  const [maintenance, setMaintenance] = useState(() => localAdminSettings.get())

  useEffect(() => {
    const id = setInterval(() => setMaintenance(localAdminSettings.get()), 2000)
    return () => clearInterval(id)
  }, [])

  if (maintenance.maintenance_mode && role !== ROLE.ADMIN) {
    return <MaintenancePage message={maintenance.maintenance_message} />
  }

  const filterFn = ROLE_NAV_MAP[role] || ROLE_NAV_MAP.admin
  const filteredNav = filterFn(pmsNav)

  return (
    <RoutesContext.Provider value={pmsRoutes}>
      <div>
        <AppSidebar nav={filteredNav} />
        <div className="wrapper d-flex flex-column min-vh-100">
          <AppHeader nav={filteredNav} />
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

export default PmsLayout
