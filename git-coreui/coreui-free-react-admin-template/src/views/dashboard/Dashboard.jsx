/**
 * Dashboard View — Placeholder
 *
 * The dashboard layout and widgets are not finalized and await stakeholder
 * validation (see HMA IEMS Architecture v2.0). This is an intentional empty
 * shell; KPI cards, charts, and summaries will be added once requirements
 * are confirmed.
 *
 * @component
 */

import React from 'react'
import { CCard, CCardBody, CCardHeader } from '@coreui/react'

const Dashboard = () => {
  return (
    <CCard className="mb-4">
      <CCardHeader>
        <strong>Dashboard</strong>
      </CCardHeader>
      <CCardBody>
        <p className="text-body-secondary mb-0">
          Dashboard widgets are pending stakeholder validation and will be added in a later phase.
        </p>
      </CCardBody>
    </CCard>
  )
}

export default Dashboard
