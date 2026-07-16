import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CContainer,
  CCard,
  CCardBody,
  CCardHeader,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CBadge,
  CButton,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowRight, cilBriefcase } from '@coreui/icons'
import { localProjects } from '../../../services/localProjects'
import { localOrgPool } from '../../../services/localOrgPool'

const ProjectOverheadsList = () => {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])

  useEffect(() => {
    // Only fetch projects that are active/ongoing to show overheads
    const all = localProjects
      .list({ pageSize: 1000 })
      .items.filter(
        (p) => ['ongoing', 'active', 'approved'].includes(p.status),
      )

    // Enrich with hr/core budgets
    const hrBudgets = localOrgPool.getActiveProjectMonthlyBudgets('hr')
    const coreBudgets = localOrgPool.getActiveProjectMonthlyBudgets('core')

    const enriched = all.map((p) => {
      const hr = hrBudgets.find((b) => b.projectId === p.id)
      const core = coreBudgets.find((b) => b.projectId === p.id)
      return {
        ...p,
        hrMonthly: hr ? hr.monthlyBudget : 0,
        coreMonthly: core ? core.monthlyBudget : 0,
      }
    })

    setProjects(enriched)
  }, [])

  const formatCurrency = (amt) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt || 0)

  return (
    <CContainer lg className="py-4">
      <h4 className="fw-bold mb-4">🏢 Project Overheads Management</h4>
      <CCard className="shadow-sm border-top border-4 border-top-info">
        <CCardHeader className="bg-transparent fw-semibold pt-3">
          Active Projects ({projects.length})
        </CCardHeader>
        <CCardBody className="p-0">
          {projects.length === 0 ? (
            <div className="text-center text-body-tertiary py-5 small">
              No active projects with overhead allocations.
            </div>
          ) : (
            <CTable hover align="middle" className="mb-0" style={{ fontSize: '0.85rem' }}>
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell className="ps-4">Project Name</CTableHeaderCell>
                  <CTableHeaderCell>Status</CTableHeaderCell>
                  <CTableHeaderCell>HR Monthly Budget</CTableHeaderCell>
                  <CTableHeaderCell>Core Monthly Budget</CTableHeaderCell>
                  <CTableHeaderCell className="text-end pe-4">Action</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {projects.map((p) => (
                  <CTableRow key={p.id}>
                    <CTableDataCell className="ps-4 fw-medium text-dark">
                      {p.title || p.name}
                      <div className="text-body-tertiary small mt-1">{p.project_code}</div>
                    </CTableDataCell>
                    <CTableDataCell>
                      <CBadge color="success" shape="rounded-pill">
                        {p.status}
                      </CBadge>
                    </CTableDataCell>
                    <CTableDataCell className="text-primary fw-semibold">
                      {formatCurrency(p.hrMonthly)}
                    </CTableDataCell>
                    <CTableDataCell className="text-info fw-semibold">
                      {formatCurrency(p.coreMonthly)}
                    </CTableDataCell>
                    <CTableDataCell className="text-end pe-4">
                      <CButton
                        color="info"
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/ems/projects/${p.id}/overheads`)}
                      >
                        Manage <CIcon icon={cilArrowRight} className="ms-1" />
                      </CButton>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          )}
        </CCardBody>
      </CCard>
    </CContainer>
  )
}

export default ProjectOverheadsList
