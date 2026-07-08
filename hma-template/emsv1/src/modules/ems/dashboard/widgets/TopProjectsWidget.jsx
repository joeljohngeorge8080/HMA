/**
 * TopProjectsWidget.jsx  ─  "Top Projects by Value"
 *
 * Simple ranked list of HMA's biggest projects by ₹ value.
 * Each row shows: rank → project name → location → value → status badge.
 * CEO can instantly see which projects carry the most money.
 *
 * Data: localProjects (all 17 CSV projects).
 */
import React, { useEffect, useState } from 'react'
import { CCard, CCardBody, CBadge } from '@coreui/react'
import { localProjects } from '../../../../services/localProjects'

const fmtL = (n) => {
  if (!n && n !== 0) return '₹0'
  if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(1)} Cr`
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(1)} L`
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(0)} K`
  return `₹${Math.round(n)}`
}

const STATUS_STYLE = {
  ongoing:   { color: '#2563EB', bg: 'rgba(37,99,235,0.08)',   emoji: '🚀', label: 'Running' },
  approved:  { color: '#059669', bg: 'rgba(5,150,105,0.08)',   emoji: '✅', label: 'Approved' },
  completed: { color: '#F59E0B', bg: 'rgba(245,158,11,0.08)',   emoji: '🏆', label: 'Done' },
  pipeline:  { color: '#64748B', bg: 'rgba(100,116,139,0.08)', emoji: '🔍', label: 'Planned' },
}

const RANK_MEDALS = ['🥇','🥈','🥉']

const TopProjectsWidget = () => {
  const [projects, setProjects] = useState(null)

  useEffect(() => {
    const all = localProjects.list({ pageSize: 1000 }).items || []
    const sorted = [...all]
      .sort((a, b) =>
        (b.project_value || b.project_valuation || 0) -
        (a.project_value || a.project_valuation || 0),
      )
      .slice(0, 7)
      .map((p, i) => ({
        rank: i + 1,
        name: p.title || p.name,
        location: p.location || p.district || '—',
        value: p.project_value || p.project_valuation || 0,
        status: p.status || 'pipeline',
        type: p.project_type || '',
      }))
    setProjects(sorted)
  }, [])

  if (!projects) return null

  return (
    <CCard className="border-0 shadow-sm h-100" style={{ borderRadius: 16, overflow: 'hidden' }}>
      <CCardBody className="p-0">
        {/* Header */}
        <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid var(--cui-border-color,#dee2e6)' }}>
          <div className="d-flex align-items-center gap-2">
            <span style={{ fontSize: '1.2rem' }}>🏆</span>
            <div>
              <div className="fw-bold" style={{ fontSize: '0.85rem', color: 'var(--cui-body-color)' }}>Top Projects by Value</div>
              <div className="text-body-secondary" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Biggest projects HMA is running — sorted by money
              </div>
            </div>
          </div>
        </div>

        {/* Project list */}
        <div className="px-4 pt-3 pb-4">
          {projects.length === 0 ? (
            <div className="text-center text-body-secondary py-4 small">No projects yet</div>
          ) : (
            <div className="d-flex flex-column gap-2">
              {projects.map((p) => {
                const ss = STATUS_STYLE[p.status] || STATUS_STYLE.pipeline
                const maxVal = projects[0]?.value || 1
                const barPct = Math.round((p.value / maxVal) * 100)

                return (
                  <div
                    key={p.rank}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 10,
                      background: 'var(--cui-tertiary-bg,#f8f9fa)',
                      border: '1px solid var(--cui-border-color,#dee2e6)',
                      transition: 'transform 0.15s, box-shadow 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)'
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <div className="d-flex align-items-center gap-2 mb-2">
                      {/* Rank */}
                      <div style={{
                        fontSize: p.rank <= 3 ? '1rem' : '0.72rem',
                        minWidth: 24, textAlign: 'center',
                        color: p.rank > 3 ? 'var(--cui-secondary-color)' : undefined,
                        fontWeight: 700,
                        fontFamily: p.rank > 3 ? "'Fira Code', monospace" : undefined
                      }}>
                        {p.rank <= 3 ? RANK_MEDALS[p.rank - 1] : `#${p.rank}`}
                      </div>

                      {/* Name + location */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="fw-semibold text-truncate" style={{ fontSize: '0.75rem', color: 'var(--cui-body-color)' }}>{p.name}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--cui-secondary-color)', marginTop: 2 }}>📍 {p.location}</div>
                      </div>

                      {/* Status pill */}
                      <div style={{
                        background: ss.bg,
                        color: ss.color,
                        borderRadius: 20,
                        padding: '2px 8px',
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        flexShrink: 0,
                        border: `1px solid ${ss.color}25`
                      }}>
                        {ss.emoji} {ss.label}
                      </div>

                      {/* Value */}
                      <div className="fw-bold text-end" style={{ fontSize: '0.85rem', color: '#2563EB', minWidth: 55, flexShrink: 0, fontFamily: "'Fira Code', monospace" }}>
                        {fmtL(p.value)}
                      </div>
                    </div>

                    {/* Value bar */}
                    <div style={{ height: 4, background: 'var(--cui-border-color,#dee2e6)', borderRadius: 4, marginLeft: 32 }}>
                      <div style={{
                        height: '100%',
                        width: `${barPct}%`,
                        background: `linear-gradient(90deg, ${ss.color}, #2563EB)`,
                        borderRadius: 4,
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </CCardBody>
    </CCard>
  )
}

export default TopProjectsWidget
