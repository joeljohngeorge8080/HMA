# PMS Implementation Architecture Plan

## Context

HMA IEMS has a fully operational EMS. The PMS shell is scaffolded: routes (`routes/pms.routes.js`), navigation (`modules/pms/_nav.jsx`), permission matrix (`constants/permissions.js`), and module constants (`constants/modules.js`) are **already defined**. All PMS module folders under `modules/pms/` are empty stubs. There is no `localProjects.js` service yet.

Source of truth:
- Business workflow: `docs/PMS (2).drawio` (already analyzed above)
- Data spec: `specs/02_projects.md`
- Permissions: `constants/permissions.js` (PMS section, lines 62–133)
- Patterns to replicate: `services/localAttendance.js`, `modules/ems/staff-payroll/EmployeeList.jsx`, `modules/ems/staff-payroll/EmployeeProfile.jsx`

---

## Implementation Phases

### Phase 1 — Data Layer (build first, everything depends on it)

**File: `src/services/localProjects.js`**

Single service handling all PMS localStorage operations. Follow the exact pattern from `localAttendance.js`:
- `uid()`, `now()`, `read(key)`, `write(key, data)` helpers
- API-first design (same methods callable against backend when available)

**localStorage keys:**
```
hma_projects
hma_project_tasks
hma_project_expenses
hma_project_expense_history
hma_project_documents
hma_project_officer_history
hma_funding_agencies
hma_implementing_partners
```

**Data shapes:**

`project`:
```
id, project_code (auto: PRJ-YYYY-NNN), project_name, project_type (CSR|LSGB|Other),
other_type_name, funder, location, project_value (immutable), start_date, end_date,
status (Draft|Active|Completed|Archived|Cancelled), sub_status (for lifecycle stage:
Pipeline|Design|Implementation|Follow-up — only when status=Active),
officer_id, officer_name (denormalized), remarks, created_by, created_at, updated_at
```

`task` (multiple per project — confirmed in diagram):
```
id, project_id, task_name, task_budget, target_date, actual_date,
status (Not Started|In Progress|Completed|Blocked), remarks,
created_by, created_at, updated_at
```

`project_expense`:
```
id, project_id, task_id (nullable), category, amount, expense_date,
remarks, created_by, updated_by, is_deleted (soft delete), created_at, updated_at
```

`project_expense_history` (append-only on every edit):
```
id, project_expense_id, old_amount, new_amount, old_remarks, new_remarks, changed_by, changed_at
```

`project_document`:
```
id, project_id, document_name, document_category
(Proposal|Agreement|Project Report|Budget File|Supporting Document|Other),
file_name, file_data (base64 for localStorage), uploaded_by, uploaded_at, remarks
```

`project_officer_history` (append-only on officer change):
```
id, project_id, old_officer_id, old_officer_name, new_officer_id, new_officer_name,
changed_by, changed_at, remarks
```

`funding_agency`: `id, name, contact, remarks, created_at`

`implementing_partner`: `id, name, contact, remarks, created_at`

**Methods to expose:**
```js
localProjects = {
  // Projects
  list({ search, status, type, page, pageSize })  → { items, total, total_pages }
  getById(id)                                      → project | null
  create(data)                                     → project  (auto-generates project_code)
  update(id, data)                                 → project  (guards project_value)
  updateStatus(id, { status, sub_status, remarks }) → project
  assignOfficer(id, { officer_id, officer_name, changed_by, remarks }) → project
  getSummaryStats()                                → { total, active, draft, value_total }

  // Tasks
  listTasks(projectId)                             → task[]
  createTask(projectId, data)                      → task
  updateTask(taskId, data)                         → task
  deleteTask(taskId)                               → void

  // Expenses
  listExpenses(projectId, { includeDeleted })      → expense[]
  addExpense(projectId, data)                      → expense
  editExpense(expenseId, data)                     → expense  (writes history row)
  deleteExpense(expenseId, deletedBy)              → void     (soft delete)
  getExpenseSummary(projectId)                     → { total, by_category[] }

  // Documents
  listDocuments(projectId, { category })           → document[]
  uploadDocument(projectId, data)                  → document
  deleteDocument(docId)                            → void

  // Officer History
  listOfficerHistory(projectId)                    → history[]

  // Agencies & Partners
  listAgencies()       createAgency(data)
  listPartners()       createPartner(data)
}
```

