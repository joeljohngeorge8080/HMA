import React from 'react'

import { usePermission } from '../../../hooks/usePermission'
import { MODULE } from '../../../constants/modules'
import GstBillsView from './components/GstBillsView'

const GstBillsPage = () => {
  const canView = usePermission(MODULE.FINANCE, 'view')
  const canEdit = usePermission(MODULE.FINANCE, 'edit')

  return (
    <GstBillsView
      title="GST Bills — Input Tax Credit"
      canView={canView}
      canEdit={canEdit}
      showFinanceFields
    />
  )
}

export default GstBillsPage
