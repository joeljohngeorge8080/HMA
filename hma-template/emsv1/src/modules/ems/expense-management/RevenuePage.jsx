// src/modules/ems/expense-management/RevenuePage.jsx
import React from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CRow,
  CCol,
  CBadge,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
} from '@coreui/react'
import { localRecruitments } from '../../../services/localRecruitments'
import { localInternships } from '../../../services/localInternships'
import { localProjects } from '../../../services/localProjects'
import { computeEffectivePoolMonthly } from '../../../services/monthlyApportionment'

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n || 0)

const StatCard = ({ label, value, color }) => (
  <CCard className={`border-top border-top-${color} border-3 text-center h-100`}>
    <CCardBody className="py-3">
      <div className="small text-body-secondary mb-1">{label}</div>
      <div className={`fw-bold fs-5 text-${color}`}>{fmt(value)}</div>
    </CCardBody>
  </CCard>
)

/**
 * Company-wide revenue rollup:
 *  - HR Revenue: sums of amount_received across Recruitment, Training
 *    (both from localRecruitments, split by activity_type), and Internship
 *    (localInternships).
 *  - Project Shares: the total Admin/HR/Core pool money every planned
 *    project has generated, summed across every month of every project's
 *    monthly_plan via computeEffectivePoolMonthly (System B — the same
 *    figures the Monthly Plan / Planning Summary already show per project,
 *    rolled up company-wide here).
 */
