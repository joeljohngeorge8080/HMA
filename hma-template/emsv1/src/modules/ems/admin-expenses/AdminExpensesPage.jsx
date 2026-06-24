/**
 * AdminExpensesPage — Manage recurring monthly, quarterly, half-yearly and annual expenses.
 * Route: /ems/admin-expenses
 */
import React, { useState, useMemo } from 'react'
import {
  CContainer,
  CRow,
  CCol,
  CCard,
  CCardBody,
  CCardHeader,
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
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CForm,
  CFormLabel,
  CTooltip,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilSearch,
  cilPlus,
  cilFilterX,
  cilPencil,
  cilTrash,
  cilInfo,
  cilSync,
  cilDollar,
  cilBuilding,
  cilList,
} from '@coreui/icons'

// ─── Dummy Data (from LSGB expense sheet) ────────────────────────────────────
const INITIAL_EXPENSES = [
  { id: 1,  vendorName: 'Manjith Travels',                  category: 'Contract Vehicle',        frequency: 'Monthly',     annualAmount: 524160,  monthlyEquivalent: 43680,  status: 'Active'   },
  { id: 2,  vendorName: 'Dr Anandam',                       category: 'House Rent',              frequency: 'Monthly',     annualAmount: 1800000, monthlyEquivalent: 150000, status: 'Active'   },
  { id: 3,  vendorName: 'BSNL',                             category: 'Land Line',               frequency: 'Monthly',     annualAmount: 24000,   monthlyEquivalent: 2000,   status: 'Active'   },
  { id: 4,  vendorName: 'KSEB',                             category: 'Electricity Bill',        frequency: 'Monthly',     annualAmount: 264000,  monthlyEquivalent: 22000,  status: 'Active'   },
  { id: 5,  vendorName: 'KWA',                              category: 'Water Bill',              frequency: 'Monthly',     annualAmount: 96000,   monthlyEquivalent: 8000,   status: 'Active'   },
  { id: 6,  vendorName: 'Subramania Industries',            category: 'DG AMC',                  frequency: 'Half Yearly', annualAmount: 10000,   monthlyEquivalent: 833,    status: 'Active'   },
  { id: 7,  vendorName: 'Imprest',                          category: 'Monthly Imprest',         frequency: 'Monthly',     annualAmount: 120000,  monthlyEquivalent: 10000,  status: 'Active'   },
  { id: 8,  vendorName: 'Alchemy IBS',                      category: 'Website',                 frequency: 'Monthly',     annualAmount: 200000,  monthlyEquivalent: 16667,  status: 'Active'   },
  { id: 9,  vendorName: 'Geejey Solutions',                 category: 'Epabx AMC',               frequency: 'Half Yearly', annualAmount: 8000,    monthlyEquivalent: 667,    status: 'Active'   },
  { id: 10, vendorName: 'VRS Infosystems',                  category: 'Tally Software Renewal',  frequency: 'Annually',    annualAmount: 16000,   monthlyEquivalent: 1333,   status: 'Active'   },
  { id: 11, vendorName: 'M/s Armtech Computer Services',    category: 'CAMC Computer Hardware',  frequency: 'Quarterly',   annualAmount: 15000,   monthlyEquivalent: 1250,   status: 'Active'   },
  { id: 12, vendorName: 'Nu Aire',                          category: 'AC AMC',                  frequency: 'Quarterly',   annualAmount: 36000,   monthlyEquivalent: 3000,   status: 'Active'   },
  { id: 13, vendorName: 'Miscellaneous',                    category: 'Repair & Maintenance',    frequency: 'Monthly',     annualAmount: 50000,   monthlyEquivalent: 4167,   status: 'Active'   },
  { id: 14, vendorName: 'Microsoft 365',                    category: 'Software',                frequency: 'Annually',    annualAmount: 7000,    monthlyEquivalent: 583,    status: 'Active'   },
  { id: 15, vendorName: 'Asterisk',                         category: 'Photocopier (Admin & DVP)', frequency: 'Monthly',  annualAmount: 48000,   monthlyEquivalent: 4000,   status: 'Active'   },
  { id: 16, vendorName: 'Pradeep Kumar Cost Accountant',    category: 'Financial Consultant',    frequency: 'Monthly',     annualAmount: 1296000, monthlyEquivalent: 108000, status: 'Active'   },
  { id: 17, vendorName: 'Pradeep Kumar Cost Accountant',    category: 'Accounts Assistance',     frequency: 'Monthly',     annualAmount: 750000,  monthlyEquivalent: 62500,  status: 'Active'   },
  { id: 18, vendorName: 'Indian Postal Department',         category: 'Speed Post',              frequency: 'Monthly',     annualAmount: 120000,  monthlyEquivalent: 10000,  status: 'Inactive' },
]

