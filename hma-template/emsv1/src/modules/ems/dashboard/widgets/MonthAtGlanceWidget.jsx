/**
 * MonthAtGlanceWidget.jsx  ─  "This Month at a Glance"
 *
 * 3 giant numbers the CEO sees at a glance:
 *   1. Total Money Spent This Month (general expenses actuals)
 *   2. Payroll This Month (active employee salaries)
 *   3. Active Projects This Month (ongoing count)
 *
 * Plain English labels, big colourful numbers, no jargon.
 */
import React, { useEffect, useState } from 'react'
import { CCard, CCardBody } from '@coreui/react'
import { localGeneralExpenses } from '../../../../services/localGeneralExpenses'
import { localEmployees } from '../../../../services/localEmployees'
import { localProjects } from '../../../../services/localProjects'
import { localOrgPool } from '../../../../services/localOrgPool'

const fmtL = (n) => {
  if (!n && n !== 0) return '₹0'
  if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(1)} Cr`
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(1)} L`
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(0)} K`
  return `₹${Math.round(n)}`
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const MonthAtGlanceWidget = () => {
  const [data, setData] = useState(null)

  useEffect(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`

    // 1. Total spend this month (general expenses)
    const analysis = localGeneralExpenses.analysis.get(year)
    const monthData = analysis.monthly_summary.find((m) => m.month === month)
    const generalSpend = monthData?.actual_total || 0

    // 2. Payroll this month
    const employees = localEmployees.list({ pageSize: 9999 }).items.filter((e) => e.status === 'Active')
    const payroll = employees.reduce((s, e) => s + parseFloat(e.current_salary || 0), 0)

    // 3. Total spend including project pool amounts (from consolidated sheet logic)
    const allProjects = localProjects.list({ pageSize: 1000 }).items || []
    let projectMonthlyBudget = 0
    const curYm = `${year}-${String(month).padStart(2, '0')}`
    allProjects.forEach((p) => {
      const entry = p.monthly_plan?.find((m) => m.month === curYm)
      if (entry) projectMonthlyBudget += entry.total || 0
    })

    const totalSpend = generalSpend + payroll
    const activeProjects = allProjects.filter((p) => p.status === 'ongoing').length

    setData({ monthLabel, totalSpend, payroll, generalSpend, activeProjects, projectMonthlyBudget })
  }, [])

  if (!data) return null

  const stats = [
    {
      emoji: '💸',
      value: fmtL(data.totalSpend),
      label: 'Total Spent',
      sublabel: 'this month (all expenses)',
      color: 'var(--cui-primary)',
      bg: 'rgba(37, 99, 235, 0.04)',
      border: '1px solid rgba(37, 99, 235, 0.15)',
    },
    {
      emoji: '👥',
      value: fmtL(data.payroll),
      label: 'Payroll',
      sublabel: 'salaries paid this month',
      color: 'var(--cui-accent)',
      bg: 'rgba(5, 150, 105, 0.04)',
      border: '1px solid rgba(5, 150, 105, 0.15)',
    },
    {
      emoji: '🚀',
      value: data.activeProjects,
      label: 'Active Projects',
      sublabel: 'running on the ground',
      color: 'var(--cui-body-color)',
      bg: 'var(--cui-tertiary-bg)',
      border: '1px solid var(--cui-border-color)',
    },
  ]

  return (
    <CCard className="border-0 shadow-sm h-100" style={{ borderRadius: 16, overflow: 'hidden' }}>
      <CCardBody className="p-0">
        {/* Header */}
        <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid var(--cui-border-color, #dee2e6)' }}>
          <div className="d-flex align-items-center gap-2">
            <span style={{ fontSize: '1.2rem' }}>📅</span>
            <div>
              <div className="fw-bold" style={{ fontSize: '0.85rem', color: 'var(--cui-body-color)' }}>This Month at a Glance</div>
              <div className="text-body-secondary" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{data.monthLabel}</div>
            </div>
          </div>
        </div>

        {/* 3 big stat cards */}
        <div className="d-flex flex-column gap-3 p-4">
          {stats.map((s) => (
            <div
              key={s.label}
              style={{
                background: s.bg,
                border: s.border,
                borderRadius: 12,
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                transition: 'transform 0.15s, box-shadow 0.15s',
                cursor: 'default',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'var(--cui-body-bg)', border: s.border,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.4rem', flexShrink: 0,
              }}>
                {s.emoji}
              </div>
              <div>
                <div className="fw-bold" style={{ fontSize: '1.6rem', color: s.color, lineHeight: 1, fontFamily: "'Fira Code', monospace" }}>{s.value}</div>
                <div className="fw-semibold" style={{ fontSize: '0.75rem', marginTop: 6, color: 'var(--cui-body-color)' }}>{s.label}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--cui-secondary-color)', marginTop: 2 }}>{s.sublabel}</div>
              </div>
            </div>
          ))}
        </div>
      </CCardBody>
    </CCard>
  )
}

export default MonthAtGlanceWidget
