import React, { useState } from 'react'
import { CButton } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSettings } from '@coreui/icons'

import useDashboardWidgets from '../../../components/dashboard/useDashboardWidgets'
import DashboardGrid from '../../../components/dashboard/DashboardGrid'
import WidgetCatalog from '../../../components/dashboard/WidgetCatalog'

const ALL_WIDGETS = []

const PmsDashboard = () => {
  const [catalogOpen, setCatalogOpen] = useState(false)
  const { activeIds, activeWidgets, toggleWidget, resetWidgets } = useDashboardWidgets(
    'pms',
    ALL_WIDGETS,
  )

  return (
    <>
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="fw-bold mb-1">Projects Dashboard</h4>
          <p className="text-body-secondary mb-0 small">
            {activeWidgets.length} of {ALL_WIDGETS.length} widgets active
          </p>
        </div>
        <CButton color="secondary" variant="outline" size="sm" onClick={() => setCatalogOpen(true)}>
          <CIcon icon={cilSettings} className="me-1" size="sm" />
          Customize
        </CButton>
      </div>

      <DashboardGrid activeWidgets={activeWidgets} />

      <WidgetCatalog
        visible={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        allWidgets={ALL_WIDGETS}
        activeIds={activeIds}
        onToggle={toggleWidget}
        onReset={resetWidgets}
      />
    </>
  )
}

export default PmsDashboard
