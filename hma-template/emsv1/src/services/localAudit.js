const mockAuditLogs = [
  { id: 1, user: 'Rajesh Kumar', role: 'Field Personnel', action: 'Submitted Report', module: 'Daily Reports', details: 'Daily progress report for Water Supply Project', timestamp: '2026-06-19 09:15 AM' },
  { id: 2, user: 'Admin User', role: 'Administrator', action: 'Created Project', module: 'Projects', details: 'Initialized "Rural Electrification Phase II"', timestamp: '2026-06-18 14:30 PM' },
  { id: 3, user: 'Anita Singh', role: 'Project Officer', action: 'Approved Report', module: 'Daily Reports', details: 'Approved report ID #1042', timestamp: '2026-06-18 16:45 PM' },
  { id: 4, user: 'Rajesh Kumar', role: 'Field Personnel', action: 'Uploaded Bill', module: 'Expenses', details: 'Transport allowance - 1500 INR', timestamp: '2026-06-17 11:00 AM' },
  { id: 5, user: 'Admin User', role: 'Administrator', action: 'Assigned Task', module: 'Daily Reports', details: 'Assigned "Site Inspection" to Rajesh Kumar', timestamp: '2026-06-17 09:30 AM' }
]

export const localAudit = {
  list: () => {
    return { items: [...mockAuditLogs], total: mockAuditLogs.length }
  }
}