const CATEGORIES = [
  'Contract Vehicle', 'House Rent', 'Land Line', 'Electricity Bill', 'Water Bill',
  'DG AMC', 'Monthly Imprest', 'Website', 'Epabx AMC', 'Tally Software Renewal',
  'CAMC Computer Hardware', 'AC AMC', 'Repair & Maintenance', 'Software',
  'Photocopier (Admin & DVP)', 'Financial Consultant', 'Accounts Assistance', 'Speed Post',
]

const FREQUENCIES = ['Monthly', 'Quarterly', 'Half Yearly', 'Annually']
const STATUSES    = ['Active', 'Inactive']

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatINR = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)

const FREQUENCY_COLOR = {
  Monthly:     'primary',
  Quarterly:   'info',
  'Half Yearly': 'warning',
  Annually:    'secondary',
}

const STATUS_COLOR = {
  Active:   'success',
  Inactive: 'danger',
}

const EMPTY_FORM = {
  vendorName: '',
  category: '',
  frequency: 'Monthly',
  annualAmount: '',
  monthlyEquivalent: '',
  status: 'Active',
}

// ─── Summary Card ─────────────────────────────────────────────────────────────
const SummaryCard = ({ label, value, icon, accent }) => (
  <CCard
    className="border-0 shadow-sm h-100"
    style={{
      borderLeft: `4px solid var(--cui-${accent}) !important`,
      borderRadius: '10px',
      overflow: 'hidden',
    }}
  >
    <CCardBody className="d-flex align-items-center gap-3 py-3">
      <div
        className={`d-flex align-items-center justify-content-center rounded-circle bg-${accent} bg-opacity-10`}
        style={{ width: 48, height: 48, flexShrink: 0 }}
      >
        <CIcon icon={icon} size="lg" className={`text-${accent}`} />
      </div>
      <div>
        <div className="text-body-secondary small fw-medium">{label}</div>
        <div className="fw-bold fs-5 mt-1" style={{ lineHeight: 1.1 }}>{value}</div>
      </div>
    </CCardBody>
    <div style={{ height: 4, background: `var(--cui-${accent})`, opacity: 0.7 }} />
  </CCard>
)

