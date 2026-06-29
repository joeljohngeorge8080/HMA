import React, { useState } from 'react'
import {
  CCard,
  CCardBody,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CBadge,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilListRich } from '@coreui/icons'
import { localAudit } from '../../../services/localAudit'

const getActionBadge = (action) => {
  if (action.includes('Created') || action.includes('Submitted') || action.includes('Uploaded'))
    return 'success'
  if (action.includes('Approved')) return 'info'
  if (action.includes('Assigned') || action.includes('Updated')) return 'warning'
  if (action.includes('Deleted') || action.includes('Rejected')) return 'danger'
  return 'secondary'
}

const AuditLogsPage = () => {
  const [logs] = useState(() => localAudit.list().items)

  return (
    <>
      {/* Page header */}
      <div className="mb-4">
        <h4 className="fw-semibold mb-1">Audit Logs</h4>
        <p className="text-body-secondary small mb-0">
          Track all user activities and system changes.
        </p>
      </div>

      <CCard>
        <CCardBody className="p-0">
          <CTable hover responsive align="middle" className="mb-0">
            <CTableHead color="light">
              <CTableRow>
                <CTableHeaderCell>Timestamp</CTableHeaderCell>
                <CTableHeaderCell>User</CTableHeaderCell>
                <CTableHeaderCell>Action</CTableHeaderCell>
                <CTableHeaderCell>Module</CTableHeaderCell>
                <CTableHeaderCell>Details</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {logs.length === 0 ? (
                <CTableRow>
                  <CTableDataCell colSpan={5}>
                    <div className="hma-empty-state">
                      <CIcon icon={cilListRich} className="hma-empty-state__icon" />
                      <p className="hma-empty-state__title">No audit logs yet</p>
                      <p className="hma-empty-state__desc">
                        User actions will appear here as the system is used.
                      </p>
                    </div>
                  </CTableDataCell>
                </CTableRow>
              ) : (
                logs.map((log) => (
                  <CTableRow key={log.id}>
                    <CTableDataCell className="text-nowrap small text-body-secondary">
                      {log.timestamp}
                    </CTableDataCell>
                    <CTableDataCell>
                      <div className="fw-medium">{log.user}</div>
                      <div className="small text-body-secondary">{log.role}</div>
                    </CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={getActionBadge(log.action)} shape="rounded-pill">
                        {log.action}
                      </CBadge>
                    </CTableDataCell>
                    <CTableDataCell>
                      <span className="fw-medium small">{log.module}</span>
                    </CTableDataCell>
                    <CTableDataCell className="small">{log.details}</CTableDataCell>
                  </CTableRow>
                ))
              )}
            </CTableBody>
          </CTable>
        </CCardBody>
      </CCard>
    </>
  )
}

export default AuditLogsPage
