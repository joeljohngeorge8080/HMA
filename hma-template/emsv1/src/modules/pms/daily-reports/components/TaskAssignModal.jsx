/**
 * TaskAssignModal — Modal for Project Officers to create/assign a task.
 *
 * Fields: Title, Description, Assign to (dropdown), Due Date.
 */
import React, { useState } from 'react'
import PropTypes from 'prop-types'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CFormSelect,
  CFormFeedback,
  CSpinner,
  CRow,
  CCol,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilTask } from '@coreui/icons'
import { FIELD_PERSONNEL_LIST } from '../../../../services/localTasks'

const TaskAssignModal = ({ visible, onClose, onConfirm, loading = false }) => {
  const [form, setForm] = useState({
    title: '',
    description: '',
    project_name: '',
    assigned_to: '',
    due_date: '',
  })
  const [errors, setErrors] = useState({})

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const validate = () => {
    const errs = {}
    if (!form.title.trim()) errs.title = 'Task title is required'
    if (form.title.length > 150) errs.title = 'Maximum 150 characters'
    if (!form.project_name?.trim()) errs.project_name = 'Project name is required'
    if (!form.assigned_to) errs.assigned_to = 'Please select a field personnel'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    onConfirm(form)
  }

  const handleClose = () => {
    setForm({ title: '', description: '', project_name: '', assigned_to: '', due_date: '' })
    setErrors({})
    onClose()
  }

  return (
    <CModal visible={visible} onClose={handleClose} alignment="center" size="lg">
      <CModalHeader closeButton>
        <CModalTitle>
          <CIcon icon={cilTask} className="me-2" />
          Assign New Task
        </CModalTitle>
      </CModalHeader>
      <CModalBody>
        {/* Title */}
        <div className="mb-3">
          <CFormLabel htmlFor="task-title" className="fw-medium">
            Task Title <span className="text-danger">*</span>
          </CFormLabel>
          <CFormInput
            id="task-title"
            placeholder="e.g. Site Survey — Block A Foundation"
            value={form.title}
            onChange={(e) => handleChange('title', e.target.value)}
            invalid={!!errors.title}
          />
          {errors.title && <CFormFeedback invalid>{errors.title}</CFormFeedback>}
        </div>

        {/* Project Name */}
        <div className="mb-3">
          <CFormLabel htmlFor="project-name" className="fw-medium">
            Project Name <span className="text-danger">*</span>
          </CFormLabel>
          <CFormInput
            id="project-name"
            placeholder="e.g. Medical College Construction"
            value={form.project_name || ''}
            onChange={(e) => handleChange('project_name', e.target.value)}
            invalid={!!errors.project_name}
          />
          {errors.project_name && <CFormFeedback invalid>{errors.project_name}</CFormFeedback>}
        </div>

        {/* Description */}
        <div className="mb-3">
          <CFormLabel htmlFor="task-description" className="fw-medium">
            Description
          </CFormLabel>
          <CFormTextarea
            id="task-description"
            rows={3}
            placeholder="Describe what needs to be done..."
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
          />
        </div>

        <CRow className="g-3">
          {/* Assign to */}
          <CCol xs={12} md={6}>
            <CFormLabel htmlFor="task-assign" className="fw-medium">
              Assign To <span className="text-danger">*</span>
            </CFormLabel>
            <CFormSelect
              id="task-assign"
              value={form.assigned_to}
              onChange={(e) => handleChange('assigned_to', e.target.value)}
              invalid={!!errors.assigned_to}
            >
              <option value="">— Select Personnel —</option>
              {FIELD_PERSONNEL_LIST.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </CFormSelect>
            {errors.assigned_to && <CFormFeedback invalid>{errors.assigned_to}</CFormFeedback>}
          </CCol>

          {/* Due Date */}
          <CCol xs={12} md={6}>
            <CFormLabel htmlFor="task-due" className="fw-medium">
              Due Date
            </CFormLabel>
            <CFormInput
              id="task-due"
              type="date"
              value={form.due_date}
              onChange={(e) => handleChange('due_date', e.target.value)}
            />
            <div className="text-body-tertiary mt-1" style={{ fontSize: '0.75rem' }}>
              Optional
            </div>
          </CCol>
        </CRow>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="ghost" onClick={handleClose} disabled={loading}>
          Cancel
        </CButton>
        <CButton color="primary" onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <>
              <CSpinner size="sm" className="me-1" />
              Assigning...
            </>
          ) : (
            'Assign Task'
          )}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

TaskAssignModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  loading: PropTypes.bool,
}

export default TaskAssignModal
