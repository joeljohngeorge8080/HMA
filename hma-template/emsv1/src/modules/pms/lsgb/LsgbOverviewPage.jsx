import React, { useState, useEffect, useCallback } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CRow,
  CCol,
  CButton,
  CFormInput,
  CFormSelect,
  CFormLabel,
  CInputGroup,
  CInputGroupText,
  CBadge,
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
  CAlert,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilPlus,
  cilPencil,
  cilTrash,
  cilSearch,
  cilBuilding,
  cilChevronBottom,
  cilChevronTop,
  cilX,
} from '@coreui/icons'
import { localLsgb, BODY_TYPES, CONTACT_ROLES } from '../../../services/localLsgb'
import { localOfficers } from '../../../services/localProjects'

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n || 0)

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'

const EMPTY_BODY = {
  officer_id: '',
  body_name: '',
  body_type: '',
  sanction_number: '',
  sanction_date: '',
  sanctioned_amount: '',
  work_order_number: '',
  agreement_date: '',
  validity_period: '',
  office_address: '',
  contact_person: '',
  contact_role: '',
  contact_phone: '',
}

// ── Body Form ─────────────────────────────────────────────────────────────────

const BodyForm = ({ form, setField, errors, lsgbOfficers }) => (
  <div>
    <div
      className="fw-semibold small text-body-secondary text-uppercase mb-3"
      style={{ letterSpacing: '0.5px' }}
    >
      Officer & Body — Required
    </div>
    <CRow className="g-3 mb-4">
      <CCol xs={12} md={6}>
        <CFormLabel className="small fw-semibold">
          LSGB Project Officer <span className="text-danger">*</span>
        </CFormLabel>
        <CFormSelect
          value={form.officer_id}
          onChange={(e) => setField('officer_id', e.target.value)}
          invalid={!!errors.officer_id}
        >
          <option value="">— Select officer —</option>
          {lsgbOfficers.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name} · {o.designation || 'Officer'}
            </option>
          ))}
        </CFormSelect>
        {errors.officer_id && <div className="text-danger small mt-1">{errors.officer_id}</div>}
      </CCol>
      <CCol xs={12} md={6}>
        <CFormLabel className="small fw-semibold">
          LSGB Body Type <span className="text-danger">*</span>
        </CFormLabel>
        <CFormSelect
          value={form.body_type}
          onChange={(e) => setField('body_type', e.target.value)}
          invalid={!!errors.body_type}
        >
          <option value="">— Select type —</option>
          {BODY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </CFormSelect>
        {errors.body_type && <div className="text-danger small mt-1">{errors.body_type}</div>}
      </CCol>
      <CCol xs={12}>
        <CFormLabel className="small fw-semibold">
          LSGB Body Name <span className="text-danger">*</span>
        </CFormLabel>
        <CFormInput
          placeholder="e.g., Thrissur Municipal Corporation"
          value={form.body_name}
          onChange={(e) => setField('body_name', e.target.value)}
          invalid={!!errors.body_name}
        />
        {errors.body_name && <div className="text-danger small mt-1">{errors.body_name}</div>}
      </CCol>
    </CRow>

    <div
      className="fw-semibold small text-body-secondary text-uppercase mb-3"
      style={{ letterSpacing: '0.5px' }}
    >
      Sanction Details — Optional
    </div>
    <CRow className="g-3 mb-4">
      <CCol xs={12} md={4}>
        <CFormLabel className="small fw-semibold">Sanction Number</CFormLabel>
        <CFormInput
          placeholder="e.g., LSG/2025/001"
          value={form.sanction_number}
          onChange={(e) => setField('sanction_number', e.target.value)}
        />
      </CCol>
      <CCol xs={12} md={4}>
        <CFormLabel className="small fw-semibold">Sanction Date</CFormLabel>
        <CFormInput
          type="date"
          value={form.sanction_date}
          onChange={(e) => setField('sanction_date', e.target.value)}
        />
      </CCol>
      <CCol xs={12} md={4}>
        <CFormLabel className="small fw-semibold">Sanctioned Amount (₹)</CFormLabel>
        <CInputGroup>
          <CInputGroupText>₹</CInputGroupText>
          <CFormInput
            type="number"
            min="0"
            placeholder="0"
            value={form.sanctioned_amount}
            onChange={(e) => setField('sanctioned_amount', e.target.value)}
          />
        </CInputGroup>
      </CCol>
    </CRow>

    <div
      className="fw-semibold small text-body-secondary text-uppercase mb-3"
      style={{ letterSpacing: '0.5px' }}
    >
      Work Order / Agreement — Optional
    </div>
    <CRow className="g-3 mb-4">
      <CCol xs={12} md={4}>
        <CFormLabel className="small fw-semibold">Work Order Number</CFormLabel>
        <CFormInput
          placeholder="e.g., WO/2025/042"
          value={form.work_order_number}
          onChange={(e) => setField('work_order_number', e.target.value)}
        />
      </CCol>
      <CCol xs={12} md={4}>
        <CFormLabel className="small fw-semibold">Agreement Date</CFormLabel>
        <CFormInput
          type="date"
          value={form.agreement_date}
          onChange={(e) => setField('agreement_date', e.target.value)}
        />
      </CCol>
      <CCol xs={12} md={4}>
        <CFormLabel className="small fw-semibold">Validity Period</CFormLabel>
        <CFormInput
          placeholder="e.g., 2 years / Until 31-Mar-2027"
          value={form.validity_period}
          onChange={(e) => setField('validity_period', e.target.value)}
        />
      </CCol>
    </CRow>

    <div
      className="fw-semibold small text-body-secondary text-uppercase mb-3"
      style={{ letterSpacing: '0.5px' }}
    >
      Contact & Address — Optional
    </div>
    <CRow className="g-3">
      <CCol xs={12} md={6}>
        <CFormLabel className="small fw-semibold">Contact Person</CFormLabel>
        <CFormInput
          placeholder="Name of president / secretary"
          value={form.contact_person}
          onChange={(e) => setField('contact_person', e.target.value)}
        />
      </CCol>
      <CCol xs={12} md={6}>
        <CFormLabel className="small fw-semibold">Role</CFormLabel>
        <CFormSelect
          value={form.contact_role}
          onChange={(e) => setField('contact_role', e.target.value)}
        >
          <option value="">— Select role —</option>
          {CONTACT_ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </CFormSelect>
      </CCol>
      <CCol xs={12} md={6}>
        <CFormLabel className="small fw-semibold">Phone</CFormLabel>
        <CFormInput
          placeholder="+91-XXXXX-XXXXX"
          value={form.contact_phone}
          onChange={(e) => setField('contact_phone', e.target.value)}
        />
      </CCol>
      <CCol xs={12} md={6}>
        <CFormLabel className="small fw-semibold">Office Address</CFormLabel>
        <CFormInput
          placeholder="Office address"
          value={form.office_address}
          onChange={(e) => setField('office_address', e.target.value)}
        />
      </CCol>
    </CRow>
  </div>
)

// ── Detail expand panel ───────────────────────────────────────────────────────

const BodyDetailPanel = ({ body, officerMap }) => {
  const officer = officerMap[body.officer_id]
  return (
    <div className="px-4 py-3 bg-body-secondary border-top">
      <CRow className="g-3">
        <CCol xs={12} md={4}>
          <div className="small fw-semibold text-body-secondary text-uppercase mb-2">
            Sanction Details
          </div>
          {[
            ['Sanction No.', body.sanction_number],
            ['Sanction Date', fmtDate(body.sanction_date)],
            ['Sanctioned Amount', body.sanctioned_amount ? fmt(body.sanctioned_amount) : null],
          ].map(([l, v]) => (
            <div key={l} className="d-flex gap-2 mb-1" style={{ fontSize: '0.82rem' }}>
              <span className="text-body-secondary flex-shrink-0" style={{ minWidth: 120 }}>
                {l}
              </span>
              <span className="fw-medium">{v || '—'}</span>
            </div>
          ))}
        </CCol>
        <CCol xs={12} md={4}>
          <div className="small fw-semibold text-body-secondary text-uppercase mb-2">
            Work Order
          </div>
          {[
            ['Work Order No.', body.work_order_number],
            ['Agreement Date', fmtDate(body.agreement_date)],
            ['Validity', body.validity_period],
          ].map(([l, v]) => (
            <div key={l} className="d-flex gap-2 mb-1" style={{ fontSize: '0.82rem' }}>
              <span className="text-body-secondary flex-shrink-0" style={{ minWidth: 120 }}>
                {l}
              </span>
              <span className="fw-medium">{v || '—'}</span>
            </div>
          ))}
        </CCol>
        <CCol xs={12} md={4}>
          <div className="small fw-semibold text-body-secondary text-uppercase mb-2">
            Contact & Officer
          </div>
          {[
            ['Contact Person', body.contact_person],
            ['Role', body.contact_role],
            ['Phone', body.contact_phone],
            ['Office Address', body.office_address],
            ['LSGB Officer', officer?.name],
          ].map(([l, v]) => (
            <div key={l} className="d-flex gap-2 mb-1" style={{ fontSize: '0.82rem' }}>
              <span className="text-body-secondary flex-shrink-0" style={{ minWidth: 120 }}>
                {l}
              </span>
              <span className="fw-medium">{v || '—'}</span>
            </div>
          ))}
        </CCol>
      </CRow>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const LsgbOverviewPage = () => {
  const [bodies, setBodies] = useState([])
  const [lsgbOfficers, setLsgbOfficers] = useState([])
  const [officerMap, setOfficerMap] = useState({})
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState(EMPTY_BODY)
  const [addErrors, setAddErrors] = useState({})

  const [editBody, setEditBody] = useState(null)
  const [editForm, setEditForm] = useState(EMPTY_BODY)
  const [editErrors, setEditErrors] = useState({})

  const reload = useCallback(() => {
    const all = localLsgb.listBodies({ search, body_type: typeFilter })
    setBodies(all)
    const officers = localOfficers.list({}).items
    const lsgb = officers.filter((o) => o.officer_type === 'LSGB' && o.status === 'active')
    setLsgbOfficers(lsgb)
    const map = {}
    officers.forEach((o) => {
      map[o.id] = o
    })
    setOfficerMap(map)
  }, [search, typeFilter])

  useEffect(() => {
    reload()
  }, [reload])

  const setAddField = (f, v) => {
    setAddForm((p) => ({ ...p, [f]: v }))
    setAddErrors((p) => ({ ...p, [f]: null }))
  }
  const setEditField = (f, v) => {
    setEditForm((p) => ({ ...p, [f]: v }))
    setEditErrors((p) => ({ ...p, [f]: null }))
  }

  const validate = (form, setErrors) => {
    const e = {}
    if (!form.officer_id) e.officer_id = 'Select an LSGB officer'
    if (!form.body_name.trim()) e.body_name = 'Body name is required'
    if (!form.body_type) e.body_type = 'Body type is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleAdd = () => {
    if (!validate(addForm, setAddErrors)) return
    localLsgb.createBody({
      ...addForm,
      sanctioned_amount: parseFloat(addForm.sanctioned_amount) || 0,
    })
    setAddOpen(false)
    setAddForm(EMPTY_BODY)
    reload()
  }

  const openEdit = (body) => {
    setEditBody(body)
    setEditForm({ ...body, sanctioned_amount: body.sanctioned_amount || '' })
    setEditErrors({})
  }

  const handleEdit = () => {
    if (!validate(editForm, setEditErrors)) return
    localLsgb.updateBody(editBody.id, {
      ...editForm,
      sanctioned_amount: parseFloat(editForm.sanctioned_amount) || 0,
    })
    setEditBody(null)
    reload()
  }

  const handleRemove = (id) => {
    localLsgb.removeBody(id)
    reload()
  }

  const totalSanctioned = bodies.reduce((s, b) => s + (parseFloat(b.sanctioned_amount) || 0), 0)

  return (
    <>
      {/* Header */}
      <div className="d-flex align-items-start justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h4 className="fw-bold mb-1">LSGB Projects — Overview</h4>
          <p className="text-body-secondary small mb-0">
            Manage Local Self Government Body details and track project officers assigned to LSGB
            work.
          </p>
        </div>
        <CButton
          color="primary"
          onClick={() => {
            setAddForm(EMPTY_BODY)
            setAddErrors({})
            setAddOpen(true)
          }}
        >
          <CIcon icon={cilPlus} className="me-1" />
          Add LSGB Body
        </CButton>
      </div>

      {/* Summary cards */}
      <CRow className="g-3 mb-4">
        {[
          { label: 'LSGB Bodies', value: bodies.length, color: '#4361ee' },
          { label: 'LSGB Officers', value: lsgbOfficers.length, color: '#06d6a0' },
          {
            label: 'Total Sanctioned',
            value: totalSanctioned ? fmt(totalSanctioned) : '—',
            color: '#9b5de5',
          },
        ].map((s) => (
          <CCol key={s.label} xs={6} md={4}>
            <CCard className="border-0 shadow-sm h-100" style={{ borderRadius: 12 }}>
              <CCardBody className="py-3 px-3">
                <div className="fw-bold fs-5 lh-1 mb-1" style={{ color: s.color }}>
                  {s.value}
                </div>
                <div className="small text-body-secondary">{s.label}</div>
              </CCardBody>
            </CCard>
          </CCol>
        ))}
      </CRow>

      {/* No LSGB officers warning */}
      {lsgbOfficers.length === 0 && (
        <CAlert color="warning" className="mb-4 small">
          No Project Officers are currently assigned the <strong>LSGB</strong> type. Go to{' '}
          <a href="/pms/project-teams/officers" className="alert-link">
            Project Officers
          </a>{' '}
          and set the Project Type to LSGB when adding or editing an officer.
        </CAlert>
      )}

      {/* Filters */}
      <CRow className="g-2 mb-3">
        <CCol xs={12} md={6}>
          <CInputGroup size="sm">
            <CInputGroupText>
              <CIcon icon={cilSearch} size="sm" />
            </CInputGroupText>
            <CFormInput
              placeholder="Search by body name or type…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <CButton color="secondary" variant="ghost" size="sm" onClick={() => setSearch('')}>
                <CIcon icon={cilX} size="sm" />
              </CButton>
            )}
          </CInputGroup>
        </CCol>
        <CCol xs={12} md={3}>
          <CFormSelect size="sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            {BODY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </CFormSelect>
        </CCol>
      </CRow>

      {/* Bodies table */}
      <CCard className="border-0 shadow-sm" style={{ borderRadius: 12 }}>
        {bodies.length === 0 ? (
          <CCardBody className="text-center py-5 text-body-secondary">
            <CIcon
              icon={cilBuilding}
              style={{ width: 48, height: 48, opacity: 0.3 }}
              className="mb-2 d-block mx-auto"
            />
            <div className="small">
              {search || typeFilter
                ? 'No LSGB bodies match your search.'
                : 'No LSGB bodies added yet. Click "Add LSGB Body" to get started.'}
            </div>
          </CCardBody>
        ) : (
          <div className="table-responsive">
            <CTable hover align="middle" className="mb-0" style={{ fontSize: '0.875rem' }}>
              <CTableHead className="bg-body-tertiary">
                <CTableRow>
                  <CTableHeaderCell className="border-0 py-2 ps-3">#</CTableHeaderCell>
                  <CTableHeaderCell className="border-0 py-2">Body Name</CTableHeaderCell>
                  <CTableHeaderCell className="border-0 py-2">Type</CTableHeaderCell>
                  <CTableHeaderCell className="border-0 py-2">Officer</CTableHeaderCell>
                  <CTableHeaderCell className="border-0 py-2">Sanctioned</CTableHeaderCell>
                  <CTableHeaderCell className="border-0 py-2">Sanction #</CTableHeaderCell>
                  <CTableHeaderCell className="border-0 py-2">Added</CTableHeaderCell>
                  <CTableHeaderCell className="border-0 py-2" />
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {bodies.map((body, i) => (
                  <React.Fragment key={body.id}>
                    <CTableRow
                      style={{ cursor: 'pointer' }}
                      className={expandedId === body.id ? 'table-active' : ''}
                      onClick={() => setExpandedId(expandedId === body.id ? null : body.id)}
                    >
                      <CTableDataCell className="ps-3 text-body-secondary small">
                        {i + 1}
                      </CTableDataCell>
                      <CTableDataCell>
                        <div className="fw-semibold">{body.body_name}</div>
                      </CTableDataCell>
                      <CTableDataCell>
                        <CBadge color="info" shape="rounded-pill">
                          {body.body_type}
                        </CBadge>
                      </CTableDataCell>
                      <CTableDataCell className="small">
                        {officerMap[body.officer_id]?.name || (
                          <span className="text-body-secondary">—</span>
                        )}
                      </CTableDataCell>
                      <CTableDataCell className="fw-semibold" style={{ color: '#4361ee' }}>
                        {body.sanctioned_amount ? (
                          fmt(body.sanctioned_amount)
                        ) : (
                          <span className="text-body-secondary small">—</span>
                        )}
                      </CTableDataCell>
                      <CTableDataCell className="small text-body-secondary">
                        {body.sanction_number || '—'}
                      </CTableDataCell>
                      <CTableDataCell className="small text-body-secondary">
                        {fmtDate(body.created_at)}
                      </CTableDataCell>
                      <CTableDataCell
                        className="text-end pe-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <CButton
                          color="secondary"
                          variant="ghost"
                          size="sm"
                          className="me-1"
                          onClick={() => openEdit(body)}
                        >
                          <CIcon icon={cilPencil} />
                        </CButton>
                        <CButton
                          color="danger"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemove(body.id)}
                        >
                          <CIcon icon={cilTrash} />
                        </CButton>
                        <CIcon
                          icon={expandedId === body.id ? cilChevronTop : cilChevronBottom}
                          style={{
                            width: 14,
                            height: 14,
                            color: 'var(--cui-body-secondary-color)',
                            marginLeft: 8,
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            setExpandedId(expandedId === body.id ? null : body.id)
                          }}
                        />
                      </CTableDataCell>
                    </CTableRow>

                    {expandedId === body.id && (
                      <CTableRow>
                        <CTableDataCell colSpan={8} className="p-0 border-0">
                          <BodyDetailPanel body={body} officerMap={officerMap} />
                        </CTableDataCell>
                      </CTableRow>
                    )}
                  </React.Fragment>
                ))}
              </CTableBody>
            </CTable>
          </div>
        )}
      </CCard>

      {/* Add Modal */}
      <CModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        alignment="center"
        size="lg"
        scrollable
      >
        <CModalHeader closeButton>
          <CModalTitle>
            <CIcon icon={cilBuilding} className="me-2 text-primary" />
            Add LSGB Body
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          <BodyForm
            form={addForm}
            setField={setAddField}
            errors={addErrors}
            lsgbOfficers={lsgbOfficers}
          />
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="ghost" onClick={() => setAddOpen(false)}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={handleAdd}>
            <CIcon icon={cilPlus} className="me-1" />
            Save LSGB Body
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Edit Modal */}
      <CModal
        visible={!!editBody}
        onClose={() => setEditBody(null)}
        alignment="center"
        size="lg"
        scrollable
      >
        <CModalHeader closeButton>
          <CModalTitle>
            <CIcon icon={cilPencil} className="me-2 text-success" />
            Edit — {editBody?.body_name}
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          <BodyForm
            form={editForm}
            setField={setEditField}
            errors={editErrors}
            lsgbOfficers={lsgbOfficers}
          />
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="ghost" onClick={() => setEditBody(null)}>
            Cancel
          </CButton>
          <CButton color="success" onClick={handleEdit}>
            Save Changes
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default LsgbOverviewPage
