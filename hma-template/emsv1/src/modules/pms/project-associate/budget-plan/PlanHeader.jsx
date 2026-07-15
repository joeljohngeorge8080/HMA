import React, { useState } from 'react'
import PropTypes from 'prop-types'
import {
  CButton,
  CCard,
  CCardBody,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
} from '@coreui/react'
import { computeWorkingPool, poolBalance } from '../../../../services/budgetPlan'
import { localBudgetPlan } from '../../../../services/localBudgetPlan'

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n || 0)

const PlanHeader = ({
  project,
  plan,
  canEdit,
  onPlanChange,
  onFullDelete,
  currentUser,
  focusedMonth,
}) => {
  const [confirmModal, setConfirmModal] = useState(null) // 'reset' | 'delete' | null
  const workingPool = computeWorkingPool(plan.project_value, plan.pool_pct)
  const hrBalance = poolBalance(plan.project_value, plan.pool_pct, 'hr', plan.transfers)
  const coreBalance = poolBalance(plan.project_value, plan.pool_pct, 'core', plan.transfers)
  const adminBalance = poolBalance(plan.project_value, plan.pool_pct, 'admin', plan.transfers)
  const projectPct = 100 - plan.pool_pct.admin - plan.pool_pct.hr - plan.pool_pct.core

  const handleSave = () => onPlanChange(localBudgetPlan.save(project.id))
  const handleResetCalculation = () => onPlanChange(localBudgetPlan.getPlan(project.id))
  const handlePoolInput = (pool, value) => {
    const target = focusedMonth || plan.months[0]?.month
    if (!target) return
    onPlanChange(
      localBudgetPlan.setPoolCapAdjustment(project.id, {
        pool,
        targetMonth: target,
        newAmount: parseFloat(value) || 0,
        createdBy: currentUser,
      }),
    )
  }

  return (
    <CCard className="mb-3">
      <CCardBody>
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-2">
          <div>
            <div className="small text-body-secondary">Total Project Value</div>
            <div className="fw-bold">{fmt(plan.project_value)}</div>
          </div>
          <div>
            <div className="small text-body-secondary">Duration</div>
            <div className="fw-bold">
              {plan.months.length} month{plan.months.length !== 1 ? 's' : ''}
            </div>
          </div>
          <div>
            <div className="small text-body-secondary">Project ({projectPct}%)</div>
            <div className="fw-bold">{fmt(workingPool)}</div>
          </div>
          <div style={{ minWidth: 160 }}>
            <div className="small text-body-secondary">Admin ({plan.pool_pct.admin}%)</div>
            <div className="fw-bold">{fmt(adminBalance)}</div>
          </div>
          <div style={{ minWidth: 180 }}>
            <div className="small text-body-secondary">HR (max {plan.pool_pct.hr}%)</div>
            {canEdit && plan.status === 'planning' ? (
              <CInputGroup size="sm">
                <CInputGroupText>₹</CInputGroupText>
                <CFormInput
                  type="number"
                  value={hrBalance}
                  onChange={(e) => handlePoolInput('hr', e.target.value)}
                />
              </CInputGroup>
            ) : (
              <div className="fw-bold">{fmt(hrBalance)}</div>
            )}
          </div>
          <div style={{ minWidth: 180 }}>
            <div className="small text-body-secondary">Core (max {plan.pool_pct.core}%)</div>
            {canEdit && plan.status === 'planning' ? (
              <CInputGroup size="sm">
                <CInputGroupText>₹</CInputGroupText>
                <CFormInput
                  type="number"
                  value={coreBalance}
                  onChange={(e) => handlePoolInput('core', e.target.value)}
                />
              </CInputGroup>
            ) : (
              <div className="fw-bold">{fmt(coreBalance)}</div>
            )}
          </div>
        </div>

        {canEdit && plan.status === 'planning' && (
          <div className="d-flex flex-wrap gap-2">
            <CButton size="sm" color="primary" onClick={handleSave}>
              Save
            </CButton>
            <CButton
              size="sm"
              color="secondary"
              variant="outline"
              onClick={() => setConfirmModal('reset')}
            >
              Reset
            </CButton>
            <CButton size="sm" color="secondary" variant="outline" onClick={handleResetCalculation}>
              Reset Calculation
            </CButton>
            <CButton
              size="sm"
              color="danger"
              variant="outline"
              onClick={() => setConfirmModal('delete')}
            >
              Full Delete
            </CButton>
          </div>
        )}
      </CCardBody>

      <CModal
        visible={Boolean(confirmModal)}
        onClose={() => setConfirmModal(null)}
        alignment="center"
        size="sm"
      >
        <CModalHeader>
          <CModalTitle>Confirm</CModalTitle>
        </CModalHeader>
        <CModalBody className="small">
          {confirmModal === 'reset'
            ? 'This restores every month and transfer back to the last Save (or the empty state if you never saved). Continue?'
            : 'This permanently deletes the entire budget plan. Continue?'}
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            variant="ghost"
            size="sm"
            onClick={() => setConfirmModal(null)}
          >
            Cancel
          </CButton>
          <CButton
            color="danger"
            size="sm"
            onClick={() => {
              if (confirmModal === 'reset') onPlanChange(localBudgetPlan.reset(project.id))
              else onFullDelete()
              setConfirmModal(null)
            }}
          >
            Confirm
          </CButton>
        </CModalFooter>
      </CModal>
    </CCard>
  )
}

PlanHeader.propTypes = {
  project: PropTypes.object.isRequired,
  plan: PropTypes.object.isRequired,
  canEdit: PropTypes.bool,
  onPlanChange: PropTypes.func.isRequired,
  onFullDelete: PropTypes.func.isRequired,
  currentUser: PropTypes.string,
  focusedMonth: PropTypes.string,
}

export default PlanHeader
