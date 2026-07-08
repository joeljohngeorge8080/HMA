# Handoff — 2026-07-08 session (ADR-036 scope narrowing applied to code)

> Read this before touching `hma-template/emsv1/src/modules/pms/**` or
> `src/constants/roles.js` / `permissions.js`. It explains what changed,
> why, and what's still open. Background: `DECISIONS.md` ADR-036,
> `newplan.txt`, `PROJECT_OVERVIEW.md`.

## What this session did

Three rounds of work, all narrowing the app to match the CEO's
expense-oversight-only scope (ADR-036) and two follow-up directives
given directly in this session (remove 4 roles; remove all "approval
system" UI except the PO's pool release).

### 1. Applied ADR-036 to the running app
Docs already described the narrowed scope; code hadn't caught up.
- Hid (not deleted) the daily-reports/task-tracking nav groups
  (`Field Personnel`, `Daily Reports (Admin)`) and the "Approved Bills"
  settlements link from `pms/_nav.jsx`.
- Removed 6 out-of-scope widgets from `PmsDashboard.jsx`'s catalog:
  `ProjectKPIsWidget`, `ProjectValueWidget`, `DailyReportsSummaryWidget`,
  `FieldPersonnelWidget`, `ProjectsByPhaseWidget`, `RecentProjectsWidget`.
- Fixed the PO/PA budget-% edit gate: `ProjectDetailPage.jsx`'s
  "Project Overheads" panel (admin/HR/core %) was gated to
  `isBudgetAdmin` (CEO/Finance/HR/Coordinator) only — PO/PA could view
  but not edit their own project's split. Now gated on
  `canEditMonthlyPlan`, which already included PO/PA.
- Added an `admin_pct` field to `ProjectFormPage.jsx`'s creation form
  (previously only `hr_pct`/`core_pct` were settable at intake; admin
  defaulted silently to 5%).

### 2. Removed 4 roles: Finance, Project Coordinator, Field Personnel, Backend Team
User directive, applied end-to-end:
- `constants/roles.js` — removed from `ROLE` and `ROLES`.
- `constants/permissions.js` — stripped from every module row;
  deleted `MODULE.FINANCE` entirely (it was a 5-route placeholder
  stub, no real functionality — routes also deleted from
  `routes/ems.routes.js`).
- EMS "Finance" nav section (`ems/_nav.jsx`) removed along with it.
- Dev-login switcher (`Login.jsx`), legacy `DEV_USERS` map
  (`services/auth.js`), user-management role dropdown/color map,
  and the two staff-payroll portal-access role dropdowns
  (`EmployeeForm.jsx`, `ManageAccessModal.jsx`) all updated to match.
- Layout/redirect logic cleaned: `AppContent.jsx`, `ProtectedRoute.jsx`
  (dead fallback branches for the removed roles),
  `PmsLayout.jsx` (`ROLE_NAV_MAP` entries removed).
- **Judgment call, confirmed with user:** `MODULE.PMS_SETTLEMENTS` only
  had EDIT access via Backend Team/Project Coordinator. Reassigned to
  HR so settlements processing wasn't Admin-only. *(Superseded by
  round 3 below — Settlements nav is now hidden entirely, so this
  permission grant is currently dead code. Low-priority cleanup: revert
  it or leave it, doesn't matter functionally since nothing links there.)*
- Verified no seeded/demo users use the removed role strings (clean;
  nothing orphaned).

### 3. Trimmed PA dashboard + removed the generic "approval system"
User directive: **the only approval that should exist is the PO
approving/releasing the project's 5% HR/Core/Admin share** (the
existing `MonthlyPlanPanel.jsx` send/revoke pool-allocation flow).
Everything else approval-shaped was demo scaffolding, not real
functionality:
- `ProjectAssociateDashboard.jsx` (`/pms/pa/dashboard`, the actual
  PA/PO landing page) — removed its own separate widget catalog
  (`EXTRA_WIDGETS`: daily reports, field personnel, settlements,
  projects-by-phase), the "Customize" button, and its
  `pending_approvals` badge.
- `ProjectDetailPage.jsx` — hid the "Approvals" tab (it rendered
  `DEMO_APPROVALS`, hardcoded mock procurement/task-expense approval
  items with Approve/Reject buttons — never wired to a real service).
  Tab content/handlers left in place, just unreachable from nav
  (kept the index-based tab-pane numbering intact instead of
  renumbering — see comment at the tabs array).
- Removed the same `pending_approvals`-driven "N pending" badges/KPIs
  from `ProjectListPage.jsx` and `TeamOverviewPage.jsx` (top KPI strip
  + per-officer card badge) for consistency — they referenced the same
  now-removed approval concept.
