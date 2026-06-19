import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import {
  CAccordion,
  CAccordionBody,
  CAccordionHeader,
  CAccordionItem,
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormFeedback,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CRow,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilPlus, cilTrash } from '@coreui/icons'

import { usePermission } from '../../hooks/usePermission'
import { MODULE } from '../../constants/modules'
import { localEmployees } from '../../services/localEmployees'
import api from '../../services/api'
import ProfilePhotoUpload from './components/ProfilePhotoUpload'

// ─── option lists ─────────────────────────────────────────────────────────────

const DEPARTMENTS = ['SDP', 'FINANCE', 'HR', 'HLL MANAGEMENT', 'UTILITY STAFF', 'OTHER']

const GENDERS = ['Male', 'Female', 'Other']
const CATEGORIES = ['Permanent', 'FTC', 'TPC']
const STATUSES = ['Active', 'Inactive', 'Resigned', 'Retired']
const MARITAL = ['Single', 'Married', 'Divorced', 'Widowed']
const BLOOD = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']
const RELATIONSHIPS = [
  'Father',
  'Mother',
  'Husband',
  'Wife',
  'Son',
  'Daughter',
  'Brother',
  'Sister',
  'Other',
]

const DEFAULT = {
  employee_id: '',
  first_name: '',
  middle_name: '',
  last_name: '',
  gender: '',
  marital_status: '',
  blood_group: '',
  date_of_birth: '',
  employee_category: '',
  status: 'Active',
  joined_date: '',
  initial_salary: '',
  contact: { personal_email: '', working_email: '', mobile: '', phone: '', emergency_contact: '' },
  address: { resident_location: '', present_address: '', permanent_address: '', state: '' },
  employment: {
    designation: '',
    department: '',
    department_other: '',
    reporting_to: '',
    working_region: '',
    working_state: '',
    start_date: '',
  },
  identification: {
    pan_number: '',
    aadhar_number: '',
    passport_number: '',
    uan_number: '',
    esi_number: '',
    pf_number: '',
  },
  bank_accounts: [],
  family_members: [],
  initial_project: '',
  initial_project_date: '',
  initial_project_remarks: '',
}

// ─── tiny helpers ─────────────────────────────────────────────────────────────

const Req = () => <span className="text-danger ms-1">*</span>

const F = ({ label, required, error, hint, children }) => (
  <div>
    <CFormLabel className={required ? 'fw-semibold' : ''}>
      {label}
      {required && <Req />}
    </CFormLabel>
    {children}
    {error && (
      <CFormFeedback invalid className="d-block">
        {error.message}
      </CFormFeedback>
    )}
    {hint && !error && <div className="form-text text-body-secondary">{hint}</div>}
  </div>
)

// ─── EmployeeForm ─────────────────────────────────────────────────────────────