**Business rules enforced in the service (not the UI):**
- `project_value` update → throw `'Project value is immutable after creation'`
- Status backward transition → throw
- Completed/Archived project edit → throw `'Project is read-only'`
- Officer reassign to same person → no-op (no history row)
- `project_type = Other` ⇒ `other_type_name` required

**Project code generation:**
```js
const nextCode = (rows) => {
  const yr = new Date().getFullYear()
  const count = rows.filter(r => r.project_code?.startsWith(`PRJ-${yr}`)).length
  return `PRJ-${yr}-${String(count + 1).padStart(3, '0')}`
}
```

**Also add:** seed function (`seedLocalProjects`) seeding 5–8 sample projects across types/statuses. Call from `App.jsx` boot, same pattern as `seedLocalEmployees`.

---

### Phase 2 — PMS Dashboard

**File: `modules/pms/dashboard/Dashboard.jsx`**

Layout (4 stat cards + 2 lists):
```
Row 1: [Total Projects] [Active] [Total Value] [Budget Utilized %]
Row 2: [Recent Projects table (last 5)] | [Status Distribution mini-chart]
```

Data: `localProjects.getSummaryStats()` + `localProjects.list({ page:1, pageSize:5 })`

No edit permissions needed on dashboard. Uses `MODULE.PMS_DASHBOARD`.

**Update `pms.routes.js`**: replace `placeholder('PMS Dashboard')` with `React.lazy(() => import('../modules/pms/dashboard/Dashboard'))`

---

### Phase 3 — Projects Module (core, most complex)

**Files:**
```
modules/pms/projects/
  ProjectList.jsx       → /pms/projects
  ProjectForm.jsx       → /pms/projects/create  AND  /pms/projects/:id/edit
  ProjectDetail.jsx     → /pms/projects/:id
  ProjectArchive.jsx    → /pms/projects/archive
  components/
    ProjectStatusBadge.jsx
    ProjectTypeBadge.jsx
    ReadOnlyBanner.jsx       (shown on Completed/Archived projects)
    OfficerAssignModal.jsx
    TasksTab.jsx
    ExpensesTab.jsx
    DocumentsTab.jsx
    OfficerHistoryTab.jsx
```

**ProjectList.jsx** — mirrors `EmployeeList.jsx` pattern exactly:
- Filters: search (name/code), status dropdown, type dropdown
- Columns: #, Code, Project Name, Type, Funder, Value, Utilization %, Status, Officer
- Clickable rows → `/pms/projects/:id`
- "Create Project" button (canEdit only, `MODULE.PMS_PROJECTS`)

**ProjectForm.jsx** — used for both create and edit:
- Create mode: all fields editable including `project_value`
- Edit mode: `project_value` field is **disabled with tooltip** "Value is locked after creation"
- Validate `other_type_name` required when type = Other
- `end_date ≥ start_date` validation
- Officer picker: dropdown populated from `localEmployees.list()` (Active employees only)
- On create: call `localProjects.create()` → navigate to `/pms/projects/:id`
- `useForm` from `react-hook-form` (already in package.json)

**ProjectDetail.jsx** — mirrors `EmployeeProfile.jsx` tab pattern:
- Header: project name, code badge, status badge, type badge, officer name, action buttons
- `ReadOnlyBanner` shown when status = Completed | Archived
- Tabs: **Overview | Tasks | Expenses | Documents | Officer History**

Tab detail:

*Overview tab:* All project fields (read-only display). Status change button (canEdit for CEO/Heads only based on permissions).

*Tasks tab (`TasksTab.jsx`):*
- Table: Task Name, Budget, Target Date, Actual Date, Status
- "Add Task" button
- Inline edit/delete (canEdit guard)
- Status badge per task

