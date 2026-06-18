// Parses Pace Attendance Software "Monthly Status Report (Detailed Work Duration)" Excel.
//
// Format: transposed block layout — NOT row-per-record.
//   Row 0:  Title "Monthly Status Report (Detailed Work Duration)"
//   Row 2:  Date range "Nov 01 2025  To  Nov 29 2025"
//   Row 6:  Day headers  ["Days", null, "1 St", "2 S", null, "3 M", ...]
//   Row 8:  Department label
//   Then repeating employee blocks (9 rows each + 1 blank separator):
//     Employee: | | | "THLLXXXX : FULL NAME" | | | | | " Total Work Duration: ..."
//     Status    | | | day1_status | day2_status | ...
//     InTime    | | | day1_intime | ...
//     OutTime   | | | day1_outtime | ...
//     Duration  | | | day1_duration | ...
//     Late By   | | | day1_lateby | ...
//     Early By  | | | day1_earlyby | ...
//     OT        | | | day1_ot | ...
//     Shift     | | | day1_shift | ...
//     (blank)
//
// Returns { rows, errors, warnings, detectedYear, detectedMonth }

import * as XLSX from 'xlsx'

const MONTH_MAP = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
}

const STATUS_NORMALIZE = {
  P: 'Present',
  A: 'Absent',
  HD: 'Half Day',
  WO: 'Weekly Off',
  L: 'On Leave',
  H: 'Holiday',
  LEAVE: 'On Leave',
  HOLIDAY: 'Holiday',
  PRESENT: 'Present',
  ABSENT: 'Absent',
  'HALF DAY': 'Half Day',
  'WEEKLY OFF': 'Weekly Off',
  'ON LEAVE': 'On Leave',
}

const normalizeStatus = (raw) => {
  if (!raw) return null
  const up = String(raw).trim().toUpperCase()
  return STATUS_NORMALIZE[up] || null
}

// "8:25" or "00:00" → "08:25" | null for "00:00" (zero means no activity)
const normTime = (val) => {
  if (val == null || val === '') return null
  const s = String(val).trim()
  if (!s || s === '00:00' || s === '0:00') return null
  const m = s.match(/^(\d{1,2}):(\d{2})/)
  if (!m) return null
  return `${m[1].padStart(2, '0')}:${m[2]}`
}

// zero-preserving version for duration — keep "00:00" as null, non-zero keep
const normDuration = normTime

// Zero-pad to "HH:MM"
const pad2 = (n) => String(n).padStart(2, '0')