const EmployeeForm = () => {
  const { id } = useParams()
  const isEdit = Boolean(id && id !== 'new')
  const navigate = useNavigate()
  const canEdit = usePermission(MODULE.STAFF_PAYROLL, 'edit')

  const [fetching, setFetching] = useState(isEdit)
  const [fetchError, setFetchError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [photo, setPhoto] = useState(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: DEFAULT })

  // ── dynamic arrays ──────────────────────────────────────────────────────────

  const {
    fields: bankFields,
    append: addBank,
    remove: removeBank,
  } = useFieldArray({ control, name: 'bank_accounts' })

  const {
    fields: familyFields,
    append: addFamily,
    remove: removeFamily,
  } = useFieldArray({ control, name: 'family_members' })

  const watchedStatus = watch('status')
  const watchedDept = watch('employment.department') || ''
  const watchedDeptOther = watch('employment.department_other') || ''
  const watchedFirst = watch('first_name') || ''
  const watchedLast = watch('last_name') || ''
  const isProjectDept = watchedDept === 'SDP'

  // ── load for edit mode ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!isEdit) return
    const load = async () => {
      setFetching(true)
      setFetchError('')
      try {
        let data = null
        try {
          const res = await api.get(`/employees/${id}`)
          data = res.data
        } catch {
          data = localEmployees.getById(id)
        }
        if (!data) {
          setFetchError('Employee not found')
          return
        }
        reset({
          employee_id: data.employee_id || '',
          first_name: data.first_name || '',
          middle_name: data.middle_name || '',
          last_name: data.last_name || '',
          gender: data.gender || '',
          marital_status: data.marital_status || '',
          blood_group: data.blood_group || '',
          date_of_birth: data.date_of_birth || '',
          employee_category: data.employee_category || '',
          status: data.status || 'Active',
          joined_date: data.joined_date || '',
          initial_salary: data.current_salary || '',
          contact: {
            personal_email: data.contact?.personal_email || '',
            working_email: data.contact?.working_email || '',
            mobile: data.contact?.mobile || '',
            phone: data.contact?.phone || '',
            emergency_contact: data.contact?.emergency_contact || '',
          },
          address: {
            resident_location: data.address?.resident_location || '',
            present_address: data.address?.present_address || '',
            permanent_address: data.address?.permanent_address || '',
            state: data.address?.state || '',
          },
          employment: {
            designation: data.employment?.designation || '',
            department: DEPARTMENTS.includes(data.employment?.department)
              ? data.employment.department
              : data.employment?.department
                ? 'OTHER'
                : '',
            department_other: DEPARTMENTS.includes(data.employment?.department)
              ? ''
              : data.employment?.department || '',
            reporting_to: data.employment?.reporting_to || '',
            working_region: data.employment?.working_region || '',
            working_state: data.employment?.working_state || '',
            start_date: data.employment?.start_date || '',
          },
          identification: {
            pan_number: data.identification?.pan_number || '',
            aadhar_number: data.identification?.aadhar_number || '',
            passport_number: data.identification?.passport_number || '',
            uan_number: data.identification?.uan_number || '',
            esi_number: data.identification?.esi_number || '',
            pf_number: data.identification?.pf_number || '',
          },
          bank_accounts: data.bank_accounts || [],
          family_members: data.family_members || [],
        })
        if (data.photo_url) setPhoto(data.photo_url)
      } catch {
        setFetchError('Failed to load employee data.')
      } finally {
        setFetching(false)
      }
    }
    load()
  }, [id, isEdit, reset])

  // ── guards ───────────────────────────────────────────────────────────────────

  if (!canEdit) {
    return (
      <CAlert color="danger">
        <strong>Access Denied.</strong> This page is restricted to HR users.
      </CAlert>
    )
  }

  if (fetching) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
        <p className="mt-2 text-body-secondary small">Loading employee record…</p>
      </div>
    )
  }

  if (fetchError) {
    return <CAlert color="danger">{fetchError}</CAlert>
  }

  // ── submit ───────────────────────────────────────────────────────────────────

  const onSubmit = async (form) => {
    setSubmitError('')
    try {
      let saved = null

      // Resolve actual department: if OTHER was picked, use the typed value
      const resolvedDept =
        form.employment?.department === 'OTHER'
          ? form.employment?.department_other || 'OTHER'
          : form.employment?.department || ''

      const { department_other: _deptOther, ...restEmployment } = form.employment || {}
      const payload = {
        ...form,
        photo_url: photo || undefined,
        employment: { ...restEmployment, department: resolvedDept },
      }

      if (isEdit) {
        try {
          await api.put(`/employees/${id}`, payload)
        } catch {
          localEmployees.update(id, payload)
        }
        navigate(`/staff/${id}`)
      } else {
        // Map form project fields to local store's expected keys
        const withProject = {
          ...payload,
          initial_project: form.initial_project || undefined,
          initial_project_date: form.initial_project_date || undefined,
          initial_project_remarks: form.initial_project_remarks || undefined,
        }
        try {
          const { data } = await api.post('/employees', withProject)
          saved = data
        } catch {
          saved = localEmployees.create(withProject)
        }
        navigate(`/staff/${saved.id}`)
      }
    } catch (err) {
      setSubmitError(err.message || 'Failed to save employee. Please try again.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const back = () => navigate(isEdit ? `/staff/${id}` : '/staff')

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <CForm onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* ── Header bar ── */}
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div className="d-flex align-items-center gap-3">
          <CButton color="link" className="ps-0 text-decoration-none" type="button" onClick={back}>
            <CIcon icon={cilArrowLeft} className="me-1" />
            {isEdit ? 'Back to Profile' : 'Back to Staff List'}
          </CButton>
          <h5 className="mb-0">{isEdit ? 'Edit Employee' : 'Add New Employee'}</h5>
        </div>
        <div className="d-flex gap-2">
          <CButton color="secondary" type="button" onClick={back}>
            Cancel
          </CButton>
          <CButton color="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting && <CSpinner size="sm" className="me-2" />}
            {isEdit ? 'Save Changes' : 'Create Employee'}
          </CButton>
        </div>
      </div>

      {submitError && (
        <CAlert color="danger" dismissible onClose={() => setSubmitError('')} className="mb-3">
          {submitError}
        </CAlert>
      )}

      {/* ══ SECTION 1: Core Identity ══════════════════════════════════════════ */}
      <CCard className="mb-3 border-top border-top-primary border-3">
        <CCardHeader className="d-flex justify-content-between">
          <strong>Employee Identity</strong>
          <span className="text-danger small">
            <Req /> Required fields
          </span>
        </CCardHeader>
        <CCardBody>
          {/* Photo + fields side by side */}
          <div className="d-flex gap-4 align-items-start mb-3">
            <div className="d-flex flex-column align-items-center gap-1" style={{ minWidth: 96 }}>
              <ProfilePhotoUpload
                photo={photo}
                name={`${watchedFirst} ${watchedLast}`.trim() || 'Employee'}
                size={96}
                canEdit
                onChange={setPhoto}
              />
              <span className="text-body-secondary" style={{ fontSize: 11 }}>
                Click to upload
              </span>
            </div>
            <div className="flex-grow-1">
              <div className="text-body-secondary small mb-2">
                Accepted: JPG, PNG, WebP &mdash; max 2 MB
              </div>
            </div>
          </div>
          <CRow className="g-3">
            {/* Employee ID */}
            <CCol md={3}>
              <F
                label="Employee ID"
                required
                error={errors.employee_id}
                hint={isEdit ? 'Cannot be changed' : 'e.g. HMA001 — 4–20 uppercase letters/numbers'}
              >
                <CFormInput
                  {...register('employee_id', {
                    required: 'Employee ID is required',
                    pattern: {
                      value: /^[A-Z0-9]{4,20}$/,
                      message: 'Must be 4–20 uppercase letters and numbers only',
                    },
                  })}
                  disabled={isEdit}
                  placeholder="HMA001"
                  className={errors.employee_id ? 'is-invalid' : ''}
                />
              </F>
            </CCol>

            {/* First Name */}
            <CCol md={3}>
              <F label="First Name" required error={errors.first_name}>
                <CFormInput
                  {...register('first_name', { required: 'First name is required' })}
                  className={errors.first_name ? 'is-invalid' : ''}
                />
              </F>
            </CCol>

            {/* Middle Name */}
            <CCol md={3}>
              <F label="Middle Name">
                <CFormInput {...register('middle_name')} />
              </F>
            </CCol>

            {/* Last Name */}
            <CCol md={3}>
              <F label="Last Name" required error={errors.last_name}>
                <CFormInput
                  {...register('last_name', { required: 'Last name is required' })}
                  className={errors.last_name ? 'is-invalid' : ''}
                />
              </F>
            </CCol>

            {/* Gender */}
            <CCol md={3}>
              <F label="Gender">
                <CFormSelect {...register('gender')}>
                  <option value="">Select gender</option>
                  {GENDERS.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </CFormSelect>
              </F>
            </CCol>

            {/* Date of Birth */}
            <CCol md={3}>
              <F label="Date of Birth">
                <CFormInput type="date" {...register('date_of_birth')} />
              </F>
            </CCol>

            {/* Marital Status */}
            <CCol md={3}>
              <F label="Marital Status">
                <CFormSelect {...register('marital_status')}>
                  <option value="">Select</option>
                  {MARITAL.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </CFormSelect>
              </F>
            </CCol>

            {/* Blood Group */}
            <CCol md={3}>
              <F label="Blood Group">
                <CFormSelect {...register('blood_group')}>
                  <option value="">Select</option>
                  {BLOOD.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </CFormSelect>
              </F>
            </CCol>

            {/* Employee Category */}
            <CCol md={3}>
              <F label="Employee Category">
                <CFormSelect {...register('employee_category')}>
                  <option value="">Select</option>
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </CFormSelect>
              </F>
            </CCol>

            {/* Status */}
            <CCol md={3}>
              <F label="Status">
                <CFormSelect {...register('status')}>
                  {STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </CFormSelect>
              </F>
            </CCol>

            {/* Joined Date */}
            <CCol md={3}>
              <F label="Joined Date">
                <CFormInput type="date" {...register('joined_date')} />
              </F>
            </CCol>

            {/* Initial Salary */}
            <CCol md={3}>
              <F
                label={isEdit ? 'Current Salary' : 'Initial Salary'}
                hint={
                  isEdit
                    ? 'Use "Update Salary" to change'
                    : 'Optional — creates first salary record'
                }
              >
                <CFormInput
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 25000"
                  {...register('initial_salary')}
                  disabled={isEdit}
                />
              </F>
            </CCol>

            {/* Exit Date — only when status is Resigned or Retired */}
            {(watchedStatus === 'Resigned' || watchedStatus === 'Retired') && (
              <CCol md={3}>
                <F label="Exit Date" required error={errors.exit_date}>
                  <CFormInput
                    type="date"
                    {...register('exit_date', { required: 'Exit date required for this status' })}
                    className={errors.exit_date ? 'is-invalid' : ''}
                  />
                </F>
              </CCol>
            )}
          </CRow>
        </CCardBody>
      </CCard>

      {/* ══ OPTIONAL DETAILS ═════════════════════════════════════════════════ */}
      <CAccordion alwaysOpen className="mb-3">
        {/* 1 — Contact Information */}
        <CAccordionItem itemKey={1}>
          <CAccordionHeader>
            <span className="fw-semibold">Contact Information</span>
          </CAccordionHeader>
          <CAccordionBody>
            <CRow className="g-3">
              <CCol md={4}>
                <F label="Working Email" error={errors.contact?.working_email}>
                  <CFormInput
                    type="email"
                    {...register('contact.working_email', {
                      pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' },
                    })}
                    className={errors.contact?.working_email ? 'is-invalid' : ''}
                  />
                </F>
              </CCol>
              <CCol md={4}>
                <F label="Personal Email" error={errors.contact?.personal_email}>
                  <CFormInput
                    type="email"
                    {...register('contact.personal_email', {
                      pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' },
                    })}
                    className={errors.contact?.personal_email ? 'is-invalid' : ''}
                  />
                </F>
              </CCol>
              <CCol md={4}>
                <F label="Mobile" error={errors.contact?.mobile}>
                  <CFormInput
                    {...register('contact.mobile', {
                      pattern: { value: /^[0-9]{10}$/, message: 'Must be 10 digits' },
                    })}
                    placeholder="10-digit number"
                    className={errors.contact?.mobile ? 'is-invalid' : ''}
                  />
                </F>
              </CCol>
              <CCol md={4}>
                <F label="Phone">
                  <CFormInput {...register('contact.phone')} />
                </F>
              </CCol>
              <CCol md={4}>
                <F label="Emergency Contact">
                  <CFormInput {...register('contact.emergency_contact')} />
                </F>
              </CCol>
            </CRow>
          </CAccordionBody>
        </CAccordionItem>

        {/* 2 — Address Information */}
        <CAccordionItem itemKey={2}>
          <CAccordionHeader>
            <span className="fw-semibold">Address Information</span>
          </CAccordionHeader>
          <CAccordionBody>
            <CRow className="g-3">
              <CCol md={4}>
                <F label="Resident Location">
                  <CFormInput
                    {...register('address.resident_location')}
                    placeholder="City / Town"
                  />
                </F>
              </CCol>
              <CCol md={4}>
                <F label="State">
                  <CFormInput {...register('address.state')} placeholder="e.g. Kerala" />
                </F>
              </CCol>
              <CCol md={6}>
                <F label="Present Address">
                  <CFormTextarea rows={3} {...register('address.present_address')} />
                </F>
              </CCol>
              <CCol md={6}>
                <F label="Permanent Address">
                  <CFormTextarea rows={3} {...register('address.permanent_address')} />
                </F>
              </CCol>
            </CRow>
          </CAccordionBody>
        </CAccordionItem>

        {/* 3 — Employment Details */}
        <CAccordionItem itemKey={3}>
          <CAccordionHeader>
            <span className="fw-semibold">Employment Details</span>
          </CAccordionHeader>
          <CAccordionBody>
            <CRow className="g-3">
              <CCol md={4}>
                <F label="Designation">
                  <CFormInput
                    {...register('employment.designation')}
                    placeholder="e.g. Project Manager"
                  />
                </F>
              </CCol>
              <CCol md={4}>
                <F label="Department">
                  <CFormSelect {...register('employment.department')}>
                    <option value="">— Select department —</option>
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d === 'SDP' ? 'SDP (Project Department)' : d}
                      </option>
                    ))}
                  </CFormSelect>
                  {watchedDept === 'OTHER' && (
                    <CFormInput
                      {...register('employment.department_other')}
                      placeholder="Type department name"
                      className="mt-2"
                    />
                  )}
                </F>
              </CCol>
              <CCol md={4}>
                <F label="Reporting To">
                  <CFormInput
                    {...register('employment.reporting_to')}
                    placeholder="Employee ID of manager"
                  />
                </F>
              </CCol>
              <CCol md={4}>
                <F label="Working Region">
                  <CFormInput
                    {...register('employment.working_region')}
                    placeholder="e.g. South India"
                  />
                </F>
              </CCol>
              <CCol md={4}>
                <F label="Working State">
                  <CFormInput {...register('employment.working_state')} placeholder="e.g. Kerala" />
                </F>
              </CCol>
              <CCol md={4}>
                <F label="Start Date">
                  <CFormInput type="date" {...register('employment.start_date')} />
                </F>
              </CCol>

              {/* Project Assignment — shown only for SDP department */}
              {isProjectDept && (
                <>
                  <CCol md={12}>
                    <hr className="my-1" />
                    <div className="fw-semibold small text-info mb-2">
                      Project Assignment
                      <span className="text-body-secondary fw-normal ms-2">
                        (logged for audit trail)
                      </span>
                    </div>
                  </CCol>
                  <CCol md={5}>
                    <F label="Assign to Project">
                      <CFormInput
                        {...register('initial_project')}
                        placeholder="e.g. Smart City Phase 2"
                      />
                    </F>
                  </CCol>
                  <CCol md={3}>
                    <F label="Assigned Date">
                      <CFormInput type="date" {...register('initial_project_date')} />
                    </F>
                  </CCol>
                  <CCol md={4}>
                    <F label="Remarks">
                      <CFormInput
                        {...register('initial_project_remarks')}
                        placeholder="Optional notes"
                      />
                    </F>
                  </CCol>
                </>
              )}
            </CRow>
          </CAccordionBody>
        </CAccordionItem>

        {/* 4 — Government IDs */}
        <CAccordionItem itemKey={4}>
          <CAccordionHeader>
            <span className="fw-semibold">Government Identification</span>
          </CAccordionHeader>
          <CAccordionBody>
            <CRow className="g-3">
              {[
                {
                  key: 'pan_number',
                  label: 'PAN Number',
                  ph: 'ABCDE1234F',
                  pattern: /^[A-Z]{5}[0-9]{4}[A-Z]$/,
                  msg: 'Invalid PAN (e.g. ABCDE1234F)',
                },
                {
                  key: 'aadhar_number',
                  label: 'Aadhar Number',
                  ph: '12-digit number',
                  pattern: /^[0-9]{12}$/,
                  msg: 'Must be 12 digits',
                },
                { key: 'passport_number', label: 'Passport Number', ph: 'A1234567' },
                { key: 'uan_number', label: 'UAN Number', ph: '12-digit UAN' },
                { key: 'esi_number', label: 'ESI Number', ph: '17-character ESI' },
                { key: 'pf_number', label: 'PF Number', ph: 'PF account number' },
              ].map(({ key, label, ph, pattern, msg }) => {
                const fieldError = errors.identification?.[key]
                return (
                  <CCol md={4} key={key}>
                    <F label={label} error={fieldError}>
                      <CFormInput
                        {...register(
                          `identification.${key}`,
                          pattern ? { pattern: { value: pattern, message: msg } } : {},
                        )}
                        placeholder={ph}
                        className={fieldError ? 'is-invalid' : ''}
                      />
                    </F>
                  </CCol>
                )
              })}
            </CRow>
          </CAccordionBody>
        </CAccordionItem>

        {/* 5 — Bank Account */}
        <CAccordionItem itemKey={5}>
          <CAccordionHeader>
            <span className="fw-semibold">Bank Accounts</span>
          </CAccordionHeader>
          <CAccordionBody>
            {bankFields.length === 0 && (
              <p className="text-body-secondary mb-3 small">No bank accounts added yet.</p>
            )}
            {bankFields.map((field, i) => (
              <CCard key={field.id} className="mb-3 border">
                <CCardHeader className="d-flex justify-content-between align-items-center py-2">
                  <span className="small fw-semibold">Account {i + 1}</span>
                  <CButton
                    color="danger"
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => removeBank(i)}
                  >
                    <CIcon icon={cilTrash} />
                  </CButton>
                </CCardHeader>
                <CCardBody>
                  <CRow className="g-3">
                    <CCol md={4}>
                      <F label="Bank Name" error={errors.bank_accounts?.[i]?.bank_name}>
                        <CFormInput
                          {...register(`bank_accounts.${i}.bank_name`)}
                          className={errors.bank_accounts?.[i]?.bank_name ? 'is-invalid' : ''}
                        />
                      </F>
                    </CCol>
                    <CCol md={4}>
                      <F label="Account Number" error={errors.bank_accounts?.[i]?.account_number}>
                        <CFormInput
                          {...register(`bank_accounts.${i}.account_number`)}
                          className={errors.bank_accounts?.[i]?.account_number ? 'is-invalid' : ''}
                        />
                      </F>
                    </CCol>
                    <CCol md={4}>
                      <F label="IFSC Code" error={errors.bank_accounts?.[i]?.ifsc_code}>
                        <CFormInput
                          {...register(`bank_accounts.${i}.ifsc_code`, {
                            pattern: {
                              value: /^[A-Z]{4}0[A-Z0-9]{6}$/,
                              message: 'Invalid IFSC (e.g. SBIN0001234)',
                            },
                          })}
                          placeholder="SBIN0001234"
                          className={errors.bank_accounts?.[i]?.ifsc_code ? 'is-invalid' : ''}
                        />
                      </F>
                    </CCol>
                  </CRow>
                </CCardBody>
              </CCard>
            ))}
            <CButton
              color="secondary"
              variant="outline"
              size="sm"
              type="button"
              onClick={() => addBank({ bank_name: '', account_number: '', ifsc_code: '' })}
            >
              <CIcon icon={cilPlus} className="me-1" />
              Add Bank Account
            </CButton>
          </CAccordionBody>
        </CAccordionItem>

        {/* 6 — Family Members */}
        <CAccordionItem itemKey={6}>
          <CAccordionHeader>
            <span className="fw-semibold">Family Members</span>
          </CAccordionHeader>
          <CAccordionBody>
            {familyFields.length === 0 && (
              <p className="text-body-secondary mb-3 small">No family members added yet.</p>
            )}
            {familyFields.map((field, i) => (
              <CCard key={field.id} className="mb-3 border">
                <CCardHeader className="d-flex justify-content-between align-items-center py-2">
                  <span className="small fw-semibold">Member {i + 1}</span>
                  <CButton
                    color="danger"
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => removeFamily(i)}
                  >
                    <CIcon icon={cilTrash} />
                  </CButton>
                </CCardHeader>
                <CCardBody>
                  <CRow className="g-3">
                    <CCol md={3}>
                      <F label="Name" required error={errors.family_members?.[i]?.name}>
                        <CFormInput
                          {...register(`family_members.${i}.name`, {
                            required: 'Name is required',
                          })}
                          className={errors.family_members?.[i]?.name ? 'is-invalid' : ''}
                        />
                      </F>
                    </CCol>
                    <CCol md={3}>
                      <F
                        label="Relationship"
                        required
                        error={errors.family_members?.[i]?.relationship}
                      >
                        <CFormSelect
                          {...register(`family_members.${i}.relationship`, {
                            required: 'Required',
                          })}
                          className={errors.family_members?.[i]?.relationship ? 'is-invalid' : ''}
                        >
                          <option value="">Select</option>
                          {RELATIONSHIPS.map((r) => (
                            <option key={r}>{r}</option>
                          ))}
                        </CFormSelect>
                      </F>
                    </CCol>
                    <CCol md={3}>
                      <F label="Contact Number">
                        <CFormInput {...register(`family_members.${i}.contact_number`)} />
                      </F>
                    </CCol>
                    <CCol md={3}>
                      <F label="Date of Birth">
                        <CFormInput type="date" {...register(`family_members.${i}.dob`)} />
                      </F>
                    </CCol>
                    <CCol md={3}>
                      <F label="Aadhar Number" error={errors.family_members?.[i]?.aadhar_number}>
                        <CFormInput
                          {...register(`family_members.${i}.aadhar_number`, {
                            pattern: { value: /^[0-9]{12}$/, message: 'Must be 12 digits' },
                          })}
                          placeholder="12-digit number"
                          className={errors.family_members?.[i]?.aadhar_number ? 'is-invalid' : ''}
                        />
                      </F>
                    </CCol>
                    <CCol md={3}>
                      <F label="PAN Number" error={errors.family_members?.[i]?.pan_number}>
                        <CFormInput
                          {...register(`family_members.${i}.pan_number`, {
                            pattern: { value: /^[A-Z]{5}[0-9]{4}[A-Z]$/, message: 'Invalid PAN' },
                          })}
                          placeholder="ABCDE1234F"
                          className={errors.family_members?.[i]?.pan_number ? 'is-invalid' : ''}
                        />
                      </F>
                    </CCol>
                  </CRow>
                </CCardBody>
              </CCard>
            ))}
            <CButton
              color="secondary"
              variant="outline"
              size="sm"
              type="button"
              onClick={() =>
                addFamily({
                  name: '',
                  relationship: '',
                  contact_number: '',
                  dob: '',
                  aadhar_number: '',
                  pan_number: '',
                })
              }
            >
              <CIcon icon={cilPlus} className="me-1" />
              Add Family Member
            </CButton>
          </CAccordionBody>
        </CAccordionItem>
      </CAccordion>

      {/* ── Bottom save bar ── */}
      <div className="d-flex justify-content-end gap-2 py-3 border-top mt-1">
        <CButton color="secondary" type="button" onClick={back}>
          Cancel
        </CButton>
        <CButton color="primary" type="submit" disabled={isSubmitting}>
          {isSubmitting && <CSpinner size="sm" className="me-2" />}
          {isEdit ? 'Save Changes' : 'Create Employee'}
        </CButton>
      </div>
    </CForm>
  )
}

export default EmployeeForm
