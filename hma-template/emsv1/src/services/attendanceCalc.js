// Pure attendance policy math — no localStorage, no I/O. Same convention as
// monthlyApportionment.js: every function is a plain data-in/data-out
// transform, so it's testable without a browser and safely shared between
// the live import path (localAttendance.js) and the one-time backfill.

import {
  FREE_LATE_UNITS,
  LATE_UNIT_MIN,
  HALF_DAY_THRESHOLD_MIN,
  HALF_DAY_DEDUCTION_HOURS,
  SHIFT_START_TIME,
} from '../constants/attendancePolicy'

// >60 min late while Present → Half Day (priority rule), else standard
// ceil(minutes/15) unit count. Only ever acts on status === 'Present' — a
// no-op for every other status, so it's safe to re-run on already-processed
// records (idempotent), which is what the backfill migration relies on.
export const classifyLateEntry = (status, lateMinutes) => {
  if (status !== 'Present' || !(lateMinutes > 0)) {
    return { status, lateUnits: 0, reclassifiedToHalfDay: false }
  }
  if (lateMinutes > HALF_DAY_THRESHOLD_MIN) {
    return { status: 'Half Day', lateUnits: 0, reclassifiedToHalfDay: true }
  }
  return {
    status: 'Present',
    lateUnits: Math.ceil(lateMinutes / LATE_UNIT_MIN),
    reclassifiedToHalfDay: false,
  }
}

// Absent on a default-holiday date (Sunday, 2nd/4th Saturday) → Weekly Off.
// Present/Half Day on that date is left untouched — a legitimate worked
// weekly-off. No-op for every other status — also idempotent.
export const applyWeekendHolidayCorrection = (status, isDefaultHoliday) => {
  if (isDefaultHoliday && status === 'Absent') {
    return { status: 'Weekly Off', corrected: true }
  }
  return { status, corrected: false }
}

// Confirmed formula: daily-salary divisor = present + absent days only.
export const computeDailySalary = (salary, presentCount, absentCount) => {
  const workingDays = presentCount + absentCount
  return workingDays > 0 ? salary / workingDays : 0
}

export const computeHourlySalary = (dailySalary) => dailySalary / 8

export const computeAttendanceDeduction = ({
  salary,
  presentCount,
  absentCount,
  halfDayCount,
  excessLateUnits,
}) => {
  const dailySalary = computeDailySalary(salary, presentCount, absentCount)
  const hourlySalary = computeHourlySalary(dailySalary)

  const absentDeduction = absentCount * dailySalary
  const halfDayDeduction = halfDayCount * HALF_DAY_DEDUCTION_HOURS * hourlySalary
  const lateDeduction = excessLateUnits * (LATE_UNIT_MIN / 60) * hourlySalary
  const totalDeduction = absentDeduction + halfDayDeduction + lateDeduction

  return {
    dailySalary,
    hourlySalary,
    absentDeduction,
    halfDayDeduction,
    lateDeduction,
    totalDeduction,
    netPayable: Math.max(0, salary - totalDeduction),
  }
}

// Flags when an employee-month's recorded days exceed the calendar days in
// that month — a data-integrity signal (e.g. duplicate-date records slipping
// past the upsert merge), never expected to fire under normal operation.
export const validateAttendanceIntegrity = ({
  presentCount,
  absentCount,
  halfDayCount = 0,
  leaveCount,
  weeklyOffCount,
  holidayCount,
  daysInMonth,
}) => {
  const total =
    presentCount + absentCount + halfDayCount + leaveCount + weeklyOffCount + holidayCount
  return {
    total,
    daysInMonth,
    valid: total <= daysInMonth,
    overBy: Math.max(0, total - daysInMonth),
  }
}

// Working-days coverage for a month: how many non-holiday calendar dates
// actually have at least one attendance record, and which are still missing.
export const computeMonthCoverage = (allDatesInMonth, defaultHolidayDateSet, recordedDateSet) => {
  const workingDates = allDatesInMonth.filter((d) => !defaultHolidayDateSet.has(d))
  const coveredWorkingDates = workingDates.filter((d) => recordedDateSet.has(d))
  return {
    totalWorkingDays: workingDates.length,
    coveredWorkingDays: coveredWorkingDates.length,
    missingDates: workingDates.filter((d) => !recordedDateSet.has(d)),
    isComplete: coveredWorkingDates.length === workingDates.length,
  }
}

// Shared "HH:MM" <-> minutes-from-midnight helpers, so the new avg-check-in
// metric doesn't become a 3rd independent time parser in this module family.
export const parseTimeToMinutes = (hhmm) => {
  if (!hhmm) return null
  const parts = String(hhmm).split(':').map(Number)
  if (parts.some((n) => Number.isNaN(n))) return null
  return parts[0] * 60 + (parts[1] || 0)
}

export const formatMinutesAsTime = (minutes) => {
  if (minutes == null || Number.isNaN(minutes)) return null
  const total = Math.round(minutes)
  const h = Math.floor(total / 60) % 24
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// Lateness ground truth: a record's own in_time vs. the official shift start
// — NOT the punch machine's "Late By" export column, which has been found to
// sit blank for entire employees/shifts even when in_time is clearly late.
// Returns null (no opinion) when in_time itself is missing.
export const computeLateMinutes = (inTime, shiftStartTime = SHIFT_START_TIME) => {
  const inMinutes = parseTimeToMinutes(inTime)
  const startMinutes = parseTimeToMinutes(shiftStartTime)
  if (inMinutes == null || startMinutes == null) return null
  return Math.max(0, inMinutes - startMinutes)
}
