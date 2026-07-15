import React from 'react'
import PropTypes from 'prop-types'

import { usePermission } from '../../../hooks/usePermission'
import { MODULE } from '../../../constants/modules'
import GstBillsView from './components/GstBillsView'

const GstBillsPage = ({ projectId = null, isProjectView = false }) => {
  const canView = usePermission(MODULE.FINANCE, 'view')
  const canEdit = usePermission(MODULE.FINANCE, 'edit')

  return (
    <GstBillsView
      title="GST Bills — Input Tax Credit"
      canView={canView}
      canEdit={canEdit}
      showFinanceFields
      projectId={projectId}
      isProjectView={isProjectView}
    />
  )
}

GstBillsPage.propTypes = {
  projectId: PropTypes.string,
  isProjectView: PropTypes.bool,
}

export default GstBillsPage
