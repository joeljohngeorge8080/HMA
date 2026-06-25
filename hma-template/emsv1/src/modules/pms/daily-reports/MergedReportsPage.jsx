/**
 * MergedReportsPage — Project Coordinator view for finalising merged reports
 * received from the Backend Team.
 *
 * Route: /pms/merged-reports
 *
 * Features:
 *  • List of all merged reports (Pending / Finalised tabs)
 *  • Expandable detail panel showing constituent bills
 *  • "Finalise Report" action
 */
import React, { useState, useEffect, useCallback } from 'react'
import {
  CContainer,
  CCard,
  CCardBody,
  CCardHeader,
  CRow,
  CCol,
  CButton,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CBadge,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
  CToaster,
  CToast,
  CToastBody,
  CToastClose,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CSpinner,
  CAccordion,
  CAccordionItem,
  CAccordionHeader,
  CAccordionBody,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilSearch,
  cilCheckCircle,
  cilFile,
  cilClock,
  cilMoney,
} from '@coreui/icons'

import {
  localMergedReports,
  MERGED_REPORT_STATUS,
} from '../../../services/localReports'

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)

const formatDateTime = (isoStr) => {
  if (!isoStr) return '—'
  try {
    return new Date(isoStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return isoStr
  }
}

const MergedReportCard = ({ report, onFinalise }) => {
  const isPending = report.status === MERGED_REPORT_STATUS.PENDING

  return (
    <CCard className={`shadow-sm mb-3 border-start border-4 ${isPending ? 'border-start-warning' : 'border-start-success'}`}>
      <CCardHeader className="bg-white">
        <div className="d-flex justify-content-between align-items-start">
          <div className="flex-grow-1">
            <h6 className="fw-semibold mb-1">{report.title}</h6>
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <CBadge
                color={isPending ? 'warning' : 'success'}
                shape="rounded-pill"
                className="px-3"
              >
                {isPending ? '⏳ Pending Finalisation' : '✅ Finalised'}
              </CBadge>
              <span className="small text-body-secondary">
                Submitted by <strong>{report.created_by_name}</strong>
              </span>
              <span className="small text-body-tertiary">{formatDateTime(report.created_at)}</span>
            </div>
          </div>
          <div className="text-end ms-3 flex-shrink-0">
            <div className="fs-5 fw-bold text-success">{formatCurrency(report.total_amount)}</div>
            <div className="small text-body-secondary">{report.bill_count} bill{report.bill_count !== 1 ? 's' : ''}</div>
            {isPending && (
              <CButton
                color="success"
                size="sm"
                className="mt-2"
                onClick={() => onFinalise(report.id)}
              >
                <CIcon icon={cilCheckCircle} className="me-1" size="sm" />
                Finalise
              </CButton>
            )}
            {!isPending && (
              <div className="small text-body-secondary mt-1">
                Finalised: {formatDateTime(report.finalised_at)}
              </div>
            )}
          </div>
        </div>
        {report.notes && (
          <div className="small text-body-secondary mt-2 fst-italic">
            📝 {report.notes}
          </div>
        )}
      </CCardHeader>

      {/* Bills breakdown */}
      <CAccordion flush>
        <CAccordionItem itemKey={report.id}>
          <CAccordionHeader className="small">
            View {report.bill_count} Constituent Bill{report.bill_count !== 1 ? 's' : ''}
          </CAccordionHeader>
          <CAccordionBody className="p-0">
            <div className="table-responsive">
              <CTable hover align="middle" className="mb-0 small">
                <CTableHead className="bg-body-tertiary">
                  <CTableRow>
                    <CTableHeaderCell>#</CTableHeaderCell>
                    <CTableHeaderCell>Personnel</CTableHeaderCell>
                    <CTableHeaderCell>Bill Topic</CTableHeaderCell>
                    <CTableHeaderCell>Date</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Amount</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {(report.bills_snapshot || []).map((bill, idx) => (
                    <CTableRow key={bill.id || idx}>
                      <CTableDataCell className="text-body-secondary">{idx + 1}</CTableDataCell>
                      <CTableDataCell className="fw-medium">{bill.submitted_by_name}</CTableDataCell>
                      <CTableDataCell>
                        <div className="text-truncate" style={{ maxWidth: 240 }}>
                          {bill.bill_topic}
                        </div>
                        {bill.task_title && (
                          <div className="text-info small">📋 {bill.task_title}</div>
                        )}
                      </CTableDataCell>
                      <CTableDataCell>{bill.report_date}</CTableDataCell>
                      <CTableDataCell className="text-end fw-semibold">
                        {formatCurrency(bill.amount)}
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </div>
            <div className="d-flex justify-content-end align-items-center gap-2 px-4 py-3 bg-success-subtle border-top">
              <span className="small text-body-secondary fw-medium">Total:</span>
              <span className="fw-bold text-success fs-6">{formatCurrency(report.total_amount)}</span>
            </div>
          </CAccordionBody>
        </CAccordionItem>
      </CAccordion>
    </CCard>
  )
}

const MergedReportsPage = () => {
  const [activeTab, setActiveTab] = useState('pending')
  const [search, setSearch] = useState('')
  const [pendingReports, setPendingReports] = useState([])
  const [finalisedReports, setFinalisedReports] = useState([])

  // Finalise modal
  const [finaliseModalVisible, setFinaliseModalVisible] = useState(false)
  const [finaliseTargetId, setFinaliseTargetId] = useState(null)
  const [finaliseLoading, setFinaliseLoading] = useState(false)

  const [toast, setToast] = useState(null)

  const loadData = useCallback(() => {
    const all = localMergedReports.list({ search })
    setPendingReports(all.filter((r) => r.status === MERGED_REPORT_STATUS.PENDING))
    setFinalisedReports(all.filter((r) => r.status === MERGED_REPORT_STATUS.FINALISED))
  }, [search])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleFinaliseClick = (id) => {
    setFinaliseTargetId(id)
    setFinaliseModalVisible(true)
  }

  const confirmFinalise = () => {
    setFinaliseLoading(true)
    try {
      localMergedReports.finalise(finaliseTargetId)
      setToast({ color: 'success', message: '✅ Report finalised successfully!' })
      setFinaliseModalVisible(false)
      setFinaliseTargetId(null)
      loadData()
    } catch (err) {
      setToast({ color: 'danger', message: err.message })
    }
    setFinaliseLoading(false)
  }

  const totalPending = pendingReports.reduce((s, r) => s + (r.total_amount || 0), 0)
  const totalFinalised = finalisedReports.reduce((s, r) => s + (r.total_amount || 0), 0)

  return (
    <CContainer lg className="py-3">
      {/* Header */}
      <div className="mb-4">
        <h4 className="fw-semibold mb-1">Merged Reports</h4>
        <p className="text-body-secondary mb-0 small">
          Review and finalise settlement reports submitted by the Backend Team
        </p>
      </div>

      {/* Summary cards */}
      <CRow className="g-3 mb-4">
        <CCol xs={12} md={4}>
          <CCard className="shadow-sm border-top border-3 border-top-warning h-100">
            <CCardBody className="d-flex align-items-center gap-3">
              <div
                className="rounded-circle bg-warning-subtle d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: 48, height: 48 }}
              >
                <CIcon icon={cilClock} className="text-warning" />
              </div>
              <div>
                <div className="fs-4 fw-bold">{pendingReports.length}</div>
                <div className="small text-body-secondary">Pending Finalisation</div>
                <div className="small fw-semibold text-warning">{formatCurrency(totalPending)}</div>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol xs={12} md={4}>
          <CCard className="shadow-sm border-top border-3 border-top-success h-100">
            <CCardBody className="d-flex align-items-center gap-3">
              <div
                className="rounded-circle bg-success-subtle d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: 48, height: 48 }}
              >
                <CIcon icon={cilCheckCircle} className="text-success" />
              </div>
              <div>
                <div className="fs-4 fw-bold">{finalisedReports.length}</div>
                <div className="small text-body-secondary">Finalised</div>
                <div className="small fw-semibold text-success">{formatCurrency(totalFinalised)}</div>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol xs={12} md={4}>
          <CCard className="shadow-sm border-top border-3 border-top-primary h-100">
            <CCardBody className="d-flex align-items-center gap-3">
              <div
                className="rounded-circle bg-primary-subtle d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: 48, height: 48 }}
              >
                <CIcon icon={cilMoney} className="text-primary" />
              </div>
              <div>
                <div className="fs-4 fw-bold">{formatCurrency(totalPending + totalFinalised)}</div>
                <div className="small text-body-secondary">Total Processed</div>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Search */}
      <CCard className="shadow-sm mb-3">
        <CCardBody className="py-3">
          <CInputGroup size="sm">
            <CInputGroupText>
              <CIcon icon={cilSearch} size="sm" />
            </CInputGroupText>
            <CFormInput
              placeholder="Search by report title or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </CInputGroup>
        </CCardBody>
      </CCard>

      {/* Tabs */}
      <CCard className="shadow-sm">
        <CCardHeader className="bg-white pb-0">
          <CNav variant="underline">
            <CNavItem>
              <CNavLink
                active={activeTab === 'pending'}
                onClick={() => setActiveTab('pending')}
                style={{ cursor: 'pointer' }}
              >
                Pending Finalisation
                {pendingReports.length > 0 && (
                  <CBadge color="warning" className="ms-2">{pendingReports.length}</CBadge>
                )}
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink
                active={activeTab === 'finalised'}
                onClick={() => setActiveTab('finalised')}
                style={{ cursor: 'pointer' }}
              >
                Finalised
                {finalisedReports.length > 0 && (
                  <CBadge color="success" className="ms-2">{finalisedReports.length}</CBadge>
                )}
              </CNavLink>
            </CNavItem>
          </CNav>
        </CCardHeader>
        <CCardBody>
          <CTabContent>
            <CTabPane visible={activeTab === 'pending'}>
              {pendingReports.length === 0 ? (
                <div className="text-center py-5 text-body-secondary">
                  <div style={{ fontSize: '3rem' }} className="mb-2">📋</div>
                  <h6 className="text-body-secondary">No pending reports</h6>
                  <p className="small text-body-tertiary mb-0">
                    Merged reports from the Backend Team will appear here
                  </p>
                </div>
              ) : (
                pendingReports.map((report) => (
                  <MergedReportCard
                    key={report.id}
                    report={report}
                    onFinalise={handleFinaliseClick}
                  />
                ))
              )}
            </CTabPane>
            <CTabPane visible={activeTab === 'finalised'}>
              {finalisedReports.length === 0 ? (
                <div className="text-center py-5 text-body-secondary">
                  <div style={{ fontSize: '3rem' }} className="mb-2">✅</div>
                  <h6 className="text-body-secondary">No finalised reports</h6>
                  <p className="small text-body-tertiary mb-0">
                    Finalised reports will appear here
                  </p>
                </div>
              ) : (
                finalisedReports.map((report) => (
                  <MergedReportCard
                    key={report.id}
                    report={report}
                    onFinalise={handleFinaliseClick}
                  />
                ))
              )}
            </CTabPane>
          </CTabContent>
        </CCardBody>
      </CCard>

      {/* Finalise confirmation modal */}
      <CModal
        visible={finaliseModalVisible}
        onClose={() => setFinaliseModalVisible(false)}
        alignment="center"
      >
        <CModalHeader closeButton>
          <CModalTitle>Finalise Report</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p>
            Are you sure you want to <strong>finalise</strong> this merged report? This action
            confirms that all settlements have been reviewed and accepted.
          </p>
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            variant="ghost"
            onClick={() => setFinaliseModalVisible(false)}
            disabled={finaliseLoading}
          >
            Cancel
          </CButton>
          <CButton color="success" onClick={confirmFinalise} disabled={finaliseLoading}>
            {finaliseLoading ? (
              <>
                <CSpinner size="sm" className="me-1" /> Finalising...
              </>
            ) : (
              <>
                <CIcon icon={cilCheckCircle} className="me-1" />
                Confirm Finalise
              </>
            )}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Toast */}
      <CToaster placement="top-end">
        {toast && (
          <CToast
            autohide
            delay={3500}
            visible
            color={toast.color}
            className="text-white"
            onClose={() => setToast(null)}
          >
            <div className="d-flex">
              <CToastBody>{toast.message}</CToastBody>
              <CToastClose className="me-2 m-auto" white />
            </div>
          </CToast>
        )}
      </CToaster>
    </CContainer>
  )
}

export default MergedReportsPage
