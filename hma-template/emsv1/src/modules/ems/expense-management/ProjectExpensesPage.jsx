// src/modules/ems/expense-management/ProjectExpensesPage.jsx
import React, { useState } from 'react'
import PropTypes from 'prop-types'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CRow,
  CCol,
  CFormSelect,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CButton,
  CAlert,
  CBadge,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilTrash } from '@coreui/icons'
import { usePermission } from '../../../hooks/usePermission'
import { MODULE } from '../../../constants/modules'
import useAuth from '../../../hooks/useAuth'
import { localProjects } from '../../../services/localProjects'
import { localProjectExpenses } from '../../../services/localProjectExpenses'

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n || 0)

const monthLabel = (ym) => {
  if (!ym) return '—'
  const [y, m] = ym.split('-')
  return new Date(y, m - 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}

const POOL_LABELS = { admin: 'Admin', hr: 'HR', core: 'Core' }

const EMPTY_FORM = { month: '', pool: '', amount: '', label: '' }

const ProjectExpenseRow = ({ project, canEdit, currentUser, expanded, onToggle, onChanged }) => {
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')

  const sentAllocations = project.sent_allocations || []
  const entries = localProjectExpenses.list({ projectId: project.id })
  const totalActual = entries.reduce((s, e) => s + e.amount, 0)
  const totalSent = sentAllocations.reduce((s, a) => s + a.amount, 0)

  const sentPools = [...new Set(sentAllocations.map((a) => a.pool))]
  const monthsForPool = (pool) => sentAllocations.filter((a) => a.pool === pool).map((a) => a.month)
  const sentAmountFor = (pool, month) =>
    sentAllocations.find((a) => a.pool === pool && a.month === month)?.amount || 0

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleAdd = () => {
    setError('')
    if (!form.pool || !form.month) {
      setError('Select a pool and month that the PO has sent.')
      return
    }
    const cap = sentAmountFor(form.pool, form.month)
    if (cap <= 0) {
      setError('This project has not sent that pool+month yet — nothing to log against.')
      return
    }
    try {
      localProjectExpenses.create({
        project_id: project.id,
        pool: form.pool,
        month: form.month,
        amount: parseFloat(form.amount),
        label: form.label,
        createdBy: currentUser,
      })
      setForm(EMPTY_FORM)
      onChanged()
    } catch (e) {
      setError(e.message)
    }
  }

  const handleRemove = (id) => {
    localProjectExpenses.remove(id)
    onChanged()
  }

  return (
    <CCard className="shadow-sm mb-2">
      <CCardHeader
        className="bg-transparent fw-semibold d-flex justify-content-between align-items-center"
        role="button"
        onClick={onToggle}
      >
        <span>{project.name || project.title}</span>
        <div className="d-flex align-items-center gap-2">
          <CBadge color="warning" textColor="dark">
            Sent: {fmt(totalSent)}
          </CBadge>
          <CBadge color="info">Actual logged: {fmt(totalActual)}</CBadge>
          <span>{expanded ? '▲' : '▼'}</span>
        </div>
      </CCardHeader>
      {expanded && (
        <CCardBody>
          {error && (
            <CAlert color="danger" className="py-2 small">
              {error}
            </CAlert>
          )}

          <div style={{ overflowX: 'auto' }} className="mb-3">
            <CTable bordered small align="middle" className="mb-0" style={{ fontSize: '0.75rem' }}>
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell>Month</CTableHeaderCell>
                  {['admin', 'hr', 'core'].map((pool) => (
                    <CTableHeaderCell key={pool} className="text-center">
                      {POOL_LABELS[pool]}
                    </CTableHeaderCell>
                  ))}
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {(project.monthly_plan || []).map((m) => (
                  <CTableRow key={m.month}>
                    <CTableDataCell className="fw-semibold">{monthLabel(m.month)}</CTableDataCell>
                    {['admin', 'hr', 'core'].map((pool) => {
                      const sent = sentAllocations.find(
                        (a) => a.pool === pool && a.month === m.month,
                      )
                      return (
                        <CTableDataCell
                          key={pool}
                          className="text-center"
                          style={
                            sent
                              ? undefined
                              : {
                                  background: 'var(--cui-tertiary-bg)',
                                  color: 'var(--cui-secondary-color)',
                                }
                          }
                        >
                          {sent ? (
                            <CBadge
                              color="success"
                              shape="rounded-pill"
                              style={{ fontSize: '0.6rem' }}
                            >
                              {fmt(sent.amount)}
                            </CBadge>
                          ) : (
                            <span className="text-body-tertiary" style={{ fontSize: '0.68rem' }}>
                              🔒 Not allowed
                            </span>
                          )}
                        </CTableDataCell>
                      )
                    })}
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </div>

          {canEdit && (
            <CRow className="g-2 mb-3 align-items-end">
              <CCol xs={12} md={2}>
                <label className="small text-body-secondary">Pool</label>
                <CFormSelect
                  size="sm"
                  value={form.pool}
                  onChange={(e) => set('pool', e.target.value)}
                >
                  <option value="">Select pool…</option>
                  {['admin', 'hr', 'core'].map((pool) => (
                    <option key={pool} value={pool} disabled={!sentPools.includes(pool)}>
                      {POOL_LABELS[pool]}
                      {!sentPools.includes(pool) ? ' (nothing sent)' : ''}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol xs={12} md={3}>
                <label className="small text-body-secondary">Month</label>
                <CFormSelect
                  size="sm"
                  value={form.month}
                  disabled={!form.pool}
                  onChange={(e) => set('month', e.target.value)}
                >
                  <option value="">Select month…</option>
                  {monthsForPool(form.pool).map((m) => (
                    <option key={m} value={m}>
                      {monthLabel(m)} — sent {fmt(sentAmountFor(form.pool, m))}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol xs={12} md={3}>
                <label className="small text-body-secondary">Amount</label>
                <CInputGroup size="sm">
                  <CInputGroupText>₹</CInputGroupText>
                  <CFormInput
                    type="number"
                    value={form.amount}
                    onChange={(e) => set('amount', e.target.value)}
                  />
                </CInputGroup>
              </CCol>
              <CCol xs={12} md={3}>
                <label className="small text-body-secondary">Label</label>
                <CFormInput
                  size="sm"
                  placeholder="What was this for?"
                  value={form.label}
                  onChange={(e) => set('label', e.target.value)}
                />
              </CCol>
              <CCol xs={12} md={1}>
                <CButton size="sm" color="primary" onClick={handleAdd}>
                  Add
                </CButton>
              </CCol>
            </CRow>
          )}

          {entries.length === 0 ? (
            <div className="text-center text-body-tertiary small py-3">
              No expenses logged yet for this project.
            </div>
          ) : (
            <CTable small align="middle" className="mb-0" style={{ fontSize: '0.8rem' }}>
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell>Pool</CTableHeaderCell>
                  <CTableHeaderCell>Month</CTableHeaderCell>
                  <CTableHeaderCell>Label</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Amount</CTableHeaderCell>
                  <CTableHeaderCell>Logged by</CTableHeaderCell>
                  {canEdit && <CTableHeaderCell />}
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {entries.map((e) => (
                  <CTableRow key={e.id}>
                    <CTableDataCell>{POOL_LABELS[e.pool] || e.pool}</CTableDataCell>
                    <CTableDataCell>{monthLabel(e.month)}</CTableDataCell>
                    <CTableDataCell>{e.label}</CTableDataCell>
                    <CTableDataCell className="text-end">{fmt(e.amount)}</CTableDataCell>
                    <CTableDataCell>{e.createdBy}</CTableDataCell>
                    {canEdit && (
                      <CTableDataCell>
                        <CButton
                          color="danger"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemove(e.id)}
                        >
                          <CIcon icon={cilTrash} size="sm" />
                        </CButton>
                      </CTableDataCell>
                    )}
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          )}
        </CCardBody>
      )}
    </CCard>
  )
}

ProjectExpenseRow.propTypes = {
  project: PropTypes.object.isRequired,
  canEdit: PropTypes.bool.isRequired,
  currentUser: PropTypes.string.isRequired,
  expanded: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  onChanged: PropTypes.func.isRequired,
}

const ProjectExpensesPage = () => {
  const canEdit = usePermission(MODULE.EXPENSE_MANAGEMENT, 'edit')
  const { user } = useAuth()
  const currentUser = user?.full_name || user?.employee_id || 'Unknown'
  const [expandedId, setExpandedId] = useState(null)
  const [, forceRefresh] = useState(0)

  const plannedProjects = localProjects
    .list({ pageSize: 1000 })
    .items.filter((p) => p.monthly_plan?.length > 0)

  return (
    <>
      <div className="mb-3">
        <p className="text-body-secondary small mb-0">
          Every project with a saved Monthly Plan appears here, month by month, as soon as the
          Project Officer plans it. A pool+month shows greyed out and "Not allowed" until the
          Project Officer sends it from the project's PMS Expense tab — only sent pool+months can be
          logged against.
        </p>
      </div>

      {plannedProjects.length === 0 ? (
        <div className="text-center text-body-tertiary py-5">
          No projects have a saved Monthly Plan yet. A Project Officer must plan and save a
          project's Monthly Plan before it appears here.
        </div>
      ) : (
        plannedProjects.map((project) => (
          <ProjectExpenseRow
            key={project.id}
            project={project}
            canEdit={canEdit}
            currentUser={currentUser}
            expanded={expandedId === project.id}
            onToggle={() => setExpandedId((id) => (id === project.id ? null : project.id))}
            onChanged={() => forceRefresh((k) => k + 1)}
          />
        ))
      )}
    </>
  )
}

export default ProjectExpensesPage
