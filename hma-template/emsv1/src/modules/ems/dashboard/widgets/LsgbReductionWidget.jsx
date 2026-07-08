/**
 * LsgbReductionWidget.jsx  ─  "Cut LSGB Borrowing"
 *
 * Dashboard version of Super Forecasting's "Can We Cut Our LSGB Borrowing?"
 * calculator: how much new project value (roughly how many new projects)
 * would close a fixed 10% slice of the current LSGB gap — or grow an
 * existing surplus by 10%. Fixed at 10% here (read-only); open the full
 * Super Forecasting page to try a different target %.
 */
import React, { useEffect, useState } from 'react'
import { CCard, CCardBody } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilChartLine } from '@coreui/icons'
import {
  computeLsgbTotals,
  computeLsgbReductionPlan,
} from '../../reports-analysis/SuperForecastingPage'

const fmtL = (n) => {
  if (!n && n !== 0) return '₹0'
  if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(1)} Cr`
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(1)} L`
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(0)} K`
  return `₹${Math.round(n)}`
}

const TARGET_PCT = 10

const LsgbReductionWidget = () => {
  const [data, setData] = useState(null)

  useEffect(() => {
    const year = new Date().getFullYear()
    const totals = computeLsgbTotals(`${year}-01`, `${year}-12`)
    const plan = computeLsgbReductionPlan(totals, TARGET_PCT)
    setData({ totals, plan })
  }, [])

  if (!data) return null

  const { totals, plan } = data

  return (
    <CCard className="border-0 shadow-sm h-100" style={{ borderRadius: 16, overflow: 'hidden' }}>
      <CCardBody className="p-0">
        <div
          style={{
            padding: '14px 20px 10px',
            borderBottom: '1px solid var(--cui-border-color,#dee2e6)',
          }}
        >
          <div className="d-flex align-items-center gap-2">
            <CIcon
              icon={cilChartLine}
              style={{ width: 18, height: 18, color: 'var(--cui-primary)' }}
            />
            <div>
              <div
                className="fw-bold"
                style={{ fontSize: '0.85rem', color: 'var(--cui-body-color)' }}
              >
                Cut LSGB Borrowing
              </div>
              <div
                className="text-body-secondary"
                style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                {totals.isProfit ? 'Growing this year’s surplus' : 'Closing this year’s gap'} by{' '}
                {TARGET_PCT}%
              </div>
            </div>
          </div>
        </div>

        <div className="p-4">
          {plan.avgProjectSize > 0 ? (
            <>
              <div style={{ fontSize: '0.85rem' }}>
                You need about{' '}
                <strong className="text-success" style={{ fontFamily: "'Fira Code', monospace" }}>
                  {fmtL(plan.neededNewProjectValue)}
                </strong>{' '}
                in new project value — roughly{' '}
                <strong className="text-success">
                  {plan.approxProjectsNeeded} project{plan.approxProjectsNeeded === 1 ? '' : 's'}
                </strong>
                , based on your average project size of {fmtL(plan.avgProjectSize)}.
              </div>
              <div className="text-body-secondary mt-2" style={{ fontSize: '0.65rem' }}>
                Assumes new projects run the whole year at your current average pool-cut rate of{' '}
                {plan.avgCombinedPct}% of project value.
              </div>
            </>
          ) : (
            <div className="text-body-secondary" style={{ fontSize: '0.8rem' }}>
              Add at least one active project to calculate this.
            </div>
          )}
        </div>
      </CCardBody>
    </CCard>
  )
}

export default LsgbReductionWidget