// ─── Main Page ────────────────────────────────────────────────────────────────
const AdminExpensesPage = () => {
  const [expenses, setExpenses]           = useState(INITIAL_EXPENSES)
  const [search, setSearch]               = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterFrequency, setFilterFrequency] = useState('')
  const [filterStatus, setFilterStatus]   = useState('')

  const [modalVisible, setModalVisible]   = useState(false)
  const [editingId, setEditingId]         = useState(null)
  const [form, setForm]                   = useState(EMPTY_FORM)
  const [deleteId, setDeleteId]           = useState(null)
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [viewingExpense, setViewingExpense] = useState(null)

  // ── Computed stats ──────────────────────────────────────────────────────────
  const activeExpenses = useMemo(() => expenses.filter(e => e.status === 'Active'), [expenses])

  const stats = useMemo(() => ({
    totalMonthly:  activeExpenses.reduce((s, e) => s + e.monthlyEquivalent, 0),
    totalAnnual:   activeExpenses.reduce((s, e) => s + e.annualAmount, 0),
    activeVendors: new Set(activeExpenses.map(e => e.vendorName)).size,
    totalExpenses: expenses.length,
  }), [activeExpenses, expenses])

  // ── Filtered rows ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return expenses.filter(e => {
      if (q && !e.vendorName.toLowerCase().includes(q)) return false
      if (filterCategory && e.category !== filterCategory) return false
      if (filterFrequency && e.frequency !== filterFrequency) return false
      if (filterStatus && e.status !== filterStatus) return false
      return true
    })
  }, [expenses, search, filterCategory, filterFrequency, filterStatus])

  // ── Handlers ────────────────────────────────────────────────────────────────
  const resetFilters = () => {
    setSearch('')
    setFilterCategory('')
    setFilterFrequency('')
    setFilterStatus('')
  }

  const openAdd = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setModalVisible(true)
  }

  const openEdit = (expense) => {
    setEditingId(expense.id)
    setForm({
      vendorName:        expense.vendorName,
      category:          expense.category,
      frequency:         expense.frequency,
      annualAmount:      expense.annualAmount,
      monthlyEquivalent: expense.monthlyEquivalent,
      status:            expense.status,
    })
    setModalVisible(true)
  }

  const handleFormChange = (field, value) => {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      // Auto-compute monthly when annual or frequency changes
      if (field === 'annualAmount' || field === 'frequency') {
        const annual = parseFloat(field === 'annualAmount' ? value : prev.annualAmount) || 0
        const freq   = field === 'frequency' ? value : prev.frequency
        const divisor = { Monthly: 1, Quarterly: 3, 'Half Yearly': 6, Annually: 12 }[freq] || 1
        next.monthlyEquivalent = annual > 0 ? Math.round(annual / 12) : ''
      }
      return next
    })
  }

  const handleSave = () => {
    if (!form.vendorName.trim() || !form.category || !form.frequency || !form.annualAmount) return
    const entry = {
      ...form,
      annualAmount:      Number(form.annualAmount),
      monthlyEquivalent: Number(form.monthlyEquivalent),
    }
    if (editingId) {
      setExpenses(prev => prev.map(e => e.id === editingId ? { ...e, ...entry } : e))
    } else {
      const newId = Math.max(0, ...expenses.map(e => e.id)) + 1
      setExpenses(prev => [...prev, { id: newId, ...entry }])
    }
    setModalVisible(false)
  }

  const confirmDelete = (id) => {
    setDeleteId(id)
    setDeleteModalVisible(true)
  }

  const handleDelete = () => {
    setExpenses(prev => prev.filter(e => e.id !== deleteId))
    setDeleteModalVisible(false)
    setDeleteId(null)
  }

  return (
    <CContainer lg className="py-4">

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-3">
        <div>
          <h4 className="fw-bold mb-1" style={{ letterSpacing: '-0.3px' }}>
            Admin Expenses
          </h4>
          <p className="text-body-secondary small mb-0">
            Manage recurring monthly, quarterly, half-yearly and annual expenses.
          </p>
        </div>
        <CButton
          id="btn-add-expense"
          color="primary"
          onClick={openAdd}
          className="d-flex align-items-center gap-2 fw-semibold px-4"
          style={{ borderRadius: 8 }}
        >
          <CIcon icon={cilPlus} />
          Add Expense
        </CButton>
      </div>

      {/* ── Summary Cards ───────────────────────────────────────────────────── */}
      <CRow className="g-3 mb-4">
        <CCol xs={12} sm={6} xl={3}>
          <SummaryCard
            label="Total Monthly Expense"
            value={formatINR(stats.totalMonthly)}
            icon={cilSync}
            accent="primary"
          />
        </CCol>
        <CCol xs={12} sm={6} xl={3}>
          <SummaryCard
            label="Total Annual Expense"
            value={formatINR(stats.totalAnnual)}
            icon={cilDollar}
            accent="success"
          />
        </CCol>
        <CCol xs={12} sm={6} xl={3}>
          <SummaryCard
            label="Active Vendors"
            value={stats.activeVendors}
            icon={cilBuilding}
            accent="info"
          />
        </CCol>
        <CCol xs={12} sm={6} xl={3}>
          <SummaryCard
            label="Total Expenses"
            value={stats.totalExpenses}
            icon={cilList}
            accent="warning"
          />
        </CCol>
      </CRow>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <CCard className="border-0 shadow-sm mb-4" style={{ borderRadius: 10 }}>
        <CCardHeader className="bg-white border-bottom py-3">
          <span className="fw-semibold small text-body-secondary text-uppercase" style={{ letterSpacing: '0.06em' }}>
            Filter Expenses
          </span>
        </CCardHeader>
        <CCardBody>
          <CRow className="g-2 align-items-end">
            <CCol xs={12} md={4}>
              <CFormLabel className="small fw-medium">Vendor Name</CFormLabel>
              <CInputGroup>
                <CInputGroupText className="bg-body-secondary">
                  <CIcon icon={cilSearch} size="sm" />
                </CInputGroupText>
                <CFormInput
                  id="filter-vendor"
                  placeholder="Search vendor..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </CInputGroup>
            </CCol>
            <CCol xs={12} sm={6} md={2}>
              <CFormLabel className="small fw-medium">Category</CFormLabel>
              <CFormSelect
                id="filter-category"
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </CFormSelect>
            </CCol>
            <CCol xs={12} sm={6} md={2}>
              <CFormLabel className="small fw-medium">Frequency</CFormLabel>
              <CFormSelect
                id="filter-frequency"
                value={filterFrequency}
                onChange={e => setFilterFrequency(e.target.value)}
              >
                <option value="">All Frequencies</option>
                {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
              </CFormSelect>
            </CCol>
            <CCol xs={12} sm={6} md={2}>
              <CFormLabel className="small fw-medium">Status</CFormLabel>
              <CFormSelect
                id="filter-status"
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
              >
                <option value="">All Status</option>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </CFormSelect>
            </CCol>
            <CCol xs={12} sm={6} md={2} className="d-flex gap-2">
              <CButton
                id="btn-search"
                color="primary"
                className="flex-grow-1 fw-semibold"
                style={{ borderRadius: 8 }}
              >
                <CIcon icon={cilSearch} className="me-1" size="sm" />
                Search
              </CButton>
              <CButton
                id="btn-reset"
                color="secondary"
                variant="outline"
                className="flex-grow-1"
                style={{ borderRadius: 8 }}
                onClick={resetFilters}
              >
                <CIcon icon={cilFilterX} size="sm" />
              </CButton>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <CCard className="border-0 shadow-sm" style={{ borderRadius: 10 }}>
        <CCardHeader className="bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
          <span className="fw-semibold small text-body-secondary text-uppercase" style={{ letterSpacing: '0.06em' }}>
            Expense Entries
          </span>
          <CBadge color="secondary" shape="rounded-pill" className="px-3">
            {filtered.length} of {expenses.length}
          </CBadge>
        </CCardHeader>
        <CCardBody className="p-0">
          <div style={{ overflowX: 'auto' }}>
            <CTable
              responsive
              hover
              align="middle"
              className="mb-0"
              style={{ minWidth: 900 }}
            >
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell className="ps-3 py-3" style={{ width: 50 }}>#</CTableHeaderCell>
                  <CTableHeaderCell className="py-3">Vendor Name</CTableHeaderCell>
                  <CTableHeaderCell className="py-3">Expense Category</CTableHeaderCell>
                  <CTableHeaderCell className="py-3 text-center">Frequency</CTableHeaderCell>
                  <CTableHeaderCell className="py-3 text-end">Annual Amount</CTableHeaderCell>
                  <CTableHeaderCell className="py-3 text-end">Monthly Equivalent</CTableHeaderCell>
                  <CTableHeaderCell className="py-3 text-center">Status</CTableHeaderCell>
                  <CTableHeaderCell className="py-3 text-center pe-3">Actions</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {filtered.length === 0 ? (
                  <CTableRow>
                    <CTableDataCell colSpan={8} className="text-center py-5 text-body-secondary">
                      No expenses found matching your filters.
                    </CTableDataCell>
                  </CTableRow>
                ) : (
                  filtered.map((exp, idx) => (
                    <CTableRow key={exp.id} className="align-middle">
                      <CTableDataCell className="ps-3 text-body-secondary small">{idx + 1}</CTableDataCell>
                      <CTableDataCell>
                        <div className="fw-semibold" style={{ fontSize: '0.875rem' }}>{exp.vendorName}</div>
                      </CTableDataCell>
                      <CTableDataCell>
                        <span className="small text-body-secondary">{exp.category}</span>
                      </CTableDataCell>
                      <CTableDataCell className="text-center">
                        <CBadge
                          color={FREQUENCY_COLOR[exp.frequency] || 'secondary'}
                          shape="rounded-pill"
                          className="px-3 py-1"
                          style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.03em' }}
                        >
                          {exp.frequency}
                        </CBadge>
                      </CTableDataCell>
                      <CTableDataCell className="text-end fw-semibold">
                        {formatINR(exp.annualAmount)}
                      </CTableDataCell>
                      <CTableDataCell className="text-end">
                        <span className="text-primary fw-medium">{formatINR(exp.monthlyEquivalent)}</span>
                      </CTableDataCell>
                      <CTableDataCell className="text-center">
                        <CBadge
                          color={STATUS_COLOR[exp.status] || 'secondary'}
                          shape="rounded-pill"
                          className="px-3 py-1"
                          style={{ fontSize: '0.7rem', fontWeight: 600 }}
                        >
                          {exp.status}
                        </CBadge>
                      </CTableDataCell>
                      <CTableDataCell className="text-center pe-3">
                        <div className="d-flex gap-1 justify-content-center">
                          <CTooltip content="View Details" placement="top">
                            <CButton
                              id={`btn-view-${exp.id}`}
                              color="info"
                              variant="ghost"
                              size="sm"
                              style={{ borderRadius: 6, padding: '4px 8px' }}
                              onClick={() => setViewingExpense(exp)}
                            >
                              <CIcon icon={cilInfo} size="sm" />
                            </CButton>
                          </CTooltip>
                          <CTooltip content="Edit" placement="top">
                            <CButton
                              id={`btn-edit-${exp.id}`}
                              color="warning"
                              variant="ghost"
                              size="sm"
                              style={{ borderRadius: 6, padding: '4px 8px' }}
                              onClick={() => openEdit(exp)}
                            >
                              <CIcon icon={cilPencil} size="sm" />
                            </CButton>
                          </CTooltip>
                          <CTooltip content="Delete" placement="top">
                            <CButton
                              id={`btn-delete-${exp.id}`}
                              color="danger"
                              variant="ghost"
                              size="sm"
                              style={{ borderRadius: 6, padding: '4px 8px' }}
                              onClick={() => confirmDelete(exp.id)}
                            >
                              <CIcon icon={cilTrash} size="sm" />
                            </CButton>
                          </CTooltip>
                        </div>
                      </CTableDataCell>
                    </CTableRow>
                  ))
                )}
              </CTableBody>
            </CTable>
          </div>
        </CCardBody>

        {/* Table Footer — totals row */}
        {filtered.length > 0 && (
          <div
            className="px-3 py-2 border-top d-flex flex-wrap justify-content-end gap-4"
            style={{ background: 'var(--cui-body-bg)', borderRadius: '0 0 10px 10px' }}
          >
            <span className="small text-body-secondary">
              <strong>Annual Total (filtered):</strong>{' '}
              <span className="fw-bold text-dark">
                {formatINR(filtered.reduce((s, e) => s + e.annualAmount, 0))}
              </span>
            </span>
            <span className="small text-body-secondary">
              <strong>Monthly Total (filtered):</strong>{' '}
              <span className="fw-bold text-primary">
                {formatINR(filtered.reduce((s, e) => s + e.monthlyEquivalent, 0))}
              </span>
            </span>
          </div>
        )}
      </CCard>

      {/* ── Add / Edit Modal ─────────────────────────────────────────────────── */}
      <CModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        size="lg"
        backdrop="static"
        id="expense-modal"
      >
        <CModalHeader className="border-bottom py-3">
          <CModalTitle className="fw-bold" style={{ fontSize: '1rem' }}>
            {editingId ? 'Edit Admin Expense' : 'Add Admin Expense'}
          </CModalTitle>
        </CModalHeader>
        <CModalBody className="py-4 px-4">
          <CForm id="expense-form">
            <CRow className="g-3">
              <CCol xs={12} md={6}>
                <CFormLabel className="fw-semibold small">
                  Vendor Name <span className="text-danger">*</span>
                </CFormLabel>
                <CFormInput
                  id="form-vendor-name"
                  placeholder="Enter vendor name"
                  value={form.vendorName}
                  onChange={e => handleFormChange('vendorName', e.target.value)}
                />
              </CCol>
              <CCol xs={12} md={6}>
                <CFormLabel className="fw-semibold small">
                  Expense Category <span className="text-danger">*</span>
                </CFormLabel>
                <CFormSelect
                  id="form-category"
                  value={form.category}
                  onChange={e => handleFormChange('category', e.target.value)}
                >
                  <option value="">Select category...</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </CFormSelect>
              </CCol>
              <CCol xs={12} md={4}>
                <CFormLabel className="fw-semibold small">
                  Frequency <span className="text-danger">*</span>
                </CFormLabel>
                <CFormSelect
                  id="form-frequency"
                  value={form.frequency}
                  onChange={e => handleFormChange('frequency', e.target.value)}
                >
                  {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                </CFormSelect>
              </CCol>
              <CCol xs={12} md={4}>
                <CFormLabel className="fw-semibold small">
                  Annual Amount (₹) <span className="text-danger">*</span>
                </CFormLabel>
                <CFormInput
                  id="form-annual-amount"
                  type="number"
                  placeholder="e.g. 120000"
                  value={form.annualAmount}
                  onChange={e => handleFormChange('annualAmount', e.target.value)}
                  min={0}
                />
              </CCol>
              <CCol xs={12} md={4}>
                <CFormLabel className="fw-semibold small">Monthly Equivalent (₹)</CFormLabel>
                <CFormInput
                  id="form-monthly-equivalent"
                  type="number"
                  placeholder="Auto-calculated"
                  value={form.monthlyEquivalent}
                  onChange={e => handleFormChange('monthlyEquivalent', e.target.value)}
                  min={0}
                />
                <div className="form-text text-body-secondary" style={{ fontSize: '0.75rem' }}>
                  Auto-calculated from annual ÷ 12
                </div>
              </CCol>
              <CCol xs={12} md={4}>
                <CFormLabel className="fw-semibold small">Status</CFormLabel>
                <CFormSelect
                  id="form-status"
                  value={form.status}
                  onChange={e => handleFormChange('status', e.target.value)}
                >
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </CFormSelect>
              </CCol>
            </CRow>
          </CForm>
        </CModalBody>
        <CModalFooter className="border-top py-3 px-4">
          <CButton
            id="btn-modal-cancel"
            color="secondary"
            variant="outline"
            onClick={() => setModalVisible(false)}
            style={{ borderRadius: 8, minWidth: 90 }}
          >
            Cancel
          </CButton>
          <CButton
            id="btn-modal-save"
            color="primary"
            onClick={handleSave}
            className="fw-semibold"
            style={{ borderRadius: 8, minWidth: 110 }}
            disabled={!form.vendorName.trim() || !form.category || !form.annualAmount}
          >
            {editingId ? 'Update Expense' : 'Save Expense'}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* ── Delete Confirm Modal ────────────────────────────────────────────── */}
      <CModal
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        id="delete-confirm-modal"
        size="sm"
      >
        <CModalHeader>
          <CModalTitle className="fw-bold text-danger" style={{ fontSize: '0.95rem' }}>
            Confirm Delete
          </CModalTitle>
        </CModalHeader>
        <CModalBody className="py-3">
          <p className="mb-0 text-body-secondary small">
            Are you sure you want to delete this expense record? This action cannot be undone.
          </p>
        </CModalBody>
        <CModalFooter className="py-2">
          <CButton
            id="btn-delete-cancel"
            color="secondary"
            variant="outline"
            size="sm"
            onClick={() => setDeleteModalVisible(false)}
          >
            Cancel
          </CButton>
          <CButton
            id="btn-delete-confirm"
            color="danger"
            size="sm"
            className="fw-semibold"
            onClick={handleDelete}
          >
            Delete
          </CButton>
        </CModalFooter>
      </CModal>

      {/* ── Expense Details Modal (read-only) ─────────────────────────────── */}
      <CModal
        visible={!!viewingExpense}
        onClose={() => setViewingExpense(null)}
        id="expense-detail-modal"
        size="md"
      >
        <CModalHeader className="border-bottom py-3">
          <CModalTitle className="fw-bold" style={{ fontSize: '1rem' }}>
            Expense Details
          </CModalTitle>
        </CModalHeader>
        {viewingExpense && (
          <CModalBody className="py-4 px-4">
            <CRow className="g-3">
              <CCol xs={12}>
                <div className="small text-body-secondary fw-semibold text-uppercase mb-1" style={{ letterSpacing: '0.05em' }}>Vendor Name</div>
                <div className="fw-semibold fs-6">{viewingExpense.vendorName}</div>
              </CCol>
              <CCol xs={12} sm={6}>
                <div className="small text-body-secondary fw-semibold text-uppercase mb-1" style={{ letterSpacing: '0.05em' }}>Expense Category</div>
                <div>{viewingExpense.category}</div>
              </CCol>
              <CCol xs={12} sm={6}>
                <div className="small text-body-secondary fw-semibold text-uppercase mb-1" style={{ letterSpacing: '0.05em' }}>Frequency</div>
                <CBadge
                  color={FREQUENCY_COLOR[viewingExpense.frequency] || 'secondary'}
                  shape="rounded-pill"
                  className="px-3 py-1"
                  style={{ fontSize: '0.75rem', fontWeight: 600 }}
                >
                  {viewingExpense.frequency}
                </CBadge>
              </CCol>
              <CCol xs={12} sm={6}>
                <div className="small text-body-secondary fw-semibold text-uppercase mb-1" style={{ letterSpacing: '0.05em' }}>Annual Amount</div>
                <div className="fw-bold fs-6">{formatINR(viewingExpense.annualAmount)}</div>
              </CCol>
              <CCol xs={12} sm={6}>
                <div className="small text-body-secondary fw-semibold text-uppercase mb-1" style={{ letterSpacing: '0.05em' }}>Monthly Equivalent</div>
                <div className="fw-semibold text-primary">{formatINR(viewingExpense.monthlyEquivalent)}</div>
              </CCol>
              <CCol xs={12}>
                <div className="small text-body-secondary fw-semibold text-uppercase mb-1" style={{ letterSpacing: '0.05em' }}>Status</div>
                <CBadge
                  color={STATUS_COLOR[viewingExpense.status] || 'secondary'}
                  shape="rounded-pill"
                  className="px-3 py-1"
                  style={{ fontSize: '0.75rem', fontWeight: 600 }}
                >
                  {viewingExpense.status}
                </CBadge>
              </CCol>
            </CRow>
          </CModalBody>
        )}
        <CModalFooter className="border-top py-3">
          <CButton
            id="btn-detail-close"
            color="secondary"
            onClick={() => setViewingExpense(null)}
            style={{ borderRadius: 8, minWidth: 90 }}
          >
            Close
          </CButton>
        </CModalFooter>
      </CModal>

    </CContainer>
  )
}

export default AdminExpensesPage
