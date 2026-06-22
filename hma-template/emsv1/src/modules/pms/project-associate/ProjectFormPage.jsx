/**
 * ProjectFormPage.jsx ΓÇö Create / Edit project form.
 * Routes: /pms/projects/create  &  /pms/projects/:id/edit
 */
import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CContainer,
  CCard,
  CCardBody,
  CCardHeader,
  CRow,
  CCol,
  CForm,
  CFormLabel,
  CFormInput,
  CFormTextarea,
  CFormSelect,
  CButton,
  CBadge,
  CAlert,
  CToaster,
  CToast,
  CToastBody,
  CToastClose,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilSave,
  cilXCircle,
  cilPeople,
  cilEnvelopeLetter,
  cilInfo,
  cilArrowLeft,
} from '@coreui/icons'
import { localProjects, localOfficers } from '../../../services/localProjects'

const EMPTY_FORM = {
  name: '',
  project_code: '',
  project_type: 'Other Public Health',
  description: '',
  funding_agency: '',
  implementing_partner: '',
  location: '',
  district: '',
  status: 'pipeline',
  phase: 'pipeline',
  project_value: '',
  amount_received: '',
  expense_accounted: '',
  committed_expense: '',
  start_date: '',
  end_date: '',
  beneficiaries_completed: '',
  officer_id: '',
}

