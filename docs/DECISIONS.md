# HMA IEMS — Architecture Decision Records (ADRs)

> Canonical log of architectural decisions, extracted from the numbered
> requirement specs (`01`–`12`), `CLAUDE.md`, and the Architecture v2.0
> review. **Future Claude sessions should consult this file before making
> design choices** — it records not just what was decided but why, and which
> requirement-doc statements have been overridden.
>
> Status values: **Accepted** · **Deferred** (decided to postpone) ·
> **Removed** (explicitly out of scope) · **Superseded**.
>
> Last updated: 2026-06-17

---

## Index

| ADR | Title | Status |
|---|---|---|
| 001 | Modular monolith architecture | Accepted |
| 002 | JWT authentication; Employee ID as username | Accepted |
| 003 | No Google OAuth | Accepted |
| 004 | Five-role RBAC with a single-source permission matrix | Accepted |
| 005 | Business locks are separate from RBAC | Accepted |
| 006 | PostgreSQL on Supabase Pro + SQLModel ORM | Accepted |
| 007 | FastAPI layered backend; logic in the service layer | Accepted |
| 008 | SQLModel for persistence, Pydantic for API I/O | Accepted |
| 009 | CoreUI React template; CoreUI components exclusively | Accepted |
| 010 | Chart.js (not Recharts) | Accepted (overrides spec) |
| 011 | Bootstrap 5 via CoreUI SCSS (not Tailwind) | Accepted (overrides spec) |
| 012 | Frontend code conventions | Accepted |
| 013 | Immutable audit logs | Accepted |
| 014 | Append-only history tables | Accepted |
| 015 | Soft deletes for expenses; no hard delete of employees | Accepted |
| 016 | Project value immutable after creation | Accepted |
| 017 | Completed projects are read-only | Accepted |
| 018 | Payroll locked after generation; overrides via history | Accepted |
| 019 | Attendance locked after import; corrections via history | Accepted |
| 020 | Pace Attendance Software is the attendance source of truth | Accepted |
| 021 | Configurable policy table; deduction formula deferred | Accepted / Deferred |
| 022 | Minimal leave model (no self-service/approval) | Accepted |
| 023 | Employee↔Project is many-to-many (multi-project) | Accepted |
| 024 | Track employee department history | Accepted |
| 025 | Project documents persist past completion | Accepted |
| 026 | Finance edit boundary: project expenses only | Accepted |
| 027 | EMS consumes ML forecasts; forecast schema deferred | Deferred |
| 028 | Settings module out of scope | Removed |
| 029 | Dashboard widgets deferred (placeholder) | Deferred |
| 030 | Module-by-module delivery | Accepted |
| 031 | AWS infrastructure & file/email services | Accepted |
| 032 | Only HR resets passwords; users created manually | Accepted |
| 033 | Standard timestamps on every record | Accepted |
| 034 | Inventory is net-new and pending scope | Deferred |
| 035 | Temporary mock user during Phase 0 | Accepted (temporary) |

---

## ADR-001 — Modular monolith architecture
**Status:** Accepted
**Context:** Small internal user base, complex interrelated business rules, internal-only system, simple maintenance goals (`10_Architecture.md`).
**Decision:** Build a modular monolith with role-based access, not microservices.
**Consequences:** Simpler deploy/ops; modules stay independently testable but share one codebase and DB.

## ADR-002 — JWT authentication; Employee ID as username
**Status:** Accepted
**Context:** Internal auth, no external IdP (`03_Business_Rules.md`, `CLAUDE.md`).
**Decision:** Username + password with JWT sessions; the Employee ID (e.g. `THLL2398`) is the login username. JWT on every protected route.
**Consequences:** `users.employee_id` is unique and FK-linked to `employees`. Token carries identity + role for matrix checks.

## ADR-003 — No Google OAuth
**Status:** Accepted
**Context:** Explicitly excluded.
**Decision:** No third-party OAuth/social login.
**Consequences:** All credentials managed in-system; HR resets passwords (see ADR-032).

## ADR-004 — Five-role RBAC with a single-source permission matrix
**Status:** Accepted
**Context:** Roles CEO, Heads, HR, Finance, Project Officer with differentiated access (`02_Roles_and_Permissions.md`).
**Decision:** One canonical matrix (`constants/permissions.js` on the frontend, mirrored in the service layer) keyed `module → role → V|E|null`. Consumed via `usePermission` and `ProtectedRoute`.
**Consequences:** No ad-hoc role checks scattered in code; changing access is a single-file edit.

## ADR-005 — Business locks are separate from RBAC
**Status:** Accepted
**Context:** Completed projects and locked payroll must be read-only regardless of role.
**Decision:** Enforce business locks as a layer distinct from the permission matrix.
**Consequences:** A user with Edit rights is still blocked when the record is locked; both checks must pass to mutate.

## ADR-006 — PostgreSQL on Supabase Pro + SQLModel ORM
**Status:** Accepted
**Context:** `10_Architecture.md`, `07_Database_Requirements.md`.
**Decision:** PostgreSQL (Supabase Pro), normalized tables, SQLModel ORM.
**Consequences:** History preserved relationally; object files live in S3, not the DB (ADR-031).

