import React, { useRef, useState } from 'react'
import PropTypes from 'prop-types'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CFormInput,
  CFormSelect,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCloudUpload, cilWarning, cilX } from '@coreui/icons'
import { listSheets, parseSheet } from '../../../../services/projectLedgerParser'
import { localProjectLedger } from '../../../../services/localProjectLedger'
import { ACTIVITY_OPTIONS, activityLabelOf, normalizeActivityText } from './activityOptions'

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n || 0)

/** Every distinct raw activity string among rows the parser couldn't resolve
 * and no remembered override already covers — these need a PO decision
 * before import can proceed (plan §5, tier 3). */
const unresolvedRawActivities = (rows, overrides, drafts) => {
  const seen = new Map()
  rows.forEach((row) => {
    if (row.activity) return
    const key = normalizeActivityText(row.activityRaw)
    if (overrides[key] || drafts[key]) return
    if (!seen.has(key)) seen.set(key, { key, raw: row.activityRaw, count: 0, amount: 0 })
    const entry = seen.get(key)
    entry.count += 1
    entry.amount = Math.round((entry.amount + row.amount) * 100) / 100
  })
  return [...seen.values()]
}

/** Effective { value, other } for a row given remembered overrides plus this
 * session's in-progress mapping choices — drafts win if both exist. */
const effectiveMapping = (row, overrides, drafts) => {
  if (row.activity) return { value: row.activity, other: '' }
  const key = normalizeActivityText(row.activityRaw)
  return drafts[key] || overrides[key] || null
}

