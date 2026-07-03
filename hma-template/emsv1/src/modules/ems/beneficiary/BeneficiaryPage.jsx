import React, { useEffect, useRef, useState } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPencil, cilPlus, cilTrash } from '@coreui/icons'
import { localBeneficiaries } from '../../../services/localBeneficiaries'

const APL_BPL = ['APL', 'BPL']

const EMPTY = {
  name: '',
  age: '',
  place_ward: '',
  address: '',
  apl_bpl: '',
  occupation: '',
  phone: '',
}

// ── Follow-up dots ────────────────────────────────────────────────────────────

const FollowUpDots = ({ beneficiary, onChange }) => {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const ref = useRef(null)

  const followUps = beneficiary.follow_ups || []
  const completed = followUps.filter((f) => f.completed).length
  const total = followUps.length

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleAdd = () => {
    if (!note.trim()) return
    const updated = localBeneficiaries.addFollowUp(beneficiary.id, { note: note.trim(), completed: false })
    onChange(updated)
    setNote('')
  }

  const handleToggle = (fid) => {
    const updated = localBeneficiaries.toggleFollowUp(beneficiary.id, fid)
    onChange(updated)
  }

  return (
    <div className="position-relative" ref={ref}>
      <button
        className="btn btn-link p-0 d-flex gap-1 align-items-center"
        title={`${completed}/${total} follow-ups complete`}
        onClick={() => setOpen((v) => !v)}
        style={{ textDecoration: 'none' }}
      >
        {[0, 1, 2].map((i) => {
          const fu = followUps[i]
          return (
            <span
              key={i}
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                display: 'inline-block',
                background: fu ? (fu.completed ? '#2eb85c' : '#e55353') : '#c8ced3',
                border: '1.5px solid rgba(0,0,0,0.15)',
              }}
            />
          )
        })}
        {total > 3 && (
          <span className="small text-body-secondary ms-1">+{total - 3}</span>
        )}
      </button>

      {open && (
        <div
          className="shadow border rounded bg-white p-3"
          style={{ position: 'absolute', zIndex: 1050, minWidth: 280, right: 0, top: '1.6rem' }}
        >
          <p className="fw-semibold mb-2 small text-uppercase text-body-secondary">Follow-ups</p>
          {followUps.length === 0 && (
            <p className="text-body-secondary small mb-2">No follow-ups yet.</p>
          )}
          <div className="d-flex flex-column gap-1 mb-2" style={{ maxHeight: 180, overflowY: 'auto' }}>
            {followUps.map((fu, idx) => (
              <label key={fu.id} className="d-flex align-items-center gap-2 small cursor-pointer mb-0">
                <input
                  type="checkbox"
                  checked={!!fu.completed}
                  onChange={() => handleToggle(fu.id)}
                />
                <span
                  className={fu.completed ? 'text-decoration-line-through text-body-secondary' : ''}
                >
                  {idx + 1}. {fu.note}
                </span>
              </label>
            ))}
          </div>
          <div className="d-flex gap-1 mt-1">
            <CFormInput
              size="sm"
              placeholder="Add follow-up note…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <CButton size="sm" color="primary" onClick={handleAdd}>
              +
            </CButton>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────

const BeneficiaryModal = ({ form, setForm, editTarget, onSave, onClose, saving, error }) => {
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              {editTarget ? 'Edit Beneficiary' : 'Add Beneficiary'}
            </h5>
            <button type="button" className="btn-close" onClick={onClose} disabled={saving} />
          </div>
          <div className="modal-body">
            {error && (
              <CAlert color="danger" className="py-2 mb-3">
                {error}
              </CAlert>
            )}

            <div className="row g-3">
              <div className="col-md-6">
                <CFormLabel>
                  Name <span className="text-danger">*</span>
                </CFormLabel>
                <CFormInput
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Full name"
                  invalid={!!error && !form.name.trim()}
                />
              </div>
              <div className="col-md-3">
                <CFormLabel>Age</CFormLabel>
                <CFormInput
                  type="number"
                  min={0}
                  max={120}
                  value={form.age}
                  onChange={(e) => set('age', e.target.value)}
                  placeholder="Age"
                />
              </div>
              <div className="col-md-3">
                <CFormLabel>APL / BPL</CFormLabel>
                <CFormSelect value={form.apl_bpl} onChange={(e) => set('apl_bpl', e.target.value)}>
                  <option value="">— Select —</option>
                  {APL_BPL.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </CFormSelect>
              </div>
              <div className="col-md-6">
                <CFormLabel>Place & Ward</CFormLabel>
                <CFormInput
                  value={form.place_ward}
                  onChange={(e) => set('place_ward', e.target.value)}
                  placeholder="Place / Ward"
                />
              </div>
              <div className="col-md-6">
                <CFormLabel>Phone No.</CFormLabel>
                <CFormInput
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="+91 XXXXX XXXXX"
                />
              </div>
              <div className="col-12">
                <CFormLabel>Address</CFormLabel>
                <CFormTextarea
                  rows={2}
                  value={form.address}
                  onChange={(e) => set('address', e.target.value)}
                  placeholder="Full address"
                />
              </div>
              <div className="col-md-6">
                <CFormLabel>Occupation (if any)</CFormLabel>
                <CFormInput
                  value={form.occupation}
                  onChange={(e) => set('occupation', e.target.value)}
                  placeholder="Occupation"
                />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <CButton color="secondary" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </CButton>
            <CButton color="primary" onClick={onSave} disabled={saving}>
              {saving ? 'Saving…' : editTarget ? 'Update' : 'Add'}
            </CButton>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const BeneficiaryPage = () => {
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = (q = search) => setRows(localBeneficiaries.list({ search: q }))

  useEffect(() => {
    load()
  }, [])

  const openAdd = () => {
    setEditTarget(null)
    setForm(EMPTY)
    setError('')
    setShowModal(true)
  }

  const openEdit = (row) => {
    setEditTarget(row)
    setForm({
      name: row.name || '',
      age: row.age || '',
      place_ward: row.place_ward || '',
      address: row.address || '',
      apl_bpl: row.apl_bpl || '',
      occupation: row.occupation || '',
      phone: row.phone || '',
    })
    setError('')
    setShowModal(true)
  }

  const handleSave = () => {
    if (!form.name.trim()) {
      setError('Name is required.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        age: form.age !== '' ? parseInt(form.age) : null,
      }
      if (editTarget) {
        localBeneficiaries.update(editTarget.id, payload)
      } else {
        localBeneficiaries.create(payload)
      }
      setShowModal(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (id) => {
    if (!window.confirm('Delete this beneficiary?')) return
    localBeneficiaries.remove(id)
    load()
  }

  const handleSearch = (e) => {
    setSearch(e.target.value)
    load(e.target.value)
  }

  const handleFollowUpChange = (updated) => {
    setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
  }

  return (
    <>
      {showModal && (
        <BeneficiaryModal
          form={form}
          setForm={setForm}
          editTarget={editTarget}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
          saving={saving}
          error={error}
        />
      )}

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">Beneficiary Records</h4>
        <CButton color="primary" size="sm" onClick={openAdd}>
          <CIcon icon={cilPlus} className="me-1" />
          Add Beneficiary
        </CButton>
      </div>

      <CCard className="mb-4">
        <CCardBody>
          <div className="mb-3" style={{ maxWidth: 320 }}>
            <CFormInput
              placeholder="Search by name, place, address…"
              value={search}
              onChange={handleSearch}
            />
          </div>

          <div style={{ overflowX: 'auto' }}>
            <CTable hover responsive bordered align="middle" className="mb-0 small">
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell style={{ width: 48 }}>SL</CTableHeaderCell>
                  <CTableHeaderCell>Name</CTableHeaderCell>
                  <CTableHeaderCell style={{ width: 60 }}>Age</CTableHeaderCell>
                  <CTableHeaderCell>Place & Ward</CTableHeaderCell>
                  <CTableHeaderCell>Address</CTableHeaderCell>
                  <CTableHeaderCell style={{ width: 72 }}>APL/BPL</CTableHeaderCell>
                  <CTableHeaderCell>Occupation</CTableHeaderCell>
                  <CTableHeaderCell>Ph. No</CTableHeaderCell>
                  <CTableHeaderCell style={{ width: 80, textAlign: 'center' }}>
                    Follow-ups
                  </CTableHeaderCell>
                  <CTableHeaderCell style={{ width: 88 }} />
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {rows.length === 0 && (
                  <CTableRow>
                    <CTableDataCell colSpan={10} className="text-center text-body-secondary py-4">
                      {search ? 'No results found.' : 'No beneficiaries added yet.'}
                    </CTableDataCell>
                  </CTableRow>
                )}
                {rows.map((row, idx) => (
                  <CTableRow key={row.id}>
                    <CTableDataCell className="text-body-secondary">{idx + 1}</CTableDataCell>
                    <CTableDataCell className="fw-semibold">{row.name}</CTableDataCell>
                    <CTableDataCell>{row.age ?? '—'}</CTableDataCell>
                    <CTableDataCell>{row.place_ward || '—'}</CTableDataCell>
                    <CTableDataCell style={{ maxWidth: 200 }}>
                      <span
                        title={row.address}
                        style={{
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: 180,
                        }}
                      >
                        {row.address || '—'}
                      </span>
                    </CTableDataCell>
                    <CTableDataCell>
                      {row.apl_bpl ? (
                        <span
                          className={`badge bg-${row.apl_bpl === 'BPL' ? 'danger' : 'info'} text-white`}
                        >
                          {row.apl_bpl}
                        </span>
                      ) : (
                        '—'
                      )}
                    </CTableDataCell>
                    <CTableDataCell>{row.occupation || '—'}</CTableDataCell>
                    <CTableDataCell>{row.phone || '—'}</CTableDataCell>
                    <CTableDataCell style={{ textAlign: 'center' }}>
                      <FollowUpDots beneficiary={row} onChange={handleFollowUpChange} />
                    </CTableDataCell>
                    <CTableDataCell>
                      <div className="d-flex gap-1 justify-content-end">
                        <CButton
                          size="sm"
                          color="info"
                          variant="outline"
                          onClick={() => openEdit(row)}
                          title="Edit"
                        >
                          <CIcon icon={cilPencil} />
                        </CButton>
                        <CButton
                          size="sm"
                          color="danger"
                          variant="outline"
                          onClick={() => handleDelete(row.id)}
                          title="Delete"
                        >
                          <CIcon icon={cilTrash} />
                        </CButton>
                      </div>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </div>
        </CCardBody>
      </CCard>
    </>
  )
}

export default BeneficiaryPage