- `pms/_nav.jsx` — removed the "Settlements" nav group entirely (last
  remnant after round 2's Backend Team removal).
- `PmsDashboard.jsx` — Settlements was its last widget; catalog is now
  `[]`. **`/pms/dashboard` currently renders as a fully empty page**
  ("0 of 0 widgets active" + empty state). Flagged to user, not yet
  resolved — see Open Items below.

## Verified this session

- `npm run build` — clean, every round.
- `npm run lint` — no *new* errors introduced; repo has a large
  pre-existing baseline of `react-hooks/set-state-in-effect` errors
  (~7988 at session start) in files this session didn't touch — don't
  mistake those for regressions.
- Live browser verification (Playwright via a scratch npm prefix —
  see note below) for every round: dev-login role list, nav contents,
  dashboard widget counts, HR's Settlements access before it was
  hidden, and the project-detail tab list, all confirmed matching the
  intended state via screenshots.

**Environment note:** `npx`/global npm installs are broken in this
environment — the committed `.npmrc` (untracked, pre-existing, not
touched this session) points `prefix` at `~/.npm-global`, which is
missing the `lib/node_modules` subtree. Work around it per-command
with `npm_config_prefix=<scratch-dir-with-lib/node_modules-precreated>`,
or fix `.npmrc` if the user wants that resolved properly — did not
touch it since it predates this session and wasn't part of the ask.

## Open items for next session

1. **`/pms/dashboard` is empty.** PA/PO already default to
   `/pms/pa/dashboard` (see `AppContent.jsx`), so this only surfaces
   for roles without a PA/PO-specific default. Options: build a real
   widget showing PO pool-release status (plan vs. released, the one
   thing that actually matters now per the user), or drop the
   `/pms/dashboard` nav entry/route if it's genuinely unreachable in
   practice.
2. **`PROJECT_TODO.md` P4.1.6 and P4.2.6 are now done in code** (PA→PO
   assignment already existed; budget-%-edit-by-PO gap is fixed; 5%
   share display already existed via the Project Overheads panel) —
   the checklist still shows them ⬜. Not updated this session (out of
   the requested scope), but should be reconciled next time docs are
   touched.
3. **Confirmed dead code, left in place** (matches this repo's
   "hide, don't delete" convention established across all three
   rounds — verify with the user before actually deleting any of it):
   - `src/modules/pms/daily-reports/**` (whole module, ~15 files)
   - 6 dashboard widget components no longer referenced by either
     dashboard: `ProjectKPIsWidget`, `ProjectValueWidget`,
     `DailyReportsSummaryWidget`, `FieldPersonnelWidget`,
     `ProjectsByPhaseWidget`, `RecentProjectsWidget`, `SettlementsWidget`
   - `src/modules/pms/projects/CreateProjectPage.jsx` and
     `ProjectDetailPage.jsx` — confirmed via routes audit to be
     imported in `pms.routes.js` but never wired to an `element:`,
     i.e. dead before this session too, unrelated to ADR-036.
   - `DEMO_APPROVALS` array + Approve/Reject modal logic in
     `ProjectDetailPage.jsx` (tab hidden, code intact).
4. **`MODULE.PMS_SETTLEMENTS` still grants HR edit access** in
   `permissions.js` even though no nav path reaches it anymore
   (only reachable by typing the URL). Harmless but inconsistent;
   clean up if/when Settlements is revisited.
5. `TeamOverviewPage.jsx` and its "Field Personnel" widget on the PA
   dashboard's *built-in* (non-catalog) sections still show domain data
   about project field staff — this is unrelated to the removed
   `ROLE.FIELD_PERSONNEL` login role (naming coincidence, verified no
   `ROLE.*` references in that code) and was intentionally left alone.

## Files touched this session (all under `hma-template/emsv1/src/`)

```
components/AppContent.jsx
components/ProtectedRoute.jsx
constants/modules.js
constants/permissions.js
constants/roles.js
layout/PmsLayout.jsx
modules/ems/_nav.jsx
modules/ems/staff-payroll/EmployeeForm.jsx
modules/ems/staff-payroll/components/ManageAccessModal.jsx
modules/ems/user-management/UserManagementPage.jsx
modules/pms/_nav.jsx
modules/pms/dashboard/PmsDashboard.jsx
modules/pms/project-associate/ProjectAssociateDashboard.jsx
modules/pms/project-associate/ProjectDetailPage.jsx
modules/pms/project-associate/ProjectFormPage.jsx
modules/pms/project-associate/ProjectListPage.jsx
modules/pms/project-associate/TeamOverviewPage.jsx
routes/ems.routes.js
services/auth.js
views/pages/login/Login.jsx
```
