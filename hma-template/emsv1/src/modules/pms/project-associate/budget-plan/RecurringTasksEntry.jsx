import React, { useState } from 'react'
import PropTypes from 'prop-types'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CFormInput,
  CFormSelect,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { localBudgetPlan } from '../../../../services/localBudgetPlan'

const PHASE_OPTIONS = [
  { value: 'design', label: 'Design' },
  { value: 'implementation', label: 'Implementation' },
  { value: 'monitoring', label: 'Monitoring' },
]

const RecurringTasksEntry = ({ project, plan, canEdit, onPlanChange }) => {
  const [phase, setPhase] = useState('design')
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')

  if (!canEdit || plan.status !== 'planning') return null

  const handleApply = () => {
    setError('')
    try {
      const updated = localBudgetPlan.applyRecurringTasks(project.id, {
        phase,
        name,
        totalAmount: parseFloat(amount) || 0,
      })
      onPlanChange(updated)
      setName('')
      setAmount('')
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <CCard className="mb-3">
      <CCardHeader className="fw-semibold">Recurring Tasks</CCardHeader>
      <CCardBody>
        <div className="small text-body-secondary mb-2">
          Enter a task once — Apply divides its total equally across all {plan.months.length}{' '}
          months.
        </div>
        <CTable bordered small align="middle" className="mb-2">
          <CTableHead color="light">
            <CTableRow>
              <CTableHeaderCell>Phase</CTableHeaderCell>
              <CTableHeaderCell>Task</CTableHeaderCell>
              <CTableHeaderCell>Total Amount</CTableHeaderCell>
              <CTableHeaderCell></CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            <CTableRow>
              <CTableDataCell>
                <CFormSelect size="sm" value={phase} onChange={(e) => setPhase(e.target.value)}>
                  {PHASE_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </CFormSelect>
              </CTableDataCell>
              <CTableDataCell>
                <CFormInput
                  size="sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Task name"
                />
              </CTableDataCell>
              <CTableDataCell>
                <CFormInput
                  size="sm"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                />
              </CTableDataCell>
              <CTableDataCell>
                <CButton size="sm" color="primary" onClick={handleApply}>
                  Apply
                </CButton>
              </CTableDataCell>
            </CTableRow>
          </CTableBody>
        </CTable>
        {error && <div className="text-danger small">{error}</div>}
      </CCardBody>
    </CCard>
  )
}

RecurringTasksEntry.propTypes = {
  project: PropTypes.object.isRequired,
  plan: PropTypes.object.isRequired,
  canEdit: PropTypes.bool,
  onPlanChange: PropTypes.func.isRequired,
}

export default RecurringTasksEntry
