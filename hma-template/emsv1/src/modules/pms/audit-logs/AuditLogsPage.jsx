import React, { useState, useEffect } from 'react'
import {
  CContainer,
  CCard,
  CCardBody,
  CCardHeader,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CBadge
} from '@coreui/react'
import { localAudit } from '../../../services/localAudit'

const AuditLogsPage = () => {
  const [logs, setLogs] = useState([])

  useEffect(() => {
    const data = localAudit.list()
    setLogs(data.items)
  }, [])

  const getActionBadge = (action) => {
    if (action.includes('Created') || action.includes('Submitted') || action.includes('Uploaded')) return 'success'
    if (action.includes('Approved')) return 'info'
    if (action.includes('Assigned') || action.includes('Updated')) return 'warning'
    if (action.includes('Deleted') || action.includes('Rejected')) return 'danger'
    return 'secondary'
  }

  return (
    <CContainer lg className="py-3">
      <h4 className="fw-semibold mb-4">System Audit Logs</h4>
      <CCard className="shadow-sm">
        <CCardHeader className="bg-white pb-0 border-bottom">
          <p className="text-body-secondary small mb-3">Track all user activities and system changes.</p>
        </CCardHeader>
        <CCardBody>
          <CTable responsive hover align="middle" className="mb-0 border">
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
              {logs.map(log => (
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
                  <CTableDataCell className="small">
                    {log.details}
                  </CTableDataCell>
                </CTableRow>
              ))}
            </CTableBody>
          </CTable>
        </CCardBody>
      </CCard>
    </CContainer>
  )
}

export default AuditLogsPage
