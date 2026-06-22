/**
 * ProjectDetailPage.jsx — Full project detail view for Project Associate.
 * Route: /pms/projects/:id
 */
import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CContainer,
  CCard,
  CCardBody,
  CCardHeader,
  CRow,
  CCol,
  CButton,
  CBadge,
  CProgress,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
  CAlert,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CToaster,
  CToast,
  CToastBody,
  CToastClose,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilPen,
  cilArrowLeft,
  cilPeople,
  cilTask,
  cilCheckCircle,
  cilXCircle,
  cilWarning,
  cilEnvelopeLetter,
  cilCalendar,
  cilLocationPin,
  cilBuilding,
  cilDollar,
  cilFolder,
  cilFile,
} from '@coreui/icons'
import { CChartDoughnut } from '@coreui/react-chartjs'
import { localProjects } from '../../../services/localProjects'

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n || 0)

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const STATUS_META = {
  pipeline: { label: 'Pipeline', color: 'secondary' },
  approved: { label: 'Approved', color: 'info' },
  ongoing: { label: 'Ongoing', color: 'primary' },
  completed: { label: 'Completed', color: 'success' },
}

// Demo pending approval items
const DEMO_APPROVALS = [
  {
    id: 'apr_1',
    type: 'Procurement',
    title: 'Purchase of 50 PVC pipes — 6 inch',
    submittedBy: 'Arjun Sharma',
    submittedAt: '2024-12-10',
    amount: 48500,
    status: 'pending',
  },
  {
    id: 'apr_2',
    type: 'Task Expense',
    title: 'Labour charges — Pipeline excavation (Week 2)',
    submittedBy: 'Arjun Sharma',
    submittedAt: '2024-12-08',
    amount: 32000,
    status: 'pending',
  },
]

const DEMO_TASKS = [
  { title: 'Site survey & soil testing', status: 'completed', assignee: 'Field Team A', target_date: '2024-04-01', actual_date: '2024-04-05' },
  { title: 'Pipeline route mapping', status: 'completed', assignee: 'Arjun Sharma', target_date: '2024-04-15', actual_date: '2024-04-12' },
  { title: 'Procurement of pipes & fittings', status: 'completed', assignee: 'Procurement Team', target_date: '2024-05-10', actual_date: '2024-05-10' },
  { title: 'Excavation — Phase 1 (Villages 1–4)', status: 'completed', assignee: 'Field Team A', target_date: '2024-06-01', actual_date: '2024-06-15' },
  { title: 'Excavation — Phase 2 (Villages 5–8)', status: 'completed', assignee: 'Field Team B', target_date: '2024-07-15', actual_date: '2024-07-10' },
  { title: 'Pipeline laying — Phase 1', status: 'active', assignee: 'Field Team A', target_date: '2024-09-01', actual_date: null },
  { title: 'Storage tank construction', status: 'active', assignee: 'Civil Contractor', target_date: '2024-10-01', actual_date: null },
  { title: 'Final commissioning & testing', status: 'active', assignee: 'Arjun Sharma', target_date: '2025-01-15', actual_date: null },
]

