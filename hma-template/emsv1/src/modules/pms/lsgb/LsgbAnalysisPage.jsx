import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CRow,
  CCol,
  CBadge,
  CProgress,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilChartPie, cilMoney, cilBuilding } from '@coreui/icons'
import { localLsgb, PURPOSE_COLOR, FUND_PURPOSES } from '../../../services/localLsgb'

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n || 0)

const pct = (a, b) => (b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0)

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'

const LsgbAnalysisPage = () => {
  const [summary, setSummary] = useState({
    totalBodies: 0,
    totalSanctioned: 0,
    totalWithdrawn: 0,
    remaining: 0,
    byPurpose: {},
    byBody: {},
  })
  const [bodies, setBodies] = useState([])
  const [recentWithdrawals, setRecentWithdrawals] = useState([])

  useEffect(() => {
    setSummary(localLsgb.getSummary())
    setBodies(localLsgb.listBodies())
    setRecentWithdrawals(localLsgb.listWithdrawals({}).slice(0, 10))
  }, [])

  const utilisationPct = pct(summary.totalWithdrawn, summary.totalSanctioned)

  // Per-body: how much withdrawn vs sanctioned
  const bodyRows = bodies
    .map((b) => {
      const withdrawn = summary.byBody[b.id]?.total || 0
      return { ...b, withdrawn, utilisationPct: pct(withdrawn, b.sanctioned_amount) }
    })
    .sort((a, b) => b.withdrawn - a.withdrawn)

  return (
    <>
      {/* Header */}
      <div className="mb-4">
        <h4 className="fw-bold mb-1">LSGB Fund Analysis</h4>
        <p className="text-body-secondary small mb-0">
          Overview of how much HMA has drawn from LSGB project funds across all bodies and expense
          categories.
        </p>
      </div>

      {/* Top stats */}
      <CRow className="g-3 mb-4">
        {[
          { label: 'LSGB Bodies', value: summary.totalBodies, color: '#4361ee', sub: 'registered' },
          {
            label: 'Total Sanctioned',
            value: fmt(summary.totalSanctioned),
            color: '#06d6a0',
            sub: 'across all bodies',
          },
          {
            label: 'Total Withdrawn',
            value: fmt(summary.totalWithdrawn),
            color: '#e74c3c',
            sub: 'by HMA',
          },
          {
            label: 'Remaining Balance',
            value: fmt(summary.remaining),
            color: summary.remaining < 0 ? '#e74c3c' : '#9b5de5',
            sub: 'available',
          },
        ].map((s) => (
          <CCol key={s.label} xs={6} md={3}>
            <CCard className="border-0 shadow-sm h-100" style={{ borderRadius: 12 }}>
              <CCardBody className="py-3 px-3">
                <div className="fw-bold fs-5 lh-1 mb-1" style={{ color: s.color }}>
                  {s.value}
                </div>
                <div className="small text-body-secondary">{s.label}</div>
                <div className="text-body-tertiary mt-1" style={{ fontSize: '0.72rem' }}>
                  {s.sub}
                </div>
              </CCardBody>
            </CCard>
          </CCol>
        ))}
      </CRow>

      <CRow className="g-4 mb-4">
        {/* Overall utilisation */}
        <CCol xs={12} md={6}>
          <CCard className="border-0 shadow-sm h-100" style={{ borderRadius: 12 }}>
            <CCardHeader className="bg-transparent border-bottom py-3">
              <span
                className="fw-semibold small text-uppercase text-body-secondary"
                style={{ letterSpacing: '0.5px' }}
              >
                <CIcon icon={cilChartPie} className="me-1" size="sm" />
                Overall Fund Utilisation
              </span>
            </CCardHeader>
            <CCardBody>
              {summary.totalSanctioned === 0 ? (
                <div className="text-center text-body-secondary py-3 small">
                  No sanctioned amounts recorded yet.
                </div>
              ) : (
                <>
                  <div className="d-flex justify-content-between mb-2 small">
                    <span className="text-body-secondary">Fund used by HMA</span>
                    <span className="fw-semibold">{utilisationPct}%</span>
                  </div>
                  <CProgress
                    value={utilisationPct}
                    height={14}
                    color={
                      utilisationPct > 90 ? 'danger' : utilisationPct > 70 ? 'warning' : 'primary'
                    }
                    className="rounded-pill mb-3"
                  />
                  <div className="d-flex justify-content-between small text-body-secondary mt-2">
                    <span>
                      Withdrawn:{' '}
                      <strong className="text-dark">{fmt(summary.totalWithdrawn)}</strong>
                    </span>
                    <span>
                      Of: <strong className="text-dark">{fmt(summary.totalSanctioned)}</strong>
                    </span>
                  </div>
                </>
              )}

              {/* By purpose */}
              <div className="mt-4">
                <div
                  className="small fw-semibold text-body-secondary text-uppercase mb-3"
                  style={{ letterSpacing: '0.5px' }}
                >
                  By Purpose
                </div>
                {FUND_PURPOSES.map((purpose) => {
                  const amount = summary.byPurpose[purpose] || 0
                  const p = pct(amount, summary.totalWithdrawn)
                  return (
                    <div key={purpose} className="mb-3">
                      <div className="d-flex justify-content-between mb-1 small">
                        <div className="d-flex align-items-center gap-2">
                          <CBadge
                            color={PURPOSE_COLOR[purpose] || 'secondary'}
                            shape="rounded-pill"
                            style={{ fontSize: '0.6rem' }}
                          >
                            {p}%
                          </CBadge>
                          <span>{purpose}</span>
                        </div>
                        <span className="fw-semibold text-body-secondary">{fmt(amount)}</span>
                      </div>
                      <CProgress
                        value={p}
                        height={6}
                        color={PURPOSE_COLOR[purpose] || 'secondary'}
                        className="rounded-pill"
                      />
                    </div>
                  )
                })}
                {Object.keys(summary.byPurpose).length === 0 && (
                  <div className="text-body-secondary small">No withdrawals recorded yet.</div>
                )}
              </div>
            </CCardBody>
          </CCard>
        </CCol>

        {/* Per-body breakdown */}
        <CCol xs={12} md={6}>
          <CCard className="border-0 shadow-sm h-100" style={{ borderRadius: 12 }}>
            <CCardHeader className="bg-transparent border-bottom py-3">
              <span
                className="fw-semibold small text-uppercase text-body-secondary"
                style={{ letterSpacing: '0.5px' }}
              >
                <CIcon icon={cilBuilding} className="me-1" size="sm" />
                Fund Utilisation by LSGB Body
              </span>
            </CCardHeader>
            <CCardBody className="p-0">
              {bodyRows.length === 0 ? (
                <div className="text-center text-body-secondary py-5 small">
                  No LSGB bodies registered yet.
                </div>
              ) : (
                <div className="p-3 d-flex flex-column gap-3">
                  {bodyRows.map((b) => (
                    <div key={b.id}>
                      <div className="d-flex justify-content-between mb-1 small">
                        <div>
                          <span className="fw-semibold">{b.body_name}</span>
                          <CBadge
                            color="info"
                            shape="rounded-pill"
                            className="ms-2"
                            style={{ fontSize: '0.6rem' }}
                          >
                            {b.body_type}
                          </CBadge>
                        </div>
                        <span className="text-body-secondary">
                          {fmt(b.withdrawn)} /{' '}
                          {b.sanctioned_amount ? fmt(b.sanctioned_amount) : 'N/A'}
                        </span>
                      </div>
                      {b.sanctioned_amount > 0 ? (
                        <CProgress
                          value={b.utilisationPct}
                          height={6}
                          color={
                            b.utilisationPct > 90
                              ? 'danger'
                              : b.utilisationPct > 60
                                ? 'warning'
                                : 'primary'
                          }
                          className="rounded-pill"
                        />
                      ) : (
                        <div className="text-body-tertiary small">
                          No sanctioned amount recorded
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Recent withdrawals */}
      <CCard className="border-0 shadow-sm" style={{ borderRadius: 12 }}>
        <CCardHeader className="bg-transparent border-bottom py-3 d-flex align-items-center justify-content-between">
          <span
            className="fw-semibold small text-uppercase text-body-secondary"
            style={{ letterSpacing: '0.5px' }}
          >
            <CIcon icon={cilMoney} className="me-1" size="sm" />
            Recent Withdrawals
          </span>
          <CBadge color="primary" shape="rounded-pill">
            {recentWithdrawals.length} shown
          </CBadge>
        </CCardHeader>
        <CCardBody className="p-0">
          {recentWithdrawals.length === 0 ? (
            <div className="text-center text-body-secondary py-5 small">
              No withdrawals recorded yet.
            </div>
          ) : (
            <div className="table-responsive">
              <CTable hover align="middle" className="mb-0" style={{ fontSize: '0.875rem' }}>
                <CTableHead className="bg-body-tertiary">
                  <CTableRow>
                    <CTableHeaderCell className="border-0 py-2 ps-3">LSGB Body</CTableHeaderCell>
                    <CTableHeaderCell className="border-0 py-2">Amount</CTableHeaderCell>
                    <CTableHeaderCell className="border-0 py-2">Purpose</CTableHeaderCell>
                    <CTableHeaderCell className="border-0 py-2">Date</CTableHeaderCell>
                    <CTableHeaderCell className="border-0 py-2">Description</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {recentWithdrawals.map((w) => (
                    <CTableRow key={w.id}>
                      <CTableDataCell className="ps-3 fw-semibold">
                        {w.lsgb_body_name || '—'}
                      </CTableDataCell>
                      <CTableDataCell className="fw-bold" style={{ color: '#e74c3c' }}>
                        {fmt(w.amount)}
                      </CTableDataCell>
                      <CTableDataCell>
                        <CBadge
                          color={PURPOSE_COLOR[w.purpose] || 'secondary'}
                          shape="rounded-pill"
                        >
                          {w.purpose}
                        </CBadge>
                      </CTableDataCell>
                      <CTableDataCell className="small text-body-secondary">
                        {fmtDate(w.withdrawal_date)}
                      </CTableDataCell>
                      <CTableDataCell
                        className="small text-body-secondary text-truncate"
                        style={{ maxWidth: 200 }}
                      >
                        {w.description || '—'}
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </div>
          )}
        </CCardBody>
      </CCard>
    </>
  )
}

export default LsgbAnalysisPage
