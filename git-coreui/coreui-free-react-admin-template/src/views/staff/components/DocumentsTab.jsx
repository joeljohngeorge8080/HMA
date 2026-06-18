import React, { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CProgress,
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
import { cilCloudDownload, cilPlus } from '@coreui/icons'

import api from '../../../services/api'

const CATEGORIES = ['Resume', 'Education', 'Identity Proof', 'Employment Documents', 'Other']
const ALLOWED_TYPES = { 'application/pdf': 'PDF', 'image/jpeg': 'JPEG', 'image/png': 'PNG' }
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

const DocumentsTab = ({ employeeId, canEdit }) => {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [formError, setFormError] = useState('')

  const [docName, setDocName] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [remarks, setRemarks] = useState('')
  const [file, setFile] = useState(null)
  const fileRef = useRef()

  const [refreshToken, setRefreshToken] = useState(0)
  const triggerRefresh = () => setRefreshToken((t) => t + 1)

  useEffect(() => {
    const fetchDocuments = async () => {
      setLoading(true)
      try {
        const { data } = await api.get(`/employees/${employeeId}/documents`)
        setDocuments(data)
      } catch {
        // show empty
      } finally {
        setLoading(false)
      }
    }
    fetchDocuments()
  }, [employeeId, refreshToken])

  const handleFileChange = (e) => {
    const f = e.target.files[0]
    if (!f) return
    if (!ALLOWED_TYPES[f.type]) {
      setFormError('Only PDF, JPEG, and PNG files are allowed')
      fileRef.current.value = ''
      return
    }
    if (f.size > MAX_FILE_SIZE) {
      setFormError('File size must not exceed 10 MB')
      fileRef.current.value = ''
      return
    }
    setFormError('')
    setFile(f)
    if (!docName) setDocName(f.name.replace(/\.[^.]+$/, ''))
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file) {
      setFormError('Please select a file')
      return
    }
    setFormError('')
    setUploading(true)
    setUploadProgress(0)

    try {
      // Step 1: Request presigned URL + create metadata row
      const { data: uploadInfo } = await api.post(`/employees/${employeeId}/documents`, {
        document_name: docName,
        document_category: category,
        file_name: file.name,
        content_type: file.type,
        file_size_bytes: file.size,
        remarks: remarks || undefined,
      })

      // Step 2: PUT file directly to S3 via presigned URL
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) setUploadProgress(Math.round((ev.loaded / ev.total) * 100))
        }
        xhr.onload = () => (xhr.status === 200 ? resolve() : reject(new Error('S3 upload failed')))
        xhr.onerror = () => reject(new Error('Network error during upload'))
        xhr.open('PUT', uploadInfo.upload_url)
        xhr.setRequestHeader('Content-Type', file.type)
        xhr.send(file)
      })

      triggerRefresh()
      setShowModal(false)
      setDocName('')
      setRemarks('')
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch (err) {
      setFormError(err.message || 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  return (
    <>
      <CCard>
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <strong>Employee Documents</strong>
          {canEdit && (
            <CButton color="primary" size="sm" onClick={() => setShowModal(true)}>
              <CIcon icon={cilPlus} className="me-1" />
              Upload Document
            </CButton>
          )}
        </CCardHeader>
        <CCardBody>
          {loading ? (
            <div className="text-center py-3">
              <CSpinner size="sm" />
            </div>
          ) : documents.length === 0 ? (
            <p className="text-body-secondary">No documents uploaded yet.</p>
          ) : (
            <CTable hover responsive bordered>
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell>Document Name</CTableHeaderCell>
                  <CTableHeaderCell>Category</CTableHeaderCell>
                  <CTableHeaderCell>File</CTableHeaderCell>
                  <CTableHeaderCell>Size</CTableHeaderCell>
                  <CTableHeaderCell>Uploaded</CTableHeaderCell>
                  <CTableHeaderCell>Remarks</CTableHeaderCell>
                  <CTableHeaderCell></CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {documents.map((doc) => (
                  <CTableRow key={doc.id}>
                    <CTableDataCell className="fw-semibold">{doc.document_name}</CTableDataCell>
                    <CTableDataCell>
                      <CBadge color="info">{doc.document_category}</CBadge>
                    </CTableDataCell>
                    <CTableDataCell>{doc.file_name}</CTableDataCell>
                    <CTableDataCell>
                      {doc.file_size_bytes ? `${(doc.file_size_bytes / 1024).toFixed(1)} KB` : '—'}
                    </CTableDataCell>
                    <CTableDataCell>
                      {new Date(doc.uploaded_at).toLocaleDateString('en-IN')}
                    </CTableDataCell>
                    <CTableDataCell>{doc.remarks || '—'}</CTableDataCell>
                    <CTableDataCell>
                      {doc.download_url && (
                        <CButton
                          color="link"
                          size="sm"
                          href={doc.download_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <CIcon icon={cilCloudDownload} />
                        </CButton>
                      )}
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          )}
        </CCardBody>
      </CCard>

      <CModal visible={showModal} onClose={() => setShowModal(false)} backdrop="static">
        <CModalHeader>
          <CModalTitle>Upload Document</CModalTitle>
        </CModalHeader>
        <CForm onSubmit={handleUpload}>
          <CModalBody>
            {formError && <CAlert color="danger">{formError}</CAlert>}

            <div className="mb-3">
              <CFormLabel htmlFor="docFile">
                File * <small className="text-body-secondary">(PDF, JPEG, PNG — max 10 MB)</small>
              </CFormLabel>
              <CFormInput
                id="docFile"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                ref={fileRef}
                onChange={handleFileChange}
                required
              />
            </div>

            <div className="mb-3">
              <CFormLabel htmlFor="docName">Document Name *</CFormLabel>
              <CFormInput
                id="docName"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                required
              />
            </div>

            <div className="mb-3">
              <CFormLabel htmlFor="docCat">Category *</CFormLabel>
              <CFormSelect
                id="docCat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </CFormSelect>
            </div>

            <div className="mb-3">
              <CFormLabel htmlFor="docRemarks">Remarks</CFormLabel>
              <CFormInput
                id="docRemarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>

            {uploading && (
              <div className="mb-3">
                <small>Uploading... {uploadProgress}%</small>
                <CProgress value={uploadProgress} className="mt-1" />
              </div>
            )}
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={() => setShowModal(false)} disabled={uploading}>
              Cancel
            </CButton>
            <CButton color="primary" type="submit" disabled={uploading}>
              {uploading && <CSpinner size="sm" className="me-2" />}
              Upload
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>
    </>
  )
}

DocumentsTab.propTypes = {
  employeeId: PropTypes.string.isRequired,
  canEdit: PropTypes.bool.isRequired,
}

export default DocumentsTab
