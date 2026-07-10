import React, { useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormLabel,
  CFormSelect,
  CRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCloudUpload } from '@coreui/icons'

import { usePermission } from '../../../hooks/usePermission'
import { MODULE } from '../../../constants/modules'
import { localGstBills } from '../../../services/localGstBills'
import { computeGstFields } from '../../../services/gstCalculations'

const money = (n) =>
  n == null
    ? '—'
    : Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const HEADERS = [
  'SL', 'Department', 'Vertical', 'Party Name', 'GST No', 'Invoice Date', 'Invoice Number',
  'Total Value (incl. tax)', 'GST Rate %', 'CESS %', 'State', 'Taxable Value', 'CGST', 'SGST',
  'IGST', 'CESS Amount', 'Accounted status', 'Eligibility',
]

const numCell = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }

const GstBillsPage = () => {
  const canView = usePermission(MODULE.FINANCE, 'view')
  const canEdit = usePermission(MODULE.FINANCE, 'edit')

  const [entries, setEntries] = useState([])
  const [batches, setBatches] = useState([])
  const [deptFilter, setDeptFilter] = useState('all')
  const [batchFilter, setBatchFilter] = useState('all')

  const reload = () => {
    setEntries(localGstBills.entries.list())
    setBatches(localGstBills.batches.list())
  }
  useEffect(reload, [])

  const departments = useMemo(() => {
    const seen = new Map()
    entries.forEach((e) => {
      const d = (e.department || '').trim()
      if (d && !seen.has(d.toLowerCase())) seen.set(d.toLowerCase(), d)
    })
    return [...seen.values()].sort((x, y) => x.localeCompare(y))
  }, [entries])

  const rows = useMemo(
    () =>
      entries
        .filter((e) => deptFilter === 'all' || (e.department || '').trim().toLowerCase() === deptFilter)
        .filter((e) => batchFilter === 'all' || e.batchId === batchFilter)
        .map((e) => ({ ...e, computed: computeGstFields(e) })),
    [entries, deptFilter, batchFilter],
  )

  const totals = useMemo(
    () =>
      rows.reduce(
        (t, r) => ({
          totalValue: t.totalValue + (Number(r.totalValue) || 0),
          taxableValue: t.taxableValue + (r.computed.taxableValue || 0),
          cgst: t.cgst + (r.computed.cgst || 0),
          sgst: t.sgst + (r.computed.sgst || 0),
          igst: t.igst + (r.computed.igst || 0),
          cessAmount: t.cessAmount + (r.computed.cessAmount || 0),
        }),
        { totalValue: 0, taxableValue: 0, cgst: 0, sgst: 0, igst: 0, cessAmount: 0 },
      ),
    [rows],
  )

  if (!canView) {
    return <CAlert color="warning">You do not have access to the Finance section.</CAlert>
  }

  return (
    <CCard>
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <strong>GST Bills — Input Tax Credit</strong>
        {canEdit && (
          <CButton color="primary" size="sm" disabled title="Upload arrives in the next task">
            <CIcon icon={cilCloudUpload} className="me-1" />
            Upload Excel
          </CButton>
        )}
      </CCardHeader>
      <CCardBody>
        <CRow className="mb-3 g-2 align-items-end">
          <CCol xs="auto">
            <CFormLabel htmlFor="gst-dept-filter" className="mb-0 small">
              Department
            </CFormLabel>
            <CFormSelect
              id="gst-dept-filter"
              size="sm"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
            >
              <option value="all">All departments</option>
              {departments.map((d) => (
                <option key={d.toLowerCase()} value={d.toLowerCase()}>
                  {d}
                </option>
              ))}
            </CFormSelect>
          </CCol>
          <CCol xs="auto">
            <CFormLabel htmlFor="gst-batch-filter" className="mb-0 small">
              Upload
            </CFormLabel>
            <CFormSelect
              id="gst-batch-filter"
              size="sm"
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
            >
              <option value="all">All uploads</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.fileName} ({new Date(b.uploadedAt).toLocaleDateString('en-IN')})
                </option>
              ))}
            </CFormSelect>
          </CCol>
        </CRow>

        {rows.length === 0 ? (
          <CAlert color="info" className="mb-0">
            No GST bills yet. {canEdit ? 'Upload the expenditure statement Excel to begin.' : ''}
          </CAlert>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table table-bordered table-sm align-middle mb-0">
              <thead>
                <tr>
                  {HEADERS.map((h) => (
                    <th key={h} className="table-light text-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id}>
                    <td style={numCell}>{i + 1}</td>
                    <td>{r.department}</td>
                    <td>{r.vertical}</td>
                    <td>{r.partyName}</td>
                    <td className="text-nowrap">
                      {r.gstNo}
                      {!r.computed.gstinValid && (
                        <div className="text-danger small">Invalid GST No</div>
                      )}
                    </td>
                    <td className="text-nowrap">{r.invoiceDate}</td>
                    <td>{r.invoiceNumber}</td>
                    <td style={numCell} className={r.needsAttention ? 'table-danger' : undefined}>
                      {money(r.totalValue)}
                    </td>
                    <td style={numCell}>{r.gstRate}</td>
                    <td style={numCell}>{r.cessRate}</td>
                    <td className="text-nowrap">{r.computed.state ?? '—'}</td>
                    <td style={numCell}>{money(r.computed.taxableValue)}</td>
                    <td style={numCell}>{money(r.computed.cgst)}</td>
                    <td style={numCell}>{money(r.computed.sgst)}</td>
                    <td style={numCell}>{money(r.computed.igst)}</td>
                    <td style={numCell}>{money(r.computed.cessAmount)}</td>
                    <td className="text-nowrap">{r.accounted}</td>
                    <td className="text-nowrap">{r.eligibility}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="fw-semibold table-light">
                  <td colSpan={7}>Totals ({rows.length} bills)</td>
                  <td style={numCell}>{money(totals.totalValue)}</td>
                  <td colSpan={3} />
                  <td style={numCell}>{money(totals.taxableValue)}</td>
                  <td style={numCell}>{money(totals.cgst)}</td>
                  <td style={numCell}>{money(totals.sgst)}</td>
                  <td style={numCell}>{money(totals.igst)}</td>
                  <td style={numCell}>{money(totals.cessAmount)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CCardBody>
    </CCard>
  )
}

export default GstBillsPage
