import React from 'react'
import { CAlert, CCard, CCardBody, CCardHeader } from '@coreui/react'

import { usePermission } from '../../../hooks/usePermission'
import { MODULE } from '../../../constants/modules'

const GstBillsPage = () => {
  const canView = usePermission(MODULE.FINANCE, 'view')

  if (!canView) {
    return <CAlert color="warning">You do not have access to the Finance section.</CAlert>
  }

  return (
    <CCard>
      <CCardHeader>
        <strong>GST Bills — Input Tax Credit</strong>
      </CCardHeader>
      <CCardBody>Upload and grid arrive in the next tasks.</CCardBody>
    </CCard>
  )
}

export default GstBillsPage
