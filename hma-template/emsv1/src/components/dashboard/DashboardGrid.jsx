import React, { Suspense } from 'react'
import { CRow, CCol, CSpinner } from '@coreui/react'

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
        <div className="fs-1 mb-2">📊</div>
        <p className="mb-0">No widgets selected. Click <strong>Customize</strong> to add some.</p>
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