## ADR-007 — FastAPI layered backend; logic in the service layer
**Status:** Accepted
**Context:** Layers: API → Service → Data Access → Validation → Audit → Report → Import/Export.
**Decision:** REST only; business logic in the service layer, never in route handlers.
**Consequences:** Routes stay thin; services are unit-testable; audit/validation centralized.

## ADR-008 — SQLModel for persistence, Pydantic for API I/O
**Status:** Accepted
**Decision:** SQLModel models define DB schema; Pydantic schemas define request/response shapes.
**Consequences:** Clear separation between storage and transport; explicit serialization boundaries.

## ADR-009 — CoreUI React template; CoreUI components exclusively
**Status:** Accepted
**Context:** `.cursorrules` forbids non-CoreUI UI libraries.
**Decision:** Use `@coreui/react` components only — no Material-UI, no Tailwind, no other component libraries.
**Consequences:** Consistent design system; new components built from CoreUI primitives.

## ADR-010 — Chart.js (not Recharts)
**Status:** Accepted — **overrides `01_Project_Overview.md` / `10_Architecture.md`**
**Context:** The requirement docs list Recharts, but the installed template ships Chart.js via `@coreui/react-chartjs`.
**Decision:** Use `@coreui/react-chartjs` (Chart.js 4.x). Ignore the Recharts mention in the specs.
**Consequences:** All charts use the CoreUI Chart.js wrapper.

## ADR-011 — Bootstrap 5 via CoreUI SCSS (not Tailwind)
**Status:** Accepted — **overrides `01`/`10` tech-stack lists**
**Context:** Specs list Tailwind; template uses Bootstrap 5 via CoreUI SCSS, and `.cursorrules` forbids Tailwind.
**Decision:** Styling via CoreUI SCSS / Bootstrap 5 utility classes; brand overrides in `scss/_custom.scss`.
**Consequences:** No Tailwind anywhere.

## ADR-012 — Frontend code conventions
**Status:** Accepted
**Decision:** Functional components + hooks only (no class components); PropTypes on every component; Prettier with no semicolons, single quotes, 2-space indent; `React.lazy` + `<Suspense>` for route components; HashRouter (`#/path`).
**Consequences:** Uniform style; ESLint/Prettier enforce it.

## ADR-013 — Immutable audit logs
**Status:** Accepted
**Context:** Governance/compliance requirement.
**Decision:** `audit_logs` is append-only; no code path may UPDATE or DELETE a row. Fields: `user_id, role, module_name, action_type, record_id, old_value, new_value, remarks, ip_address, created_at`. Every create/update/delete/correction/login/override/password-reset writes one row.
**Consequences:** Audit-write hook is cross-cutting from RBAC onward (see module specs).

## ADR-014 — Append-only history tables
**Status:** Accepted
**Decision:** Never overwrite historical records. History tables: `employee_salary_history`, `employee_department_history`, `project_officer_history`, `project_expense_history`, `attendance_corrections`, `payroll_history`, `finance_file_history`, `employee_project_assignments` (closed, never overwritten).
**Consequences:** Current-value tables update in place *and* write a history row in the same transaction.

## ADR-015 — Soft deletes for expenses; no hard delete of employees
**Status:** Accepted
**Decision:** `expenses` and `project_expenses` use `is_deleted` (soft delete). Employee records are never hard-deleted; status moves to Inactive/Resigned/Retired.
**Consequences:** Historical reporting stays intact.

## ADR-016 — Project value immutable after creation
**Status:** Accepted
**Decision:** `projects.project_value` cannot be modified once the project is created — for any role.
**Consequences:** Variance reporting compares actuals against a fixed baseline.

## ADR-017 — Completed projects are read-only
**Status:** Accepted
**Decision:** When `projects.status = Completed`, the project and its child expenses become read-only (business lock, ADR-005).
**Consequences:** Service layer rejects mutations on completed projects regardless of role.

## ADR-018 — Payroll locked after generation; overrides via history
**Status:** Accepted
**Decision:** Generated payroll sets `is_locked = true` and is read-only. HR overrides require a `payroll_history` entry + audit log.
**Consequences:** No silent edits to processed payroll.

## ADR-019 — Attendance locked after import; corrections via history
**Status:** Accepted
**Decision:** Imported attendance rows are locked. HR corrections write to `attendance_corrections` (original + corrected value + reason); the original row is never overwritten.
**Consequences:** Imported file remains the source of truth (ADR-020).

## ADR-020 — Pace Attendance Software is the attendance source of truth
**Status:** Accepted
**Context:** `03_Business_Rules.md`, `12_Excel_Import_Specifications.md`.
**Decision:** Attendance is imported from Pace `.xlsx` exports with 11 fixed columns (Employee ID, Employee Name, Date, Status, In Time, Out Time, Work Duration, Late By, Early By, Overtime, Shift). The imported file is authoritative.
**Consequences:** Import validation: employee exists, date non-null, valid status, no duplicate (employee + date). Test fixture: `WorkDurationReport.xlsx`.

