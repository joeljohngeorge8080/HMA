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
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilTrash } from '@coreui/icons'
import { localProjects } from '../../../services/localProjects'
import { computeWorkingPool, monthsInRange } from '../../../services/monthlyApportionment'

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

const TemplateEditor = ({ project, onProjectChange }) => {
  const [lines, setLines] = useState([emptyLine()])
  const [error, setError] = useState('')

  const workingPool = computeWorkingPool(project)
  const monthCount = monthsInRange(project.start_date, project.end_date).length
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
          month&apos;s phase breakdown below, then Generate repeats it across every month of the
          project.
        </div>

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
}

const MonthlyPlanPanel = ({ project, onProjectChange }) => {
  if (!project.monthly_plan || project.monthly_plan.length === 0) {
    return <TemplateEditor project={project} onProjectChange={onProjectChange} />
  }
  return <div>Plan table goes here (Task 5)</div>
}

MonthlyPlanPanel.propTypes = {
  project: PropTypes.object.isRequired,
  onProjectChange: PropTypes.func.isRequired,
}

export default MonthlyPlanPanel
