import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormSelect,
  CPagination,
  CPaginationItem,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilSearch, cilUser } from '@coreui/icons'

import { usePermission } from '../../hooks/usePermission'
import { MODULE } from '../../constants/modules'
import api from '../../services/api'
import { localEmployees } from '../../services/localEmployees'

const STATUS_COLORS = {
  Active: 'success',
  Inactive: 'secondary',
  Resigned: 'danger',
  Retired: 'warning',
}

const EmployeeList = () => {
  const navigate = useNavigate()
  const canEdit = usePermission(MODULE.STAFF_PAYROLL, 'edit')

  const [employees, setEmployees] = useState([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 25

  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true)
      setError('')
      try {
        // Try the real API first
        const params = new URLSearchParams({ page, page_size: PAGE_SIZE })
        if (search) params.set('search', search)
        if (filterStatus) params.set('status', filterStatus)
        if (filterDept) params.set('department', filterDept)
        if (filterCategory) params.set('category', filterCategory)

        const { data } = await api.get(`/employees?${params}`)
        setEmployees(data.items)
        setTotal(data.total)
        setTotalPages(data.total_pages)
      } catch {
        // API not available — read from local store
        const result = localEmployees.list({
          search,
          status: filterStatus,
          department: filterDept,
          category: filterCategory,
          page,
          pageSize: PAGE_SIZE,
        })
        setEmployees(result.items)
        setTotal(result.total)
        setTotalPages(result.total_pages)
      } finally {
        setLoading(false)
      }
    }
    fetchEmployees()
  }, [page, search, filterStatus, filterDept, filterCategory])

  const handleSearchChange = (e) => {
    setSearch(e.target.value)
    setPage(1)
  }

  return (
    <CCard className="mb-4">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <strong>
          <CIcon icon={cilUser} className="me-2" />
          Staff & Payroll
        </strong>
        {canEdit && (
          <CButton color="primary" size="sm" onClick={() => navigate('/staff/new')}>
            <CIcon icon={cilPlus} className="me-1" />
            Add Employee
          </CButton>
        )}
      </CCardHeader>

      <CCardBody>
        {/* Filters */}
        <CRow className="g-2 mb-3">
          <CCol md={4}>
            <CFormInput
              placeholder="Search by name or employee ID..."
              value={search}
              onChange={handleSearchChange}
              prepend={<CIcon icon={cilSearch} />}
            />
          </CCol>
          <CCol md={2}>
            <CFormSelect
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All Status</option>
              <option>Active</option>
              <option>Inactive</option>
              <option>Resigned</option>
              <option>Retired</option>
            </CFormSelect>
          </CCol>
          <CCol md={2}>
            <CFormSelect
              value={filterDept}
              onChange={(e) => {
                setFilterDept(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All Departments</option>
              <option>HR</option>
              <option>Finance</option>
              <option>Projects</option>
              <option>Administration</option>
            </CFormSelect>
          </CCol>
          <CCol md={2}>
            <CFormSelect
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All Categories</option>
              <option>Permanent</option>
              <option>FTC</option>
              <option>TPC</option>
            </CFormSelect>
          </CCol>
        </CRow>

        {error && <p className="text-danger">{error}</p>}

        {loading ? (
          <div className="text-center py-5">
            <CSpinner color="primary" />
          </div>
        ) : (
          <>
            <CTable hover responsive bordered>
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell>#</CTableHeaderCell>
                  <CTableHeaderCell>Employee ID</CTableHeaderCell>
                  <CTableHeaderCell>Employee Name</CTableHeaderCell>
                  <CTableHeaderCell>Designation</CTableHeaderCell>
                  <CTableHeaderCell>Department</CTableHeaderCell>
                  <CTableHeaderCell>Category</CTableHeaderCell>
                  <CTableHeaderCell>Gender</CTableHeaderCell>
                  <CTableHeaderCell>Salary CTC</CTableHeaderCell>
                  <CTableHeaderCell>Status</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {employees.length === 0 ? (
                  <CTableRow>
                    <CTableDataCell colSpan={9} className="text-center text-body-secondary py-4">
                      No employees found
                    </CTableDataCell>
                  </CTableRow>
                ) : (
                  employees.map((emp, idx) => {
                    const name =
                      emp.employee_name ||
                      [emp.first_name, emp.middle_name, emp.last_name].filter(Boolean).join(' ') ||
                      emp.full_name ||
                      '—'
                    const designation = emp.employment?.designation || emp.designation || '—'
                    const department = emp.employment?.department || emp.department || '—'
                    const salary = emp.current_salary || 0

                    return (
                      <CTableRow
                        key={emp.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/staff/${emp.id}`)}
                      >
                        <CTableDataCell>{(page - 1) * PAGE_SIZE + idx + 1}</CTableDataCell>
                        <CTableDataCell className="fw-semibold text-primary">
                          {emp.employee_id}
                        </CTableDataCell>
                        <CTableDataCell>{name}</CTableDataCell>
                        <CTableDataCell>{designation}</CTableDataCell>
                        <CTableDataCell>{department}</CTableDataCell>
                        <CTableDataCell>{emp.employee_category || '—'}</CTableDataCell>
                        <CTableDataCell>{emp.gender || '—'}</CTableDataCell>
                        <CTableDataCell>
                          {salary > 0 ? `₹${Number(salary).toLocaleString('en-IN')}` : '—'}
                        </CTableDataCell>
                        <CTableDataCell>
                          <CBadge color={STATUS_COLORS[emp.status] || 'secondary'}>
                            {emp.status}
                          </CBadge>
                        </CTableDataCell>
                      </CTableRow>
                    )
                  })
                )}
              </CTableBody>
            </CTable>

            {totalPages > 1 && (
              <div className="d-flex justify-content-between align-items-center mt-2">
                <small className="text-body-secondary">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of{' '}
                  {total}
                </small>
                <CPagination>
                  <CPaginationItem disabled={page === 1} onClick={() => setPage(page - 1)}>
                    Previous
                  </CPaginationItem>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                    <CPaginationItem key={p} active={p === page} onClick={() => setPage(p)}>
                      {p}
                    </CPaginationItem>
                  ))}
                  <CPaginationItem disabled={page === totalPages} onClick={() => setPage(page + 1)}>
                    Next
                  </CPaginationItem>
                </CPagination>
              </div>
            )}
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

export default EmployeeList