const ProjectFormPage = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const [form, setForm] = useState(EMPTY_FORM)
  const [officers, setOfficers] = useState([])
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [emailNotice, setEmailNotice] = useState(false)

  useEffect(() => {
    localProjects.seedDemoData()
    setOfficers(localOfficers.getAvailable())

    if (isEdit) {
      const project = localProjects.getById(id)
      if (project) {
        setForm({
          name: project.name || '',
          project_code: project.project_code || '',
          project_type: project.project_type || 'Other Public Health',
          description: project.description || '',
          funding_agency: project.funding_agency || '',
          implementing_partner: project.implementing_partner || '',
          location: project.location || '',
          district: project.district || '',
          status: project.status || 'pipeline',
          phase: project.phase || 'pipeline',
          project_value: project.project_value || '',
          amount_received: project.amount_received || '',
          expense_accounted: project.expense_accounted || '',
          committed_expense: project.committed_expense || '',
          beneficiaries_completed: project.beneficiaries_completed || '',
          start_date: project.start_date || '',
          end_date: project.end_date || '',
          officer_id: project.officer_id || '',
        })
      }
    }
  }, [id, isEdit])

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }))
    if (field === 'officer_id' && value) setEmailNotice(true)
    if (field === 'officer_id' && !value) setEmailNotice(false)
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Project name is required'
    if (!form.project_code?.trim()) e.project_code = 'Project code is required'
    if (!form.project_value || isNaN(Number(form.project_value)))
      e.project_value = 'Enter a valid project value'
    if (!form.start_date) e.start_date = 'Start date is required'
    if (!form.location.trim()) e.location = 'Location is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    try {
      const data = {
        ...form,
        project_value: Number(form.project_value),
        amount_received: Number(form.amount_received) || 0,
        expense_accounted: Number(form.expense_accounted) || 0,
        committed_expense: Number(form.committed_expense) || 0,
        beneficiaries_completed: Number(form.beneficiaries_completed) || 0,
      }

      let savedProject
      if (isEdit) {
        savedProject = localProjects.update(id, data)
        // If officer changed, assign properly
        if (form.officer_id && form.officer_id !== localProjects.getById(id)?.officer_id) {
          localProjects.assignOfficer(id, form.officer_id)
        }
        setToast({ color: 'success', message: 'Γ£à Project updated successfully!' })
      } else {
        savedProject = localProjects.create(data)
        // Assign officer if selected
        if (form.officer_id) {
          localProjects.assignOfficer(savedProject.id, form.officer_id)
        }
        setToast({ color: 'success', message: 'Γ£à Project created successfully!' })
      }

      setTimeout(() => navigate(`/pms/projects/${savedProject.id}`), 1200)
    } catch (err) {
      setToast({ color: 'danger', message: `Γ¥î Error: ${err.message}` })
    }
    setSaving(false)
  }

  const selectedOfficer = officers.find((o) => o.id === form.officer_id)

  return (
    <CContainer lg className="py-4">
      {/* Back + Title */}
      <div className="mb-4">
        <CButton
          color="secondary"
          variant="ghost"
          size="sm"
          className="mb-2"
          onClick={() => navigate(isEdit ? `/pms/projects/${id}` : '/pms/projects')}
        >
          <CIcon icon={cilArrowLeft} className="me-1" />
          Back
        </CButton>
        <h4 className="fw-bold mb-1">{isEdit ? 'Edit Project' : 'Create New Project'}</h4>
        <p className="text-body-secondary mb-0 small">
          {isEdit
            ? 'Update the project details and officer assignment'
            : 'Fill in the details to create a new project and assign a project officer'}
        </p>
      </div>

      <CForm onSubmit={handleSubmit} noValidate>
        <CRow className="g-4">
          {/* Left column */}
          <CCol xs={12} lg={8}>
            {/* Project Details */}
            <CCard className="border-0 shadow-sm mb-4" style={{ borderRadius: '12px' }}>
              <CCardHeader className="bg-transparent border-bottom py-3">
                <h6 className="fw-bold mb-0">≡ƒôï Project Details</h6>
              </CCardHeader>
              <CCardBody>
                <CRow className="g-3">
                  <CCol xs={12}>
                    <CFormLabel className="fw-semibold small">
                      Project Name <span className="text-danger">*</span>
                    </CFormLabel>
                    <CFormInput
                      placeholder="e.g., Rural Water Supply Scheme ΓÇö Wayanad"
                      value={form.name}
                      onChange={(e) => set('name', e.target.value)}
                      invalid={!!errors.name}
                    />
                    {errors.name && (
                      <div className="text-danger small mt-1">{errors.name}</div>
                    )}
                  </CCol>
                  <CCol xs={12} md={6}>
                    <CFormLabel className="fw-semibold small">
                      Project Code <span className="text-danger">*</span>
                    </CFormLabel>
                    <CFormInput
                      placeholder="e.g., RWS-W-001"
                      value={form.project_code || ''}
                      onChange={(e) => set('project_code', e.target.value)}
                      invalid={!!errors.project_code}
                    />
                    {errors.project_code && (
                      <div className="text-danger small mt-1">{errors.project_code}</div>
                    )}
                  </CCol>
                  <CCol xs={12} md={6}>
                    <CFormLabel className="fw-semibold small">Project Type</CFormLabel>
                    <CFormSelect value={form.project_type || ''} onChange={(e) => set('project_type', e.target.value)}>
                      <option value="Consultancy">Consultancy</option>
                      <option value="Other Public Health">Other Public Health</option>
                      <option value="M-CUP">M-CUP</option>
                    </CFormSelect>
                  </CCol>
                  <CCol xs={12}>
                    <CFormLabel className="fw-semibold small">Description</CFormLabel>
                    <CFormTextarea
                      rows={3}
                      placeholder="Brief description of the project objectives..."
                      value={form.description}
                      onChange={(e) => set('description', e.target.value)}
                    />
                  </CCol>
                  <CCol xs={12} md={6}>
                    <CFormLabel className="fw-semibold small">Funding Agency</CFormLabel>
                    <CFormInput
                      placeholder="e.g., NABARD, MNRE, NHM..."
                      value={form.funding_agency}
                      onChange={(e) => set('funding_agency', e.target.value)}
                    />
                  </CCol>
                  <CCol xs={12} md={6}>
                    <CFormLabel className="fw-semibold small">Implementing Partner</CFormLabel>
                    <CFormInput
                      placeholder="e.g., Kudumbashree, KSEB..."
                      value={form.implementing_partner}
                      onChange={(e) => set('implementing_partner', e.target.value)}
                    />
                  </CCol>
                  <CCol xs={12} md={6}>
                    <CFormLabel className="fw-semibold small">
                      Location <span className="text-danger">*</span>
                    </CFormLabel>
                    <CFormInput
                      placeholder="e.g., Wayanad, Kerala"
                      value={form.location}
                      onChange={(e) => set('location', e.target.value)}
                      invalid={!!errors.location}
                    />
                    {errors.location && (
                      <div className="text-danger small mt-1">{errors.location}</div>
                    )}
                  </CCol>
                  <CCol xs={12} md={6}>
                    <CFormLabel className="fw-semibold small">District</CFormLabel>
                    <CFormInput
                      placeholder="e.g., Wayanad"
                      value={form.district}
                      onChange={(e) => set('district', e.target.value)}
                    />
                  </CCol>
                  <CCol xs={12} md={6}>
                    <CFormLabel className="fw-semibold small">Start Date <span className="text-danger">*</span></CFormLabel>
                    <CFormInput
                      type="date"
                      value={form.start_date}
                      onChange={(e) => set('start_date', e.target.value)}
                      invalid={!!errors.start_date}
                    />
                    {errors.start_date && (
                      <div className="text-danger small mt-1">{errors.start_date}</div>
                    )}
                  </CCol>
                  <CCol xs={12} md={6}>
                    <CFormLabel className="fw-semibold small">End Date</CFormLabel>
                    <CFormInput
                      type="date"
                      value={form.end_date}
                      onChange={(e) => set('end_date', e.target.value)}
                    />
                  </CCol>
                </CRow>
              </CCardBody>
            </CCard>

            {/* Financial Details */}
            <CCard className="border-0 shadow-sm mb-4" style={{ borderRadius: '12px' }}>
              <CCardHeader className="bg-transparent border-bottom py-3">
                <h6 className="fw-bold mb-0">≡ƒÆ░ Financial Details</h6>
              </CCardHeader>
              <CCardBody>
                <CRow className="g-3">
                  <CCol xs={12} md={6}>
                    <CFormLabel className="fw-semibold small">
                      Project Value (Γé╣) <span className="text-danger">*</span>
                    </CFormLabel>
                    <CFormInput
                      type="number"
                      placeholder="e.g., 4500000"
                      value={form.project_value}
                      onChange={(e) => set('project_value', e.target.value)}
                      invalid={!!errors.project_value}
                    />
                    {errors.project_value && (
                      <div className="text-danger small mt-1">{errors.project_value}</div>
                    )}
                    {form.project_value && !isNaN(Number(form.project_value)) && (
                      <div className="text-body-secondary small mt-1">
                        Γé╣{Number(form.project_value).toLocaleString('en-IN')}
                      </div>
                    )}
                  </CCol>
                  <CCol xs={12} md={6}>
                    <CFormLabel className="fw-semibold small">Amount Received (Γé╣)</CFormLabel>
                    <CFormInput
                      type="number"
                      placeholder="e.g., 2800000"
                      value={form.amount_received}
                      onChange={(e) => set('amount_received', e.target.value)}
                    />
                    {form.amount_received && !isNaN(Number(form.amount_received)) && (
                      <div className="text-success small mt-1">
                        Γé╣{Number(form.amount_received).toLocaleString('en-IN')}
                      </div>
                    )}
                  </CCol>
                  <CCol xs={12} md={6}>
                    <CFormLabel className="fw-semibold small">Expense Accounted (Γé╣)</CFormLabel>
                    <CFormInput
                      type="number"
                      placeholder="e.g., 1950000"
                      value={form.expense_accounted}
                      onChange={(e) => set('expense_accounted', e.target.value)}
                    />
                    {form.expense_accounted && !isNaN(Number(form.expense_accounted)) && (
                      <div className="text-warning small mt-1">
                        Γé╣{Number(form.expense_accounted).toLocaleString('en-IN')}
                      </div>
                    )}
                  </CCol>
                  <CCol xs={12} md={6}>
                    <CFormLabel className="fw-semibold small">Committed Expense (Γé╣)</CFormLabel>
                    <CFormInput
                      type="number"
                      placeholder="e.g., 380000"
                      value={form.committed_expense}
                      onChange={(e) => set('committed_expense', e.target.value)}
                    />
                    {form.committed_expense && !isNaN(Number(form.committed_expense)) && (
                      <div className="text-body-secondary small mt-1">
                        Γé╣{Number(form.committed_expense).toLocaleString('en-IN')}
                      </div>
                    )}
                  </CCol>
                  {/* Live fund balance preview */}
                  {form.project_value && (
                    <CCol xs={12}>
                      {(() => {
                        const pv = Number(form.project_value) || 0
                        const ea = Number(form.expense_accounted) || 0
                        const ce = Number(form.committed_expense) || 0
                        const balance = pv - ea - ce
                        return (
                          <div
                            className="rounded-3 p-3"
                            style={{
                              background: balance >= 0 ? 'rgba(6,214,160,0.08)' : 'rgba(231,76,60,0.08)',
                              border: `1.5px solid ${balance >= 0 ? '#06d6a044' : '#e74c3c44'}`,
                            }}
                          >
                            <div className="d-flex justify-content-between align-items-center">
                              <span className="small fw-semibold text-body-secondary">Fund Balance (auto-computed)</span>
                              <span
                                className="fw-bold fs-6"
                                style={{ color: balance >= 0 ? '#06d6a0' : '#e74c3c' }}
                              >
                                Γé╣{balance.toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div className="text-body-secondary mt-1" style={{ fontSize: '0.72rem' }}>
                              Project Value ΓêÆ Expense Accounted ΓêÆ Committed Expense
                            </div>
                          </div>
                        )
                      })()}
                    </CCol>
                  )}
                  <CCol xs={12}>
                    <CFormLabel className="fw-semibold small">Beneficiaries Completed Till Date</CFormLabel>
                    <CFormInput
                      type="number"
                      placeholder="e.g., 1500"
                      value={form.beneficiaries_completed}
                      onChange={(e) => set('beneficiaries_completed', e.target.value)}
                    />
                  </CCol>
                </CRow>
              </CCardBody>
            </CCard>

            {/* Status & Phase */}
            <CCard className="border-0 shadow-sm" style={{ borderRadius: '12px' }}>
              <CCardHeader className="bg-transparent border-bottom py-3">
                <h6 className="fw-bold mb-0">≡ƒôè Status & Phase</h6>
              </CCardHeader>
              <CCardBody>
                <CRow className="g-3">
                  <CCol xs={12} md={6}>
                    <CFormLabel className="fw-semibold small">Project Status</CFormLabel>
                    <CFormSelect value={form.status} onChange={(e) => set('status', e.target.value)}>
                      <option value="pipeline">Pipeline</option>
                      <option value="approved">Approved</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                    </CFormSelect>
                  </CCol>
                  <CCol xs={12} md={6}>
                    <CFormLabel className="fw-semibold small">Project Phase</CFormLabel>
                    <CFormSelect value={form.phase} onChange={(e) => set('phase', e.target.value)}>
                      <option value="design_and_initiation">Design and Initiation</option>
                      <option value="implementation">Implementation</option>
                      <option value="monitoring_and_evaluation">Monitoring and Evaluation</option>
                    </CFormSelect>
                  </CCol>
                </CRow>
              </CCardBody>
            </CCard>
          </CCol>

          {/* Right column: Officer assignment */}
          <CCol xs={12} lg={4}>
            <CCard
              className="border-0 shadow-sm mb-4"
              style={{ borderRadius: '12px', border: '2px solid transparent' }}
            >
              <CCardHeader className="bg-transparent border-bottom py-3">
                <h6 className="fw-bold mb-0">
                  <CIcon icon={cilPeople} className="me-2 text-primary" />
                  Assign Project Officer
                </h6>
              </CCardHeader>
              <CCardBody>
                <CFormLabel className="fw-semibold small">Select Officer</CFormLabel>
                <CFormSelect
                  value={form.officer_id}
                  onChange={(e) => set('officer_id', e.target.value)}
                  className="mb-3"
                >
                  <option value="">ΓÇö No officer assigned ΓÇö</option>
                  {officers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} ┬╖ {o.designation}
                    </option>
                  ))}
                </CFormSelect>

                {/* Selected officer card */}
                {selectedOfficer && (
                  <div
                    className="p-3 rounded-3 mb-3"
                    style={{ background: 'rgba(67,97,238,0.06)', border: '1px solid rgba(67,97,238,0.15)' }}
                  >
                    <div className="d-flex align-items-center gap-3 mb-2">
                      <div
                        className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold"
                        style={{ width: 40, height: 40, fontSize: '1rem', flexShrink: 0 }}
                      >
                        {selectedOfficer.name.charAt(0)}
                      </div>
                      <div>
                        <div className="fw-semibold">{selectedOfficer.name}</div>
                        <div className="text-body-secondary small">{selectedOfficer.designation}</div>
                      </div>
                    </div>
                    <div className="small">
                      <div className="text-body-secondary mb-1">
                        ≡ƒôº {selectedOfficer.email}
                      </div>
                      <div className="text-body-secondary">
                        ≡ƒô▒ {selectedOfficer.phone}
                      </div>
                    </div>
                    <div className="mt-2">
                      <CBadge color="info" shape="rounded-pill" className="small">
                        {selectedOfficer.projects_assigned.length} projects assigned
                      </CBadge>
                    </div>
                  </div>
                )}

                {/* SES email notice */}
                {emailNotice && (
                  <CAlert color="info" className="py-2 px-3 mb-0 d-flex align-items-start gap-2" style={{ fontSize: '0.8rem' }}>
                    <CIcon icon={cilEnvelopeLetter} className="mt-1 flex-shrink-0 text-info" />
                    <div>
                      <strong>Email access will be granted</strong>
                      <br />
                      On save, an invite email will be sent to{' '}
                      <strong>{selectedOfficer?.email}</strong> via AWS SES giving them project access.
                    </div>
                  </CAlert>
                )}
              </CCardBody>
            </CCard>

            {/* Save actions */}
            <div className="d-grid gap-2">
              <CButton
                type="submit"
                color="primary"
                size="lg"
                className="fw-semibold shadow-sm"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <CSpinner size="sm" className="me-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CIcon icon={cilSave} className="me-2" />
                    {isEdit ? 'Update Project' : 'Create Project'}
                  </>
                )}
              </CButton>
              <CButton
                color="secondary"
                variant="outline"
                onClick={() => navigate(isEdit ? `/pms/projects/${id}` : '/pms/projects')}
                disabled={saving}
              >
                <CIcon icon={cilXCircle} className="me-1" />
                Cancel
              </CButton>
            </div>

            {/* Info hint */}
            <CAlert color="light" className="mt-3 py-2 px-3 border d-flex align-items-start gap-2" style={{ fontSize: '0.75rem' }}>
              <CIcon icon={cilInfo} className="mt-1 flex-shrink-0 text-body-secondary" />
              <div className="text-body-secondary">
                Project Officers will receive a login link via email and can then view &amp; edit their assigned projects, manage tasks, and submit procurement requests.
              </div>
            </CAlert>
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

export default ProjectFormPage
