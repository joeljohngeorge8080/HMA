/**
 * CreateMergedReportModal — Backend Team modal to bundle settled bills into
 * a single Merged Report and send it to the Project Coordinator.
 */
import React, { useState } from 'react'
import PropTypes from 'prop-types'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CFormInput,
  CFormTextarea,
  CFormLabel,
  CFormCheck,
  CSpinner,
  CBadge,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CAlert,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSend, cilWarning } from '@coreui/icons'

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)

const CreateMergedReportModal = ({ visible, onClose, settledBills, onSubmit, loading = false }) => {
  const [selectedIds, setSelectedIds] = useState([])
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
    if (error) setError('')
  }

  const toggleAll = () => {
    if (selectedIds.length === settledBills.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(settledBills.map((b) => b.id))
    }
  }

  const selectedBills = settledBills.filter((b) => selectedIds.includes(b.id))
  const totalAmount = selectedBills.reduce((sum, b) => sum + (b.amount || 0), 0)

  const handleSubmit = () => {
    if (selectedIds.length === 0) {
      setError('Please select at least one settled bill to include in the report.')
      return
    }
    setError('')
    onSubmit({ title, notes, billIds: selectedIds, bills: selectedBills })
  }

  const handleClose = () => {
    setSelectedIds([])
    setTitle('')
    setNotes('')
    setError('')
    onClose()
  }

  return (
    <CModal visible={visible} onClose={handleClose} size="lg" alignment="center" scrollable>
      <CModalHeader closeButton>
        <CModalTitle>
          <CIcon icon={cilSend} className="me-2 text-primary" />
          Create Merged Report
        </CModalTitle>
      </CModalHeader>

      <CModalBody>
        <p className="text-body-secondary small mb-3">
          Select the settled bills to include in this merged report. The report will be sent to the
          <strong> Project Coordinator</strong> for final review.
        </p>

        {error && (
          <CAlert color="danger" className="py-2 small">
            <CIcon icon={cilWarning} className="me-1" /> {error}
          </CAlert>
        )}

        {/* Report title & notes */}
        <div className="mb-3">
          <CFormLabel className="fw-medium small">Report Title</CFormLabel>
          <CFormInput
            placeholder={`Merged Settlement Report — ${new Date().toISOString().split('T')[0]}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="mb-3">
          <CFormLabel className="fw-medium small">Notes / Remarks</CFormLabel>
          <CFormTextarea
            rows={2}
            placeholder="Any remarks for the Project Coordinator..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Bills selection table */}
        <div className="d-flex justify-content-between align-items-center mb-2">
          <span className="fw-semibold small">
            Settled Bills ({settledBills.length})
          </span>
          <CButton
            color="secondary"
            variant="ghost"
            size="sm"
            onClick={toggleAll}
            disabled={settledBills.length === 0}
          >
            {selectedIds.length === settledBills.length ? 'Deselect All' : 'Select All'}
          </CButton>
        </div>

        {settledBills.length === 0 ? (
          <div className="text-center py-4 text-body-secondary bg-body-tertiary rounded">
            <div style={{ fontSize: '2rem' }}>📋</div>
            <div className="small mt-1">No settled bills available</div>
          </div>
        ) : (
          <div className="table-responsive border rounded">
            <CTable hover align="middle" className="mb-0 small">
              <CTableHead className="bg-body-tertiary">
                <CTableRow>
                  <CTableHeaderCell style={{ width: 40 }}></CTableHeaderCell>
                  <CTableHeaderCell>Personnel</CTableHeaderCell>
                  <CTableHeaderCell>Bill Topic</CTableHeaderCell>
                  <CTableHeaderCell>Date</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Amount</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {settledBills.map((bill) => (
                  <CTableRow
                    key={bill.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => toggleSelect(bill.id)}
                    className={selectedIds.includes(bill.id) ? 'table-primary' : ''}
                  >
                    <CTableDataCell>
                      <CFormCheck
                        checked={selectedIds.includes(bill.id)}
                        onChange={() => toggleSelect(bill.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </CTableDataCell>
                    <CTableDataCell className="fw-medium">{bill.submitted_by_name}</CTableDataCell>
                    <CTableDataCell>
                      <div className="text-truncate" style={{ maxWidth: 200 }}>
                        {bill.bill_topic}
                      </div>
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
        )}

        {/* Selected summary */}
        {selectedIds.length > 0 && (
          <div className="d-flex justify-content-between align-items-center mt-3 p-3 bg-success-subtle rounded border border-success-subtle">
            <div className="small">
              <CBadge color="success" className="me-2">{selectedIds.length}</CBadge>
              bill{selectedIds.length !== 1 ? 's' : ''} selected
            </div>
            <div className="fw-bold text-success">{formatCurrency(totalAmount)}</div>
          </div>
        )}
      </CModalBody>

      <CModalFooter>
        <CButton color="secondary" variant="ghost" onClick={handleClose} disabled={loading}>
          Cancel
        </CButton>
        <CButton
          color="primary"
          onClick={handleSubmit}
          disabled={loading || selectedIds.length === 0}
        >
          {loading ? (
            <>
              <CSpinner size="sm" className="me-1" />
              Submitting...
            </>
          ) : (
            <>
              <CIcon icon={cilSend} className="me-1" />
              Send to Project Coordinator
            </>
          )}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

CreateMergedReportModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  settledBills: PropTypes.array.isRequired,
  onSubmit: PropTypes.func.isRequired,
  loading: PropTypes.bool,
}

export default CreateMergedReportModal
