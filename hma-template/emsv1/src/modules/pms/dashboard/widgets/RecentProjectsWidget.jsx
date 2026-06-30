import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
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
import { cilArrowRight, cilFolder } from '@coreui/icons'
import { localProjects } from '../../../../services/localProjects'

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n)

const STATUS_COLOR = {
  pipeline: 'secondary',
  approved: 'info',
  ongoing: 'primary',
  completed: 'success',
}

const RecentProjectsWidget = () => {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])

  useEffect(() => {
    localProjects.seedDemoData()
    const { items } = localProjects.list({ pageSize: 6 })
    setProjects(items)
  }, [])

  return (
    <CCard className="border-0 shadow-sm h-100" style={{ borderRadius: 12 }}>
      <CCardHeader className="bg-transparent border-bottom d-flex justify-content-between align-items-center py-3">
        <h6 className="fw-bold mb-0 small text-uppercase text-body-secondary">Recent Projects</h6>
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
        {projects.length === 0 ? (
          <div className="text-center py-5 text-body-secondary">
            <CIcon icon={cilFolder} style={{ width: 36, height: 36, opacity: 0.4 }} className="mb-2 d-block mx-auto" />
            <div className="small">No projects yet</div>
          </div>
        ) : (
          <CTable hover responsive className="mb-0" style={{ fontSize: '0.8rem' }}>
            <CTableHead className="bg-body-tertiary">
              <CTableRow>
                <CTableHeaderCell className="border-0 py-2 ps-3">Project</CTableHeaderCell>
                <CTableHeaderCell className="border-0 py-2">Value</CTableHeaderCell>
                <CTableHeaderCell className="border-0 py-2">Progress</CTableHeaderCell>
                <CTableHeaderCell className="border-0 py-2">Status</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {projects.map((p) => {
                const progress =
                  p.tasks_count > 0 ? Math.round((p.tasks_completed / p.tasks_count) * 100) : 0
                return (
                  <CTableRow
                    key={p.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/pms/projects/${p.id}`)}
                  >
                    <CTableDataCell className="py-2 ps-3">
                      <div className="fw-semibold text-truncate" style={{ maxWidth: 180 }}>
                        {p.name}
                      </div>
                      <div className="text-body-secondary" style={{ fontSize: '0.7rem' }}>
                        {p.project_code || '—'} · {p.location}
                      </div>
                    </CTableDataCell>
                    <CTableDataCell className="py-2">
                      <div className="fw-semibold">{fmt(p.project_value || p.project_valuation || 0)}</div>
                    </CTableDataCell>
                    <CTableDataCell className="py-2" style={{ minWidth: 90 }}>
                      <div className="d-flex align-items-center gap-1">
                        <CProgress
                          value={progress}
                          height={5}
                          className="flex-grow-1 rounded-pill"
                          color={progress === 100 ? 'success' : 'primary'}
                        />
                        <span className="text-body-secondary" style={{ fontSize: '0.7rem' }}>
                          {progress}%
                        </span>
                      </div>
                    </CTableDataCell>
                    <CTableDataCell className="py-2">
                      <CBadge
                        color={STATUS_COLOR[p.status] || 'secondary'}
                        shape="rounded-pill"
                        className="px-2"
                        style={{ fontSize: '0.65rem' }}
                      >
                        {p.status}
                      </CBadge>
                    </CTableDataCell>
                  </CTableRow>
                )
              })}
            </CTableBody>
          </CTable>
        )}
      </CCardBody>
    </CCard>
  )
}

export default RecentProjectsWidget
