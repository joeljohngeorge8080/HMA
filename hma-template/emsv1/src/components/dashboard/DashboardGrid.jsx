import React, { Suspense } from 'react'
import { CRow, CCol, CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilChartPie } from '@coreui/icons'

const WidgetSkeleton = ({ colProps }) => (
  <CCol {...colProps}>
    <div
      className="rounded-3 bg-body-secondary d-flex align-items-center justify-content-center"
      style={{ height: 120, animation: 'pulse 1.5s ease-in-out infinite' }}
    >
      <CSpinner size="sm" color="secondary" />
    </div>
  </CCol>
)

const DashboardGrid = ({ activeWidgets }) => {
  if (activeWidgets.length === 0) {
    return (
      <div className="text-center py-5 text-body-secondary">
        <CIcon
          icon={cilChartPie}
          style={{ width: 42, height: 42, marginBottom: 10, opacity: 0.5 }}
        />
        <p className="mb-0">
          No widgets selected. Click <strong>Customize</strong> to add some.
        </p>
      </div>
    )
  }

  return (
    <CRow className="g-3">
      {activeWidgets.map((widget) => {
        const Component = widget.component
        return (
          <CCol key={widget.id} {...widget.colProps}>
            <Suspense fallback={<CSpinner size="sm" />}>
              <Component />
            </Suspense>
          </CCol>
        )
      })}
    </CRow>
  )
}

export default DashboardGrid
