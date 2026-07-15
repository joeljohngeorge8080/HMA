import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { CAlert, CButton, CCard, CCardBody, CCardHeader } from '@coreui/react'
import { localBudgetPlan } from '../../../services/localBudgetPlan'
import { monthsInRange } from '../../../services/budgetPlan'
import PlanHeader from './budget-plan/PlanHeader'
import RecurringTasksEntry from './budget-plan/RecurringTasksEntry'
import PlanningMonthCard from './budget-plan/PlanningMonthCard'
import ActualMonthCard from './budget-plan/ActualMonthCard'

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n || 0)

const BudgetPlanPanel = ({ project, canEdit = false, currentUser = 'Unknown' }) => {
  const [plan, setPlan] = useState(() => localBudgetPlan.getPlan(project.id))
  const [focusedMonth, setFocusedMonth] = useState(null)
  const [submitError, setSubmitError] = useState('')
  const [initError, setInitError] = useState('')

  const months = monthsInRange(project.start_date, project.end_date)

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
          focusedMonth={focusedMonth}
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
            onFocus={() => setFocusedMonth(m.month)}
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
