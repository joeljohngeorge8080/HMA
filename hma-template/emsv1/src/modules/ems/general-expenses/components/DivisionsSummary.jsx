import React, { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import {
  CBadge,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CProgress,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import api from '../../../../services/api'
import { localGeneralExpenses } from '../../../../services/localGeneralExpenses'

const MONTHS = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const currency = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n || 0)

// Category IDs classified as HR division; everything else falls under Admin.
// Outsourced Services covers HK, Security, and City salaries — workforce costs managed by HR.
const HR_CATEGORY_IDS = new Set(['cat-00000000-0012'])

const DIVISIONS = [
  {
    key: 'hr',
    label: 'HR Expenses',
    description: 'Workforce & outsourced staff costs',
    color: 'info',
    matchFn: (catId) => HR_CATEGORY_IDS.has(catId),
  },
  {
    key: 'admin',
    label: 'Admin Expenses',
    description: 'Office operations & infrastructure',
    color: 'primary',
    matchFn: (catId) => !HR_CATEGORY_IDS.has(catId),
  },
]

const DivisionCard = ({ division, expenses, categories }) => {
  const divExpenses = expenses.filter((e) => division.matchFn(e.category_id))

  const totalPlanned = divExpenses.reduce((s, e) => s + parseFloat(e.planned_amount || 0), 0)
  const totalActual = divExpenses.reduce((s, e) => s + parseFloat(e.actual_amount || 0), 0)
  const variance = totalActual - totalPlanned
  const paidCount = divExpenses.filter((e) => e.status === 'Paid').length
  const pendingCount = divExpenses.filter((e) => e.status === 'Pending').length
  const overdueCount = divExpenses.filter((e) => e.status === 'Overdue').length

  // Per-category totals within this division
  const catMap = {}
  for (const e of divExpenses) {
    if (!catMap[e.category_id]) catMap[e.category_id] = { planned: 0, actual: 0, count: 0 }
    catMap[e.category_id].planned += parseFloat(e.planned_amount || 0)
    catMap[e.category_id].actual += parseFloat(e.actual_amount || 0)
    catMap[e.category_id].count++
  }

  const catRows = Object.entries(catMap)
    .map(([catId, totals]) => ({
      catId,
      name: categories.find((c) => c.id === catId)?.name || 'Unknown',
      ...totals,
      variance: totals.actual - totals.planned,
    }))
    .sort((a, b) => b.planned - a.planned)

  const utilizationPct =
    totalPlanned > 0 ? Math.min(100, Math.round((totalActual / totalPlanned) * 100)) : 0

  return (
    <CCard className={`border-top border-top-${division.color} border-3 h-100`}>
      <CCardHeader>
        <div className="d-flex align-items-center justify-content-between">
          <div>
            <strong>{division.label}</strong>
            <div className="small text-body-secondary mt-1">{division.description}</div>
          </div>
          <CBadge color={division.color} className="fs-6 px-3 py-2">
            {divExpenses.length} item{divExpenses.length !== 1 ? 's' : ''}
          </CBadge>
        </div>
      </CCardHeader>
      <CCardBody>
        {divExpenses.length === 0 ? (
          <p className="text-body-secondary small mb-0">No expense records for this division.</p>
        ) : (
          <>
            {/* Totals */}
            <CRow className="g-2 mb-3">
              <CCol xs={4}>
                <div className="border rounded p-2 text-center">
                  <div className="small text-body-secondary">Planned</div>
                  <div className={`fw-bold text-${division.color}`}>{currency(totalPlanned)}</div>
                </div>
              </CCol>
              <CCol xs={4}>
                <div className="border rounded p-2 text-center">
                  <div className="small text-body-secondary">Actual</div>
                  <div className="fw-bold">{currency(totalActual)}</div>
                </div>
              </CCol>
              <CCol xs={4}>
                <div className="border rounded p-2 text-center">
                  <div className="small text-body-secondary">Variance</div>
                  <div className={`fw-bold text-${variance > 0 ? 'danger' : 'success'}`}>
                    {variance > 0 ? '+' : ''}{currency(variance)}
                  </div>
                </div>
              </CCol>
            </CRow>

            {/* Utilization bar */}
            <div className="mb-3">
              <div className="d-flex justify-content-between small text-body-secondary mb-1">
                <span>Budget utilisation</span>
                <span>{utilizationPct}%</span>
              </div>
              <CProgress
                value={utilizationPct}
                color={utilizationPct > 100 ? 'danger' : utilizationPct > 85 ? 'warning' : division.color}
                height={8}
              />
            </div>

            {/* Status badges */}
            <div className="d-flex gap-2 mb-3 flex-wrap">
              {paidCount > 0 && <CBadge color="success">{paidCount} Paid</CBadge>}
              {pendingCount > 0 && <CBadge color="warning">{pendingCount} Pending</CBadge>}
              {overdueCount > 0 && <CBadge color="danger">{overdueCount} Overdue</CBadge>}
            </div>

            {/* Category breakdown */}
            <CTable small bordered hover className="mb-0">
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell>Category</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Planned</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Actual</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Variance</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {catRows.map((row) => (
                  <CTableRow key={row.catId}>
                    <CTableDataCell>{row.name}</CTableDataCell>
                    <CTableDataCell className="text-end small">{currency(row.planned)}</CTableDataCell>
                    <CTableDataCell className="text-end small">{currency(row.actual)}</CTableDataCell>
                    <CTableDataCell
                      className={`text-end small fw-semibold text-${row.variance > 0 ? 'danger' : 'success'}`}
                    >
                      {row.variance > 0 ? '+' : ''}{currency(row.variance)}
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

DivisionCard.propTypes = {
  division: PropTypes.object.isRequired,
  expenses: PropTypes.array.isRequired,
  categories: PropTypes.array.isRequired,
}

const DivisionsSummary = ({ year, month }) => {
  const [expenses, setExpenses] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ page_size: 500 })
        if (year) params.set('year', year)
        if (month) params.set('month', month)
        const [expRes, catRes] = await Promise.all([
          api.get(`/general-expenses?${params}`),
          api.get('/general-expenses/categories'),
        ])
        setExpenses(expRes.data.items || [])
        setCategories(catRes.data || [])
      } catch {
        const result = localGeneralExpenses.expenses.list({
          year: year || undefined,
          month: month || undefined,
          page_size: 500,
        })
        setExpenses(result.items || [])
        setCategories(localGeneralExpenses.categories.list())
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [year, month])

  const totalPlanned = useMemo(
    () => expenses.reduce((s, e) => s + parseFloat(e.planned_amount || 0), 0),
    [expenses],
  )
  const totalActual = useMemo(
    () => expenses.reduce((s, e) => s + parseFloat(e.actual_amount || 0), 0),
    [expenses],
  )

  if (loading) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
      </div>
    )
  }

  const periodLabel =
    month && year
      ? `${MONTHS[month]} ${year}`
      : year
      ? `Year ${year}`
      : 'All Time'

  return (
    <>
      {/* Overall header */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <strong className="fs-6">Divisions Overview</strong>
          <span className="text-body-secondary small ms-2">— {periodLabel}</span>
        </div>
        <div className="d-flex gap-3 text-center">
          <div>
            <div className="small text-body-secondary">Total Planned</div>
            <div className="fw-bold text-primary">{currency(totalPlanned)}</div>
          </div>
          <div>
            <div className="small text-body-secondary">Total Actual</div>
            <div className="fw-bold">{currency(totalActual)}</div>
          </div>
          <div>
            <div className="small text-body-secondary">Net Variance</div>
            <div className={`fw-bold text-${totalActual > totalPlanned ? 'danger' : 'success'}`}>
              {currency(Math.abs(totalActual - totalPlanned))}
              <span className="small ms-1">{totalActual > totalPlanned ? 'over' : 'under'}</span>
            </div>
          </div>
        </div>
      </div>

      {expenses.length === 0 ? (
        <p className="text-body-secondary">
          No expense records for {periodLabel}. Add expenses to see division breakdowns.
        </p>
      ) : (
        <CRow className="g-4">
          {DIVISIONS.map((div) => (
            <CCol key={div.key} lg={6}>
              <DivisionCard division={div} expenses={expenses} categories={categories} />
            </CCol>
          ))}
        </CRow>
      )}
    </>
  )
}

DivisionsSummary.propTypes = {
  year: PropTypes.number,
  month: PropTypes.number,
}

export default DivisionsSummary
