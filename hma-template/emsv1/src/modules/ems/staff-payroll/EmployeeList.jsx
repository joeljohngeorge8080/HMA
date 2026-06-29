import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CFormInput,
  CFormSelect,
  CInputGroup,
  CInputGroupText,
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

import { usePermission } from '../../../hooks/usePermission'
import { MODULE } from '../../../constants/modules'
import api from '../../../services/api'
import { localEmployees } from '../../../services/localEmployees'

const STATUS_COLORS = {
  Active: 'success',
  Inactive: 'secondary',
  Resigned: 'danger',
  Retired: 'warning',
  Deleted: 'dark',
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

  const hasFilters = search || filterStatus || filterDept || filterCategory

  return (
    <>
      {/* Page header */}
      <div className="d-flex align-items-start justify-content-between mb-4 gap-3">
        <div>
          <h4 className="fw-semibold mb-1">Staff &amp; Payroll</h4>
          <p className="text-body-secondary small mb-0">
            {total > 0
              ? `${total} employee${total !== 1 ? 's' : ''}`
              : 'Manage employee records and payroll information'}
          </p>
        </div>
        {canEdit && (
          <CButton color="primary" onClick={() => navigate('/ems/staff-payroll/new')}>
            <CIcon icon={cilPlus} className="me-1" />
            Add Employee
          </CButton>
        )}
      </div>

      <CCard>
        <CCardBody>
          {/* Filters */}
          <CRow className="g-2 mb-4">
            <CCol md={5}>
              <CInputGroup>
                <CInputGroupText>
                  <CIcon icon={cilSearch} />
                </CInputGroupText>
                <CFormInput
                  placeholder="Search by name or employee ID…"
                  value={search}
                  onChange={handleSearchChange}
                />
              </CInputGroup>
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
            <CCol md={3}>
              <CFormSelect
                value={filterDept}
                onChange={(e) => {
                  setFilterDept(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">All Departments</option>
                <option>Finance</option>
                <option>HR</option>
                <option>HMA Management</option>
                <option>IT</option>
                <option>SDP</option>
                <option>Utility Staff</option>
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
                <option value="Permanent">Permanent</option>
                <option value="FTC">FTC</option>
                <option value="TPC">Third Party</option>
              </CFormSelect>
            </CCol>
          </CRow>

          {error && <p className="text-danger small mb-3">{error}</p>}

          {loading ? (
            <div className="text-center py-5">
              <CSpinner color="primary" />
            </div>
          ) : (
            <>
              <CTable hover responsive className="mb-0">
                <CTableHead color="light">
                  <CTableRow>
                    <CTableHeaderCell style={{ width: 48 }}>#</CTableHeaderCell>
                    <CTableHeaderCell>Employee ID</CTableHeaderCell>
                    <CTableHeaderCell>Name</CTableHeaderCell>
                    <CTableHeaderCell>Designation</CTableHeaderCell>
                    <CTableHeaderCell>Department</CTableHeaderCell>
                    <CTableHeaderCell>Category</CTableHeaderCell>
                    <CTableHeaderCell>Gender</CTableHeaderCell>
                    <CTableHeaderCell>Monthly CTC</CTableHeaderCell>
                    <CTableHeaderCell>Joined</CTableHeaderCell>
                    <CTableHeaderCell>Status</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {employees.length === 0 ? (
                    <CTableRow>
                      <CTableDataCell colSpan={10}>
                        <div className="hma-empty-state">
                          <CIcon icon={cilUser} className="hma-empty-state__icon" />
                          <p className="hma-empty-state__title">
                            {hasFilters ? 'No matching employees' : 'No employees yet'}
                          </p>
                          <p className="hma-empty-state__desc">
                            {hasFilters
                              ? 'Try adjusting your search or filter criteria.'
                              : 'Add employees to get started.'}
                          </p>
                        </div>
                      </CTableDataCell>
                    </CTableRow>
                  ) : (
                    employees.map((emp, idx) => {
                      const name =
                        emp.employee_name ||
                        [emp.first_name, emp.middle_name, emp.last_name]
                          .filter(Boolean)
                          .join(' ') ||
                        emp.full_name ||
                        '—'
                      const designation = emp.employment?.designation || emp.designation || '—'
                      const department = emp.employment?.department || emp.department || '—'
                      const salary = emp.current_salary || 0

                      return (
                        <CTableRow
                          key={emp.id}
                          style={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/ems/staff-payroll/${emp.id}`)}
                        >
                          <CTableDataCell className="text-body-secondary">
                            {(page - 1) * PAGE_SIZE + idx + 1}
                          </CTableDataCell>
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
                          <CTableDataCell className="text-body-secondary">
                            {emp.joined_date || emp.employment?.start_date || '—'}
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
                <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
                  <small className="text-body-secondary">
                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of{' '}
                    {total}
                  </small>
                  <CPagination size="sm">
                    <CPaginationItem disabled={page === 1} onClick={() => setPage(page - 1)}>
                      Previous
                    </CPaginationItem>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                      <CPaginationItem key={p} active={p === page} onClick={() => setPage(p)}>
                        {p}
                      </CPaginationItem>
                    ))}
                    <CPaginationItem
                      disabled={page === totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      Next
                    </CPaginationItem>
                  </CPagination>
                </div>
              )}
            </>
          )}
        </CCardBody>
      </CCard>
    </>
  )
}

export default EmployeeList