const RevenuePage = () => {
  const recruitmentRows = localRecruitments.list()
  const recruitmentRevenue = recruitmentRows
    .filter((r) => (r.activity_type || 'recruitment') === 'recruitment')
    .reduce((s, r) => s + (r.amount_received || 0), 0)
  const trainingRevenue = recruitmentRows
    .filter((r) => r.activity_type === 'training')
    .reduce((s, r) => s + (r.amount_received || 0), 0)

  const internshipRows = localInternships.list()
  const internshipRevenue = internshipRows.reduce((s, r) => s + (r.amount_received || 0), 0)

  const hrRevenueTotal = recruitmentRevenue + trainingRevenue + internshipRevenue

  const plannedProjects = localProjects
    .list({ pageSize: 1000 })
    .items.filter((p) => p.monthly_plan?.length > 0)

  const projectShareRows = plannedProjects.map((p) => {
    const poolTotal = (pool) =>
      p.monthly_plan.reduce((s, m) => s + computeEffectivePoolMonthly(p, pool, m.month), 0)
    return {
      id: p.id,
      name: p.name || p.title,
      admin: poolTotal('admin'),
      hr: poolTotal('hr'),
      core: poolTotal('core'),
    }
  })
  const adminShare = projectShareRows.reduce((s, r) => s + r.admin, 0)
  const hrShare = projectShareRows.reduce((s, r) => s + r.hr, 0)
  const coreShare = projectShareRows.reduce((s, r) => s + r.core, 0)
  const projectSharesTotal = adminShare + hrShare + coreShare

  const grandTotal = hrRevenueTotal + projectSharesTotal

  return (
    <>
      <div className="mb-3">
        <p className="text-body-secondary small mb-0">
          Company-wide revenue: HR revenue (Recruitment, Training, Internship fees) and every
          planned project's Admin/HR/Core pool shares, rolled up.
        </p>
      </div>

      <CCard className="mb-4 border-0 shadow-sm" style={{ background: 'var(--cui-tertiary-bg)' }}>
        <CCardBody className="text-center py-4">
          <div className="small text-body-secondary mb-1">Total Revenue</div>
          <div className="fw-bold fs-2 text-success">{fmt(grandTotal)}</div>
        </CCardBody>
      </CCard>

      {/* HR Revenue */}
      <CCard className="mb-4">
        <CCardHeader className="bg-transparent fw-semibold">💼 HR Revenue</CCardHeader>
        <CCardBody>
          <CRow className="g-3 mb-3">
            <CCol xs={6} md={3}>
              <StatCard label="Recruitment" value={recruitmentRevenue} color="primary" />
            </CCol>
            <CCol xs={6} md={3}>
              <StatCard label="Training" value={trainingRevenue} color="info" />
            </CCol>
            <CCol xs={6} md={3}>
              <StatCard label="Internship" value={internshipRevenue} color="warning" />
            </CCol>
            <CCol xs={6} md={3}>
              <StatCard label="HR Revenue Total" value={hrRevenueTotal} color="success" />
            </CCol>
          </CRow>

          <div style={{ overflowX: 'auto' }}>
            <CTable small hover align="middle" className="mb-0" style={{ fontSize: '0.82rem' }}>
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell>Type</CTableHeaderCell>
                  <CTableHeaderCell>Name</CTableHeaderCell>
                  <CTableHeaderCell>Details</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Amount</CTableHeaderCell>
                  <CTableHeaderCell>Payment</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {recruitmentRows.length === 0 && internshipRows.length === 0 && (
                  <CTableRow>
                    <CTableDataCell colSpan={5} className="text-center text-body-secondary py-4">
                      No HR revenue records yet.
                    </CTableDataCell>
                  </CTableRow>
                )}
                {recruitmentRows.map((r) => (
                  <CTableRow key={r.id}>
                    <CTableDataCell>
                      <CBadge color={r.activity_type === 'training' ? 'info' : 'primary'}>
                        {r.activity_type === 'training' ? 'Training' : 'Recruitment'}
                      </CBadge>
                    </CTableDataCell>
                    <CTableDataCell>{r.candidate_name}</CTableDataCell>
                    <CTableDataCell className="small text-body-secondary">
                      {r.position || '—'}
                    </CTableDataCell>
                    <CTableDataCell className="text-end fw-semibold">
                      {fmt(r.amount_received)}
                    </CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={r.payment_status === 'Paid' ? 'success' : 'warning'}>
                        {r.payment_status}
                      </CBadge>
                    </CTableDataCell>
                  </CTableRow>
                ))}
                {internshipRows.map((r) => (
                  <CTableRow key={r.id}>
                    <CTableDataCell>
                      <CBadge color="warning" textColor="dark">
                        Internship
                      </CBadge>
                    </CTableDataCell>
                    <CTableDataCell>{r.name}</CTableDataCell>
                    <CTableDataCell className="small text-body-secondary">
                      {r.institution || '—'}
                    </CTableDataCell>
                    <CTableDataCell className="text-end fw-semibold">
                      {fmt(r.amount_received)}
                    </CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={r.payment_status === 'Paid' ? 'success' : 'warning'}>
                        {r.payment_status}
                      </CBadge>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </div>
        </CCardBody>
      </CCard>

      {/* Project Shares */}
      <CCard className="mb-4">
        <CCardHeader className="bg-transparent fw-semibold">🏗 Project Shares</CCardHeader>
        <CCardBody>
          <CRow className="g-3 mb-3">
            <CCol xs={6} md={3}>
              <StatCard label="Admin" value={adminShare} color="warning" />
            </CCol>
            <CCol xs={6} md={3}>
              <StatCard label="HR" value={hrShare} color="primary" />
            </CCol>
            <CCol xs={6} md={3}>
              <StatCard label="Core" value={coreShare} color="danger" />
            </CCol>
            <CCol xs={6} md={3}>
              <StatCard label="Project Shares Total" value={projectSharesTotal} color="success" />
            </CCol>
          </CRow>

          <div style={{ overflowX: 'auto' }}>
            <CTable small hover align="middle" className="mb-0" style={{ fontSize: '0.82rem' }}>
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell>Project</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Admin</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">HR</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Core</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Total</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {projectShareRows.length === 0 ? (
                  <CTableRow>
                    <CTableDataCell colSpan={5} className="text-center text-body-secondary py-4">
                      No planned projects yet.
                    </CTableDataCell>
                  </CTableRow>
                ) : (
                  projectShareRows.map((r) => (
                    <CTableRow key={r.id}>
                      <CTableDataCell className="fw-semibold">{r.name}</CTableDataCell>
                      <CTableDataCell className="text-end">{fmt(r.admin)}</CTableDataCell>
                      <CTableDataCell className="text-end">{fmt(r.hr)}</CTableDataCell>
                      <CTableDataCell className="text-end">{fmt(r.core)}</CTableDataCell>
                      <CTableDataCell className="text-end fw-semibold">
                        {fmt(r.admin + r.hr + r.core)}
                      </CTableDataCell>
                    </CTableRow>
                  ))
                )}
              </CTableBody>
            </CTable>
          </div>
        </CCardBody>
      </CCard>
    </>
  )
}

export default RevenuePage
