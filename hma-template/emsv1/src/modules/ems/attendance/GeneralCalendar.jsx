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

import { usePermission } from '../../../hooks/usePermission'
import { MODULE } from '../../../constants/modules'
import { localHolidays } from '../../../services/localHolidays'

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

const TODAY = new Date().toISOString().slice(0, 10)

const CELL_BG = {
  sunday: '#f3f4f6',
  saturday: '#f3f4f6',
  custom: '#fffbeb',
  working: '#ffffff',
  empty: '#fafafa',
}

const HOLIDAY_PILL = {
  sunday: { bg: '#e5e7eb', text: '#6b7280' },
  saturday: { bg: '#e5e7eb', text: '#6b7280' },
  custom: { bg: '#fde68a', text: '#92400e' },
}

const GeneralCalendar = ({ year, month }) => {
  const canEdit = usePermission(MODULE.ATTENDANCE, 'edit')

  const [holidayMap, setHolidayMap] = useState({})
  const [hoveredDate, setHoveredDate] = useState(null)
  const [addDate, setAddDate] = useState(null)
  const [addName, setAddName] = useState('')
  const [addError, setAddError] = useState('')

  const reload = useCallback(() => {
    setHolidayMap(localHolidays.getMonthMap(year, month))
  }, [year, month])

  useEffect(() => {
    reload()
  }, [reload])

  // Build grid
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
    if (!canEdit || holidayMap[dateStr]) return
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
      <CCard className="shadow-sm">
        <CCardHeader className="d-flex align-items-center justify-content-between flex-wrap gap-2 py-3">
          <div>
            <strong className="fs-6">
              General Calendar — {MONTHS[month - 1]} {year}
            </strong>
            <div className="small text-body-secondary mt-1">
              <span className="me-2">
                <span
                  style={{
                    display: 'inline-block',
                    width: 10,
                    height: 10,
                    background: '#e5e7eb',
                    borderRadius: 2,
                    marginRight: 4,
                    verticalAlign: 'middle',
                  }}
                />
                {sundayCount} Sunday{sundayCount !== 1 ? 's' : ''}
              </span>
              <span className="me-2">
                <span
                  style={{
                    display: 'inline-block',
                    width: 10,
                    height: 10,
                    background: '#e5e7eb',
                    borderRadius: 2,
                    marginRight: 4,
                    verticalAlign: 'middle',
                  }}
                />
                {satCount} 2nd/4th Saturday{satCount !== 1 ? 's' : ''}
              </span>
              <span>
                <span
                  style={{
                    display: 'inline-block',
                    width: 10,
                    height: 10,
                    background: '#fde68a',
                    borderRadius: 2,
                    marginRight: 4,
                    verticalAlign: 'middle',
                  }}
                />
                {customCount} custom holiday{customCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          {canEdit && (
            <span className="text-body-secondary small fst-italic">
              Click any working day to mark as holiday
            </span>
          )}
        </CCardHeader>

        <CCardBody className="p-0">
          {/* Day header row */}
          <div
            style={{
              display: 'flex',
              background: '#f8f9fa',
              borderBottom: '2px solid #dee2e6',
            }}
          >
            {DAY_LABELS.map((label, i) => (
              <div
                key={label}
                style={{
                  width: '14.28%',
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: 11,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  padding: '10px 0',
                  color: i >= 5 ? '#9ca3af' : '#374151',
                }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Calendar weeks */}
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: 'flex', borderBottom: '1px solid #f3f4f6' }}>
              {week.map((dayNum, di) => {
                if (!dayNum) {
                  return (
                    <div
                      key={di}
                      style={{
                        width: '14.28%',
                        minHeight: 90,
                        background: CELL_BG.empty,
                        borderRight: '1px solid #f3f4f6',
                      }}
                    />
                  )
                }

                const dateStr = `${year}-${pad(month)}-${pad(dayNum)}`
                const h = holidayMap[dateStr]
                const isCustom = h?.type === 'custom'
                const isClickable = canEdit && !h
                const isToday = dateStr === TODAY
                const isHovered = hoveredDate === dateStr
                const pill = h ? HOLIDAY_PILL[h.type] : null

                return (
                  <div
                    key={di}
                    onClick={() => isClickable && handleCellClick(dateStr)}
                    onMouseEnter={() => isClickable && setHoveredDate(dateStr)}
                    onMouseLeave={() => setHoveredDate(null)}
                    title={isClickable ? 'Click to mark as holiday' : undefined}
                    style={{
                      width: '14.28%',
                      minHeight: 90,
                      borderRight: '1px solid #f3f4f6',
                      background: isHovered ? '#eff6ff' : h ? CELL_BG[h.type] : CELL_BG.working,
                      cursor: isClickable ? 'pointer' : 'default',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '10px 6px 8px',
                      transition: 'background 0.12s',
                    }}
                  >
                    {/* Date circle */}
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        background: isToday ? '#2563eb' : 'transparent',
                        border: isToday ? 'none' : '2px solid transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: isToday ? 700 : 600,
                        fontSize: 15,
                        color: isToday ? '#ffffff' : h ? '#6b7280' : '#111827',
                        marginBottom: 6,
                        flexShrink: 0,
                      }}
                    >
                      {dayNum}
                    </div>

                    {/* Holiday label pill */}
                    {h && (
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 500,
                          color: pill.text,
                          background: pill.bg,
                          borderRadius: 4,
                          padding: '2px 6px',
                          textAlign: 'center',
                          lineHeight: 1.4,
                          maxWidth: '100%',
                          wordBreak: 'break-word',
                        }}
                      >
                        {h.name}
                      </div>
                    )}

                    {/* Hover hint for working days */}
                    {isHovered && (
                      <div
                        style={{
                          fontSize: 10,
                          color: '#2563eb',
                          marginTop: 4,
                          fontWeight: 500,
                        }}
                      >
                        + Add holiday
                      </div>
                    )}

                    {/* Delete button for custom holidays */}
                    {isCustom && canEdit && (
                      <button
                        onClick={(e) => handleDelete(e, h.id)}
                        title="Remove holiday"
                        style={{
                          position: 'absolute',
                          top: 4,
                          right: 5,
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderRadius: '50%',
                          width: 18,
                          height: 18,
                          fontSize: 11,
                          color: '#dc2626',
                          cursor: 'pointer',
                          lineHeight: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          padding: 0,
                        }}
                      >
                        ×
                      </button>
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
          <CModalTitle>Add Holiday</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <div className="text-body-secondary small mb-2">
            {addDate && (
              <>
                {new Date(addDate + 'T00:00:00').toLocaleDateString('en-IN', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </>
            )}
          </div>
          {addError && (
            <CAlert color="danger" className="py-1 small mb-2">
              {addError}
            </CAlert>
          )}
          <CFormInput
            placeholder="Holiday name (e.g. Diwali, Republic Day)"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddSave()}
            autoFocus
          />
          <div className="small text-body-secondary mt-2">
            This will reflect in all employee personal calendars.
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
