import React from 'react'
import CIcon from '@coreui/icons-react'
import { cilWarning } from '@coreui/icons'
import { localAdminSettings } from '../../../services/localAdminSettings'

const MaintenanceBanner = () => {
  const s = localAdminSettings.get()
  if (!s.maintenance_mode) return null
  return (
    <div
      style={{
        background: '#d93025',
        color: '#fff',
        textAlign: 'center',
        padding: '8px 16px',
        fontSize: 13,
        fontWeight: 600,
        zIndex: 9999,
        position: 'sticky',
        top: 0,
      }}
    >
      <CIcon icon={cilWarning} className="me-2" />
      MAINTENANCE MODE ACTIVE — {s.maintenance_message}
    </div>
  )
}

export default MaintenanceBanner
