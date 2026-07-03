/**
 * GeneralExpensesTab.jsx
 * ──────────────────────
 * Displays real HR & Admin monthly expense data (Mar–May 2026) extracted
 * from "hr and admin expenses - Sheet1.csv".
 *
 * Features:
 *  • Box/card view per month (actual data) + June 2026 WMA forecast
 *  • Editable line items via modal (updates live; forecast recalculates)
 *  • Budget cap = HR pool (5% from active projects) + HR Revenue entries
 *  • Forecasting: Weighted Moving Average — Mar×1 + Apr×2 + May×3 ÷ 6
 *  • Data accuracy note: Improves with more months of input
 */

import React, { useState, useMemo, useCallback } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CBadge,
  CButton,
  CModal,
  CModalHeader,
  CModalBody,
  CModalFooter,
  CModalTitle,
  CFormInput,
  CFormLabel,
  CTooltip,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPencil, cilInfo, cilPlus, cilX, cilChart } from '@coreui/icons'
import { localOrgPool } from '../../../services/localOrgPool'
import { localRecruitments } from '../../../services/localRecruitments'
import { localInternships } from '../../../services/localInternships'

// ── Formatters ────────────────────────────────────────────────────────────────

const fmtINR = (n) => {
  if (!n && n !== 0) return '—'
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(2)} L`
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(1)} K`
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