const ProjectDetailPage = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const [project, setProject] = useState(null)
  const [activeTab, setActiveTab] = useState(0)
  const [approvals, setApprovals] = useState([])
  const [approveModal, setApproveModal] = useState({ visible: false, item: null })
  const [rejectModal, setRejectModal] = useState({ visible: false, item: null })
  const [ucModal, setUcModal] = useState({ visible: false, milestone: null })
  const [toast, setToast] = useState(null)

  useEffect(() => {
    localProjects.seedDemoData()
    const p = localProjects.getById(id)
    setProject(p)
    // Load approvals only for projects that have pending ones
    if (p && p.pending_approvals > 0) {
      setApprovals(DEMO_APPROVALS)
    }
  }, [id])

  if (!project) {
    return (
      <CContainer lg className="py-4 text-center">
        <div style={{ fontSize: '4rem' }}>🔍</div>
        <h5 className="text-body-secondary">Project not found</h5>
        <CButton color="primary" variant="outline" onClick={() => navigate('/pms/projects')}>
          Back to Projects
        </CButton>
      </CContainer>
    )
  }

  const progressPct =
    project.tasks_count > 0
      ? Math.round((project.tasks_completed / project.tasks_count) * 100)
      : 0
  const receivedPct =
    project.project_value > 0
      ? Math.round((project.amount_received / project.project_value) * 100)
      : 0
  const sm = STATUS_META[project.status] || { label: project.status, color: 'secondary' }

  const handleApprove = (item) => {
    setApprovals((prev) => prev.map((a) => (a.id === item.id ? { ...a, status: 'approved' } : a)))
    setApproveModal({ visible: false, item: null })
    setToast({ color: 'success', message: '✅ Approval granted successfully' })
  }

  const handleReject = (item) => {
    setApprovals((prev) => prev.map((a) => (a.id === item.id ? { ...a, status: 'rejected' } : a)))
    setRejectModal({ visible: false, item: null })
    setToast({ color: 'danger', message: '⚠️ Request rejected and sent back' })
  }

  const handleSubmitUc = (milestone) => {
    // Mock updating the UC status and actual date locally
    const actualDate = new Date().toISOString().split('T')[0]
    const updatedMilestones = project.milestones.map((m) =>
      m.id === milestone.id ? { ...m, uc_status: 'Submitted', actual_date: actualDate } : m
    )
    const updatedProject = { ...project, milestones: updatedMilestones }
    setProject(updatedProject)
    localProjects.update(project.id, { milestones: updatedMilestones })
    setUcModal({ visible: false, milestone: null })
    setToast({ color: 'success', message: '✅ Utilisation Certificate submitted successfully' })
  }

  return (
    <CContainer lg className="py-4">
      {/* Back */}
      <CButton
        color="secondary"
        variant="ghost"
        size="sm"
        className="mb-3"
        onClick={() => navigate('/pms/projects')}
      >
        <CIcon icon={cilArrowLeft} className="me-1" />
        All Projects
      </CButton>

      {/* Hero banner */}
      <div
        className="rounded-4 mb-4 p-4 text-white position-relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%)' }}
      >
        <div className="position-absolute end-0 top-0 opacity-10" style={{ fontSize: '8rem', lineHeight: 1 }}>
          🏗️
        </div>
        <div className="position-relative d-flex flex-wrap justify-content-between align-items-start gap-3">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="d-flex align-items-center gap-2 mb-1">
              <CBadge color={sm.color} shape="rounded-pill" className="px-2">
                {sm.label}
              </CBadge>
              <CBadge color="light" className="text-dark px-2 text-capitalize">
                {project.phase}
              </CBadge>
            </div>
            <h4 className="fw-bold mb-2">{project.name}</h4>
            <div className="d-flex flex-wrap gap-3 opacity-75 small">
              <span><CIcon icon={cilLocationPin} className="me-1" />{project.location}</span>
              <span><CIcon icon={cilBuilding} className="me-1" />{project.funding_agency}</span>
              <span>
                <CIcon icon={cilCalendar} className="me-1" />
                {fmtDate(project.start_date)} → {fmtDate(project.end_date)}
              </span>
            </div>
          </div>
          <CButton
            color="light"
            className="text-primary fw-semibold flex-shrink-0"
            onClick={() => navigate(`/pms/projects/${id}/edit`)}
          >
            <CIcon icon={cilPen} className="me-1" />
            Edit Project
          </CButton>
        </div>
      </div>

      {/* KPI row */}
      <CRow className="g-3 mb-4">
        {/* Left Column */}
        <CCol xs={12} md={6}>
          <div className="d-flex flex-column gap-3 h-100">
            {[
              {
                label: 'Project Value',
                value: fmt(project.project_value),
                sub: 'Total sanctioned',
                color: '#4361ee',
                bg: 'rgba(67,97,238,0.06)',
              },
              {
                label: 'Task Progress',
                value: `${progressPct}%`,
                sub: `${project.tasks_completed}/${project.tasks_count} tasks done`,
                color: '#06d6a0',
                bg: 'rgba(6,214,160,0.06)',
              },
              {
                label: 'Beneficiaries Completed',
                value: project.beneficiaries_completed || 0,
                sub: 'Till date',
                color: '#f72585',
                bg: 'rgba(247,37,133,0.06)',
              },
            ].map((kpi, i) => (
              <CCard key={i} className="border-0 shadow-sm flex-grow-1" style={{ borderRadius: '12px' }}>
                <CCardBody className="py-3">
                  <div className="fw-bold fs-5 lh-1 mb-1" style={{ color: kpi.color }}>
                    {kpi.value}
                  </div>
                  <div className="fw-semibold small text-body">{kpi.label}</div>
                  <div className="text-body-secondary" style={{ fontSize: '0.72rem' }}>
                    {kpi.sub}
                  </div>
                  {kpi.label === 'Task Progress' && (
                    <CProgress value={progressPct} height={4} color="success" className="mt-2 rounded-pill" />
                  )}
                </CCardBody>
              </CCard>
            ))}
          </div>
        </CCol>

        {/* Right Column */}
        <CCol xs={12} md={6}>
          <div className="d-flex flex-column gap-3 h-100">
            {[
              {
                label: 'Amount Received',
                value: fmt(project.amount_received),
                sub: `${receivedPct}% of total`,
                color: '#2ec4b6',
                bg: 'rgba(46,196,182,0.06)',
              },
              {
                label: 'Amount Spent',
                value: fmt(project.amount_spent),
                sub: `Balance: ${fmt(project.amount_received - project.amount_spent)}`,
                color: '#f77f00',
                bg: 'rgba(247,127,0,0.06)',
              },
            ].map((kpi, i) => (
              <CCard key={i} className="border-0 shadow-sm flex-grow-1" style={{ borderRadius: '12px' }}>
                <CCardBody className="py-3">
                  <div className="fw-bold fs-5 lh-1 mb-1" style={{ color: kpi.color }}>
                    {kpi.value}
                  </div>
                  <div className="fw-semibold small text-body">{kpi.label}</div>
                  <div className="text-body-secondary" style={{ fontSize: '0.72rem' }}>
                    {kpi.sub}
                  </div>
                </CCardBody>
              </CCard>
            ))}
          </div>
        </CCol>
      </CRow>

      <CCard className="border-0 shadow-sm" style={{ borderRadius: '12px' }}>
        <CCardHeader className="bg-transparent border-bottom-0 px-4 pt-3">
          <CNav variant="underline" role="tablist">
            {['Overview', 'Project Officer', 'Tasks & Procurement', 'Approvals', 'Project Financials', 'Project Milestones'].map((tab, i) => (
              <CNavItem key={i}>
                <CNavLink
                  active={activeTab === i}
                  onClick={() => setActiveTab(i)}
                  role="button"
                  className="fw-medium"
                >
                  {tab}
                  {i === 3 && approvals.filter((a) => a.status === 'pending').length > 0 && (
                    <CBadge color="danger" shape="rounded-pill" className="ms-2">
                      {approvals.filter((a) => a.status === 'pending').length}
                    </CBadge>
                  )}
                  {i === 4 && (
                    <CBadge
                      color={
                        (project.project_value - (project.expense_accounted || 0) - (project.committed_expense || 0)) >= 0
                          ? 'success'
                          : 'danger'
                      }
                      shape="rounded-pill"
                      className="ms-2"
                    >
                      {(() => {
                        const bal = project.project_value - (project.expense_accounted || 0) - (project.committed_expense || 0)
                        return bal >= 0 ? '✓' : '!'
                      })()}
                    </CBadge>
                  )}
                </CNavLink>
              </CNavItem>
            ))}
          </CNav>
        </CCardHeader>

        <CCardBody className="bg-body-tertiary rounded-bottom-4 pt-4">
          <CTabContent>
            {/* Overview Tab */}
            <CTabPane visible={activeTab === 0}>
              <CRow className="g-3">
                <CCol xs={12} md={6}>
                  <CCard className="border-0 shadow-sm h-100" style={{ borderRadius: '10px' }}>
                    <CCardBody>
                      <h6 className="fw-bold mb-3 text-body-secondary text-uppercase small">Project Info</h6>
                      {[
                        { label: 'Project Code', value: project.project_code },
                        { label: 'Project Type', value: project.project_type },
                        { label: 'Funding Agency', value: project.funding_agency },
                        { label: 'Implementing Partner', value: project.implementing_partner },
                        { label: 'Location', value: project.location },
                        { label: 'Start Date', value: fmtDate(project.start_date) },
                        { label: 'End Date', value: fmtDate(project.end_date) },
                        { label: 'Last Updated', value: fmtDate(project.updated_at) },
                      ].map((row, i) => (
                        <div key={i} className="d-flex justify-content-between py-2 border-bottom small">
                          <span className="text-body-secondary">{row.label}</span>
                          <span className="fw-medium">{row.value || '—'}</span>
                        </div>
                      ))}
                    </CCardBody>
                  </CCard>
                </CCol>
                <CCol xs={12} md={6}>
                  <CCard className="border-0 shadow-sm" style={{ borderRadius: '10px' }}>
                    <CCardBody>
                      <h6 className="fw-bold mb-3 text-body-secondary text-uppercase small">Fund Utilization</h6>
                      <div className="mb-3">
                        <div className="d-flex justify-content-between mb-1 small">
                          <span className="text-body-secondary">Received</span>
                          <span className="fw-semibold">{receivedPct}%</span>
                        </div>
                        <CProgress value={receivedPct} height={8} color="success" className="rounded-pill" />
                      </div>
                      <div className="mb-3">
                        <div className="d-flex justify-content-between mb-1 small">
                          <span className="text-body-secondary">Spent</span>
                          <span className="fw-semibold">
                            {project.amount_received > 0
                              ? Math.round((project.amount_spent / project.amount_received) * 100)
                              : 0}%
                          </span>
                        </div>
                        <CProgress
                          value={
                            project.amount_received > 0
                              ? Math.round((project.amount_spent / project.amount_received) * 100)
                              : 0
                          }
                          height={8}
                          color="primary"
                          className="rounded-pill"
                        />
                      </div>
                      {project.description && (
                        <>
                          <hr />
                          <h6 className="fw-semibold small mb-2">Description</h6>
                          <p className="text-body-secondary small mb-0">{project.description}</p>
                        </>
                      )}
                    </CCardBody>
                  </CCard>
                </CCol>
              </CRow>
            </CTabPane>

            {/* Project Officer Tab */}
            <CTabPane visible={activeTab === 1}>
              {project.officer_id ? (
                <CCard className="border-0 shadow-sm" style={{ borderRadius: '10px', maxWidth: '500px' }}>
                  <CCardBody>
                    <div className="d-flex align-items-center gap-3 mb-4">
                      <div
                        className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold fs-4"
                        style={{ width: 64, height: 64, flexShrink: 0 }}
                      >
                        {project.officer_name?.charAt(0)}
                      </div>
                      <div>
                        <h5 className="fw-bold mb-0">{project.officer_name}</h5>
                        <div className="text-body-secondary small">Project Officer</div>
                      </div>
                    </div>
                    {[
                      { icon: cilEnvelopeLetter, label: project.officer_email },
                    ].map((row, i) => (
                      <div key={i} className="d-flex align-items-center gap-2 mb-2 small">
                        <CIcon icon={row.icon} className="text-primary" />
                        <span>{row.label}</span>
                      </div>
                    ))}
                    {project.email_sent && (
                      <CAlert color="success" className="mt-3 py-2 px-3 d-flex align-items-center gap-2 small mb-0">
                        <CIcon icon={cilEnvelopeLetter} />
                        <div>Access email sent via <strong>AWS SES</strong></div>
                      </CAlert>
                    )}
                    <div className="mt-3">
                      <CButton
                        color="primary"
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/pms/projects/${id}/edit`)}
                      >
                        <CIcon icon={cilPeople} className="me-1" />
                        Reassign Officer
                      </CButton>
                    </div>
                  </CCardBody>
                </CCard>
              ) : (
                <CAlert color="warning" className="d-flex align-items-center gap-2">
                  <CIcon icon={cilWarning} />
                  No officer assigned. &nbsp;
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      navigate(`/pms/projects/${id}/edit`)
                    }}
                    className="fw-semibold"
                  >
                    Assign one now →
                  </a>
                </CAlert>
              )}
            </CTabPane>

            {/* Tasks & Procurement Tab */}
            <CTabPane visible={activeTab === 2}>
              <CRow className="g-4">
                <CCol xs={12} lg={4}>
                  <CCard className="border-0 shadow-sm bg-body-tertiary h-100" style={{ borderRadius: '12px' }}>
                    <CCardBody className="text-center p-4">
                      <h6 className="fw-bold mb-4 small text-uppercase text-body-secondary">Schedule Status</h6>
                      {(() => {
                        const today = new Date().toISOString().split('T')[0]
                        const tasksStats = DEMO_TASKS.map(t => {
                          const isDelayed = t.status === 'completed' 
                            ? (t.actual_date > t.target_date) 
                            : (today > t.target_date)
                          return { ...t, isDelayed }
                        })
                        const delayedCount = tasksStats.filter(t => t.isDelayed).length
                        const onTrackCount = tasksStats.length - delayedCount

                        return (
                          <div style={{ maxWidth: '220px', margin: '0 auto' }}>
                            <CChartDoughnut
                              data={{
                                labels: ['On Track', 'Delayed'],
                                datasets: [
                                  {
                                    backgroundColor: ['#06d6a0', '#e74c3c'],
                                    data: [onTrackCount, delayedCount],
                                    borderWidth: 0,
                                  },
                                ],
                              }}
                              options={{
                                plugins: {
                                  legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, font: { size: 12 } } }
                                },
                                cutout: '75%',
                              }}
                            />
                            <div className="mt-3 small text-body-secondary">
                              <strong>{delayedCount}</strong> out of {tasksStats.length} tasks are experiencing delays.
                            </div>
                          </div>
                        )
                      })()}
                    </CCardBody>
                  </CCard>
                </CCol>
                <CCol xs={12} lg={8}>
                  <h6 className="fw-semibold mb-3">Tasks List</h6>
                  <div className="d-flex flex-column gap-2">
                    {DEMO_TASKS.map((task, i) => {
                      const today = new Date().toISOString().split('T')[0]
                      const isDelayed = task.status === 'completed' 
                        ? (task.actual_date > task.target_date) 
                        : (today > task.target_date)
                      return (
                        <div
                          key={i}
                          className="d-flex align-items-center gap-3 p-3 bg-white rounded-3 border shadow-sm"
                          style={{ fontSize: '0.875rem' }}
                        >
                          <div
                            className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0`}
                            style={{
                              width: 32,
                              height: 32,
                              background: task.status === 'completed' ? '#06d6a020' : '#f0ad4e20',
                            }}
                          >
                            <CIcon
                              icon={task.status === 'completed' ? cilCheckCircle : cilTask}
                              style={{
                                color: task.status === 'completed' ? '#06d6a0' : '#f0ad4e',
                                width: 16,
                                height: 16,
                              }}
                            />
                          </div>
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <span className="fw-bold" style={{ fontSize: '0.95rem' }}>{task.title}</span>
                              {isDelayed && (
                                <CBadge color="danger" shape="rounded-pill" className="small" style={{ fontSize: '0.65rem' }}>Delayed</CBadge>
                              )}
                            </div>
                            <CRow className="g-2 text-body-secondary mt-1" style={{ fontSize: '0.75rem' }}>
                              <CCol xs={12} sm={4}>
                                <CIcon icon={cilPeople} className="me-1 opacity-75" />
                                {task.assignee}
                              </CCol>
                              <CCol xs={6} sm={4}>
                                Target: <span className="fw-medium text-body">{fmtDate(task.target_date)}</span>
                              </CCol>
                              <CCol xs={6} sm={4}>
                                Actual: <span className="fw-medium text-body">{task.actual_date ? fmtDate(task.actual_date) : '—'}</span>
                              </CCol>
                            </CRow>
                          </div>
                          <CBadge
                            color={task.status === 'completed' ? 'success' : 'warning'}
                            shape="rounded-pill"
                            className="text-capitalize"
                          >
                            {task.status}
                          </CBadge>
                        </div>
                      )
                    })}
                  </div>
                </CCol>
              </CRow>
            </CTabPane>

            {/* Approvals Tab */}
            <CTabPane visible={activeTab === 3}>
              {approvals.length === 0 ? (
                <div className="text-center py-5 text-body-secondary">
                  <div style={{ fontSize: '3rem' }}>✅</div>
                  <h6>No pending approvals</h6>
                  <p className="small">All submissions are reviewed</p>
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {approvals.map((item) => (
                    <CCard
                      key={item.id}
                      className="border-0 shadow-sm"
                      style={{
                        borderRadius: '10px',
                        borderLeft: `4px solid ${item.status === 'pending' ? '#f77f00' : item.status === 'approved' ? '#06d6a0' : '#e74c3c'}`,
                      }}
                    >
                      <CCardBody>
                        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                          <div>
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <CBadge color="info" shape="rounded-pill" className="small">
                                {item.type}
                              </CBadge>
                              <CBadge
                                color={
                                  item.status === 'pending'
                                    ? 'warning'
                                    : item.status === 'approved'
                                    ? 'success'
                                    : 'danger'
                                }
                                shape="rounded-pill"
                                className="small text-capitalize"
                              >
                                {item.status}
                              </CBadge>
                            </div>
                            <h6 className="fw-semibold mb-1">{item.title}</h6>
                            <div className="text-body-secondary small">
                              Submitted by {item.submittedBy} · {item.submittedAt}
                            </div>
                          </div>
                          <div className="text-end">
                            <div className="fw-bold fs-5 text-primary">{fmt(item.amount)}</div>
                            {item.status === 'pending' && (
                              <div className="d-flex gap-2 mt-2">
                                <CButton
                                  color="success"
                                  size="sm"
                                  onClick={() => setApproveModal({ visible: true, item })}
                                >
                                  <CIcon icon={cilCheckCircle} className="me-1" />
                                  Approve
                                </CButton>
                                <CButton
                                  color="danger"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setRejectModal({ visible: true, item })}
                                >
                                  <CIcon icon={cilXCircle} className="me-1" />
                                  Reject
                                </CButton>
                              </div>
                            )}
                          </div>
                        </div>
                      </CCardBody>
                    </CCard>
                  ))}
                </div>
              )}
            </CTabPane>

            {/* Project Financials Tab */}
            <CTabPane visible={activeTab === 4}>
              {/* 4 KPI tiles */}
              <CRow className="g-3 mb-4">
                {[
                  {
                    label: 'Project Value',
                    value: fmt(project.project_value),
                    sub: 'Total sanctioned amount',
                    color: '#4361ee',
                    bg: 'rgba(67,97,238,0.07)',
                    icon: '📋',
                  },
                  {
                    label: 'Expense Accounted',
                    value: fmt(project.expense_accounted),
                    sub: `${project.project_value > 0 ? Math.round(((project.expense_accounted || 0) / project.project_value) * 100) : 0}% of project value`,
                    color: '#f77f00',
                    bg: 'rgba(247,127,0,0.07)',
                    icon: '📤',
                  },
                  {
                    label: 'Committed Expense',
                    value: fmt(project.committed_expense),
                    sub: 'Approved but not yet paid',
                    color: '#7209b7',
                    bg: 'rgba(114,9,183,0.07)',
                    icon: '🔒',
                  },
                  (() => {
                    const bal = project.project_value - (project.expense_accounted || 0) - (project.committed_expense || 0)
                    return {
                      label: 'Fund Balance',
                      value: fmt(bal),
                      sub: 'Available after committed expenses',
                      color: bal >= 0 ? '#06d6a0' : '#e74c3c',
                      bg: bal >= 0 ? 'rgba(6,214,160,0.07)' : 'rgba(231,76,60,0.07)',
                      icon: bal >= 0 ? '✅' : '⚠️',
                    }
                  })(),
                ].map((kpi, i) => (
                  <CCol key={i} xs={12} sm={6} xl={3}>
                    <div
                      className="rounded-3 p-4 h-100"
                      style={{ background: kpi.bg, border: `1.5px solid ${kpi.color}22` }}
                    >
                      <div className="d-flex align-items-center gap-2 mb-3">
                        <span style={{ fontSize: '1.25rem' }}>{kpi.icon}</span>
                        <span className="small fw-semibold text-body-secondary">{kpi.label}</span>
                      </div>
                      <div className="fw-bold lh-1 mb-2" style={{ color: kpi.color, fontSize: '1.35rem' }}>
                        {kpi.value}
                      </div>
                      <div className="text-body-secondary" style={{ fontSize: '0.72rem' }}>
                        {kpi.sub}
                      </div>
                    </div>
                  </CCol>
                ))}
              </CRow>

              {/* Utilisation breakdown card */}
              <CCard className="border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                <CCardBody className="px-4 py-3">
                  <h6 className="fw-semibold mb-3 small text-uppercase text-body-secondary">Utilisation Breakdown</h6>
                  <CRow className="g-4">
                    <CCol xs={12} md={4}>
                      <div className="d-flex justify-content-between mb-1 small">
                        <span className="text-body-secondary">Expense Accounted</span>
                        <span className="fw-semibold">
                          {project.project_value > 0 ? Math.round(((project.expense_accounted || 0) / project.project_value) * 100) : 0}%
                        </span>
                      </div>
                      <CProgress
                        value={project.project_value > 0 ? Math.round(((project.expense_accounted || 0) / project.project_value) * 100) : 0}
                        height={10}
                        color="warning"
                        className="rounded-pill"
                      />
                      <div className="text-body-secondary mt-1" style={{ fontSize: '0.72rem' }}>
                        {fmt(project.expense_accounted)} of {fmt(project.project_value)}
                      </div>
                    </CCol>
                    <CCol xs={12} md={4}>
                      <div className="d-flex justify-content-between mb-1 small">
                        <span className="text-body-secondary">Committed Expense</span>
                        <span className="fw-semibold">
                          {project.project_value > 0 ? Math.round(((project.committed_expense || 0) / project.project_value) * 100) : 0}%
                        </span>
                      </div>
                      <CProgress
                        value={project.project_value > 0 ? Math.round(((project.committed_expense || 0) / project.project_value) * 100) : 0}
                        height={10}
                        color="info"
                        className="rounded-pill"
                      />
                      <div className="text-body-secondary mt-1" style={{ fontSize: '0.72rem' }}>
                        {fmt(project.committed_expense)} of {fmt(project.project_value)}
                      </div>
                    </CCol>
                    <CCol xs={12} md={4}>
                      {(() => {
                        const bal = project.project_value - (project.expense_accounted || 0) - (project.committed_expense || 0)
                        const balPct = project.project_value > 0 ? Math.round((bal / project.project_value) * 100) : 0
                        return (
                          <>
                            <div className="d-flex justify-content-between mb-1 small">
                              <span className="text-body-secondary">Fund Balance</span>
                              <span className="fw-semibold" style={{ color: bal >= 0 ? '#06d6a0' : '#e74c3c' }}>
                                {balPct}%
                              </span>
                            </div>
                            <CProgress
                              value={Math.abs(balPct)}
                              height={10}
                              color={bal >= 0 ? 'success' : 'danger'}
                              className="rounded-pill"
                            />
                            <div className="text-body-secondary mt-1" style={{ fontSize: '0.72rem' }}>
                              {fmt(bal)} remaining
                            </div>
                          </>
                        )
                      })()}
                    </CCol>
                  </CRow>

                  {/* Summary totals */}
                  <hr className="mt-4 mb-3" />
                  <CRow className="g-2 text-center">
                    {[
                      { label: 'Total Sanctioned', value: fmt(project.project_value), color: '#4361ee' },
                      { label: 'Total Utilised', value: fmt((project.expense_accounted || 0) + (project.committed_expense || 0)), color: '#f77f00' },
                      { label: 'Available Balance', value: fmt(project.project_value - (project.expense_accounted || 0) - (project.committed_expense || 0)), color: '#06d6a0' },
                    ].map((item, i) => (
                      <CCol key={i} xs={12} md={4}>
                        <div className="py-2 px-3 rounded-3" style={{ background: 'var(--cui-body-bg)' }}>
                          <div className="fw-bold" style={{ color: item.color, fontSize: '1.1rem' }}>{item.value}</div>
                          <div className="text-body-secondary small">{item.label}</div>
                        </div>
                      </CCol>
                    ))}
                  </CRow>
                </CCardBody>
              </CCard>
            </CTabPane>

            {/* Project Milestones Tab */}
            <CTabPane visible={activeTab === 5}>
              <CRow className="g-4">
                {/* Milestones & UC Tracking */}
                <CCol xs={12} lg={8}>
                  <CCard className="border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
                    <CCardBody className="p-4">
                      <div className="d-flex align-items-center justify-content-between mb-4">
                        <h6 className="fw-bold mb-0 text-uppercase text-body-secondary small">Fund Installments & UCs</h6>
                      </div>
                      
                      {project.milestones && project.milestones.length > 0 ? (
                        <div className="position-relative">
                          {/* Vertical timeline line */}
                          <div
                            className="position-absolute bg-secondary opacity-25"
                            style={{ left: '16px', top: '10px', bottom: '10px', width: '2px' }}
                          ></div>
                          
                          <div className="d-flex flex-column gap-4">
                            {project.milestones.map((ms, i) => (
                              <div key={ms.id} className="d-flex position-relative">
                                {/* Timeline Dot */}
                                <div
                                  className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 z-1"
                                  style={{
                                    width: 34,
                                    height: 34,
                                    background: ms.uc_status === 'Approved' ? '#06d6a0' : ms.uc_status === 'Submitted' ? '#4361ee' : '#fff',
                                    border: `2px solid ${ms.uc_status === 'Approved' ? '#06d6a0' : ms.uc_status === 'Submitted' ? '#4361ee' : '#dee2e6'}`,
                                    color: ms.uc_status === 'Pending' ? '#adb5bd' : '#fff',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                  }}
                                >
                                  {ms.uc_status === 'Approved' ? '✓' : i + 1}
                                </div>
                                
                                {/* Content Card */}
                                <div className="ms-4 flex-grow-1">
                                  <div className="p-3 rounded-3 border bg-white shadow-sm">
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                      <div>
                                        <h6 className="fw-bold mb-1">{ms.title}</h6>
                                        <div className="text-primary fw-bold fs-5">{fmt(ms.amount)}</div>
                                      </div>
                                      <CBadge
                                        color={ms.uc_status === 'Approved' ? 'success' : ms.uc_status === 'Submitted' ? 'primary' : 'warning'}
                                        shape="rounded-pill"
                                      >
                                        UC: {ms.uc_status}
                                      </CBadge>
                                    </div>
                                    
                                    <CRow className="g-2 small text-body-secondary mt-2">
                                      <CCol xs={6}>
                                        <div><CIcon icon={cilFolder} className="me-1" /> Target Date</div>
                                        <div className="fw-medium text-body">{fmtDate(ms.target_date)}</div>
                                      </CCol>
                                      <CCol xs={6}>
                                        <div><CIcon icon={cilFolder} className="me-1" /> Actual Date</div>
                                        <div className="fw-medium text-body">{ms.actual_date ? fmtDate(ms.actual_date) : '—'}</div>
                                      </CCol>
                                    </CRow>
                                    
                                    {ms.uc_status === 'Pending' && (
                                      <div className="mt-3 pt-3 border-top text-end">
                                        <CButton color="primary" size="sm" onClick={() => setUcModal({ visible: true, milestone: ms })}>
                                          <CIcon icon={cilFile} className="me-1" />
                                          Submit UC
                                        </CButton>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-5 text-body-secondary">
                          No milestones configured for this project.
                        </div>
                      )}
                    </CCardBody>
                  </CCard>
                </CCol>
                
                {/* Project Risks */}
                <CCol xs={12} lg={4}>
                  <CCard className="border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
                    <CCardBody className="p-4">
                      <div className="d-flex align-items-center justify-content-between mb-4">
                        <h6 className="fw-bold mb-0 text-uppercase text-body-secondary small">Project Risks</h6>
                        <CButton color="secondary" variant="ghost" size="sm">
                          Add Risk
                        </CButton>
                      </div>
                      
                      {project.risks && project.risks.length > 0 ? (
                        <div className="d-flex flex-column gap-3">
                          {project.risks.map((risk) => (
                            <div key={risk.id} className="p-3 rounded-3 border bg-body-tertiary">
                              <div className="d-flex justify-content-between mb-2">
                                <CBadge
                                  color={risk.severity === 'High' ? 'danger' : risk.severity === 'Medium' ? 'warning' : 'info'}
                                  shape="rounded-pill"
                                >
                                  {risk.severity} Risk
                                </CBadge>
                                <span className="small text-body-secondary">{risk.status}</span>
                              </div>
                              <div className="fw-medium text-body small">
                                {risk.title}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-body-secondary small bg-body-tertiary rounded-3 border">
                          No active risks logged.
                        </div>
                      )}
                    </CCardBody>
                  </CCard>
                </CCol>
              </CRow>
            </CTabPane>
          </CTabContent>
        </CCardBody>
      </CCard>

      {/* Approve Modal */}
      <CModal visible={approveModal.visible} onClose={() => setApproveModal({ visible: false, item: null })} alignment="center">
        <CModalHeader>
          <CModalTitle>Confirm Approval</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p>
            Approve <strong>{approveModal.item?.title}</strong> for{' '}
            <strong className="text-primary">{fmt(approveModal.item?.amount)}</strong>?
          </p>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="ghost" onClick={() => setApproveModal({ visible: false, item: null })}>
            Cancel
          </CButton>
          <CButton color="success" onClick={() => handleApprove(approveModal.item)}>
            <CIcon icon={cilCheckCircle} className="me-1" />
            Approve
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Reject Modal */}
      <CModal visible={rejectModal.visible} onClose={() => setRejectModal({ visible: false, item: null })} alignment="center">
        <CModalHeader>
          <CModalTitle>Reject Request</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p>
            Reject <strong>{rejectModal.item?.title}</strong>? This will send it back to the Project Officer.
          </p>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="ghost" onClick={() => setRejectModal({ visible: false, item: null })}>
            Cancel
          </CButton>
          <CButton color="danger" onClick={() => handleReject(rejectModal.item)}>
            <CIcon icon={cilXCircle} className="me-1" />
            Reject
          </CButton>
        </CModalFooter>
      </CModal>

      {/* UC Submission Modal */}
      <CModal visible={ucModal.visible} onClose={() => setUcModal({ visible: false, milestone: null })} alignment="center">
        <CModalHeader>
          <CModalTitle>Submit Utilisation Certificate (UC)</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <div className="mb-3">
            <label className="form-label small text-body-secondary">Installment</label>
            <div className="fw-medium">{ucModal.milestone?.title} — {fmt(ucModal.milestone?.amount)}</div>
          </div>
          <div className="mb-3">
            <label className="form-label small text-body-secondary">Upload UC Document (PDF)</label>
            <input type="file" className="form-control" accept=".pdf" />
          </div>
          <div className="mb-0">
            <label className="form-label small text-body-secondary">Remarks</label>
            <textarea className="form-control" rows="3" placeholder="Any comments regarding the fund utilisation..."></textarea>
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="ghost" onClick={() => setUcModal({ visible: false, milestone: null })}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={() => handleSubmitUc(ucModal.milestone)}>
            <CIcon icon={cilFile} className="me-1" />
            Submit
          </CButton>
        </CModalFooter>
      </CModal>

      <CToaster placement="top-end">
        {toast && (
          <CToast autohide delay={3000} visible color={toast.color} className="text-white" onClose={() => setToast(null)}>
            <div className="d-flex">
              <CToastBody>{toast.message}</CToastBody>
              <CToastClose className="me-2 m-auto" white />
            </div>
          </CToast>
        )}
      </CToaster>
    </CContainer>
  )
}

export default ProjectDetailPage
