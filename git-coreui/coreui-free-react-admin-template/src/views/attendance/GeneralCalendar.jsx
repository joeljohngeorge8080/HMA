import React, { useCallback, useEffect, useState } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CFormInput,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'

import { usePermission } from '../../hooks/usePermission'
import { MODULE } from '../../constants/modules'
import { localHolidays } from '../../services/localHolidays'

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const pad = (n) => String(n).padStart(2, '0')

const HOLIDAY_BG = {
  sunday: '#e9ecef',
  saturday: '#e9ecef',
  custom: '#fff3cd',
}
const HOLIDAY_TEXT = {
  sunday: '#6c757d',
  saturday: '#6c757d',
  custom: '#856404',
}

const GeneralCalendar = ({ year, month }) => {
  const canEdit = usePermission(MODULE.ATTENDANCE, 'edit')

  const [holidayMap, setHolidayMap] = useState({})
  const [addDate, setAddDate] = useState(null)
  const [addName, setAddName] = useState('')
  const [addError, setAddError] = useState('')

  const reload = useCallback(() => {
    setHolidayMap(localHolidays.getMonthMap(year, month))
  }, [year, month])

  useEffect(() => {
    reload()
  }, [reload])

  // Build calendar grid
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDow = new Date(year, month - 1, 1).getDay()
  const startOffset = (firstDow + 6) % 7
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7
  const cells = []
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startOffset + 1
    cells.push(dayNum >= 1 && dayNum <= daysInMonth ? dayNum : null)
  }
  const weeks = []
  for (let r = 0; r < cells.length / 7; r++) {
    weeks.push(cells.slice(r * 7, r * 7 + 7))
  }

  const handleCellClick = (dateStr) => {
    if (!canEdit) return
    if (holidayMap[dateStr]) return
    setAddDate(dateStr)
    setAddName('')
    setAddError('')
  }

  const handleAddSave = () => {
    if (!addName.trim()) {
      setAddError('Please enter a holiday name.')
      return
    }
    try {
      localHolidays.addHoliday({ date: addDate, name: addName })
      setAddDate(null)
      reload()
    } catch (e) {
      setAddError(e.message)
    }
  }

  const handleDelete = (e, id) => {
    e.stopPropagation()
    localHolidays.deleteHoliday(id)
    reload()
  }

  const sundayCount = Object.values(holidayMap).filter((h) => h.type === 'sunday').length
  const satCount = Object.values(holidayMap).filter((h) => h.type === 'saturday').length
  const customCount = Object.values(holidayMap).filter((h) => h.type === 'custom').length

  return (
    <>
      <CCard>
        <CCardHeader className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div>
            <strong>
              General Calendar — {MONTHS[month - 1]} {year}
            </strong>
            <div className="small text-body-secondary mt-1">
              {sundayCount} Sunday{sundayCount !== 1 ? 's' : ''} &middot; {satCount} 2nd/4th
              Saturday{satCount !== 1 ? 's' : ''} &middot; {customCount} custom holiday
              {customCount !== 1 ? 's' : ''}
            </div>
          </div>
          {canEdit && (
            <span className="text-body-secondary small fst-italic">
              Click any working day to mark as holiday
            </span>
          )}
        </CCardHeader>
        <CCardBody className="px-3 pt-2 pb-3">
          {/* Legend */}
          <div className="d-flex gap-3 mb-3 flex-wrap align-items-center">
            {[
              { label: 'Sunday', bg: '#e9ecef' },
              { label: '2nd / 4th Saturday', bg: '#e9ecef' },
              { label: 'Custom Holiday', bg: '#fff3cd' },
              { label: 'Working Day', bg: '#fff', border: true },
            ].map((item) => (
              <div key={item.label} className="d-flex align-items-center gap-1">
                <div
                  style={{
                    width: 13,
                    height: 13,
                    background: item.bg,
                    border: '1px solid #dee2e6',
                    borderRadius: 2,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 11 }}>{item.label}</span>
              </div>
            ))}
          </div>

          {/* Day header */}
          <div style={{ display: 'flex', marginBottom: 2 }}>
            {DAY_LABELS.map((label) => (
              <div
                key={label}
                style={{
                  width: '14.28%',
                  textAlign: 'center',
                  fontWeight: 600,
                  fontSize: 12,
                  padding: '4px 0',
                  borderBottom: '2px solid #dee2e6',
                }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Weeks */}
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: 'flex' }}>
              {week.map((dayNum, di) => {
                if (!dayNum) {
                  return (
                    <div
                      key={di}
                      style={{
                        width: '14.28%',
                        minHeight: 70,
                        border: '1px solid #dee2e6',
                        background: '#fafafa',
                      }}
                    />
                  )
                }
                const dateStr = `${year}-${pad(month)}-${pad(dayNum)}`
                const h = holidayMap[dateStr]
                const isCustom = h?.type === 'custom'
                const isClickable = canEdit && !h

                return (
                  <div
                    key={di}
                    onClick={() => isClickable && handleCellClick(dateStr)}
                    title={isClickable ? 'Click to mark as holiday' : undefined}
                    style={{
                      width: '14.28%',
                      minHeight: 70,
                      border: '1px solid #dee2e6',
                      padding: '4px 6px',
                      background: h ? HOLIDAY_BG[h.type] : '#fff',
                      cursor: isClickable ? 'pointer' : 'default',
                      position: 'relative',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{dayNum}</div>
                    {h && (
                      <div
                        style={{
                          fontSize: 10,
                          marginTop: 2,
                          color: HOLIDAY_TEXT[h.type],
                          lineHeight: 1.3,
                        }}
                      >
                        {h.name}
                      </div>
                    )}
                    {isCustom && canEdit && (
                      <button
                        onClick={(e) => handleDelete(e, h.id)}
                        title="Remove holiday"
                        style={{
                          position: 'absolute',
                          top: 3,
                          right: 4,
                          background: 'none',
                          border: 'none',
                          fontSize: 12,
                          color: '#dc3545',
                          cursor: 'pointer',
                          lineHeight: 1,
                          padding: '1px 2px',
                          fontWeight: 700,
                        }}
                      >
                        ×
                      </button>
                    )}
                    {isClickable && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 3,
                          right: 5,
                          fontSize: 14,
                          color: '#ced4da',
                          lineHeight: 1,
                        }}
                      >
                        +
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </CCardBody>
      </CCard>

      {/* Add Holiday Modal */}
      <CModal visible={Boolean(addDate)} onClose={() => setAddDate(null)} size="sm">
        <CModalHeader>
          <CModalTitle>Add Holiday — {addDate}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {addError && (
            <CAlert color="danger" className="py-1 small mb-2">
              {addError}
            </CAlert>
          )}
          <CFormInput
            placeholder="Holiday name (e.g. Diwali, National Day)"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddSave()}
            autoFocus
          />
          <div className="small text-body-secondary mt-1">
            This holiday will appear in all employee personal calendars.
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" size="sm" onClick={() => setAddDate(null)}>
            Cancel
          </CButton>
          <CButton color="primary" size="sm" onClick={handleAddSave}>
            Save Holiday
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default GeneralCalendar
