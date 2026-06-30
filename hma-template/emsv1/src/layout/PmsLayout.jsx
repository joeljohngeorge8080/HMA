import React, { useEffect, useState } from 'react'
import { AppContent, AppSidebar, AppFooter, AppHeader } from '../components/index'
import { RoutesContext } from '../contexts/RoutesContext'
import pmsNav from '../modules/pms/_nav'
import { pmsRoutes } from '../routes/pms.routes'
import { CButton, CBadge } from '@coreui/react'
import FloatingCalculator from '../components/FloatingCalculator'
import MaintenancePage from '../modules/ems/admin/MaintenancePage'
import { localAdminSettings } from '../services/localAdminSettings'
import useRole from '../hooks/useRole'
import { ROLE } from '../constants/roles'

const ROLE_NAV_MAP = {
  admin: (nav) => nav,
  project_associate: (nav) =>
    nav.filter(
      (item) =>
        item.name === 'Project Associate' ||
        item.name === 'Switch to EMS' ||
        item.name === 'Dashboard',
    ),
  project_officer: (nav) =>
    nav.filter((item) => item.name !== 'Field Personnel' && item.name !== 'Project Associate'),
  project_coordinator: (nav) =>
    nav.filter((item) => item.name !== 'Field Personnel' && item.name !== 'Project Associate'),
  field_personnel: (nav) =>
    nav.filter((item) => item.name === 'Field Personnel' || item.name === 'Switch to EMS'),
}

const ROLES = [
  { key: 'admin', label: 'Administrator', color: 'primary' },
  { key: 'project_officer', label: 'Project Officer', color: 'info' },
  { key: 'project_coordinator', label: 'Project Coordinator', color: 'success' },
  { key: 'project_associate', label: 'Project Associate', color: 'secondary' },
  { key: 'field_personnel', label: 'Field Personnel', color: 'warning' },
]

const PmsLayout = () => {
  const [role, setRole] = useState('admin')
  const authRole = useRole()
  const [maintenance, setMaintenance] = useState(() => localAdminSettings.get())

  useEffect(() => {
    const id = setInterval(() => setMaintenance(localAdminSettings.get()), 2000)
    return () => clearInterval(id)
  }, [])

  if (maintenance.maintenance_mode && authRole !== ROLE.ADMIN) {
    return <MaintenancePage message={maintenance.maintenance_message} />
  }

  const filterFn = ROLE_NAV_MAP[role] || ROLE_NAV_MAP.admin
  const filteredNav = filterFn(pmsNav)

  return (
    <RoutesContext.Provider value={pmsRoutes}>
      <div>
        <AppSidebar nav={filteredNav} />
        <div className="wrapper d-flex flex-column min-vh-100">
          <AppHeader />
          {/* Demo Role Switcher */}
          <div
            className="p-2 border-bottom d-flex justify-content-end align-items-center gap-2 flex-wrap"
            style={{ background: 'rgba(67,97,238,0.06)' }}
          >
            <span className="small fw-bold text-body-secondary me-1">Viewing As:</span>
            {ROLES.map((r) => (
              <CButton
                key={r.key}
                size="sm"
                color={role === r.key ? r.color : 'secondary'}
                variant={role === r.key ? '' : 'outline'}
                onClick={() => setRole(r.key)}
                className="d-flex align-items-center gap-1"
              >
                {r.label}
                {role === r.key && (
                  <CBadge color="light" className="text-dark ms-1" style={{ fontSize: '0.6rem' }}>
                    Active
                  </CBadge>
                )}
              </CButton>
            ))}
          </div>
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
