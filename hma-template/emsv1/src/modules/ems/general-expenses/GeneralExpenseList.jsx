import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
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
import {
  cilChartPie,
  cilCloudUpload,
  cilPencil,
  cilPlus,
  cilTags,
  cilTrash,
} from '@coreui/icons'

import { usePermission } from '../../../hooks/usePermission'
import { MODULE } from '../../../constants/modules'
import api from '../../../services/api'
import { localGeneralExpenses } from '../../../services/localGeneralExpenses'
import ExpenseFilters from './components/ExpenseFilters'
import VarianceBadge from './components/VarianceBadge'

const thisYear = new Date().getFullYear()
const thisMonth = new Date().getMonth() + 1

const STATUS_COLORS = {
  Pending: 'warning',
  Paid: 'success',
  Overdue: 'danger',
  Cancelled: 'secondary',
}

const MONTHS = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const currency = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)

const GeneralExpenseList = () => {
  const navigate = useNavigate()
  const canEdit = usePermission(MODULE.GENERAL_EXPENSES, 'edit')

  const [filters, setFilters] = useState({
    year: thisYear,
    month: thisMonth,
    categoryId: '',
    status: '',
  })
  const [categories, setCategories] = useState([])
  const [expenses, setExpenses] = useState([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const PAGE_SIZE = 25

  useEffect(() => {
    const loadCats = async () => {
      try {
        const { data } = await api.get('/general-expenses/categories')
        setCategories(data)
      } catch {
        setCategories(localGeneralExpenses.categories.list())
      }
    }
    loadCats()
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ page, page_size: PAGE_SIZE })
        if (filters.year) params.set('year', filters.year)
        if (filters.month) params.set('month', filters.month)
        if (filters.categoryId) params.set('category_id', filters.categoryId)
        if (filters.status) params.set('status', filters.status)
        const { data } = await api.get(`/general-expenses?${params}`)
        setExpenses(data.items)
        setTotal(data.total)
        setTotalPages(data.total_pages)
      } catch {
        const result = localGeneralExpenses.expenses.list({
          year: filters.year || undefined,
          month: filters.month || undefined,
          category_id: filters.categoryId || undefined,
          status: filters.status || undefined,
          page,
          page_size: PAGE_SIZE,
        })
        setExpenses(result.items)
        setTotal(result.total)
        setTotalPages(result.total_pages)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [filters, page])

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters)
    setPage(1)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/general-expenses/${deleteTarget.id}`)
    } catch (err) {
      if (err.response?.status !== 404) {
        localGeneralExpenses.expenses.delete(deleteTarget.id)
      }
    }
    setDeleteTarget(null)
    setDeleting(false)
    setPage(1)
    setFilters((f) => ({ ...f }))
  }

  const totalPlanned = expenses.reduce((s, e) => s + parseFloat(e.planned_amount || 0), 0)
  const totalActual = expenses.reduce((s, e) => s + parseFloat(e.actual_amount || 0), 0)

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <strong className="fs-5">General Expenses</strong>
        {canEdit && (
          <div className="d-flex gap-2">
            <CButton color="secondary" variant="outline" size="sm" onClick={() => navigate('/ems/general-expenses/categories')}>
              <CIcon icon={cilTags} className="me-1" /> Categories
            </CButton>
            <CButton color="secondary" variant="outline" size="sm" onClick={() => navigate('/ems/general-expenses/upload')}>
              <CIcon icon={cilCloudUpload} className="me-1" /> Upload Excel
            </CButton>
            <CButton color="primary" size="sm" onClick={() => navigate('/ems/general-expenses/new')}>
              <CIcon icon={cilPlus} className="me-1" /> Add Expense
            </CButton>
          </div>
        )}
        {!canEdit && (
          <CButton color="secondary" variant="outline" size="sm" onClick={() => navigate('/ems/general-expenses/analysis')}>
            <CIcon icon={cilChartPie} className="me-1" /> Analysis
          </CButton>
        )}
      </div>

      <ExpenseFilters
        year={filters.year}
        month={filters.month}
        categoryId={filters.categoryId}
        status={filters.status}
        categories={categories}
        onChange={handleFilterChange}
      />

      {/* Summary bar */}
      {expenses.length > 0 && (
        <CRow className="g-2 mb-3">
          <CCol sm={4}>
            <div className="border rounded p-2 text-center">
              <div className="small text-body-secondary">Total Planned</div>
              <div className="fw-bold text-primary">{currency(totalPlanned)}</div>
            </div>
          </CCol>
          <CCol sm={4}>
            <div className="border rounded p-2 text-center">
              <div className="small text-body-secondary">Total Actual</div>
              <div className="fw-bold text-info">{currency(totalActual)}</div>
            </div>
          </CCol>
          <CCol sm={4}>
            <div className="border rounded p-2 text-center">
              <div className="small text-body-secondary">Net Variance</div>
              <div className={`fw-bold text-${totalActual - totalPlanned > 0 ? 'danger' : 'success'}`}>
                {currency(Math.abs(totalActual - totalPlanned))}
                <span className="small ms-1">{totalActual > totalPlanned ? 'over' : 'under'}</span>
              </div>
            </div>
          </CCol>
        </CRow>
      )}

      <CCard>
        <CCardHeader className="d-flex align-items-center justify-content-between">
          <span>
            {filters.month && filters.year
              ? `${MONTHS[filters.month]} ${filters.year}`
              : filters.year
              ? `Year ${filters.year}`
              : 'All Expenses'}{' '}
            — {total} record{total !== 1 ? 's' : ''}
          </span>
          <CButton color="link" size="sm" onClick={() => navigate('/ems/general-expenses/analysis')}>
            View Analysis →
          </CButton>
        </CCardHeader>
        <CCardBody className="p-0">
          {loading ? (
            <div className="text-center py-5"><CSpinner /></div>
          ) : (
            <CTable small hover responsive className="mb-0">
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Expense</CTableHeaderCell>
                  <CTableHeaderCell>Category</CTableHeaderCell>
                  <CTableHeaderCell>Frequency</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Planned</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Actual</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Variance</CTableHeaderCell>
                  <CTableHeaderCell>Status</CTableHeaderCell>
                  <CTableHeaderCell>Remarks</CTableHeaderCell>
                  {canEdit && <CTableHeaderCell>Actions</CTableHeaderCell>}
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {expenses.length === 0 && (
                  <CTableRow>
                    <CTableDataCell colSpan={9} className="text-center text-body-secondary py-5">
                      No expense records found. {canEdit && 'Click "Add Expense" or upload an Excel sheet to get started.'}
                    </CTableDataCell>
                  </CTableRow>
                )}
                {expenses.map((exp) => (
                  <CTableRow
                    key={exp.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/ems/general-expenses/${exp.id}`)}
                  >
                    <CTableDataCell className="fw-semibold">{exp.expense_name}</CTableDataCell>
                    <CTableDataCell>
                      <CBadge color="info" textColor="dark">{exp.category_name}</CBadge>
                    </CTableDataCell>
                    <CTableDataCell className="text-body-secondary small">{exp.frequency}</CTableDataCell>
                    <CTableDataCell className="text-end">{currency(exp.planned_amount)}</CTableDataCell>
                    <CTableDataCell className="text-end">{currency(exp.actual_amount)}</CTableDataCell>
                    <CTableDataCell className="text-end">
                      <VarianceBadge variance={exp.variance} />
                    </CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={STATUS_COLORS[exp.status] || 'secondary'}>{exp.status}</CBadge>
                    </CTableDataCell>
                    <CTableDataCell className="text-body-secondary small text-truncate" style={{ maxWidth: 140 }}>
                      {exp.remarks || '—'}
                    </CTableDataCell>
                    {canEdit && (
                      <CTableDataCell onClick={(e) => e.stopPropagation()}>
                        <CButton
                          color="secondary"
                          variant="ghost"
                          size="sm"
                          className="me-1"
                          onClick={() => navigate(`/ems/general-expenses/${exp.id}/edit`)}
                        >
                          <CIcon icon={cilPencil} />
                        </CButton>
                        <CButton
                          color="danger"
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(exp)}
                        >
                          <CIcon icon={cilTrash} />
                        </CButton>
                      </CTableDataCell>
                    )}
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          )}
        </CCardBody>
      </CCard>

      {totalPages > 1 && (
        <CPagination className="mt-3 justify-content-center">
          <CPaginationItem disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</CPaginationItem>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <CPaginationItem key={p} active={p === page} onClick={() => setPage(p)}>{p}</CPaginationItem>
          ))}
          <CPaginationItem disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next</CPaginationItem>
        </CPagination>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Delete Expense</h5>
              </div>
              <div className="modal-body">
                Delete <strong>{deleteTarget.expense_name}</strong>? This cannot be undone. The
                action will be recorded in the audit log.
              </div>
              <div className="modal-footer">
                <CButton color="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                  Cancel
                </CButton>
                <CButton color="danger" onClick={handleDelete} disabled={deleting}>
                  {deleting && <CSpinner size="sm" className="me-1" />}
                  Delete
                </CButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default GeneralExpenseList
