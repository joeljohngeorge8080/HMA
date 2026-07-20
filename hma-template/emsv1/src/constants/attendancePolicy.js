// Attendance business-rule constants (previously duplicated independently in
// localAttendance.js and AttendanceImport.jsx, and baked as magic numbers
// into DeductionSummary.jsx / attendanceRevenue.js / CorePoolPage.jsx).
export const FREE_LATE_UNITS = 7 // free late units per month, no carry-forward
export const LATE_UNIT_MIN = 15 // 1 unit = 15 minutes
export const HALF_DAY_THRESHOLD_MIN = 60 // >60 min late while Present → Half Day (priority rule)
export const HALF_DAY_DEDUCTION_HOURS = 4 // Half Day = 4 hrs deduction

// Official shift start ("Start Time: 09:15 AM" per docs/03_Business_Rules.md).
// Lateness is derived from a record's own in_time against this, NOT from the
// punch machine's own "Late By" export column — that column has been found
// to sit blank for entire employees/shifts even when in_time is clearly past
// this start time, so it cannot be trusted as the source of truth.
export const SHIFT_START_TIME = '09:15'

// Wizard-preview-only rule (AttendanceImport.jsx generateRemarks/effective_absent).
// Not part of the unified deduction formula in attendanceCalc.js — none of the
// production formulas fold excess leave into absent days.
export const CL_MONTHLY_LIMIT = 1
