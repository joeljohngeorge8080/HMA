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
import { cilPlus, cilTrash, cilArrowThickTop, cilArrowThickBottom } from '@coreui/icons'
import { localProjects } from '../../../services/localProjects'
import {
  computeWorkingPool,
  monthsInRange,
  computeMonthSplit,
  validatePlanTotal,
} from '../../../services/monthlyApportionment'

const PHASE_OPTIONS = [
  { value: 'design', label: 'Design' },
  { value: 'implementation', label: 'Implementation' },
  { value: 'monitoring', label: 'Monitoring' },
]

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n || 0)

const emptyLine = () => ({ phase: 'design', label: '', amount: '' })

const monthLabelShort = (ym) => {
  if (!ym) return '—'
  const [y, m] = ym.split('-')
  return new Date(y, m - 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}

const BaselineTable = ({ months, baselinePerMonth }) => (
  <div className="mb-3">
    <div style={{ overflowX: 'auto' }}>
      <CTable bordered small align="middle" className="mb-0" style={{ fontSize: '0.8rem' }}>
        <CTableHead color="light">
          <CTableRow>
            {months.map((m) => (
              <CTableHeaderCell key={m} className="text-center text-nowrap">
                {monthLabelShort(m)}
              </CTableHeaderCell>
            ))}
          </CTableRow>
        </CTableHead>
        <CTableBody>
          <CTableRow>
            {months.map((m) => (
              <CTableDataCell key={m} className="text-center text-nowrap">
                {fmt(baselinePerMonth)}
              </CTableDataCell>
            ))}
          </CTableRow>
        </CTableBody>
      </CTable>
    </div>
  </div>
)

BaselineTable.propTypes = {
  months: PropTypes.arrayOf(PropTypes.string).isRequired,
  baselinePerMonth: PropTypes.number.isRequired,
}

const TemplateEditor = ({ project, onProjectChange, canEdit = false }) => {
  const [lines, setLines] = useState([emptyLine()])
  const [error, setError] = useState('')

  const workingPool = computeWorkingPool(project)
  const months = monthsInRange(project.start_date, project.end_date)
  const monthCount = months.length
  const baselinePerMonth = monthCount > 0 ? Math.round((workingPool / monthCount) * 100) / 100 : 0
  const templateTotal = lines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0)

  const updateLine = (i, patch) => {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }

  const addLine = () => setLines((prev) => [...prev, emptyLine()])
  const removeLine = (i) => setLines((prev) => prev.filter((_, idx) => idx !== i))

  const handleGenerate = () => {
    setError('')
    try {
      const templatePhases = lines
        .filter((l) => l.label.trim() && parseFloat(l.amount) > 0)
        .map((l) => ({ phase: l.phase, label: l.label.trim(), amount: parseFloat(l.amount) }))
      if (templatePhases.length === 0) {
        setError('Add at least one phase line item with a label and amount.')
        return
      }
      const updated = localProjects.generateMonthlyPlan(project.id, templatePhases)
      onProjectChange(updated)
    } catch (e) {
      setError(e.message)
    }
  }

  if (!canEdit) {
    return (
      <CCard className="shadow-sm mb-4">
        <CCardHeader className="bg-transparent fw-semibold pt-3">
          📅 Plan One Month — Generate Across the Full Duration
        </CCardHeader>
        <CCardBody>
          <CAlert color="info" className="mb-0 small">
            You don&apos;t have permission to plan this project&apos;s budget.
          </CAlert>
        </CCardBody>
      </CCard>
    )
  }

  return (
    <CCard className="shadow-sm mb-4">
      <CCardHeader className="bg-transparent fw-semibold pt-3">
        📅 Plan One Month — Generate Across the Full Duration
      </CCardHeader>
      <CCardBody>
        <div className="text-body-secondary small mb-3">
          Working pool: <strong>{fmt(workingPool)}</strong> (project value minus the locked admin
          share) across <strong>{monthCount}</strong> month{monthCount !== 1 ? 's' : ''} — baseline
          suggestion: <strong>{fmt(baselinePerMonth)}</strong>/month if split evenly. Build one
          month&apos;s phase breakdown below, then Generate keeps month 1 as entered and spreads the
          rest of the pool across the remaining months.
        </div>

        {monthCount > 0 && <BaselineTable months={months} baselinePerMonth={baselinePerMonth} />}

        {lines.map((line, i) => (
          <CRow key={i} className="g-2 mb-2 align-items-center">
            <CCol xs={12} md={3}>
              <CFormSelect
                size="sm"
                value={line.phase}
                onChange={(e) => updateLine(i, { phase: e.target.value })}
              >
                {PHASE_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol xs={12} md={5}>
              <CFormInput
                size="sm"
                placeholder="Task / activity"
                value={line.label}
                onChange={(e) => updateLine(i, { label: e.target.value })}
              />
            </CCol>
            <CCol xs={8} md={3}>
              <CInputGroup size="sm">
                <CInputGroupText>₹</CInputGroupText>
                <CFormInput
                  type="number"
                  min="0"
                  value={line.amount}
                  onChange={(e) => updateLine(i, { amount: e.target.value })}
                />
              </CInputGroup>
            </CCol>
            <CCol xs={4} md={1}>
              <CButton
                size="sm"
                color="danger"
                variant="ghost"
                disabled={lines.length === 1}
                onClick={() => removeLine(i)}
              >
                <CIcon icon={cilTrash} />
              </CButton>
            </CCol>
          </CRow>
        ))}

        <CButton size="sm" color="secondary" variant="outline" className="mb-3" onClick={addLine}>
          <CIcon icon={cilPlus} className="me-1" />
          Add Line
        </CButton>

        <div className="d-flex align-items-center gap-2 mb-3">
          <span className="small text-body-secondary">Month total:</span>
          <CBadge color={templateTotal > 0 ? 'primary' : 'secondary'}>{fmt(templateTotal)}</CBadge>
        </div>

        {error && (
          <CAlert color="danger" className="py-2 small">
            {error}
          </CAlert>
        )}

        <CButton color="success" onClick={handleGenerate}>
          Generate {project.start_date && project.end_date ? 'Full' : ''} Plan
        </CButton>
      </CCardBody>
    </CCard>
  )
}

TemplateEditor.propTypes = {
  project: PropTypes.object.isRequired,
  onProjectChange: PropTypes.func.isRequired,
  canEdit: PropTypes.bool,
}

const monthLabel = (ym) => {
  if (!ym) return '—'
  const [y, m] = ym.split('-')
  return new Date(y, m - 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}

const PctStepper = ({ value, onChange, disabled = false }) => (
  <div className="d-flex align-items-center gap-1">
    <CButton
      size="sm"
      color="secondary"
      variant="ghost"
      style={{ padding: '2px 6px' }}
      disabled={disabled}
      onClick={() => onChange(Math.max(0, Math.round((value - 0.5) * 10) / 10))}
    >
      <CIcon icon={cilArrowThickBottom} size="sm" />
    </CButton>
    <span className="fw-semibold" style={{ minWidth: 40, textAlign: 'center' }}>
      {value}%
    </span>
    <CButton
      size="sm"
      color="secondary"
      variant="ghost"
      style={{ padding: '2px 6px' }}
      disabled={disabled}
      onClick={() => onChange(Math.round((value + 0.5) * 10) / 10)}
    >
      <CIcon icon={cilArrowThickTop} size="sm" />
    </CButton>
  </div>
)

PctStepper.propTypes = {
  value: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
}

const PlanTable = ({ project, onProjectChange, canEdit = false }) => {
  const workingPool = computeWorkingPool(project)
  const validation = validatePlanTotal(project.monthly_plan, workingPool)

  const handlePctChange = (month, patch) => {
    const updated = localProjects.updateMonthPct(project.id, month, patch)
    onProjectChange(updated)
  }

  const handleAmountChange = (month, phaseIdx, amount) => {
    const monthEntry = project.monthly_plan.find((m) => m.month === month)
    const phases = monthEntry.phases.map((ph, i) =>
      i === phaseIdx ? { ...ph, amount: parseFloat(amount) || 0 } : ph,
    )
    const { project: updated } = localProjects.updateMonthPlan(project.id, month, phases)
    onProjectChange(updated)
  }

  return (
    <CCard className="shadow-sm mb-4">
      <CCardHeader className="bg-transparent fw-semibold pt-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <span>📊 Monthly Plan</span>
        <CBadge color={validation.valid ? 'success' : 'danger'}>
          {validation.valid
            ? `Balanced — ${fmt(validation.planTotal)}`
            : `Off by ${fmt(Math.abs(validation.diff))} (plan ${fmt(validation.planTotal)} vs pool ${fmt(validation.workingPool)})`}
        </CBadge>
      </CCardHeader>
      <CCardBody className="p-0">
        <div style={{ overflowX: 'auto' }}>
          <CTable hover align="middle" className="mb-0" style={{ fontSize: '0.82rem' }}>
            <CTableHead color="light">
              <CTableRow>
                <CTableHeaderCell>Month</CTableHeaderCell>
                <CTableHeaderCell>Phase Breakdown</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Total</CTableHeaderCell>
                <CTableHeaderCell className="text-center">HR %</CTableHeaderCell>
                <CTableHeaderCell className="text-center">Core %</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Project / HR / Core</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {project.monthly_plan.map((m) => {
                const split = computeMonthSplit(m)
                return (
                  <CTableRow key={m.month}>
                    <CTableDataCell className="fw-semibold">{monthLabel(m.month)}</CTableDataCell>
                    <CTableDataCell>
                      {m.phases.map((ph, i) => (
                        <div key={i} className="d-flex align-items-center gap-2 mb-1">
                          <CBadge
                            color="secondary"
                            shape="rounded-pill"
                            style={{ fontSize: '0.65rem' }}
                          >
                            {ph.phase}
                          </CBadge>
                          <span className="text-body-secondary">{ph.label}</span>
                          <CInputGroup size="sm" style={{ maxWidth: 130 }}>
                            <CInputGroupText>₹</CInputGroupText>
                            <CFormInput
                              type="number"
                              min="0"
                              value={ph.amount}
                              disabled={!canEdit}
                              onChange={(e) => handleAmountChange(m.month, i, e.target.value)}
                            />
                          </CInputGroup>
                        </div>
                      ))}
                    </CTableDataCell>
                    <CTableDataCell className="text-end fw-bold">{fmt(m.total)}</CTableDataCell>
                    <CTableDataCell className="text-center">
                      <PctStepper
                        value={m.hr_pct}
                        onChange={(v) => handlePctChange(m.month, { hr_pct: v })}
                        disabled={!canEdit}
                      />
                    </CTableDataCell>
                    <CTableDataCell className="text-center">
                      <PctStepper
                        value={m.core_pct}
                        onChange={(v) => handlePctChange(m.month, { core_pct: v })}
                        disabled={!canEdit}
                      />
                    </CTableDataCell>
                    <CTableDataCell className="text-end">
                      <div className="text-primary">{fmt(split.projectAmount)}</div>
                      <div className="text-info">{fmt(split.hrAmount)}</div>
                      <div className="text-danger">{fmt(split.coreAmount)}</div>
                    </CTableDataCell>
                  </CTableRow>
                )
              })}
            </CTableBody>
          </CTable>
        </div>
      </CCardBody>
    </CCard>
  )
}

PlanTable.propTypes = {
  project: PropTypes.object.isRequired,
  onProjectChange: PropTypes.func.isRequired,
  canEdit: PropTypes.bool,
}

const MonthlyPlanPanel = ({ project, onProjectChange, canEdit = false }) => {
  if (!project.monthly_plan || project.monthly_plan.length === 0) {
    return <TemplateEditor project={project} onProjectChange={onProjectChange} canEdit={canEdit} />
  }
  return <PlanTable project={project} onProjectChange={onProjectChange} canEdit={canEdit} />
}

MonthlyPlanPanel.propTypes = {
  project: PropTypes.object.isRequired,
  onProjectChange: PropTypes.func.isRequired,
  canEdit: PropTypes.bool,
}

export default MonthlyPlanPanel