## ADR-021 — Configurable policy table; deduction formula deferred
**Status:** Accepted / Deferred
**Context:** Late-entry/leave rules exist but the deduction formula needs HR confirmation.
**Decision:** Store policy values (free late units = 7, unit = 15 min, work hours 09:15–17:45, casual = 12, sick = 8) in an `attendance_policy` table — not hardcoded. The payroll deduction formula is **deferred** until HR confirms; build the calculation pluggable.
**Consequences:** Policy changes without code changes; payroll generation ships with the formula as a swappable component.

## ADR-022 — Minimal leave model (no self-service/approval)
**Status:** Accepted
**Decision:** `leave_balances` tracks used casual/sick days per employee per year only, to support payroll. No leave applications, approval workflow, or self-service in this release. No carry-forward.
**Consequences:** A future self-service portal extends this; current scope stays small.

## ADR-023 — Employee↔Project is many-to-many (multi-project)
**Status:** Accepted
**Context:** One employee may work on multiple projects simultaneously.
**Decision:** Join entity `employee_project_assignments` (employee, project, start, end, status, remarks). Append-only; reassignment closes the prior row (end date + status), never overwrites.
**Consequences:** Distinct from `projects.officer_id` (the single accountable officer).

## ADR-024 — Track employee department history
**Status:** Accepted
**Decision:** Department changes update `employees.department` *and* append to `employee_department_history` (previous, new, effective date, remarks, changed_by).
**Consequences:** Department moves are fully auditable.

## ADR-025 — Project documents persist past completion
**Status:** Accepted
**Decision:** `project_documents` (Proposal/Agreement/Report/Budget/Supporting/Other) remain accessible after a project is Completed or Archived.
**Consequences:** Read access continues even when the project is locked.

## ADR-026 — Finance edit boundary: project expenses only
**Status:** Accepted
**Context:** Finance and Project Officer jointly own project expenses, but Finance must not alter project master data.
**Decision:** Finance may create/edit/delete `project_expenses` and upload `project_documents`, but has **no** write access to `projects` master fields (name, value, type, dates, officer). Project Officer may edit master fields (except value) + expenses.
**Consequences:** Service-layer guard distinct from the module-level matrix.

## ADR-027 — EMS consumes ML forecasts; forecast schema deferred
**Status:** Deferred
**Context:** ML team has not finalized inputs/outputs/model/frequency/format.
**Decision:** The EMS does not run models; it would only store and display ML output. No `forecasts` table is finalized yet. Reporting shows forecasting as a placeholder ("future ML integration").
**Consequences:** Revisit when ML requirements land.

## ADR-028 — Settings module out of scope
**Status:** Removed
**Context:** v2.0 review removed Settings from current scope.
**Decision:** No Settings module, page, route, table, or API. `attendance_policy` is the only configurable store needed now.
**Consequences:** Sidebar has no Settings item; future settings scoped separately.

## ADR-029 — Dashboard widgets deferred (placeholder)
**Status:** Deferred
**Context:** Dashboard layout/widgets not finalized; await stakeholder validation.
**Decision:** Ship Dashboard as a placeholder; no fixed KPI cards/charts until requirements confirmed.
**Consequences:** Dashboard route exists and renders an empty shell.

## ADR-030 — Module-by-module delivery
**Status:** Accepted
**Context:** `11_Development_Rules.md`, `CLAUDE.md`.
**Decision:** Build and validate one module at a time; do not generate the whole system at once. Sequence per EMS_ROADMAP.md.
**Consequences:** Each phase is verified before the next begins.

## ADR-031 — AWS infrastructure & file/email services
**Status:** Accepted
**Decision:** S3 for files (employee/project docs, expense & finance uploads, report exports); SES for email; EC2 + Route53 + Certificate Manager + CloudWatch; Docker; CI/CD via GitHub Actions → ECR → EC2.
**Consequences:** File paths stored as S3 references in DB rows.

## ADR-032 — Only HR resets passwords; users created manually
**Status:** Accepted
**Decision:** Only HR can reset passwords; system administrators create users manually. No self-registration.
**Consequences:** Register page removed from the template; `POST /auth/reset-password` is HR-gated.

## ADR-033 — Standard timestamps on every record
**Status:** Accepted
**Decision:** Every table carries `created_at` / `updated_at` (history/audit tables carry `created_at`/event timestamps).
**Consequences:** Uniform temporal auditing.

## ADR-034 — Inventory is net-new and pending scope
**Status:** Deferred
**Context:** Requested as an EMS module but absent from v2.0 spec (no entities/rules).
**Decision:** Do not plan or build Inventory until a scoping pass defines entities, fields, rules, and permission-matrix rows. Tracked as an optional parallel track (EMS_ROADMAP.md P9).
**Consequences:** Reporting/Notifications treat Inventory as conditional.

## ADR-035 — Temporary mock user during Phase 0
**Status:** Accepted (temporary)
**Context:** Phase 0 has no login yet, but the shell must render and sidebar role-filtering must be testable.
**Decision:** Seed a mock CEO user in the Redux store, clearly commented as temporary.
**Consequences:** **Must be removed in Phase 1** when real JWT login lands (see PROJECT_TODO P1.2.3).
