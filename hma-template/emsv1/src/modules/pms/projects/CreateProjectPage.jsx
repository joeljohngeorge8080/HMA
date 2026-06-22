/**
 * CreateProjectPage — Full project creation form for Project Officers.
 * Route: /pms/projects/create
 */
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CContainer,
  CRow,
  CCol,
  CCard,
  CCardBody,
  CCardHeader,
  CForm,
  CFormLabel,
  CFormInput,
  CFormSelect,
  CFormTextarea,
  CButton,
  CSpinner,
  CToaster,
  CToast,
  CToastBody,
  CToastClose,
  CInputGroup,
  CInputGroupText,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilSave } from '@coreui/icons'

import { localProjects } from '../../../services/localProjects'

const OFFICER_ID = 'po_001' // Demo: replace with auth context

const CreateProjectPage = () => {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const [form, setForm] = useState({
    title: '',
    phase: 'pipeline',
    funding_agency: '',
    implementing_partner: '',
    location: '',
    start_date: '',
    end_date: '',
    project_valuation: '',
    amount_sanctioned: '',
    amount_released: '',
    amount_utilized: '',
    notes: '',
  })

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const project = localProjects.create({
        ...form,
        assigned_officer_id: OFFICER_ID,
      })
      setToast({ color: 'success', message: '✅ Project created successfully!' })
      setTimeout(() => navigate(`/pms/projects/${project.id}`), 1200)
    } catch (err) {
      setToast({ color: 'danger', message: err.message || 'Failed to create project' })
      setSaving(false)
    }
  }

  return (
    <CContainer lg className="py-3">
      {/* Page header */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <CButton color="secondary" variant="ghost" onClick={() => navigate('/pms/projects/my-projects')}>
          <CIcon icon={cilArrowLeft} />
        </CButton>
        <div>
          <h4 className="mb-0 fw-semibold">Create New Project</h4>
          <div className="small text-body-secondary">Fill in the project details below</div>
        </div>
      </div>

      <CForm onSubmit={handleSubmit}>
        <CRow className="g-4">
          {/* Left column */}
          <CCol xs={12} lg={8}>
            {/* Basic Info */}
            <CCard className="shadow-sm mb-4">
              <CCardHeader className="bg-transparent fw-semibold pt-3">
                Project Information
              </CCardHeader>
              <CCardBody>
                <div className="mb-3">
                  <CFormLabel className="fw-medium">
                    Project Title <span className="text-danger">*</span>
                  </CFormLabel>
                  <CFormInput
                    placeholder="Enter project title"
                    value={form.title}
                    onChange={(e) => setField('title', e.target.value)}
                    required
                  />
                </div>

                <div className="mb-3">
                  <CFormLabel className="fw-medium">Project Phase</CFormLabel>
                  <CFormSelect
                    value={form.phase}
                    onChange={(e) => setField('phase', e.target.value)}
                  >
                    <option value="pipeline">🔵 Pipeline</option>
                    <option value="approved">🟦 Approved</option>
                    <option value="ongoing">🟢 Ongoing</option>
                    <option value="completed">✅ Completed</option>
                  </CFormSelect>
                </div>

                <CRow className="g-3">
                  <CCol xs={12} md={6}>
                    <CFormLabel className="fw-medium">Funding Agency</CFormLabel>
                    <CFormInput
                      placeholder="e.g. Ministry of Health"
                      value={form.funding_agency}
                      onChange={(e) => setField('funding_agency', e.target.value)}
                    />
                  </CCol>
                  <CCol xs={12} md={6}>
                    <CFormLabel className="fw-medium">Implementing Partner</CFormLabel>
                    <CFormInput
                      placeholder="e.g. HLL Lifecare Limited"
                      value={form.implementing_partner}
                      onChange={(e) => setField('implementing_partner', e.target.value)}
                    />
                  </CCol>
                </CRow>

                <div className="mt-3">
                  <CFormLabel className="fw-medium">Location</CFormLabel>
                  <CFormInput
                    placeholder="District, State"
                    value={form.location}
                    onChange={(e) => setField('location', e.target.value)}
                  />
                </div>
              </CCardBody>
            </CCard>

            {/* Dates */}
            <CCard className="shadow-sm mb-4">
              <CCardHeader className="bg-transparent fw-semibold pt-3">
                Timeline
              </CCardHeader>
              <CCardBody>
                <CRow className="g-3">
                  <CCol xs={12} md={6}>
                    <CFormLabel className="fw-medium">Start Date</CFormLabel>
                    <CFormInput
                      type="date"
                      value={form.start_date}
                      onChange={(e) => setField('start_date', e.target.value)}
                    />
                  </CCol>
                  <CCol xs={12} md={6}>
                    <CFormLabel className="fw-medium">
                      End Date (Deadline) <span className="text-danger">*</span>
                    </CFormLabel>
                    <CFormInput
                      type="date"
                      value={form.end_date}
                      onChange={(e) => setField('end_date', e.target.value)}
                      required
                    />
                  </CCol>
                </CRow>
              </CCardBody>
            </CCard>

            {/* Financial Details */}
            <CCard className="shadow-sm mb-4">
              <CCardHeader className="bg-transparent fw-semibold pt-3">
                Financial Details
              </CCardHeader>
              <CCardBody>
                <CRow className="g-3">
                  <CCol xs={12} md={6}>
                    <CFormLabel className="fw-medium">
                      Project Valuation (₹) <span className="text-danger">*</span>
                    </CFormLabel>
                    <CInputGroup>
                      <CInputGroupText>₹</CInputGroupText>
                      <CFormInput
                        type="number"
                        min="0"
                        placeholder="0"
                        value={form.project_valuation}
                        onChange={(e) => setField('project_valuation', e.target.value)}
                        required
                      />
                    </CInputGroup>
                  </CCol>
                  <CCol xs={12} md={6}>
                    <CFormLabel className="fw-medium">Amount Sanctioned (₹)</CFormLabel>
                    <CInputGroup>
                      <CInputGroupText>₹</CInputGroupText>
                      <CFormInput
                        type="number"
                        min="0"
                        placeholder="0"
                        value={form.amount_sanctioned}
                        onChange={(e) => setField('amount_sanctioned', e.target.value)}
                      />
                    </CInputGroup>
                  </CCol>
                  <CCol xs={12} md={6}>
                    <CFormLabel className="fw-medium">Amount Released (₹)</CFormLabel>
                    <CInputGroup>
                      <CInputGroupText>₹</CInputGroupText>
                      <CFormInput
                        type="number"
                        min="0"
                        placeholder="0"
                        value={form.amount_released}
                        onChange={(e) => setField('amount_released', e.target.value)}
                      />
                    </CInputGroup>
                  </CCol>
                  <CCol xs={12} md={6}>
                    <CFormLabel className="fw-medium">Amount Utilized (₹)</CFormLabel>
                    <CInputGroup>
                      <CInputGroupText>₹</CInputGroupText>
                      <CFormInput
                        type="number"
                        min="0"
                        placeholder="0"
                        value={form.amount_utilized}
                        onChange={(e) => setField('amount_utilized', e.target.value)}
                      />
                    </CInputGroup>
                  </CCol>
                </CRow>
              </CCardBody>
            </CCard>
          </CCol>

          {/* Right sidebar — summary + submit */}
          <CCol xs={12} lg={4}>
            <CCard className="shadow-sm sticky-top" style={{ top: '80px' }}>
              <CCardHeader className="bg-transparent fw-semibold pt-3">
                Summary
              </CCardHeader>
              <CCardBody>
                <div className="mb-3 small">
                  <div className="text-body-secondary mb-1">Title</div>
                  <div className="fw-semibold">{form.title || '—'}</div>
                </div>
                <div className="mb-3 small">
                  <div className="text-body-secondary mb-1">Phase</div>
                  <div className="fw-semibold text-capitalize">{form.phase}</div>
                </div>
                <div className="mb-3 small">
                  <div className="text-body-secondary mb-1">Location</div>
                  <div className="fw-semibold">{form.location || '—'}</div>
                </div>
                <div className="mb-3 small">
                  <div className="text-body-secondary mb-1">End Date</div>
                  <div className="fw-semibold">{form.end_date || '—'}</div>
                </div>
                <div className="mb-4 small">
                  <div className="text-body-secondary mb-1">Valuation</div>
                  <div className="fw-bold fs-5 text-primary">
                    {form.project_valuation
                      ? `₹${parseFloat(form.project_valuation).toLocaleString('en-IN')}`
                      : '—'}
                  </div>
                </div>

                <div className="d-grid gap-2">
                  <CButton color="primary" type="submit" disabled={saving}>
                    {saving ? (
                      <>
                        <CSpinner size="sm" className="me-2" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <CIcon icon={cilSave} className="me-1" />
                        Create Project
                      </>
                    )}
                  </CButton>
                  <CButton
                    color="secondary"
                    variant="ghost"
                    onClick={() => navigate('/pms/projects/my-projects')}
                  >
                    Cancel
                  </CButton>
                </div>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CForm>

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

export default CreateProjectPage
