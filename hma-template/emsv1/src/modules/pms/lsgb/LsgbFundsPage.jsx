import React, { useState, useEffect, useCallback } from 'react'
import {
  CCard,
  CCardBody,
  CRow,
  CCol,
  CButton,
  CFormInput,
  CFormSelect,
  CFormLabel,
  CInputGroup,
  CInputGroupText,
  CBadge,
  CProgress,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CAlert,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilPlus,
  cilPencil,
  cilTrash,
  cilMoney,
} from '@coreui/icons'
import { localLsgb, FUND_PURPOSES, PURPOSE_COLOR } from '../../../services/localLsgb'

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const today = () => new Date().toISOString().slice(0, 10)

const EMPTY_FORM = {
  lsgb_body_id: '',
  amount: '',
  withdrawal_date: today(),
  purpose: '',
  description: '',
}

// ── Add / Edit Modal ──────────────────────────────────────────────────────────

const WithdrawalModal = ({ visible, onClose, onSave, bodies, initial }) => {
  const [form, setForm] = useState(initial || EMPTY_FORM)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    setForm(initial || EMPTY_FORM)
    setErrors({})
  }, [initial, visible])

  const set = (f, v) => { setForm((p) => ({ ...p, [f]: v })); setErrors((p) => ({ ...p, [f]: null })) }

  const validate = () => {
    const e = {}
    if (!form.lsgb_body_id) e.lsgb_body_id = 'Select an LSGB body'
    if (!form.amount || parseFloat(form.amount) <= 0) e.amount = 'Enter a valid amount'
    if (!form.purpose) e.purpose = 'Select a purpose'
    if (!form.withdrawal_date) e.withdrawal_date = 'Date is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    const selected = bodies.find((b) => b.id === form.lsgb_body_id)
    onSave({ ...form, amount: parseFloat(form.amount), lsgb_body_name: selected?.body_name || '' })
    onClose()
  }

  const selected = bodies.find((b) => b.id === form.lsgb_body_id)

  return (
    <CModal visible={visible} onClose={onClose} alignment="center" size="md">
      <CModalHeader closeButton>
        <CModalTitle>
          <CIcon icon={cilMoney} className="me-2 text-primary" />
          {initial?.id ? 'Edit Fund Withdrawal' : 'Record Fund Withdrawal'}
        </CModalTitle>
      </CModalHeader>
      <CModalBody>
        <p className="text-body-secondary small mb-3">
          Record how much HMA has taken from the LSGB project fund for operational use.
        </p>

        <CRow className="g-3">
          <CCol xs={12}>
            <CFormLabel className="small fw-semibold">LSGB Body <span className="text-danger">*</span></CFormLabel>
            <CFormSelect value={form.lsgb_body_id} onChange={(e) => set('lsgb_body_id', e.target.value)} invalid={!!errors.lsgb_body_id}>
              <option value="">— Select LSGB body —</option>
              {bodies.map((b) => (
                <option key={b.id} value={b.id}>{b.body_name} ({b.body_type})</option>
              ))}
            </CFormSelect>
            {errors.lsgb_body_id && <div className="text-danger small mt-1">{errors.lsgb_body_id}</div>}
            {selected?.sanctioned_amount > 0 && (
              <div className="small text-body-secondary mt-1">Sanctioned: <strong>{fmt(selected.sanctioned_amount)}</strong></div>
            )}
          </CCol>

          <CCol xs={12} md={6}>
            <CFormLabel className="small fw-semibold">Amount Withdrawn (₹) <span className="text-danger">*</span></CFormLabel>
            <CInputGroup>
              <CInputGroupText>₹</CInputGroupText>
              <CFormInput type="number" min="0" placeholder="0" value={form.amount} onChange={(e) => set('amount', e.target.value)} invalid={!!errors.amount} />
            </CInputGroup>
            {errors.amount && <div className="text-danger small mt-1">{errors.amount}</div>}
          </CCol>

          <CCol xs={12} md={6}>
            <CFormLabel className="small fw-semibold">Date <span className="text-danger">*</span></CFormLabel>
            <CFormInput type="date" value={form.withdrawal_date} onChange={(e) => set('withdrawal_date', e.target.value)} invalid={!!errors.withdrawal_date} />
            {errors.withdrawal_date && <div className="text-danger small mt-1">{errors.withdrawal_date}</div>}
          </CCol>

          <CCol xs={12}>
            <CFormLabel className="small fw-semibold">Purpose / Used For <span className="text-danger">*</span></CFormLabel>
            <CFormSelect value={form.purpose} onChange={(e) => set('purpose', e.target.value)} invalid={!!errors.purpose}>
              <option value="">— Select purpose —</option>
              {FUND_PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
            </CFormSelect>
            {errors.purpose && <div className="text-danger small mt-1">{errors.purpose}</div>}
          </CCol>

          <CCol xs={12}>
            <CFormLabel className="small fw-semibold">Description <span className="text-muted fw-normal">(optional)</span></CFormLabel>
            <CFormInput
              placeholder="e.g., Q2 core expense allocation from Thrissur Municipal fund"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </CCol>
        </CRow>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="ghost" onClick={onClose}>Cancel</CButton>
        <CButton color="primary" onClick={handleSave}>
          <CIcon icon={cilPlus} className="me-1" />
          {initial?.id ? 'Save Changes' : 'Record Withdrawal'}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const LsgbFundsPage = () => {
  const [withdrawals, setWithdrawals] = useState([])
  const [bodies, setBodies] = useState([])
  const [filterBody, setFilterBody] = useState('')
  const [filterPurpose, setFilterPurpose] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)

  const reload = useCallback(() => {
    const filters = {}
    if (filterBody) filters.lsgb_body_id = filterBody
    if (filterPurpose) filters.purpose = filterPurpose
    setWithdrawals(localLsgb.listWithdrawals(filters))
    setBodies(localLsgb.listBodies())
  }, [filterBody, filterPurpose])

  useEffect(() => { reload() }, [reload])

  const handleSave = (data) => {
    if (editTarget?.id) {
      localLsgb.updateWithdrawal(editTarget.id, data)
    } else {
      localLsgb.addWithdrawal(data)
    }
    reload()
  }

  const handleRemove = (id) => { localLsgb.removeWithdrawal(id); reload() }

  const openAdd = () => { setEditTarget(null); setModalOpen(true) }
  const openEdit = (w) => { setEditTarget({ ...w, amount: String(w.amount) }); setModalOpen(true) }

  // Summary stats
  const summary = localLsgb.getSummary()
  const totalWithdrawnFiltered = withdrawals.reduce((s, w) => s + (w.amount || 0), 0)

  return (
    <>
      {/* Header */}
      <div className="d-flex align-items-start justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h4 className="fw-bold mb-1">LSGB Fund Tracking</h4>
          <p className="text-body-secondary small mb-0">
            Track how much HMA has drawn from LSGB project funds — used for core, HR, and other operational expenses.
          </p>
        </div>
        <CButton color="primary" onClick={openAdd}>
          <CIcon icon={cilPlus} className="me-1" />
          Record Withdrawal
        </CButton>
      </div>

      {/* Summary cards */}
      <CRow className="g-3 mb-4">
        {[
          { label: 'Total Sanctioned (all bodies)', value: fmt(summary.totalSanctioned), color: '#4361ee' },
          { label: 'Total Withdrawn', value: fmt(summary.totalWithdrawn), color: '#e74c3c' },
          { label: 'Remaining Fund', value: fmt(summary.remaining), color: '#06d6a0' },
          { label: 'No. of Withdrawals', value: localLsgb.listWithdrawals().length, color: '#9b5de5' },
        ].map((s) => (
          <CCol key={s.label} xs={6} md={3}>
            <CCard className="border-0 shadow-sm h-100" style={{ borderRadius: 12 }}>
              <CCardBody className="py-3 px-3">
                <div className="fw-bold fs-5 lh-1 mb-1" style={{ color: s.color }}>{s.value}</div>
                <div className="small text-body-secondary">{s.label}</div>
              </CCardBody>
            </CCard>
          </CCol>
        ))}
      </CRow>

      {/* Utilisation bar */}
      {summary.totalSanctioned > 0 && (
        <CCard className="border-0 shadow-sm mb-4" style={{ borderRadius: 12 }}>
          <CCardBody className="py-3">
            <div className="d-flex justify-content-between mb-1 small">
              <span className="fw-semibold">Fund Utilisation</span>
              <span className="text-body-secondary">
                {fmt(summary.totalWithdrawn)} of {fmt(summary.totalSanctioned)} used
                {' '}({Math.min(100, Math.round((summary.totalWithdrawn / summary.totalSanctioned) * 100))}%)
              </span>
            </div>
            <CProgress
              value={Math.min(100, (summary.totalWithdrawn / summary.totalSanctioned) * 100)}
              height={10}
              color={summary.totalWithdrawn / summary.totalSanctioned > 0.9 ? 'danger' : summary.totalWithdrawn / summary.totalSanctioned > 0.6 ? 'warning' : 'primary'}
              className="rounded-pill"
            />
          </CCardBody>
        </CCard>
      )}

      {/* No bodies warning */}
      {bodies.length === 0 && (
        <CAlert color="info" className="mb-4 small">
          No LSGB bodies found. <a href="/pms/lsgb/overview" className="alert-link">Add an LSGB body</a> first before recording withdrawals.
        </CAlert>
      )}

      {/* Filters */}
      <CRow className="g-2 mb-3">
        <CCol xs={12} md={5}>
          <CFormSelect size="sm" value={filterBody} onChange={(e) => setFilterBody(e.target.value)}>
            <option value="">All LSGB Bodies</option>
            {bodies.map((b) => <option key={b.id} value={b.id}>{b.body_name}</option>)}
          </CFormSelect>
        </CCol>
        <CCol xs={12} md={4}>
          <CFormSelect size="sm" value={filterPurpose} onChange={(e) => setFilterPurpose(e.target.value)}>
            <option value="">All Purposes</option>
            {FUND_PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
          </CFormSelect>
        </CCol>
        {(filterBody || filterPurpose) && (
          <CCol xs="auto">
            <CButton size="sm" color="secondary" variant="ghost" onClick={() => { setFilterBody(''); setFilterPurpose('') }}>Clear</CButton>
          </CCol>
        )}
      </CRow>

      {/* Withdrawals table */}
      <CCard className="border-0 shadow-sm" style={{ borderRadius: 12 }}>
        {withdrawals.length === 0 ? (
          <CCardBody className="text-center py-5 text-body-secondary">
            <CIcon icon={cilMoney} style={{ width: 48, height: 48, opacity: 0.3 }} className="mb-2 d-block mx-auto" />
            <div className="small">{filterBody || filterPurpose ? 'No withdrawals match the selected filters.' : 'No fund withdrawals recorded yet.'}</div>
          </CCardBody>
        ) : (
          <div className="table-responsive">
            <CTable hover align="middle" className="mb-0" style={{ fontSize: '0.875rem' }}>
              <CTableHead className="bg-body-tertiary">
                <CTableRow>
                  <CTableHeaderCell className="border-0 py-2 ps-3">#</CTableHeaderCell>
                  <CTableHeaderCell className="border-0 py-2">LSGB Body</CTableHeaderCell>
                  <CTableHeaderCell className="border-0 py-2">Amount</CTableHeaderCell>
                  <CTableHeaderCell className="border-0 py-2">Purpose</CTableHeaderCell>
                  <CTableHeaderCell className="border-0 py-2">Date</CTableHeaderCell>
                  <CTableHeaderCell className="border-0 py-2">Description</CTableHeaderCell>
                  <CTableHeaderCell className="border-0 py-2" />
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {withdrawals.map((w, i) => (
                  <CTableRow key={w.id}>
                    <CTableDataCell className="ps-3 text-body-secondary small">{i + 1}</CTableDataCell>
                    <CTableDataCell>
                      <div className="fw-semibold">{w.lsgb_body_name || '—'}</div>
                    </CTableDataCell>
                    <CTableDataCell className="fw-bold" style={{ color: '#e74c3c' }}>
                      {fmt(w.amount)}
                    </CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={PURPOSE_COLOR[w.purpose] || 'secondary'} shape="rounded-pill">
                        {w.purpose}
                      </CBadge>
                    </CTableDataCell>
                    <CTableDataCell className="small text-body-secondary">
                      {fmtDate(w.withdrawal_date)}
                    </CTableDataCell>
                    <CTableDataCell className="small text-body-secondary text-truncate" style={{ maxWidth: 200 }}>
                      {w.description || '—'}
                    </CTableDataCell>
                    <CTableDataCell className="text-end pe-3">
                      <CButton color="secondary" variant="ghost" size="sm" className="me-1" onClick={() => openEdit(w)}>
                        <CIcon icon={cilPencil} />
                      </CButton>
                      <CButton color="danger" variant="ghost" size="sm" onClick={() => handleRemove(w.id)}>
                        <CIcon icon={cilTrash} />
                      </CButton>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>

            {/* Totals footer */}
            {(filterBody || filterPurpose) && withdrawals.length > 0 && (
              <div className="px-3 py-2 bg-body-tertiary border-top d-flex justify-content-end small">
                <span className="text-body-secondary me-2">Filtered total:</span>
                <span className="fw-bold" style={{ color: '#e74c3c' }}>{fmt(totalWithdrawnFiltered)}</span>
              </div>
            )}
          </div>
        )}
      </CCard>

      <WithdrawalModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        bodies={bodies}
        initial={editTarget}
      />
    </>
  )
}

export default LsgbFundsPage
