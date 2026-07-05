import React, { useEffect, useState } from 'react'
import { CCard, CCardBody, CBadge } from '@coreui/react'
import { computeLsgbTotals } from '../../reports-analysis/LsgbDependencyPage'

const fmtCompact = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: 'compact', maximumFractionDigits: 1 }).format(n || 0)

const ProfitLossWidget = () => {
  const [data, setData] = useState(null)

  useEffect(() => {
    const year = new Date().getFullYear()
    setData(computeLsgbTotals(`${year}-01`, `${year}-12`))
  }, [])

  if (!data) return null

  return (
    <CCard className="border-0 shadow-sm h-100" style={{ borderRadius: 12 }}>
      <CCardBody className="pt-4">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h6 className="fw-semibold mb-0 small text-uppercase text-body-secondary">Profit / Loss ({new Date().getFullYear()})</h6>
          <CBadge color={data.isProfit ? 'success' : 'danger'} shape="rounded-pill">
            {data.isProfit ? 'Profit' : 'Loss'}
          </CBadge>
        </div>
        <div className="small text-body-secondary mb-1">Expenses vs Own Revenue</div>
        <div className="fw-bold mb-2" style={{ fontSize: '1.3rem', color: data.isProfit ? '#06d6a0' : '#ef476f' }}>
          {fmtCompact(data.expenses)} vs {fmtCompact(data.ownRevenue)}
        </div>
        <div className="text-body-secondary" style={{ fontSize: '0.75rem' }}>
          {data.isProfit
            ? `Surplus ${fmtCompact(data.surplus)} — fully self-funded`
            : `${fmtCompact(data.lsgbNeed)} (${data.lsgbSharePct.toFixed(1)}%) must come from LSGB revenue`}
        </div>
      </CCardBody>
    </CCard>
  )
}

export default ProfitLossWidget