const fmtFull = (n) =>
  `₹${Math.round(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

// ── Seed data extracted from "hr and admin expenses - Sheet1.csv" ─────────────
// Each entry: { id, category, vendor, service, values: { '2026-03', '2026-04', '2026-05' } }

const SEED_DATA = [
  // ── HR Expenses ────────────────────────────────────────────────────────────
  {
    id: 'hr_1',
    category: 'HR',
    vendor: 'Manjith Travels',
    service: 'Contract Vehicle',
    frequency: 'Monthly',
    annualCommitment: 523932,
    values: { '2026-03': 46000, '2026-04': 46000, '2026-05': 46000 },
  },
  {
    id: 'hr_2',
    category: 'HR',
    vendor: 'Oval Blue Technologies',
    service: 'Photocopier SDP',
    frequency: 'Monthly',
    annualCommitment: 84000,
    values: { '2026-03': 5122, '2026-04': 4783, '2026-05': 9289 },
  },
  {
    id: 'hr_3',
    category: 'HR',
    vendor: 'Volks Electronics',
    service: 'Desktop Rental',
    frequency: 'Monthly',
    annualCommitment: 720000,
    values: { '2026-03': 60720, '2026-04': 61720, '2026-05': 63490 },
  },
  {
    id: 'hr_4',
    category: 'HR',
    vendor: 'Asianet',
    service: 'Internet Services',
    frequency: 'Quarterly',
    annualCommitment: 56640,
    values: { '2026-03': 7076, '2026-04': 7076, '2026-05': 0 },
  },
  {
    id: 'hr_5',
    category: 'HR',
    vendor: 'Oval Blue Technologies',
    service: 'Photocopier HR',
    frequency: 'Monthly',
    annualCommitment: 84000,
    values: { '2026-03': 0, '2026-04': 0, '2026-05': 8016 },
  },
  // ── Admin Expenses ─────────────────────────────────────────────────────────
  {
    id: 'adm_1',
    category: 'Admin',
    vendor: 'Dr Anandam',
    service: 'House Rent',
    frequency: 'Monthly',
    annualCommitment: 1800000,
    values: { '2026-03': 119100, '2026-04': 119100, '2026-05': 119100 },
  },
  {
    id: 'adm_2',
    category: 'Admin',
    vendor: 'BSNL',
    service: 'Land Line',
    frequency: 'Monthly',
    annualCommitment: 24000,
    values: { '2026-03': 1979, '2026-04': 1976, '2026-05': 1980 },
  },
  {
    id: 'adm_3',
    category: 'Admin',
    vendor: 'KSEB',
    service: 'Electricity Bill',
    frequency: 'Monthly',
    annualCommitment: 264000,
    values: { '2026-03': 19161, '2026-04': 26143, '2026-05': 22741 },
  },
  {
    id: 'adm_4',
    category: 'Admin',
    vendor: 'Imprest',
    service: 'Monthly Imprest',
    frequency: 'Monthly',
    annualCommitment: 120000,
    values: { '2026-03': 10000, '2026-04': 10000, '2026-05': 0 },
  },
  {
    id: 'adm_5',
    category: 'Admin',
    vendor: 'Asterisk',
    service: 'Photocopier (Admin & CEO)',
    frequency: 'Monthly',
    annualCommitment: 60000,
    values: { '2026-03': 2671, '2026-04': 2950, '2026-05': 2950 },
  },
  {
    id: 'adm_6',
    category: 'Admin',
    vendor: 'Indian Postal Department',
    service: 'Speed Post',
    frequency: 'Monthly',
    annualCommitment: 120000,
    values: { '2026-03': 11288, '2026-04': 6899, '2026-05': 34626 },
  },
  {
    id: 'adm_7',
    category: 'Admin',
    vendor: 'Vismaya Services',
    service: 'HK Salary',
    frequency: 'Monthly',
    annualCommitment: 600000,
    values: { '2026-03': 46955, '2026-04': 46955, '2026-05': 46328 },
  },
  {
    id: 'adm_8',
    category: 'Admin',
    vendor: 'Vismaya Services',
    service: 'My City Salary',
    frequency: 'Monthly',
    annualCommitment: 810000,
    values: { '2026-03': 66207, '2026-04': 66207, '2026-05': 60103 },
  },
  {
    id: 'adm_9',
    category: 'Admin',
    vendor: 'Naveen Security Services',
    service: 'Security Salary',
    frequency: 'Monthly',
    annualCommitment: 1140000,
    values: { '2026-03': 96550, '2026-04': 96550, '2026-05': 0 },
  },
  {
    id: 'adm_10',
    category: 'Admin',
    vendor: 'Pestindia Trading Corporation',
    service: 'Pest Control Services',
    frequency: 'Monthly',
    annualCommitment: 56640,
    values: { '2026-03': 0, '2026-04': 0, '2026-05': 4720 },
  },
]

const DATA_MONTHS = ['2026-03', '2026-04', '2026-05']
const FORECAST_MONTH = '2026-06'

const WMA_WEIGHTS = [1, 2, 3] // Mar=1, Apr=2, May=3
const WMA_SUM = WMA_WEIGHTS.reduce((a, b) => a + b, 0)

const MONTH_LABELS = {
  '2026-03': 'March 2026',
  '2026-04': 'April 2026',
  '2026-05': 'May 2026',
  '2026-06': 'June 2026',
}

// ── Weighted Moving Average ───────────────────────────────────────────────────

const computeWMA = (vals) => {
  // vals = [mar, apr, may]
  const sum = vals.reduce((acc, v, i) => acc + (v || 0) * WMA_WEIGHTS[i], 0)
  return Math.round(sum / WMA_SUM)
}

// ── Category colour map ───────────────────────────────────────────────────────

const CAT_COLORS = {
  HR: { badge: 'primary', line: '#4cc9f0', bg: 'rgba(76,201,240,0.08)' },
  Admin: { badge: 'warning', line: '#ffd166', bg: 'rgba(255,209,102,0.08)' },
}

// ── Month Summary Card ────────────────────────────────────────────────────────

const MonthCard = ({ monthKey, label, rows, totalBudget, isForecast, onEdit }) => {
  const hrTotal = rows.filter((r) => r.category === 'HR').reduce((s, r) => s + (r.values[monthKey] || 0), 0)
  const adminTotal = rows.filter((r) => r.category === 'Admin').reduce((s, r) => s + (r.values[monthKey] || 0), 0)
  const grandTotal = hrTotal + adminTotal

  const utilizedPct = totalBudget > 0 ? Math.min(100, Math.round((grandTotal / totalBudget) * 100)) : 0
  const remaining = totalBudget - grandTotal
  const isOver = remaining < 0

  return (
    <div
      style={{
        minWidth: 220,
        maxWidth: 260,
        flex: '0 0 auto',
        border: isForecast
          ? '2px dashed rgba(6,214,160,0.6)'
          : '1.5px solid var(--cui-border-color)',
        borderRadius: 16,
        background: isForecast
          ? 'linear-gradient(145deg,rgba(6,214,160,0.05),rgba(6,214,160,0.02))'
          : 'var(--cui-card-bg, var(--cui-body-bg))',
        padding: '18px 20px',
        position: 'relative',
        boxShadow: isForecast
          ? '0 4px 24px rgba(6,214,160,0.12)'
          : '0 2px 12px rgba(0,0,0,0.08)',
        transition: 'box-shadow 0.2s ease',
      }}
    >
      {/* Month header */}
      <div className="d-flex align-items-start justify-content-between mb-3">
        <div>
          <div
            className="fw-bold"
            style={{ fontSize: '0.95rem', color: isForecast ? '#06d6a0' : 'var(--cui-body-color)' }}
          >
            {label}
          </div>
          {isForecast && (
            <CBadge color="success" shape="rounded-pill" style={{ fontSize: '0.65rem', marginTop: 4 }}>
              🔮 WMA Forecast
            </CBadge>
          )}
        </div>
        {!isForecast && (
          <CButton
            size="sm"
            color="ghost"
            className="p-1"
            title="Edit this month's values"
            onClick={() => onEdit(monthKey)}
            style={{ opacity: 0.7 }}
          >
            <CIcon icon={cilPencil} style={{ width: 14, height: 14 }} />
          </CButton>
        )}
      </div>

      {/* Progress bar */}
      {totalBudget > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div
            className="rounded-pill"
            style={{ height: 6, background: 'var(--cui-secondary-bg, #e9ecef)', overflow: 'hidden' }}
          >
            <div
              style={{
                height: '100%',
                width: `${utilizedPct}%`,
                background: isOver
                  ? '#ff6b6b'
                  : utilizedPct > 85
                  ? '#ffd166'
                  : isForecast
                  ? '#06d6a0'
                  : '#4cc9f0',
                borderRadius: 999,
                transition: 'width 0.5s ease',
              }}
            />
          </div>
          <div className="d-flex justify-content-between mt-1" style={{ fontSize: '0.68rem', color: 'var(--cui-secondary-color)' }}>
            <span>{utilizedPct}% utilized</span>
            <span>{isOver ? 'Over budget' : `${fmtINR(remaining)} left`}</span>
          </div>
        </div>
      )}

      {/* Key metrics */}
      <div className="d-flex flex-column gap-2">
        <div className="d-flex justify-content-between align-items-center">
          <span style={{ fontSize: '0.78rem', color: 'var(--cui-secondary-color)' }}>HR Expenses</span>
          <span className="fw-semibold" style={{ fontSize: '0.82rem', color: '#4cc9f0' }}>
            {fmtINR(hrTotal)}
          </span>
        </div>
        <div className="d-flex justify-content-between align-items-center">
          <span style={{ fontSize: '0.78rem', color: 'var(--cui-secondary-color)' }}>Admin Expenses</span>
          <span className="fw-semibold" style={{ fontSize: '0.82rem', color: '#ffd166' }}>
            {fmtINR(adminTotal)}
          </span>
        </div>

        <div
          style={{
            borderTop: '1px solid var(--cui-border-color)',
            paddingTop: 10,
            marginTop: 2,
          }}
        >
          <div className="d-flex justify-content-between align-items-center">
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Budget Utilized</span>
            <span
              className="fw-bold"
              style={{ fontSize: '0.9rem', color: isOver ? '#ff6b6b' : isForecast ? '#06d6a0' : 'var(--cui-body-color)' }}
            >
              {fmtINR(grandTotal)}
            </span>
          </div>
          {totalBudget > 0 && (
            <div className="d-flex justify-content-between align-items-center mt-1">
              <span style={{ fontSize: '0.78rem', color: 'var(--cui-secondary-color)' }}>Budget Remaining</span>
              <span
                className="fw-semibold"
                style={{ fontSize: '0.82rem', color: isOver ? '#ff6b6b' : '#06d6a0' }}
              >
                {isOver ? '−' : ''}{fmtINR(Math.abs(remaining))}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

const EditMonthModal = ({ visible, monthKey, rows, onClose, onSave }) => {
  const [draft, setDraft] = useState({})

  React.useEffect(() => {
    if (visible && monthKey) {
      const init = {}
      rows.forEach((r) => { init[r.id] = String(r.values[monthKey] ?? 0) })
      setDraft(init)
    }
  }, [visible, monthKey, rows])

  const handleChange = (id, val) => setDraft((d) => ({ ...d, [id]: val }))

  const handleSave = () => {
    const parsed = {}
    Object.entries(draft).forEach(([id, val]) => {
      parsed[id] = parseFloat(val) || 0
    })
    onSave(monthKey, parsed)
    onClose()
  }

  const hrRows = rows.filter((r) => r.category === 'HR')
  const adminRows = rows.filter((r) => r.category === 'Admin')

  return (
    <CModal visible={visible} onClose={onClose} size="lg" scrollable>
      <CModalHeader>
        <CModalTitle style={{ fontSize: '1rem' }}>
          Edit Expenses — {MONTH_LABELS[monthKey] || monthKey}
        </CModalTitle>
      </CModalHeader>
      <CModalBody>
        <div className="mb-2 small text-body-secondary">
          Update actual expense values. The June forecast recalculates automatically after saving.
        </div>

        {[{ label: 'HR Expenses', rows: hrRows, color: '#4cc9f0' }, { label: 'Admin Expenses', rows: adminRows, color: '#ffd166' }].map(
          ({ label, rows: catRows, color }) => (
            <div key={label} className="mb-4">
              <div
                className="fw-semibold mb-2 pb-1"
                style={{ borderBottom: `2px solid ${color}`, color, fontSize: '0.85rem', letterSpacing: '0.05em' }}
              >
                {label}
              </div>
              <div className="d-flex flex-column gap-2">
                {catRows.map((r) => (
                  <div key={r.id} className="d-flex align-items-center gap-3">
                    <div style={{ flex: 1, fontSize: '0.82rem' }}>
                      <div className="fw-medium">{r.service}</div>
                      <div className="text-body-secondary" style={{ fontSize: '0.72rem' }}>
                        {r.vendor} · {r.frequency}
                      </div>
                    </div>
                    <div style={{ width: 140 }}>
                      <CFormInput
                        type="number"
                        size="sm"
                        min={0}
                        step={1}
                        value={draft[r.id] ?? ''}
                        onChange={(e) => handleChange(r.id, e.target.value)}
                        style={{ textAlign: 'right' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </CButton>
        <CButton color="primary" size="sm" onClick={handleSave}>
          Save & Recalculate
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

// ── HR Revenue Modal ──────────────────────────────────────────────────────────

const HRRevenueModal = ({ visible, revenues, onClose, onSave }) => {
  const [draft, setDraft] = useState([])

  React.useEffect(() => {
    if (visible) setDraft(revenues.map((r) => ({ ...r })))
  }, [visible, revenues])

  const handleChange = (idx, field, val) => {
    setDraft((d) => d.map((r, i) => (i === idx ? { ...r, [field]: val } : r)))
  }

  const addRow = () =>
    setDraft((d) => [
      ...d,
      { id: `rev_${Date.now()}`, label: '', amount: '' },
    ])

  const removeRow = (idx) => setDraft((d) => d.filter((_, i) => i !== idx))

  return (
    <CModal visible={visible} onClose={onClose} size="md">
      <CModalHeader>
        <CModalTitle style={{ fontSize: '1rem' }}>HR Revenue Sources</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <div className="small text-body-secondary mb-3">
          Enter monthly HR revenue amounts (Internship, Training, Recruitment, Hall Rent, etc.)
          These are added to the HR pool budget for the budget-remaining calculation.
        </div>
        <div className="d-flex flex-column gap-2">
          {draft.map((r, idx) => (
            <div key={r.id} className="d-flex gap-2 align-items-center">
              <CFormInput
                size="sm"
                placeholder="Source (e.g. Hall Rent)"
                value={r.label}
                onChange={(e) => handleChange(idx, 'label', e.target.value)}
                style={{ flex: 2 }}
              />
              <CFormInput
                size="sm"
                type="number"
                placeholder="₹ Amount"
                value={r.amount}
                onChange={(e) => handleChange(idx, 'amount', e.target.value)}
                style={{ flex: 1, textAlign: 'right' }}
              />
              <CButton size="sm" color="ghost" className="p-1 text-danger" onClick={() => removeRow(idx)}>
                <CIcon icon={cilX} style={{ width: 13, height: 13 }} />
              </CButton>
            </div>
          ))}
        </div>
        <CButton size="sm" color="primary" variant="ghost" className="mt-3" onClick={addRow}>
          <CIcon icon={cilPlus} className="me-1" style={{ width: 13, height: 13 }} />
          Add Revenue Source
        </CButton>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </CButton>
        <CButton
          color="primary"
          size="sm"
          onClick={() => {
            onSave(
              draft
                .filter((r) => r.label && parseFloat(r.amount) > 0)
                .map((r) => ({ ...r, amount: parseFloat(r.amount) || 0 }))
            )
            onClose()
          }}
        >
          Save
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

// ── Detail Table ──────────────────────────────────────────────────────────────

const DetailTable = ({ rows, forecastValues }) => {
  const hrRows = rows.filter((r) => r.category === 'HR')
  const adminRows = rows.filter((r) => r.category === 'Admin')

  const renderSection = (catRows, catLabel, color) => {
    const totals = DATA_MONTHS.map((m) =>
      catRows.reduce((s, r) => s + (r.values[m] || 0), 0)
    )
    const forecastTotal = catRows.reduce((s, r) => s + (forecastValues[r.id] || 0), 0)

    return (
      <React.Fragment key={catLabel}>
        <tr>
          <td
            colSpan={DATA_MONTHS.length + 2}
            style={{
              background: color === '#4cc9f0' ? 'rgba(76,201,240,0.07)' : 'rgba(255,209,102,0.07)',
              fontWeight: 700,
              fontSize: '0.78rem',
              color,
              letterSpacing: '0.06em',
              padding: '8px 12px',
            }}
          >
            {catLabel}
          </td>
        </tr>
        {catRows.map((r) => {
          const vals = DATA_MONTHS.map((m) => r.values[m] || 0)
          const fc = forecastValues[r.id] || 0
          const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
          const trend = vals[2] - vals[0]

          return (
            <tr key={r.id} style={{ fontSize: '0.8rem' }}>
              <td style={{ paddingLeft: 20 }}>
                <div className="fw-medium">{r.service}</div>
                <div className="text-body-secondary" style={{ fontSize: '0.7rem' }}>
                  {r.vendor}
                </div>
              </td>
              {vals.map((v, i) => (
                <td key={i} className="text-end" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {v > 0 ? fmtINR(v) : <span className="text-body-tertiary">—</span>}
                </td>
              ))}
              <td
                className="text-end fw-semibold"
                style={{
                  color: '#06d6a0',
                  borderLeft: '2px dashed rgba(6,214,160,0.3)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {fc > 0 ? fmtINR(fc) : <span className="text-body-tertiary">—</span>}
                {trend !== 0 && (
                  <div style={{ fontSize: '0.63rem', color: trend > 0 ? '#ff6b6b' : '#06d6a0', marginTop: 1 }}>
                    {trend > 0 ? '▲' : '▼'} trend
                  </div>
                )}
              </td>
            </tr>
          )
        })}
        <tr style={{ background: 'var(--cui-tertiary-bg)', fontWeight: 700 }}>
          <td style={{ paddingLeft: 20, fontSize: '0.8rem' }}>Subtotal</td>
          {totals.map((t, i) => (
            <td key={i} className="text-end" style={{ color, fontSize: '0.82rem' }}>
              {fmtINR(t)}
            </td>
          ))}
          <td
            className="text-end"
            style={{
              color: '#06d6a0',
              borderLeft: '2px dashed rgba(6,214,160,0.3)',
              fontSize: '0.82rem',
            }}
          >
            {fmtINR(forecastTotal)}
          </td>
        </tr>
      </React.Fragment>
    )
  }

  return (
    <div style={{ overflowX: 'auto', marginTop: 4 }}>
      <table
        className="table table-bordered align-middle mb-0"
        style={{ minWidth: 700, fontSize: '0.82rem' }}
      >
        <thead>
          <tr className="bg-body-tertiary">
            <th style={{ minWidth: 220 }}>Expense Item</th>
            {DATA_MONTHS.map((m) => (
              <th key={m} className="text-center" style={{ minWidth: 110 }}>
                {MONTH_LABELS[m]}
                <div style={{ fontSize: '0.65rem', color: 'var(--cui-secondary-color)', fontWeight: 400 }}>
                  Actual
                </div>
              </th>
            ))}
            <th
              className="text-center"
              style={{
                minWidth: 120,
                color: '#06d6a0',
                borderLeft: '2px dashed rgba(6,214,160,0.3)',
              }}
            >
              {MONTH_LABELS[FORECAST_MONTH]}
              <div style={{ fontSize: '0.65rem', fontWeight: 400 }}>WMA Forecast</div>
            </th>
          </tr>
        </thead>
        <tbody>
          {renderSection(rows.filter((r) => r.category === 'HR'), 'HR Expenses', '#4cc9f0')}
          <tr style={{ height: 6 }}>
            <td colSpan={DATA_MONTHS.length + 2} style={{ background: 'var(--cui-border-color)', padding: 0 }} />
          </tr>
          {renderSection(rows.filter((r) => r.category === 'Admin'), 'Admin Expenses', '#ffd166')}
          {/* Grand total */}
          <tr style={{ borderTop: '2.5px solid var(--cui-border-color)', fontWeight: 800, fontSize: '0.88rem' }}>
            <td>Grand Total</td>
            {DATA_MONTHS.map((m) => {
              const total = rows.reduce((s, r) => s + (r.values[m] || 0), 0)
              return (
                <td key={m} className="text-end text-primary">
                  {fmtINR(total)}
                </td>
              )
            })}
            <td
              className="text-end fw-bold"
              style={{ color: '#06d6a0', borderLeft: '2px dashed rgba(6,214,160,0.3)' }}
            >
              {fmtINR(rows.reduce((s, r) => s + (forecastValues[r.id] || 0), 0))}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

const GeneralExpensesTab = () => {
  // Expense rows state (editable)
  const [rows, setRows] = useState(() =>
    SEED_DATA.map((r) => ({
      ...r,
      values: { ...r.values },
    }))
  )

  // HR Revenue entries state — Internship/Training/Recruitment seed from the
  // real ledgers (localInternships/localRecruitments) so this tab reflects
  // actual data instead of manually re-entered zeros; still editable here
  // afterwards (e.g. Hall Rent has no other source and stays manual).
  const [hrRevenues, setHrRevenues] = useState(() => {
    const recruitmentTotal = localRecruitments
      .list({ activity_type: 'recruitment' })
      .reduce((s, r) => s + (r.amount_received || 0), 0)
    const trainingTotal = localRecruitments
      .list({ activity_type: 'training' })
      .reduce((s, r) => s + (r.amount_received || 0), 0)
    const internshipTotal = localInternships
      .list()
      .reduce((s, r) => s + (r.amount_received || 0), 0)
    return [
      { id: 'rev_1', label: 'Internship', amount: internshipTotal },
      { id: 'rev_2', label: 'Training', amount: trainingTotal },
      { id: 'rev_3', label: 'Recruitment', amount: recruitmentTotal },
      { id: 'rev_4', label: 'Hall Rent', amount: 0 },
    ]
  })

  // Modals
  const [editModal, setEditModal] = useState(null) // monthKey
  const [revenueModal, setRevenueModal] = useState(false)
  const [showDetail, setShowDetail] = useState(false)

  // ── Budget cap from HR pool + revenues ──────────────────────────────────────
  const hrPoolMonthly = useMemo(() => {
    try {
      const budgets = localOrgPool.getActiveProjectMonthlyBudgets('hr')
      return budgets.reduce((s, b) => s + (b.monthlyBudget || 0), 0)
    } catch {
      return 0
    }
  }, [])

  const hrRevenueMonthly = useMemo(
    () => hrRevenues.reduce((s, r) => s + (r.amount || 0), 0),
    [hrRevenues]
  )

  const totalBudgetCap = hrPoolMonthly + hrRevenueMonthly

  // ── WMA Forecast ────────────────────────────────────────────────────────────
  const forecastValues = useMemo(() => {
    const fc = {}
    rows.forEach((r) => {
      const vals = DATA_MONTHS.map((m) => r.values[m] || 0)
      fc[r.id] = computeWMA(vals)
    })
    return fc
  }, [rows])

  // Build forecast rows for card view
  const forecastRows = useMemo(() => {
    return rows.map((r) => ({
      ...r,
      values: { ...r.values, [FORECAST_MONTH]: forecastValues[r.id] },
    }))
  }, [rows, forecastValues])

  // ── Edit handler ─────────────────────────────────────────────────────────────
  const handleSaveEdits = useCallback((monthKey, parsed) => {
    setRows((prev) =>
      prev.map((r) =>
        parsed[r.id] !== undefined
          ? { ...r, values: { ...r.values, [monthKey]: parsed[r.id] } }
          : r
      )
    )
  }, [])

  // ── Stats ────────────────────────────────────────────────────────────────────
  const monthTotals = useMemo(
    () =>
      DATA_MONTHS.map((m) => ({
        month: m,
        total: rows.reduce((s, r) => s + (r.values[m] || 0), 0),
      })),
    [rows]
  )

  const forecastTotal = useMemo(
    () => rows.reduce((s, r) => s + (forecastValues[r.id] || 0), 0),
    [rows, forecastValues]
  )

  const avgActual = useMemo(
    () => Math.round(monthTotals.reduce((s, m) => s + m.total, 0) / monthTotals.length),
    [monthTotals]
  )

  return (
    <div>
      {/* Header */}
      <div className="d-flex align-items-start justify-content-between flex-wrap gap-3 mb-4">
        <div>
          <h6 className="fw-bold mb-1">General Expenses — HR & Admin</h6>
          <div className="text-body-secondary small">
            Actual data: Mar – May 2026 &nbsp;·&nbsp; June 2026 forecasted via{' '}
            <span style={{ color: '#06d6a0', fontWeight: 600 }}>Weighted Moving Average</span>
            {' '}(Mar×1, Apr×2, May×3 ÷ 6)
          </div>
          <div className="text-body-secondary small mt-1" style={{ fontSize: '0.72rem', opacity: 0.7 }}>
            💡 Forecast accuracy improves as more months of data are added. Currently using 3 months.
          </div>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <CButton
            size="sm"
            color="info"
            variant="ghost"
            onClick={() => setRevenueModal(true)}
          >
            <CIcon icon={cilPlus} className="me-1" style={{ width: 13, height: 13 }} />
            HR Revenue
          </CButton>
          <CButton
            size="sm"
            color={showDetail ? 'primary' : 'secondary'}
            variant={showDetail ? 'outline' : 'ghost'}
            onClick={() => setShowDetail((v) => !v)}
          >
            <CIcon icon={cilChart} className="me-1" style={{ width: 13, height: 13 }} />
            {showDetail ? 'Hide Detail' : 'Show Detail'}
          </CButton>
        </div>
      </div>

      {/* Budget cap info strip */}
      <div
        className="rounded-3 mb-4 d-flex flex-wrap gap-3 align-items-center px-4 py-3"
        style={{
          background: 'linear-gradient(135deg,rgba(76,201,240,0.08),rgba(6,214,160,0.06))',
          border: '1px solid rgba(76,201,240,0.2)',
          fontSize: '0.82rem',
        }}
      >
        <div>
          <div className="text-body-secondary" style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            HR Pool Budget (5% from Projects)
          </div>
          <div className="fw-bold" style={{ color: '#4cc9f0', fontSize: '1rem' }}>
            {hrPoolMonthly > 0 ? fmtINR(hrPoolMonthly) + ' /mo' : (
              <span className="text-body-secondary" style={{ fontSize: '0.82rem', fontWeight: 400 }}>
                No active projects — set via PMS
              </span>
            )}
          </div>
        </div>
        <div style={{ color: 'var(--cui-border-color)' }}>+</div>
        <div>
          <div className="text-body-secondary" style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            HR Revenue (Internship / Training / Hall Rent…)
          </div>
          <div className="fw-bold" style={{ color: '#06d6a0', fontSize: '1rem' }}>
            {fmtINR(hrRevenueMonthly)}{' '}
            <CButton
              size="sm"
              color="ghost"
              className="p-0 ms-1"
              style={{ fontSize: '0.7rem', verticalAlign: 'middle' }}
              onClick={() => setRevenueModal(true)}
            >
              Edit
            </CButton>
          </div>
        </div>
        <div style={{ color: 'var(--cui-border-color)' }}>=</div>
        <div>
          <div className="text-body-secondary" style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Total Monthly Budget Cap
          </div>
          <div className="fw-bold" style={{ fontSize: '1.1rem' }}>
            {totalBudgetCap > 0 ? fmtINR(totalBudgetCap) : <span className="text-body-secondary" style={{ fontWeight: 400 }}>—</span>}
          </div>
        </div>
        <div className="ms-auto text-body-secondary small">
          3-month actual avg: <strong>{fmtINR(avgActual)}</strong>
        </div>
      </div>

      {/* ── Box Cards Row ───────────────────────────────────────────────────── */}
      <div className="d-flex gap-4 flex-wrap mb-5" style={{ overflowX: 'auto', paddingBottom: 4 }}>
        {DATA_MONTHS.map((m) => (
          <MonthCard
            key={m}
            monthKey={m}
            label={MONTH_LABELS[m]}
            rows={rows}
            totalBudget={totalBudgetCap}
            isForecast={false}
            onEdit={(mk) => setEditModal(mk)}
          />
        ))}

        {/* Divider */}
        <div
          className="d-flex align-items-center"
          style={{ color: 'var(--cui-secondary-color)', fontSize: '0.75rem', writingMode: 'vertical-rl' }}
        >
          <div style={{ width: 1, height: 40, background: 'var(--cui-border-color)', marginBottom: 6 }} />
          forecast
          <div style={{ width: 1, height: 40, background: 'var(--cui-border-color)', marginTop: 6 }} />
        </div>

        {/* Forecast card */}
        <MonthCard
          monthKey={FORECAST_MONTH}
          label={MONTH_LABELS[FORECAST_MONTH]}
          rows={forecastRows}
          totalBudget={totalBudgetCap}
          isForecast={true}
          onEdit={() => {}}
        />
      </div>

      {/* WMA explanation */}
      <div
        className="rounded-3 px-4 py-3 mb-4"
        style={{
          background: 'rgba(6,214,160,0.05)',
          border: '1px solid rgba(6,214,160,0.15)',
          fontSize: '0.78rem',
        }}
      >
        <div className="fw-semibold mb-1" style={{ color: '#06d6a0' }}>
          🔮 How the June Forecast Works
        </div>
        <div className="text-body-secondary">
          <strong>Weighted Moving Average (WMA)</strong> — each expense line is forecasted independently.
          Weights: March × 1, April × 2, May × 3 (most recent month counts more). Formula: <code>(Mar + Apr×2 + May×3) ÷ 6</code>.
          {' '}Forecast will auto-improve once you have 6+ months of data (Exponential Smoothing) or 12+ months (seasonal detection).
        </div>
        <div className="mt-2 d-flex flex-wrap gap-3">
          {DATA_MONTHS.map((m, i) => (
            <div key={m} className="text-body-secondary">
              {MONTH_LABELS[m]}:{' '}
              <strong style={{ color: 'var(--cui-body-color)' }}>
                {fmtINR(monthTotals[i]?.total)}
              </strong>{' '}
              (weight ×{WMA_WEIGHTS[i]})
            </div>
          ))}
          <div>
            → June Forecast:{' '}
            <strong style={{ color: '#06d6a0' }}>{fmtINR(forecastTotal)}</strong>
          </div>
        </div>
      </div>

      {/* Detail table (toggle) */}
      {showDetail && (
        <CCard className="border-0 shadow-sm">
          <CCardHeader className="py-3">
            <div className="d-flex align-items-center justify-content-between">
              <h6 className="fw-bold mb-0">Detailed Breakdown</h6>
              <div className="small text-body-secondary">
                Click a month card's pencil icon to edit values
              </div>
            </div>
          </CCardHeader>
          <CCardBody className="p-0">
            <DetailTable rows={rows} forecastValues={forecastValues} />
          </CCardBody>
        </CCard>
      )}

      {/* Edit Modal */}
      <EditMonthModal
        visible={!!editModal}
        monthKey={editModal}
        rows={rows}
        onClose={() => setEditModal(null)}
        onSave={handleSaveEdits}
      />

      {/* HR Revenue Modal */}
      <HRRevenueModal
        visible={revenueModal}
        revenues={hrRevenues}
        onClose={() => setRevenueModal(false)}
        onSave={setHrRevenues}
      />
    </div>
  )
}

export default GeneralExpensesTab
