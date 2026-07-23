import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { CAlert, CButton, CCard, CCardBody, CCardHeader } from '@coreui/react'
import { localBudgetPlan } from '../../../services/localBudgetPlan'
import { monthsInRange, computeWorkingPool, monthBaselines } from '../../../services/budgetPlan'
import PlanHeader from './budget-plan/PlanHeader'
import RecurringTasksEntry from './budget-plan/RecurringTasksEntry'
import PlanningMonthCard from './budget-plan/PlanningMonthCard'
import ActualMonthCard from './budget-plan/ActualMonthCard'
import BaselineSplitStrip from './budget-plan/BaselineSplitStrip'
import LedgerUploadPanel from './budget-plan/LedgerUploadPanel'

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n || 0)

const BudgetPlanPanel = ({ project, canEdit = false, currentUser = 'Unknown' }) => {
  const [plan, setPlan] = useState(() => localBudgetPlan.getPlan(project.id))
  const [submitError, setSubmitError] = useState('')
  const [initError, setInitError] = useState('')

  const months = monthsInRange(project.start_date, project.end_date)
  const previewPoolPct = {
    admin: project.admin_pct ?? 5,
    hr: project.hr_pct ?? 5,
    core: project.core_pct ?? 5,
  }
  const previewProjectValue = project.project_value || project.project_valuation || 0
  const previewWorkingPool = computeWorkingPool(previewProjectValue, previewPoolPct)
  const previewBaselines = monthBaselines(previewWorkingPool, months)

  const handleInitialize = () => {
    setInitError('')
    try {
      const created = localBudgetPlan.initializePlan(project.id, {
        projectValue: project.project_value || project.project_valuation || 0,
        startDate: project.start_date,
        endDate: project.end_date,
        poolPct: {
          admin: project.admin_pct ?? 5,
          hr: project.hr_pct ?? 5,
          core: project.core_pct ?? 5,
        },
      })
      setPlan(created)
    } catch (e) {
      setInitError(e.message)
    }
  }

  const handleFullDelete = () => {
    localBudgetPlan.fullDelete(project.id)
    setPlan(null)
  }

  const handleSubmit = () => {
    setSubmitError('')
    try {
      setPlan(localBudgetPlan.submit(project.id))
    } catch (e) {
      setSubmitError(e.message)
    }
  }

  const handleDrawFromAdmin = () => {
    setSubmitError('')
    try {
      setPlan(localBudgetPlan.drawFromAdmin(project.id, { createdBy: currentUser }))
    } catch (e) {
      setSubmitError(e.message)
    }
  }

  if (!plan) {
    return (
      <CCard className="shadow-sm mb-4">
        <CCardHeader className="fw-semibold">Budget Plan</CCardHeader>
        <CCardBody>
          {months.length > 0 && (
            <>
              <div className="d-flex flex-wrap gap-3 mb-2">
                <div>
                  <div className="small text-body-secondary">Total Project Value</div>
                  <div className="fw-bold">{fmt(previewProjectValue)}</div>
                </div>
                <div>
                  <div className="small text-body-secondary">
                    Project ({100 - previewPoolPct.admin - previewPoolPct.hr - previewPoolPct.core}
                    %)
                  </div>
                  <div className="fw-bold">{fmt(previewWorkingPool)}</div>
                </div>
                <div>
                  <div className="small text-body-secondary">Admin ({previewPoolPct.admin}%)</div>
                  <div className="fw-bold">
                    {fmt((previewProjectValue * previewPoolPct.admin) / 100)}
                  </div>
                </div>
                <div>
                  <div className="small text-body-secondary">HR ({previewPoolPct.hr}%)</div>
                  <div className="fw-bold">
                    {fmt((previewProjectValue * previewPoolPct.hr) / 100)}
                  </div>
                </div>
                <div>
                  <div className="small text-body-secondary">Core ({previewPoolPct.core}%)</div>
                  <div className="fw-bold">
                    {fmt((previewProjectValue * previewPoolPct.core) / 100)}
                  </div>
                </div>
              </div>
              <BaselineSplitStrip
                months={months}
                amounts={previewBaselines}
                workingPool={previewWorkingPool}
              />
            </>
          )}
          {canEdit ? (
            <>
              <CAlert color="info" className="small">
                No budget plan yet for this {months.length}-month project.
              </CAlert>
              <CButton color="primary" onClick={handleInitialize} disabled={months.length === 0}>
                Initialize Plan
              </CButton>
              {initError && <div className="text-danger small mt-2">{initError}</div>}
            </>
          ) : (
            <CAlert color="info" className="small mb-0">
              No budget plan has been created yet.
            </CAlert>
          )}
        </CCardBody>
      </CCard>
    )
  }

  if (plan.status === 'planning') {
    const check = localBudgetPlan.computeSettlement(project.id)
    return (
      <>
        <PlanHeader
          project={project}
          plan={plan}
          canEdit={canEdit}
          onPlanChange={setPlan}
          onFullDelete={handleFullDelete}
          currentUser={currentUser}
        />
        <RecurringTasksEntry
          project={project}
          plan={plan}
          canEdit={canEdit}
          onPlanChange={setPlan}
        />
        {plan.months.map((m, i) => (
          <PlanningMonthCard
            key={m.month}
            project={project}
            plan={plan}
            month={m.month}
            colorIndex={i}
            canEdit={canEdit}
            onPlanChange={setPlan}
            currentUser={currentUser}
          />
        ))}
        {canEdit && (
          <CCard className="mb-4">
            <CCardBody>
              <div className="small mb-2">
                {check.valid ? (
                  <span className="text-success">Every month is settled — ready to submit.</span>
                ) : (
                  <ul className="mb-0">
                    {check.monthIssues.map((i) => (
                      <li key={i.month} className="text-danger">
                        {i.month}:{' '}
                        {i.diff > 0 ? `over by ${fmt(i.diff)}` : `${fmt(-i.diff)} unallocated`}
                      </li>
                    ))}
                    {!check.invariantOk && (
                      <li className="text-danger">
                        Totals don&apos;t add up to the project value — try Reset Calculation.
                      </li>
                    )}
                    {!check.poolsNonNegative && (
                      <li className="text-danger">A pool has gone negative.</li>
                    )}
                  </ul>
                )}
              </div>
              {check.adminDraw && (
                <CButton size="sm" color="warning" className="me-2" onClick={handleDrawFromAdmin}>
                  Draw {fmt(check.adminDraw.amount)} from Admin
                </CButton>
              )}
              <CButton color="primary" disabled={!check.valid} onClick={handleSubmit}>
                Submit Plan
              </CButton>
              {submitError && <div className="text-danger small mt-2">{submitError}</div>}
            </CCardBody>
          </CCard>
        )}
      </>
    )
  }

  return (
    <>
      <PlanHeader
        project={project}
        plan={plan}
        canEdit={canEdit}
        onPlanChange={setPlan}
        onFullDelete={handleFullDelete}
        currentUser={currentUser}
      />
      <LedgerUploadPanel
        project={project}
        plan={plan}
        canEdit={canEdit}
        currentUser={currentUser}
        onPlanChange={setPlan}
      />
      {plan.months.map((m, i) => (
        <ActualMonthCard
          key={m.month}
          project={project}
          plan={plan}
          month={m.month}
          colorIndex={i}
          canEdit={canEdit}
          onPlanChange={setPlan}
          currentUser={currentUser}
        />
      ))}
    </>
  )
}

BudgetPlanPanel.propTypes = {
  project: PropTypes.object.isRequired,
  onProjectChange: PropTypes.func,
  canEdit: PropTypes.bool,
  currentUser: PropTypes.string,
}

export default BudgetPlanPanel