*Expenses tab (`ExpensesTab.jsx`):*
- Budget vs Actual progress bar (project_value vs sum of expenses)
- Expense table: Date, Category, Amount, Remarks, Actions
- Add/Edit expense modal (Finance + Project Officer can edit)
- Soft-deleted expenses hidden by default (toggle to show)
- Warning indicator when total > project_value

*Documents tab (`DocumentsTab.jsx`):*
- Filter by category
- Upload button → file input → base64 encode → `localProjects.uploadDocument()`
- Download link for stored documents
- Persists even on Completed/Archived projects (ADR-025)

*Officer History tab:*
- Timeline list of officer assignments with dates
- "Reassign Officer" button (CEO/Heads only)
- Opens `OfficerAssignModal` → calls `localProjects.assignOfficer()`

**ProjectArchive.jsx:** Same list as ProjectList but pre-filtered to status ∈ {Completed, Archived, Cancelled}. Read-only view.

---

### Phase 4 — Lifecycle Views

**Files: `modules/pms/project-lifecycle/`**

All 5 pages are filtered views over the same project list. No new data fetching.

| Route | Filter |
|-------|--------|
| `/pipeline` | status = Draft |
| `/design` | status = Active, sub_status = Design |
| `/implementation` | status = Active, sub_status = Implementation |
| `/followup` | status = Active, sub_status = Follow-up |
| `/completed` | status = Completed |

Create a shared `LifecycleView.jsx` component that takes `{ title, statusFilter, subStatusFilter }` props and renders a filtered `ProjectList`. Each route file is a thin wrapper.

**Sub-status:** Displayed as a secondary badge on Active projects. Managed via the status change modal with sub-status selector (only visible when status = Active).

---

### Phase 5 — Expenses Module

**Files: `modules/pms/project-expenses/`**

`ExpenseEntry.jsx` — global expense entry (project selector + all expense form fields). Useful when Finance wants to add an expense without navigating to a specific project.

`ExpenseHistory.jsx` — table of all expenses across projects:
- Filters: project, date range, category
- Shows: Project Code, Category, Amount, Date, Added By, Status
- Expandable row → shows expense edit history

`ExpenseAnalysis.jsx` — charts using `@coreui/react-chartjs`:
- Bar chart: project value vs spent, per project
- Pie chart: expense breakdown by category
- Table: projects with budget variance (over/under)

`ExpenseDocuments.jsx` — cross-project document browser filtered to Budget File category.

---

### Phase 6 — Documents Module

**Files: `modules/pms/project-documents/`**

Each route (`/proposals`, `/agreements`, etc.) is a filtered view of all documents by `document_category`. Create shared `DocumentBrowser.jsx` taking `{ category }` prop.

Document browser columns: Project Code, Document Name, Uploaded By, Date, Download.

---

### Phase 7 — Teams, Locations, Supporting

**Project Teams (`modules/pms/project-teams/`):**

`OfficerList.jsx` — table of unique current project officers (group projects by officer). Columns: Officer, # Active Projects, Total Value.

`Allocation.jsx` — table: Project Name | Officer | Since | End Date. Filterable.

`AssignmentHistory.jsx` — flat list of all `project_officer_history` records.

**Project Locations (`modules/pms/project-locations/`):**

`LocationList.jsx` — unique locations from projects (extracted from `project.location` field), with count of projects per location.

`DistrictList.jsx` — unique districts (derived from location field, or a separate `district` field added to project).

`LocationMapping.jsx` — table: Project → Location cross-reference.

**Funding Agencies (`modules/pms/funding-agencies/`):**

`AgencyList.jsx` — CRUD list, same pattern as EmployeeList. Uses `localProjects.listAgencies()`.

**Implementing Partners (`modules/pms/implementing-partners/`):**

`PartnerList.jsx` — same CRUD pattern.

---

### Phase 8 — Reports

**Files: `modules/pms/project-reports/`**

