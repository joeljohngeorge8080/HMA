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
import { computeFlatMonthlyRate, monthsInRange } from '../../../services/monthlyApportionment'

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

const EMPTY_FORM = { month: '', pool: 'admin', amount: '', label: '' }

const ProjectExpenseRow = ({ project, canEdit, currentUser, expanded, onToggle, onChanged }) => {
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')

  const months = monthsInRange(project.start_date, project.end_date)
  const adminRate = computeFlatMonthlyRate(project, 'admin')
  const entries = localProjectExpenses.list({ projectId: project.id, pool: 'admin' })
  const totalActual = entries.reduce((s, e) => s + e.amount, 0)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleAdd = () => {
    setError('')
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
            Admin rate: {fmt(adminRate)}/mo
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

          {canEdit && (
            <CRow className="g-2 mb-3 align-items-end">
              <CCol xs={12} md={3}>
                <label className="small text-body-secondary">Month</label>
                <CFormSelect
                  size="sm"
                  value={form.month}
                  onChange={(e) => set('month', e.target.value)}
                >
                  <option value="">Select month…</option>
                  {months.map((m) => (
                    <option key={m} value={m}>
                      {monthLabel(m)}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol xs={12} md={2}>
                <label className="small text-body-secondary">Pool</label>
                <CFormSelect
                  size="sm"
                  value={form.pool}
                  onChange={(e) => set('pool', e.target.value)}
                >
                  <option value="admin">Admin</option>
                  <option value="hr" disabled>
                    HR (coming soon)
                  </option>
                  <option value="core" disabled>
                    Core (coming soon)
                  </option>
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
              No admin expenses logged yet for this project.
            </div>
          ) : (
            <CTable small align="middle" className="mb-0" style={{ fontSize: '0.8rem' }}>
              <CTableHead color="light">
                <CTableRow>
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

  const activeProjects = localProjects
    .list({ pageSize: 1000 })
    .items.filter((p) => p.is_operations_active === true)

  return (
    <>
      <div className="mb-3">
        <p className="text-body-secondary small mb-0">
          Log actual Admin-pool expenses against an activated project. Only projects that have
          completed planning and been activated appear here. HR/Core expense tracking is coming
          later — Admin is wired up first.
        </p>
      </div>

      {activeProjects.length === 0 ? (
        <div className="text-center text-body-tertiary py-5">
          No activated projects yet. A project must complete its Monthly Plan and be activated
          before its expenses can be logged here.
        </div>
      ) : (
        activeProjects.map((project) => (
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