const LedgerUploadPanel = ({ project, plan, canEdit, currentUser }) => {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [file, setFile] = useState(null)
  const [sheets, setSheets] = useState([])
  const [sheetName, setSheetName] = useState('')
  const [listingError, setListingError] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parseErrors, setParseErrors] = useState([])
  const [parseWarnings, setParseWarnings] = useState([])
  const [parsedRows, setParsedRows] = useState([])
  const [mappingDrafts, setMappingDrafts] = useState({}) // normKey -> { value, other }
  const [includeCommitted, setIncludeCommitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState(null)
  const [removeConfirm, setRemoveConfirm] = useState(false)
  const fileInputRef = useRef(null)

  const existing = localProjectLedger.get(project.id)

  if (!canEdit || plan.status !== 'submitted') return null

  const resetWizard = () => {
    setStep(0)
    setFile(null)
    setSheets([])
    setSheetName('')
    setListingError('')
    setParseErrors([])
    setParseWarnings([])
    setParsedRows([])
    setMappingDrafts({})
    setIncludeCommitted(false)
    setSaveResult(null)
  }

  const handleStart = () => {
    resetWizard()
    setOpen(true)
  }

  const handleFileSelected = async (e) => {
    const picked = e.dataTransfer?.files[0] || e.target.files[0]
    if (!picked) return
    if (!picked.name.match(/\.(xlsx|xls)$/i)) {
      setListingError('Only .xlsx or .xls files are accepted.')
      return
    }
    setFile(picked)
    setListingError('')
    try {
      const list = await listSheets(picked)
      setSheets(list)
      setStep(1)
    } catch (err) {
      setListingError(err.message)
    }
  }

  const handlePickSheet = async (name) => {
    setSheetName(name)
    setParsing(true)
    setParseErrors([])
    setParseWarnings([])
    setParsedRows([])
    try {
      const { rows, errors, warnings } = await parseSheet(file, name)
      setParseErrors(errors)
      setParseWarnings(warnings)
      setParsedRows(rows)
      if (errors.length === 0) setStep(2)
    } catch (err) {
      setParseErrors([err.message])
    } finally {
      setParsing(false)
    }
  }

  const overrides = localProjectLedger.getOverrides(project.id)
  const unresolved = unresolvedRawActivities(parsedRows, overrides, mappingDrafts)
  const canImport = unresolved.length === 0 && parsedRows.length > 0

  const setDraft = (key, patch) =>
    setMappingDrafts((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || { value: '', other: '' }), ...patch },
    }))

  const planMonths = new Set((plan.months || []).map((m) => m.month))
  const outsideRangeMonths = [
    ...new Set(parsedRows.map((r) => r.month).filter((m) => !planMonths.has(m))),
  ].sort()

  // Preview aggregation — month + activity, mirroring localProjectLedger's
  // stored aggregation but computed live from the not-yet-saved rows/drafts.
  const previewByMonth = {}
  parsedRows.forEach((row) => {
    if (row.committed && !includeCommitted) return
    const eff = effectiveMapping(row, overrides, mappingDrafts)
    if (!eff) return
    const key = eff.value === 'other' ? `other:${eff.other}` : eff.value
    previewByMonth[row.month] = previewByMonth[row.month] || {}
    previewByMonth[row.month][key] = previewByMonth[row.month][key] || {
      label: activityLabelOf(eff.value, eff.other),
      total: 0,
    }
    previewByMonth[row.month][key].total =
      Math.round((previewByMonth[row.month][key].total + row.amount) * 100) / 100
  })
  const previewMonths = Object.keys(previewByMonth).sort()
  const previewTotal = previewMonths.reduce(
    (s, m) => s + Object.values(previewByMonth[m]).reduce((ss, a) => ss + a.total, 0),
    0,
  )

  const handleImport = () => {
    setSaving(true)
    try {
      const finalOverrides = { ...overrides }
      Object.entries(mappingDrafts).forEach(([key, val]) => {
        if (val.value) finalOverrides[key] = { value: val.value, other: val.other || '' }
      })
      const finalRows = parsedRows.map((row) => {
        const eff = effectiveMapping(row, overrides, mappingDrafts)
        return { ...row, activity: eff.value, activityOther: eff.other || '' }
      })
      localProjectLedger.save(project.id, {
        sourceFile: file.name,
        sourceSheet: sheetName,
        rows: finalRows,
        uploadedBy: currentUser,
        activityOverrides: finalOverrides,
      })
      setSaveResult({ success: true })
      setStep(3)
    } catch (err) {
      setSaveResult({ success: false, message: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = () => {
    localProjectLedger.remove(project.id)
    setRemoveConfirm(false)
  }

  if (!open) {
    return (
      <CCard className="mb-3">
        <CCardHeader className="fw-semibold d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            Project Ledger Upload
            <div className="small text-body-secondary fw-normal">
              Upload the officer&apos;s Excel account sheet — read-only, kept separate from manual
              actual entry
            </div>
          </div>
          <div className="d-flex gap-2">
            <CButton size="sm" color="primary" variant="outline" onClick={handleStart}>
              <CIcon icon={cilCloudUpload} className="me-1" />
              {existing ? 'Re-upload' : 'Upload Ledger'}
            </CButton>
            {existing && (
              <CButton
                size="sm"
                color="danger"
                variant="ghost"
                onClick={() => setRemoveConfirm(true)}
              >
                Remove
              </CButton>
            )}
          </div>
        </CCardHeader>
        {existing && (
          <CCardBody className="small text-body-secondary">
            Uploaded {new Date(existing.uploaded_at).toLocaleDateString('en-IN')} by{' '}
            {existing.uploaded_by} · sheet &quot;{existing.source_sheet}&quot; ·{' '}
            {existing.rows.length} rows
          </CCardBody>
        )}

        <CModal
          visible={removeConfirm}
          onClose={() => setRemoveConfirm(false)}
          alignment="center"
          size="sm"
        >
          <CModalHeader>
            <CModalTitle>Remove uploaded ledger?</CModalTitle>
          </CModalHeader>
          <CModalBody className="small">
            This deletes the uploaded ledger for this project. Manual actual entries are not
            affected. This cannot be undone.
          </CModalBody>
          <CModalFooter>
            <CButton
              color="secondary"
              variant="ghost"
              size="sm"
              onClick={() => setRemoveConfirm(false)}
            >
              Cancel
            </CButton>
            <CButton color="danger" size="sm" onClick={handleRemove}>
              Remove
            </CButton>
          </CModalFooter>
        </CModal>
      </CCard>
    )
  }

  return (
    <CCard className="mb-3">
      <CCardHeader className="fw-semibold d-flex justify-content-between align-items-center">
        <span>Project Ledger Upload</span>
        <CButton size="sm" color="secondary" variant="ghost" onClick={() => setOpen(false)}>
          <CIcon icon={cilX} />
        </CButton>
      </CCardHeader>
      <CCardBody>
        {/* Step 0: upload */}
        {step === 0 && (
          <>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                handleFileSelected(e)
              }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--cui-border-color)',
                borderRadius: 8,
                padding: '36px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'var(--cui-tertiary-bg, #f8f9fa)',
              }}
            >
              <CIcon icon={cilCloudUpload} style={{ width: 32, height: 32, opacity: 0.4 }} />
              <div className="mt-2 fw-semibold">
                {file ? file.name : 'Drop the project account Excel file here, or click to browse'}
              </div>
              <div className="text-body-secondary small mt-1">Accepts .xlsx and .xls</div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                onChange={handleFileSelected}
              />
            </div>
            {listingError && (
              <CAlert color="danger" className="mt-3 small">
                {listingError}
              </CAlert>
            )}
          </>
        )}

        {/* Step 1: pick sheet — the workbook holds one sheet per project; the
            PO picks theirs since sheet names are truncated/unreliable to
            auto-match (plan §3). */}
        {step === 1 && (
          <>
            <div className="small text-body-secondary mb-2">
              This workbook has {sheets.length} sheets. Pick the one that belongs to{' '}
              <strong>{project.name || project.project_title || 'this project'}</strong>.
            </div>
            <CTable hover responsive small>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Sheet</CTableHeaderCell>
                  <CTableHeaderCell>Rows</CTableHeaderCell>
                  <CTableHeaderCell />
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {sheets.map((s) => (
                  <CTableRow key={s.name}>
                    <CTableDataCell>{s.name}</CTableDataCell>
                    <CTableDataCell>{s.dataRowCount}</CTableDataCell>
                    <CTableDataCell>
                      {s.hasActivityColumn ? (
                        <CButton
                          size="sm"
                          color="primary"
                          variant="outline"
                          disabled={parsing}
                          onClick={() => handlePickSheet(s.name)}
                        >
                          {parsing && sheetName === s.name && (
                            <CSpinner size="sm" className="me-1" />
                          )}
                          Choose
                        </CButton>
                      ) : (
                        <span className="text-body-tertiary small">
                          <CIcon icon={cilWarning} className="me-1" />
                          No Activity column
                        </span>
                      )}
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
            {parseErrors.length > 0 && (
              <CAlert color="danger" className="small">
                {parseErrors.map((e, i) => (
                  <div key={i}>{e}</div>
                ))}
              </CAlert>
            )}
            <CButton size="sm" color="secondary" variant="outline" onClick={() => setStep(0)}>
              ← Back
            </CButton>
          </>
        )}

        {/* Step 2: review, map any unresolved activities, then commit */}
        {step === 2 && (
          <>
            {parseWarnings.length > 0 && (
              <CAlert color="warning" className="small">
                <strong>{parseWarnings.length} row(s) excluded during parsing:</strong>
                <ul className="mb-0 mt-1">
                  {parseWarnings.slice(0, 8).map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                  {parseWarnings.length > 8 && <li>…and {parseWarnings.length - 8} more</li>}
                </ul>
              </CAlert>
            )}

            {outsideRangeMonths.length > 0 && (
              <CAlert color="info" className="small">
                {outsideRangeMonths.length} month(s) in this sheet fall outside the plan&apos;s
                duration ({outsideRangeMonths.join(', ')}). They will still be imported and shown,
                just outside any month card.
              </CAlert>
            )}

            <div className="form-check mb-2">
              <input
                className="form-check-input"
                type="checkbox"
                id="includeCommitted"
                checked={includeCommitted}
                onChange={(e) => setIncludeCommitted(e.target.checked)}
              />
              <label className="form-check-label small" htmlFor="includeCommitted">
                Include rows marked &quot;Committed&quot; in the totals below (excluded by default —
                they are not yet accounted spend)
              </label>
            </div>

            {unresolved.length > 0 && (
              <div className="border rounded p-2 mb-3">
                <div className="fw-semibold small mb-2">
                  Map {unresolved.length} activity name{unresolved.length !== 1 ? 's' : ''} not in
                  our list before importing:
                </div>
                {unresolved.map((u) => {
                  const draft = mappingDrafts[u.key] || { value: '', other: '' }
                  return (
                    <div key={u.key} className="d-flex gap-2 align-items-center flex-wrap mb-2">
                      <span className="small" style={{ width: 200 }}>
                        &quot;{u.raw}&quot;
                      </span>
                      <span className="small text-body-secondary" style={{ width: 110 }}>
                        {u.count} row{u.count !== 1 ? 's' : ''} · {fmt(u.amount)}
                      </span>
                      <CFormSelect
                        size="sm"
                        style={{ width: 200 }}
                        value={draft.value}
                        onChange={(e) => setDraft(u.key, { value: e.target.value, other: '' })}
                      >
                        <option value="">Map to...</option>
                        {ACTIVITY_OPTIONS.map((a) => (
                          <option key={a.value} value={a.value}>
                            {a.label}
                          </option>
                        ))}
                      </CFormSelect>
                      {draft.value === 'other' && (
                        <CFormInput
                          size="sm"
                          style={{ width: 160 }}
                          placeholder="Custom activity name"
                          value={draft.other}
                          onChange={(e) => setDraft(u.key, { other: e.target.value })}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            <div className="fw-semibold small mb-2">Preview — month totals by activity</div>
            {previewMonths.length === 0 ? (
              <div className="text-body-tertiary small mb-3">Nothing to import yet.</div>
            ) : (
              previewMonths.map((month) => (
                <div key={month} className="mb-2">
                  <div className="small fw-semibold">
                    {month}{' '}
                    {!planMonths.has(month) && <span className="text-warning">(outside plan)</span>}
                  </div>
                  {Object.values(previewByMonth[month]).map((a) => (
                    <div key={a.label} className="d-flex justify-content-between small ms-3">
                      <span>{a.label}</span>
                      <span>{fmt(a.total)}</span>
                    </div>
                  ))}
                </div>
              ))
            )}
            <div className="d-flex justify-content-between fw-semibold small border-top pt-1 mb-3">
              <span>Total</span>
              <span>{fmt(previewTotal)}</span>
            </div>

            {saveResult && !saveResult.success && (
              <CAlert color="danger" className="small">
                {saveResult.message}
              </CAlert>
            )}

            <div className="d-flex gap-2">
              <CButton size="sm" color="secondary" variant="outline" onClick={() => setStep(1)}>
                ← Back
              </CButton>
              <CButton
                size="sm"
                color="primary"
                disabled={!canImport || saving}
                onClick={handleImport}
              >
                {saving && <CSpinner size="sm" className="me-1" />}
                {canImport
                  ? `Import ${parsedRows.length} row(s)`
                  : `Map ${unresolved.length} activit${unresolved.length !== 1 ? 'ies' : 'y'} first`}
              </CButton>
            </div>
          </>
        )}

        {/* Step 3: done */}
        {step === 3 && saveResult?.success && (
          <>
            <CAlert color="success" className="small">
              Imported {parsedRows.length} rows from &quot;{sheetName}&quot;, totalling{' '}
              {fmt(previewTotal)} across {previewMonths.length} month(s).
            </CAlert>
            <CButton size="sm" color="secondary" variant="outline" onClick={() => setOpen(false)}>
              Done
            </CButton>
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

LedgerUploadPanel.propTypes = {
  project: PropTypes.object.isRequired,
  plan: PropTypes.object.isRequired,
  canEdit: PropTypes.bool,
  currentUser: PropTypes.string,
}

export default LedgerUploadPanel