`ProjectWiseReport.jsx` — select a project → show summary table (value, spent, tasks completed, documents count, officer history).

`OverallReport.jsx` — aggregate: total projects, total value, total spent, by type breakdown.

`MonthlyReport.jsx` — filter by month/year → show projects active/started/completed in that period + expense totals.

`YearlyReport.jsx` — same but yearly with month-by-month expense chart.

`ReportExports.jsx` — placeholder for future CSV/PDF export.

---

### Phase 9 — Audit Logs

**File: `modules/pms/audit-logs/AuditLogs.jsx`**

Reads from `hma_activity_log` (same store as EMS). Filter to action types relevant to PMS. Columns: Timestamp, User, Action, Entity, Old Value, New Value.

---

## Routes Update

Replace all `placeholder(...)` calls in `routes/pms.routes.js` with `React.lazy(() => import(...))` imports as each module is built. Follow the existing lazy-import pattern from `routes/ems.routes.js`.

Pattern:
```js
const ProjectList = React.lazy(() => import('../modules/pms/projects/ProjectList'))
// then in route object:
{ path: '/pms/projects', name: 'Projects', element: ProjectList, module: MODULE.PMS_PROJECTS }
```

---

## Permissions Already Defined

No changes needed to `constants/permissions.js` or `constants/modules.js`. All PMS permissions are already in place (lines 62–133 of permissions.js).

**Key role access summary:**
- HR: NO access to any PMS module
- Project Officer: EDIT expenses + documents; VIEW everything else
- Finance: EDIT expenses only; VIEW rest
- CEO/Heads: EDIT projects, lifecycle, teams, locations, agencies, partners
- All (except HR): VIEW dashboard + reports

---

## Shared Utilities to Reuse

| Utility | Path | Use in PMS |
|---------|------|-----------|
| `usePermission(module, action)` | `hooks/usePermission.js` | Gate all edit buttons/forms |
| `useRole()` | `hooks/useRole.js` | Role-aware rendering |
| `useAuth()` | `hooks/useAuth.js` | Get `user` for `created_by` fields |
| `api` (axios) | `services/api.js` | API-first calls before localStorage fallback |
| `ProtectedRoute` | `components/ProtectedRoute.jsx` | Already wrapping PMS routes |
| `AppContent` | `components/AppContent.jsx` | Already rendering PMS routes via RoutesContext |

---

## Build Order (module by module, validate each before next)

```
1. localProjects.js + seed data
2. PMS Dashboard
3. Projects: List → Create → Detail (Overview tab only)
4. Projects: Detail tabs (Tasks → Expenses → Documents → Officer History)
5. Projects: Edit + Archive
6. Lifecycle Views (thin wrappers, reuse project list)
7. Expenses Module (entry + history + analysis)
8. Documents Module (filtered browser)
9. Teams + Locations (filtered + derived views)
10. Funding Agencies + Partners (CRUD)
11. Reports
12. Audit Logs
```

---

## Diagram-Sourced Features (defer after core is complete)

These come from the Draw.io analysis but are NOT in `specs/02_projects.md`. Build after core PMS is validated:

- **Procurement workflow**: Indent → Sanction → Work Order → Payment Details (per task)
- **Daily Reports**: Field Staff submission with geotagged photos + merged bills
- **Field Staff Attendance**: Geotagged image, Project Officer verification
- **Settlement workflow**: Backend Team combines bills → Merged Report → review chain
- **Leave management**: Field Staff leave requests through project hierarchy

These will need their own spec before implementation.

---

## Verification Steps

After each phase:
1. Run dev server: `cd hma-template/emsv1 && npm run dev`
2. Navigate to `/select-system` → click PMS
3. Confirm the built module renders without console errors
4. Test CRUD operations via UI; verify localStorage key (`hma_projects` etc.) in DevTools → Application
5. Test permission gating: log in as different roles and confirm edit buttons appear/hide correctly
6. Confirm `project_value` cannot be changed on edit form
7. Confirm Completed/Archived projects show ReadOnlyBanner and block edits
