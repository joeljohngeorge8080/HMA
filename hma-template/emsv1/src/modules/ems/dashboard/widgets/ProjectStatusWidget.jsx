/**
 * ProjectStatusWidget.jsx
 * Dashboard widget — Project Status from Consolidated Sheet.
 *
 * Designed to be instantly understood at a glance — even by a child.
 * Shows how many projects are running, waiting, done, and how healthy
 * the overall budget is, with large colourful icons and plain language.
 */
import React, { useEffect, useState } from 'react'
import { CCard, CCardBody, CProgress } from '@coreui/react'
import { localProjects } from '../../../../services/localProjects'
import { localOrgPool } from '../../../../services/localOrgPool'

// ── Compact currency formatter ────────────────────────────────────────────────
const fmtL = (n) => {
  if (!n && n !== 0) return '—'
  if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(1)} Cr`
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(1)} L`
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(0)} K`
  return `₹${Math.round(n)}`
}

// Status buckets — professional labels, emojis, colours
const STATUS_DEFS = [
  {
    key: 'ongoing',
    emoji: '🚀',
    label: 'Running Now',
    sublabel: 'These projects are active!',
    bg: '#2563EB',
    shadow: 'rgba(37,99,235,0.3)',
  },
  {
    key: 'approved',
    emoji: '✅',
    label: 'Ready to Start',
    sublabel: 'Approved — just about to begin',
    bg: '#059669',
    shadow: 'rgba(5,150,105,0.3)',
  },
  {
    key: 'completed',
    emoji: '🏆',
    label: 'All Done!',
    sublabel: 'Successfully finished',
    bg: '#475569',
    shadow: 'rgba(71,85,105,0.3)',
  },
  {
    key: 'pipeline',
    emoji: '🔍',
    label: 'Being Planned',
    sublabel: 'Still in the pipeline',
    bg: '#F59E0B',
    shadow: 'rgba(245,158,11,0.25)',
  },
]

const ProjectStatusWidget = () => {
  const [data, setData] = useState(null)

  useEffect(() => {
    const allProjects = localProjects.list({ pageSize: 1000 }).items || []

    // Count by status
    const counts = { ongoing: 0, approved: 0, completed: 0, pipeline: 0 }
    let totalBudget = 0
    let totalUsed = 0

    allProjects.forEach((p) => {
      const s = p.status || 'pipeline'
      if (counts[s] !== undefined) counts[s]++
      else counts.pipeline++

      // Budget from consolidated sheet logic
      const bd = localOrgPool.buildProjectMonthlyBreakdown(p)
      const budget =
        bd.reduce((s, m) => s + m.adminBudget + m.hrBudget + m.coreBudget, 0) +
        bd.reduce((s, m) => s + m.directBudget, 0)
      const hrUsed = localOrgPool.getProjectHRBudgetSummary(p.id).totalCharged || 0
      const coreUsed = localOrgPool.getProjectCoreBudgetSummary(p.id).totalCharged || 0

      totalBudget += budget
      totalUsed += hrUsed + coreUsed
    })

    const budgetPct = totalBudget > 0 ? Math.min(100, Math.round((totalUsed / totalBudget) * 100)) : 0

    setData({
      counts,
      total: allProjects.length,
      totalBudget,
      totalUsed,
      budgetPct,
    })
  }, [])

  if (!data) return null

  const budgetColor =
    data.budgetPct > 90 ? '#DC2626' : data.budgetPct > 70 ? '#F59E0B' : '#059669'
  const budgetLabel =
    data.budgetPct > 90 ? '🔴 Almost used up!' : data.budgetPct > 70 ? '🟡 Getting full' : '🟢 Plenty left'

  return (
    <CCard className="border-0 shadow-sm h-100" style={{ borderRadius: 16, overflow: 'hidden' }}>
      <CCardBody className="p-0">
        {/* Header */}
        <div
          style={{
            background: '#0F172A',
            padding: '16px 20px 14px',
          }}
        >
          <div className="d-flex align-items-center gap-2 mb-1">
            <span style={{ fontSize: '1.4rem' }}>📋</span>
            <div>
              <div className="text-white fw-bold" style={{ fontSize: '0.88rem', letterSpacing: '0.05em' }}>
                PROJECT STATUS
              </div>
              <div className="text-white-50" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                from Consolidated Sheet · {data.total} total projects
              </div>
            </div>
          </div>
        </div>

        {/* Status cards — big and clear */}
        <div className="px-4 pt-4 pb-3">
          <div className="d-flex gap-3 flex-wrap mb-4">
            {STATUS_DEFS.map((def) => {
              const count = data.counts[def.key] || 0
              return (
                <div
                  key={def.key}
                  style={{
                    flex: '1 1 calc(50% - 8px)',
                    minWidth: 100,
                    background: def.bg,
                    borderRadius: 12,
                    padding: '14px 16px',
                    boxShadow: `0 4px 12px ${def.shadow}`,
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    cursor: 'default',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = `0 6px 16px ${def.shadow}`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = `0 4px 12px ${def.shadow}`
                  }}
                >
                  <div className="d-flex justify-content-between align-items-start">
                    <div style={{ fontSize: '1.6rem', lineHeight: 1 }}>{def.emoji}</div>
                    <div
                      className="text-white fw-bold"
                      style={{ fontSize: '1.8rem', lineHeight: 1, fontFamily: "'Fira Code', monospace" }}
                    >
                      {count}
                    </div>
                  </div>
                  <div className="text-white fw-semibold mt-2" style={{ fontSize: '0.8rem', opacity: 0.95 }}>
                    {def.label}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
                    {def.sublabel}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Budget health bar */}
          <div
            style={{
              background: 'var(--cui-tertiary-bg, #f8f9fa)',
              borderRadius: 12,
              padding: '12px 16px',
              border: '1px solid var(--cui-border-color)'
            }}
          >
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="fw-bold" style={{ fontSize: '0.75rem', color: 'var(--cui-body-color)' }}>
                💰 Money Used So Far
              </span>
              <span style={{ fontSize: '0.75rem', color: budgetColor, fontWeight: 700 }}>
                {budgetLabel}
              </span>
            </div>
            <CProgress
              value={data.budgetPct}
              height={10}
              className="rounded-pill mb-2"
              style={{ '--cui-progress-bar-bg': budgetColor }}
            />
            <div className="d-flex justify-content-between" style={{ fontSize: '0.65rem', color: 'var(--cui-secondary-color)', fontFamily: "'Fira Code', monospace" }}>
              <span>Used: {fmtL(data.totalUsed)}</span>
              <span>{data.budgetPct}% of total budget</span>
              <span>Total: {fmtL(data.totalBudget)}</span>
            </div>
          </div>
        </div>
      </CCardBody>
    </CCard>
  )
}

export default ProjectStatusWidget
