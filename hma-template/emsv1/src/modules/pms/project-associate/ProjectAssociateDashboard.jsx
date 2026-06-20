/**
 * ProjectAssociateDashboard.jsx — Project Associate main dashboard.
 * Route: /pms/pa/dashboard
 */
import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CContainer,
  CRow,
  CCol,
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
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
import {
  cilPlus,
  cilFolder,
  cilPeople,
  cilCheckCircle,
  cilWarning,
  cilClock,
  cilArrowRight,
  cilBell,
} from '@coreui/icons'
import { localProjects } from '../../../services/localProjects'

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

const STATUS_META = {
  active: { label: 'Active', color: 'success' },
  pipeline: { label: 'Pipeline', color: 'warning' },
  completed: { label: 'Completed', color: 'secondary' },
  on_hold: { label: 'On Hold', color: 'danger' },
}

const PHASE_META = {
  pipeline: { label: 'Pipeline', color: '#f0ad4e' },
  design: { label: 'Design', color: '#5bc0de' },
  implementation: { label: 'Implementation', color: '#337ab7' },
  followup: { label: 'Follow-up', color: '#9b59b6' },
  completed: { label: 'Completed', color: '#5cb85c' },
}

const ProjectAssociateDashboard = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [recentProjects, setRecentProjects] = useState([])

  const load = useCallback(() => {
    localProjects.seedDemoData()
    setStats(localProjects.getStats())
    const { items } = localProjects.list({ pageSize: 5 })
    setRecentProjects(items)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (!stats) return null

  const utilizationPct =
    stats.totalReceived > 0 ? Math.round((stats.totalSpent / stats.totalReceived) * 100) : 0

  const kpiCards = [
    {
      label: 'Total Projects',
      value: stats.total,
      icon: cilFolder,
      color: '#4361ee',
      bg: 'rgba(67,97,238,0.08)',
      sub: `${stats.active} active`,
    },
    {
      label: 'Total Project Value',
      value: fmt(stats.totalValue),
      icon: cilCheckCircle,
      color: '#2ec4b6',
      bg: 'rgba(46,196,182,0.08)',
      sub: `${fmt(stats.totalReceived)} received`,
    },
    {
      label: 'Pending Approvals',
      value: stats.pendingApprovals,
      icon: cilBell,
      color: '#f77f00',
      bg: 'rgba(247,127,0,0.08)',
      sub: 'Require your action',
    },
    {
      label: 'Completed',
      value: stats.completed,
      icon: cilCheckCircle,
      color: '#06d6a0',
      bg: 'rgba(6,214,160,0.08)',
      sub: `${stats.pipeline} in pipeline`,
    },
  ]

  return (
    <CContainer lg className="py-4">
      {/* Hero Header */}
      <div
        className="rounded-4 mb-4 px-4 py-4 text-white position-relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%)',
          minHeight: '120px',
        }}
      >
        <div
          className="position-absolute top-0 end-0 opacity-10"
          style={{ fontSize: '8rem', lineHeight: 1, marginTop: '-1rem' }}
        >
          🏗️
        </div>
        <div className="position-relative">
          <h3 className="fw-bold mb-1">Project Associate Dashboard</h3>
          <p className="mb-3 opacity-75">Manage projects, assign officers, and track progress</p>
          <div className="d-flex gap-2 flex-wrap">
            <CButton
              color="light"
              size="sm"
              className="fw-semibold text-primary"
              onClick={() => navigate('/pms/projects/create')}
            >
              <CIcon icon={cilPlus} className="me-1" />
              New Project
            </CButton>
            <CButton
              color="light"
              variant="outline"
              size="sm"
              className="text-white border-white"
              onClick={() => navigate('/pms/project-teams/officers')}
            >
              <CIcon icon={cilPeople} className="me-1" />
              Project Officers
            </CButton>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <CRow className="g-3 mb-4">
        {kpiCards.map((card, i) => (
          <CCol key={i} xs={12} sm={6} xl={3}>
            <CCard className="border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
              <CCardBody className="d-flex align-items-center gap-3 py-3">
                <div
                  className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 52, height: 52, background: card.bg }}
                >
                  <CIcon icon={card.icon} style={{ color: card.color, width: 24, height: 24 }} />
                </div>
                <div className="min-w-0">
                  <div className="fw-bold fs-5 lh-1 mb-1" style={{ color: card.color }}>
                    {card.value}
                  </div>
                  <div className="fw-semibold small text-body">{card.label}</div>
                  <div className="text-body-secondary" style={{ fontSize: '0.72rem' }}>
                    {card.sub}
                  </div>
                </div>
              </CCardBody>
            </CCard>
          </CCol>
        ))}
      </CRow>

      <CRow className="g-4">
        {/* Left: Fund Utilization + Phase Breakdown */}
        <CCol xs={12} lg={4}>
          <CCard className="border-0 shadow-sm mb-4" style={{ borderRadius: '12px' }}>
            <CCardHeader className="bg-transparent border-bottom-0 pt-3 pb-0">
              <h6 className="fw-bold mb-0">Fund Utilization</h6>
            </CCardHeader>
            <CCardBody>
              <div className="mb-3">
                <div className="d-flex justify-content-between mb-1">
                  <span className="small text-body-secondary">Received vs Spent</span>
                  <span className="small fw-semibold">{utilizationPct}%</span>
                </div>
                <CProgress
                  value={utilizationPct}
                  color={utilizationPct > 90 ? 'danger' : utilizationPct > 70 ? 'warning' : 'success'}
                  height={10}
                  className="rounded-pill"
                />
                <div className="d-flex justify-content-between mt-2">
                  <div>
                    <div className="small text-body-secondary">Total Received</div>
                    <div className="fw-bold text-success small">{fmt(stats.totalReceived)}</div>
                  </div>
                  <div className="text-end">
                    <div className="small text-body-secondary">Total Spent</div>
                    <div className="fw-bold text-primary small">{fmt(stats.totalSpent)}</div>
                  </div>
                </div>
              </div>

              <hr />
              <h6 className="fw-semibold mb-3 small text-uppercase text-body-secondary">
                Projects by Phase
              </h6>
              {Object.entries(PHASE_META).map(([phase, meta]) => {
                const count = recentProjects.filter((p) => p.phase === phase).length
                const total = Math.max(recentProjects.length, 1)
                return (
                  <div key={phase} className="mb-2">
                    <div className="d-flex justify-content-between mb-1">
                      <span className="small">{meta.label}</span>
                      <span className="small fw-semibold">{count}</span>
                    </div>
                    <CProgress
                      value={(count / total) * 100}
                      height={5}
                      className="rounded-pill"
                      style={{ '--cui-progress-bar-bg': meta.color }}
                    />
                  </div>
                )
              })}
            </CCardBody>
          </CCard>

          {/* Quick Actions */}
          <CCard className="border-0 shadow-sm" style={{ borderRadius: '12px' }}>
            <CCardHeader className="bg-transparent border-bottom-0 pt-3 pb-0">
              <h6 className="fw-bold mb-0">Quick Actions</h6>
            </CCardHeader>
            <CCardBody className="pt-2">
              {[
                {
                  label: 'Create New Project',
                  to: '/pms/projects/create',
                  icon: cilPlus,
                  color: '#4361ee',
                },
                {
                  label: 'View All Projects',
                  to: '/pms/projects',
                  icon: cilFolder,
                  color: '#2ec4b6',
                },
                {
                  label: 'Manage Officers',
                  to: '/pms/project-teams/officers',
                  icon: cilPeople,
                  color: '#f77f00',
                },
              ].map((action, i) => (
                <button
                  key={i}
                  className="btn btn-light w-100 text-start mb-2 d-flex align-items-center gap-2 py-2"
                  style={{ borderRadius: '8px', border: '1px solid #f0f0f0' }}
                  onClick={() => navigate(action.to)}
                >
                  <div
                    className="rounded-2 d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{
                      width: 32,
                      height: 32,
                      background: `${action.color}15`,
                    }}
                  >
                    <CIcon icon={action.icon} style={{ color: action.color, width: 16, height: 16 }} />
                  </div>
                  <span className="fw-medium small">{action.label}</span>
                  <CIcon icon={cilArrowRight} className="ms-auto text-body-secondary" style={{ width: 14, height: 14 }} />
                </button>
              ))}
            </CCardBody>
          </CCard>
        </CCol>

        {/* Right: Recent Projects Table */}
        <CCol xs={12} lg={8}>
          <CCard className="border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
            <CCardHeader className="bg-transparent border-bottom d-flex justify-content-between align-items-center py-3">
              <h6 className="fw-bold mb-0">Recent Projects</h6>
              <CButton
                color="primary"
                variant="ghost"
                size="sm"
                onClick={() => navigate('/pms/projects')}
              >
                View All <CIcon icon={cilArrowRight} className="ms-1" />
              </CButton>
            </CCardHeader>
            <CCardBody className="p-0">
              <CTable hover responsive className="mb-0" style={{ fontSize: '0.875rem' }}>
                <CTableHead className="bg-body-tertiary">
                  <CTableRow>
                    <CTableHeaderCell className="border-0 py-3 ps-4">Project</CTableHeaderCell>
                    <CTableHeaderCell className="border-0 py-3">Officer</CTableHeaderCell>
                    <CTableHeaderCell className="border-0 py-3">Value</CTableHeaderCell>
                    <CTableHeaderCell className="border-0 py-3">Progress</CTableHeaderCell>
                    <CTableHeaderCell className="border-0 py-3">Status</CTableHeaderCell>
                    <CTableHeaderCell className="border-0 py-3"></CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {recentProjects.map((p) => {
                    const progress =
                      p.tasks_count > 0
                        ? Math.round((p.tasks_completed / p.tasks_count) * 100)
                        : 0
                    const statusMeta = STATUS_META[p.status] || { label: p.status, color: 'secondary' }
                    return (
                      <CTableRow
                        key={p.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/pms/projects/${p.id}`)}
                      >
                        <CTableDataCell className="py-3 ps-4">
                          <div className="fw-semibold text-truncate" style={{ maxWidth: '200px' }}>
                            {p.name}
                          </div>
                          <div className="text-body-secondary" style={{ fontSize: '0.75rem' }}>
                            {p.location}
                          </div>
                          {p.pending_approvals > 0 && (
                            <CBadge color="warning" className="mt-1" style={{ fontSize: '0.65rem' }}>
                              <CIcon icon={cilWarning} style={{ width: 10 }} className="me-1" />
                              {p.pending_approvals} pending
                            </CBadge>
                          )}
                        </CTableDataCell>
                        <CTableDataCell className="py-3">
                          {p.officer_name ? (
                            <div>
                              <div className="fw-medium">{p.officer_name}</div>
                              {p.email_sent && (
                                <span
                                  className="text-success"
                                  style={{ fontSize: '0.7rem' }}
                                  title="Email sent via SES"
                                >
                                  ✉️ Invited
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-body-secondary small">Unassigned</span>
                          )}
                        </CTableDataCell>
                        <CTableDataCell className="py-3">
                          <div className="fw-semibold">{fmt(p.project_value)}</div>
                          <div className="text-success" style={{ fontSize: '0.75rem' }}>
                            {fmt(p.amount_received)} received
                          </div>
                        </CTableDataCell>
                        <CTableDataCell className="py-3" style={{ minWidth: '100px' }}>
                          <div className="d-flex align-items-center gap-2">
                            <CProgress
                              value={progress}
                              height={6}
                              className="flex-grow-1 rounded-pill"
                              color={progress === 100 ? 'success' : 'primary'}
                            />
                            <span className="small text-body-secondary">{progress}%</span>
                          </div>
                        </CTableDataCell>
                        <CTableDataCell className="py-3">
                          <CBadge color={statusMeta.color} shape="rounded-pill" className="px-2">
                            {statusMeta.label}
                          </CBadge>
                        </CTableDataCell>
                        <CTableDataCell className="py-3 pe-3 text-end">
                          <CButton
                            color="primary"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/pms/projects/${p.id}`)
                            }}
                          >
                            <CIcon icon={cilArrowRight} />
                          </CButton>
                        </CTableDataCell>
                      </CTableRow>
                    )
                  })}
                </CTableBody>
              </CTable>
              {recentProjects.length === 0 && (
                <div className="text-center py-5 text-body-secondary">
                  <div style={{ fontSize: '3rem' }}>📁</div>
                  <div>No projects yet</div>
                </div>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </CContainer>
  )
}

export default ProjectAssociateDashboard