export const parseAttendanceExcel = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array', raw: true })
        const ws = wb.Sheets[wb.SheetNames[0]]

        // Read as array-of-arrays so we have precise column indices
        const sheet = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null })

        if (sheet.length < 10) {
          return resolve({
            rows: [],
            errors: ['File is empty or unrecognised format.'],
            warnings: [],
          })
        }

        // ── 1. Detect year + month from date range row ─────────────────────────
        let detectedYear = null
        let detectedMonth = null

        for (let i = 0; i < Math.min(10, sheet.length); i++) {
          const row = sheet[i]
          for (const cell of row) {
            if (!cell) continue
            const s = String(cell)
            // "Nov 01 2025  To  Nov 29 2025"
            const m = s.match(/([A-Za-z]{3})\s+\d+\s+(\d{4})/)
            if (m) {
              detectedMonth = MONTH_MAP[m[1].toLowerCase()] || null
              detectedYear = parseInt(m[2])
              break
            }
          }
          if (detectedYear) break
        }

        // ── 2. Build column→day mapping from the "Days" header row ───────────────
        let colToDay = {} // colIndex → dayOfMonth (1-31)
        let daysRowIdx = -1

        for (let i = 0; i < Math.min(15, sheet.length); i++) {
          if (sheet[i][0] === 'Days') {
            daysRowIdx = i
            sheet[i].forEach((cell, colIdx) => {
              if (!cell) return
              const m = String(cell).match(/^(\d+)\s/)
              if (m) colToDay[colIdx] = parseInt(m[1])
            })
            break
          }
        }

        if (Object.keys(colToDay).length === 0) {
          return resolve({
            rows: [],
            errors: [
              'Could not find the "Days" header row. ' +
                'Make sure this is a Pace Attendance "Monthly Status Report (Detailed Work Duration)" file.',
            ],
            warnings: [],
          })
        }

        // ── 3. Walk rows, collect employee blocks ─────────────────────────────────
        const rows = []
        const errors = []
        const warnings = []

        // The block structure for each employee:
        // offset 0: Employee: row  (col 3 = "ID : Name", col 8 = summary)
        // offset 1: Status row
        // offset 2: InTime row
        // offset 3: OutTime row
        // offset 4: Duration row
        // offset 5: Late By row
        // offset 6: Early By row
        // offset 7: OT row
        // offset 8: Shift row

        const ROW_LABELS = [
          'Status',
          'InTime',
          'OutTime',
          'Duration',
          'Late By',
          'Early By',
          'OT',
          'Shift',
        ]

        let i = daysRowIdx + 1
        while (i < sheet.length) {
          const row = sheet[i]
          if (row[0] !== 'Employee:') {
            i++
            continue
          }

          // Parse employee identity from col 3: "THLL2408 : TITU S JAYAN"
          const empCell = String(row[3] || '')
          const empMatch = empCell.match(/^(\S+)\s*:\s*(.+)$/)
          if (!empMatch) {
            warnings.push(
              `Row ${i + 1}: Could not parse Employee ID from "${empCell}" — block skipped`,
            )
            i += 10
            continue
          }

          const employeeId = empMatch[1].trim()
          const employeeName = empMatch[2].trim()

          // Collect the 8 sub-rows by their row label
          const blockRows = {}
          for (let offset = 1; offset <= 8; offset++) {
            const subRow = sheet[i + offset]
            if (!subRow) break
            const label = subRow[0]
            if (label && ROW_LABELS.includes(label)) {
              blockRows[label] = subRow
            }
          }

          if (!blockRows['Status']) {
            warnings.push(`Row ${i + 1} (${employeeId}): Missing Status row — block skipped`)
            i += 10
            continue
          }

          // For each day column, emit one record
          Object.entries(colToDay).forEach(([colIdxStr, dayOfMonth]) => {
            const colIdx = parseInt(colIdxStr)
            const statusRaw = blockRows['Status']?.[colIdx]
            const status = normalizeStatus(statusRaw)

            if (!status) {
              if (statusRaw != null) {
                warnings.push(
                  `${employeeId} day ${dayOfMonth}: unknown status "${statusRaw}" — skipped`,
                )
              }
              return
            }

            // Build ISO date
            let date = null
            if (detectedYear && detectedMonth) {
              date = `${detectedYear}-${pad2(detectedMonth)}-${pad2(dayOfMonth)}`
            }
            // Fallback if year/month not detected — skip (can't form a real date)
            if (!date) {
              warnings.push(
                `${employeeId} day ${dayOfMonth}: could not determine year/month — skipped`,
              )
              return
            }

            const inTime = normTime(blockRows['InTime']?.[colIdx])
            const outTime = normTime(blockRows['OutTime']?.[colIdx])
            const duration = normDuration(blockRows['Duration']?.[colIdx])
            const lateBy = normTime(blockRows['Late By']?.[colIdx])
            const earlyBy = normTime(blockRows['Early By']?.[colIdx])
            const overtime = normTime(blockRows['OT']?.[colIdx])
            const shift = String(blockRows['Shift']?.[colIdx] || '').trim()

            rows.push({
              employee_id: employeeId,
              employee_name: employeeName,
              date,
              status,
              in_time: inTime,
              out_time: outTime,
              work_duration: duration,
              late_by: lateBy,
              early_by: earlyBy,
              overtime,
              shift,
            })
          })

          i += 10 // skip past this 9-row block + blank separator
        }

        if (rows.length === 0 && errors.length === 0) {
          errors.push(
            'No attendance records could be parsed. ' +
              'Ensure the file is a Pace "Monthly Status Report (Detailed Work Duration)".',
          )
        }

        resolve({ rows, errors, warnings, detectedYear, detectedMonth })
      } catch (err) {
        reject(new Error(`Failed to parse Excel: ${err.message}`))
      }
    }
    reader.readAsArrayBuffer(file)
  })
