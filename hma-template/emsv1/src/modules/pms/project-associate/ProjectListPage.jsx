/**
 * ProjectListPage.jsx — All projects list with search, filter, and actions.
 * Route: /pms/projects
 */
import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  CCard,
  CCardBody,
  CRow,
  CCol,
  CButton,
  CBadge,
  CFormInput,
  CFormSelect,
  CInputGroup,
  CInputGroupText,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CProgress,
  CToaster,
  CToast,
  CToastBody,
  CToastClose,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilPlus,
  cilSearch,
  cilFilterX,
  cilPen,
  cilArrowRight,
  cilPeople,
  cilOptions,
  cilFolder,
  cilTrash,
} from '@coreui/icons'
import { localProjects } from '../../../services/localProjects'
import useRole from '../../../hooks/useRole'
import useAuth from '../../../hooks/useAuth'
import { ROLE } from '../../../constants/roles'
import DeleteProjectConfirmModal from './DeleteProjectConfirmModal'

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n)

const STATUS_META = {
  pipeline: { label: 'Pipeline', color: 'secondary' },
  approved: { label: 'Approved', color: 'info' },
  ongoing: { label: 'Ongoing', color: 'primary' },
  completed: { label: 'Completed', color: 'success' },
}

const ProjectListPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [projects, setProjects] = useState([])
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({
    search: '',
    status: searchParams.get('status') || '',
    phase: '',
  })
  const [toast, setToast] = useState(null)
  const [deleteModal, setDeleteModal] = useState({ visible: false, project: null })

  const role = useRole()
  const { user } = useAuth()
  const isPA = role === ROLE.PROJECT_ASSOCIATE
  const canDelete = role === ROLE.PROJECT_OFFICER || role === ROLE.PROJECT_ASSOCIATE

  // Sync filter when URL ?status= changes (e.g. clicking sidebar lifecycle items)
  useEffect(() => {
    const s = searchParams.get('status') || ''
    setFilters((prev) => ({ ...prev, status: s }))
  }, [searchParams])

  const load = useCallback(() => {
    localProjects.seedDemoData()
    // PAs see only their own projects; all other roles see everything
    const result = localProjects.list({
      ...filters,
      paId: isPA ? (user?.employee_id || '') : '',
    })
    setProjects(result.items)
    setTotal(result.total)
  }, [filters, isPA, user?.employee_id])

  useEffect(() => {
    load()
  }, [load])

  const stats = isPA
    ? localProjects.getStatsForPA(user?.employee_id || '')
    : localProjects.getStats()

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  const clearFilters = () => setFilters({ search: '', status: '', phase: '' })

  const handleDeleteConfirm = () => {
    const proj = deleteModal.project
    localProjects.remove(proj.id)
    setDeleteModal({ visible: false, project: null })
    setToast({ color: 'success', message: `"${proj.name}" was deleted.` })
    load()
  }

  return (
    <>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h4 className="fw-bold mb-1">All Projects</h4>
          <p className="text-body-secondary mb-0 small">
            {total} project{total !== 1 ? 's' : ''} total
          </p>
        </div>
        <CButton
          color="primary"
          className="shadow-sm"
          onClick={() => navigate('/pms/projects/create')}
        >
          <CIcon icon={cilPlus} className="me-1" />
          Create Project
        </CButton>
      </div>

      {/* Stat chips */}
      <div className="d-flex gap-2 flex-wrap mb-4">
        {[
          { label: 'All', value: stats.total, status: '' },
          { label: 'Ongoing', value: stats.ongoing, status: 'ongoing', color: 'primary' },
          { label: 'Approved', value: stats.approved, status: 'approved', color: 'info' },
          { label: 'Pipeline', value: stats.pipeline, status: 'pipeline', color: 'secondary' },
          { label: 'Completed', value: stats.completed, status: 'completed', color: 'success' },
        ].map((chip) => (
          <button
            key={chip.status}
            className={`btn btn-sm px-3 fw-medium ${
              filters.status === chip.status ? 'btn-primary' : 'btn-light border'
            }`}
            style={{ borderRadius: '20px' }}
            onClick={() => handleFilterChange('status', chip.status)}
          >
            {chip.label}
            <span
              className={`ms-2 badge rounded-pill ${
                filters.status === chip.status
                  ? 'text-white bg-primary-subtle'
                  : 'bg-secondary text-white'
              }`}
            >
              {chip.value}
            </span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <CCard className="mb-3 shadow-sm border-0" style={{ borderRadius: '12px' }}>
        <CCardBody className="py-3">
          <CRow className="g-2 align-items-end">
            <CCol xs={12} md={5}>
              <CInputGroup size="sm">
                <CInputGroupText className="bg-transparent">
                  <CIcon icon={cilSearch} size="sm" />
                </CInputGroupText>
                <CFormInput
                  placeholder="Search by name, location, officer..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </CInputGroup>
            </CCol>
            <CCol xs={6} md={3}>
              <CFormSelect
                size="sm"
                value={filters.phase}
                onChange={(e) => handleFilterChange('phase', e.target.value)}
              >
                <option value="">All Phases</option>
                <option value="design_and_initiation">Design and Initiation</option>
                <option value="implementation">Implementation</option>
                <option value="monitoring_and_evaluation">Monitoring and Evaluation</option>
              </CFormSelect>
            </CCol>
            <CCol xs={6} md={2}>
              <CButton
                color="secondary"
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="w-100"
              >
                <CIcon icon={cilFilterX} size="sm" className="me-1" />
                Clear
              </CButton>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      {/* Table */}
      <CCard className="border-0 shadow-sm" style={{ borderRadius: '12px' }}>
        <CTable hover responsive className="mb-0" style={{ fontSize: '0.875rem' }}>
          <CTableHead className="bg-body-tertiary">
            <CTableRow>
              <CTableHeaderCell className="border-0 py-3 ps-4" style={{ width: '22%' }}>
                Project
              </CTableHeaderCell>
              <CTableHeaderCell className="border-0 py-3">Code</CTableHeaderCell>
              <CTableHeaderCell className="border-0 py-3">Type</CTableHeaderCell>
              <CTableHeaderCell className="border-0 py-3">Officer</CTableHeaderCell>
              <CTableHeaderCell className="border-0 py-3">Value</CTableHeaderCell>
              <CTableHeaderCell className="border-0 py-3">Amount Received</CTableHeaderCell>
              <CTableHeaderCell className="border-0 py-3">Progress</CTableHeaderCell>
              <CTableHeaderCell className="border-0 py-3">Status</CTableHeaderCell>
              <CTableHeaderCell className="border-0 py-3 text-end pe-4">Actions</CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {projects.map((p) => {
              const pct =
                p.tasks_count > 0 ? Math.round((p.tasks_completed / p.tasks_count) * 100) : 0
              const sm = STATUS_META[p.status] || { label: p.status, color: 'secondary' }
              return (
                <CTableRow
                  key={p.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/pms/projects/${p.id}`)}
                >
                  <CTableDataCell className="py-3 ps-4">
                    <div className="fw-semibold">{p.name}</div>
                    <div className="text-body-secondary" style={{ fontSize: '0.75rem' }}>
                      {p.location} · {p.funding_agency}
                    </div>
                  </CTableDataCell>
                  <CTableDataCell className="py-3">
                    <span
                      className="fw-medium text-body-secondary small"
                      style={{ letterSpacing: '0.5px' }}
                    >
                      {p.project_code || '—'}
                    </span>
                  </CTableDataCell>
                  <CTableDataCell className="py-3">
                    <span className="text-body-secondary small">{p.project_type || '—'}</span>
                  </CTableDataCell>
                  <CTableDataCell className="py-3">
                    {p.officer_name ? (
                      <div>
                        <div className="fw-medium">{p.officer_name}</div>
                        {p.email_sent && (
                          <span className="text-success" style={{ fontSize: '0.7rem' }}>
                            Emailed
                          </span>
                        )}
                      </div>
                    ) : (
                      <span
                        className="text-danger small fw-medium"
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/pms/projects/${p.id}/edit`)
                        }}
                      >
                        + Assign Officer
                      </span>
                    )}
                  </CTableDataCell>
                  <CTableDataCell className="py-3 fw-semibold">
                    {fmt(p.project_value)}
                  </CTableDataCell>
                  <CTableDataCell className="py-3">
                    <div className="text-success fw-medium">{fmt(p.amount_received)}</div>
                    {p.project_value > 0 && (
                      <div className="text-body-secondary" style={{ fontSize: '0.7rem' }}>
                        {Math.round((p.amount_received / p.project_value) * 100)}% of total
                      </div>
                    )}
                  </CTableDataCell>
                  <CTableDataCell className="py-3" style={{ minWidth: '120px' }}>
                    <div className="d-flex align-items-center gap-2">
                      <CProgress
                        value={pct}
                        height={6}
                        className="flex-grow-1 rounded-pill"
                        color={pct === 100 ? 'success' : 'primary'}
                      />
                      <span className="small text-body-secondary" style={{ minWidth: '28px' }}>
                        {pct}%
                      </span>
                    </div>
                    <div className="text-body-secondary" style={{ fontSize: '0.7rem' }}>
                      {p.tasks_completed}/{p.tasks_count} tasks
                    </div>
                  </CTableDataCell>
                  <CTableDataCell className="py-3">
                    <CBadge color={sm.color} shape="rounded-pill" className="px-2 text-capitalize">
                      {sm.label}
                    </CBadge>
                  </CTableDataCell>
                  <CTableDataCell className="py-3 pe-4 text-end">
                    <CDropdown alignment="end">
                      <CDropdownToggle
                        color="secondary"
                        variant="ghost"
                        size="sm"
                        caret={false}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <CIcon icon={cilOptions} />
                      </CDropdownToggle>
                      <CDropdownMenu>
                        <CDropdownItem
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/pms/projects/${p.id}`)
                          }}
                        >
                          <CIcon icon={cilArrowRight} className="me-2" />
                          View Details
                        </CDropdownItem>
                        <CDropdownItem
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/pms/projects/${p.id}/edit`)
                          }}
                        >
                          <CIcon icon={cilPen} className="me-2" />
                          Edit Project
                        </CDropdownItem>
                        <CDropdownItem
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/pms/projects/${p.id}/edit#officer`)
                          }}
                        >
                          <CIcon icon={cilPeople} className="me-2" />
                          Assign Officer
                        </CDropdownItem>
                        {canDelete && (
                          <CDropdownItem
                            className="text-danger"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteModal({ visible: true, project: p })
                            }}
                          >
                            <CIcon icon={cilTrash} className="me-2" />
                            Delete Project
                          </CDropdownItem>
                        )}
                      </CDropdownMenu>
                    </CDropdown>
                  </CTableDataCell>
                </CTableRow>
              )
            })}
          </CTableBody>
        </CTable>

        {projects.length === 0 && (
          <div className="text-center py-5">
            <div className="mb-2 text-body-secondary">
              <CIcon icon={cilFolder} style={{ width: 48, height: 48 }} />
            </div>
            <h5 className="text-body-secondary">No projects found</h5>
            <p className="text-body-tertiary">
              {filters.search || filters.status || filters.phase
                ? 'Try adjusting your filters'
                : 'Get started by creating your first project'}
            </p>
            {!filters.search && !filters.status && (
              <CButton color="primary" onClick={() => navigate('/pms/projects/create')}>
                <CIcon icon={cilPlus} className="me-1" />
                Create Project
              </CButton>
            )}
          </div>
        )}
      </CCard>

      <CToaster placement="top-end">
        {toast && (
          <CToast
            autohide
            delay={3000}
            visible
            color={toast.color}
            className="text-white"
            onClose={() => setToast(null)}
          >
            <div className="d-flex">
              <CToastBody>{toast.message}</CToastBody>
              <CToastClose className="me-2 m-auto" white />
            </div>
          </CToast>
        )}
      </CToaster>

      <DeleteProjectConfirmModal
        visible={deleteModal.visible}
        project={deleteModal.project}
        onClose={() => setDeleteModal({ visible: false, project: null })}
        onConfirm={handleDeleteConfirm}
      />
    </>
  )
}

export default ProjectListPage
