# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**HMA IEMS** (HMA Internal Enterprise Management System) is a role-based web application that replaces fragmented Excel workflows with a centralized platform for managing projects, employees, attendance, payroll, expenses, finance, and reporting.

The full specification lives in the numbered markdown files at the root (`01_Project_Overview.md` through `11_Development_Rules.md`). Always read the relevant spec file before implementing a module.

The `git-coreui/` directory contains the CoreUI free React admin template that serves as the frontend base.

---

## Development Approach

Build **module by module**. Validate each module before starting the next. Do not generate the whole project at once. The order is: Auth → Dashboard → Projects → Staff & Payroll → Attendance → Expense Management → Finance → Reports & Analysis → Audit Logs.

---

## Frontend (CoreUI React Template)

**Location:** `git-coreui/coreui-free-react-admin-template/`

```bash
npm install          # Install dependencies
npm start            # Start dev server at http://localhost:3000
npm run build        # Production build
npm run lint         # Run ESLint + Prettier check
npm run serve        # Preview production build
```

**Stack:** React 19, Vite 8, CoreUI React 5.x, React Router 7.x, Redux 5.x, Sass/Bootstrap 5, Chart.js 4.x

**Critical rules for this template:**
- Use **CoreUI React components exclusively** (`@coreui/react`). Never use Tailwind CSS, Material-UI, or other component libraries.
- Use functional components with Hooks only — no class components.
- Prettier formatting: no semicolons, single quotes, 2-space indentation.
- Always add PropTypes for new components.
- Use `React.lazy()` + `<Suspense>` for all route components.

**Adding a new page:**
1. Create component in `src/views/[feature]/ComponentName.js`
2. Add route to `src/routes.js`
3. Add navigation item to `src/_nav.js` (sidebar is role-based — show items conditionally based on user role from Redux store)

**Charts:** Use `@coreui/react-chartjs` (Chart.js wrapper), not Recharts. (Note: `01_Project_Overview.md` lists Recharts but the template uses Chart.js — follow the template.)

**Theme:** Support dark mode via `useColorModes` from `@coreui/react`.

---

## Backend

**Stack:** Python 3.12+, FastAPI, SQLModel (ORM), Pydantic (validation), PostgreSQL via Supabase Pro, JWT authentication

**Backend layers:** API → Service → Data Access → Validation → Audit Logging → Report Generation → Import/Export

**Rules:**
- REST APIs only. JWT for all protected routes. Employee ID is the login username.
- Put business logic in the service layer, not in route handlers.
- Use SQLModel models for DB schema and Pydantic schemas for API I/O.
- Every module must remain independently testable.
- Google OAuth is explicitly out of scope.

**API base routes** (see `08_API_Requirements.md` for full list):
`/auth`, `/dashboard`, `/employees`, `/projects`, `/attendance`, `/payroll`, `/expenses`, `/finance`, `/reports`, `/audit-logs`, `/settings`

---

## Database

PostgreSQL on Supabase Pro. Use SQLModel ORM.

**Immutability rules (critical):**
- Never overwrite historical records. Create new history entries instead.
- Audit logs (`audit_logs` table) must never be deleted or updated by any code path.
- Completed projects become read-only.
- Payroll is locked after generation; overrides require a `payroll_history` entry.
- Attendance is locked after upload; corrections go to `attendance_corrections`, not the original row.
- Project value is fixed at creation and must never be modified.

**History tables exist for:** `employee_salary_history`, `project_officer_history`, `project_expense_history`, `attendance_corrections`, `payroll_history`, `finance_file_history`

Every record must have `created_at` / `updated_at` timestamps. Use soft deletes (`is_deleted`) not hard deletes for expenses and project expenses.

---

## Authentication & RBAC

Five roles: **CEO**, **Heads**, **HR**, **Finance**, **Project Officer**

| Module              | CEO | Heads | HR | Finance | Project Officer |
|---------------------|-----|-------|----|---------|-----------------|
| Dashboard           | V   | V     | V  | V       | V               |
| Projects            | V   | V     | V  | V       | E               |
| Project Expenses    | V   | V     | V  | E       | E               |
| Staff & Payroll     | V   | V     | E  | V       | —               |
| Attendance          | V   | V     | E  | V       | —               |
| Expense Management  | V   | V     | E  | V       | —               |
| Finance             | V   | V     | V  | E       | —               |
| Reports & Analysis  | V   | V     | V  | V       | V               |
| Audit Logs          | V   | V     | V  | V       | V               |

(V = View, E = Edit/Create/Update, — = No Access)

Only HR can reset passwords. Users are created manually by system administrators.

---

## Key Business Rules

**Attendance:**
- Work week: Mon–Sat (2nd and 4th Saturdays are holidays). Hours: 09:15–17:45.
- 7 free late-entry units/month (1 unit = 15 min). Beyond that: hourly salary deduction (`monthly_salary / days_in_month / 8`).
- Arriving >1 hour late → marked Half Day (4-hour deduction).
- Annual leave: 12 casual days (1/month), 8 sick days. Neither carries forward.

**Payroll:**
- Generated monthly by HR. Locked after generation.
- Every salary increment creates a `employee_salary_history` entry; never mutate `current_salary` without it.

**Projects:**
- Categories: CSR, LSGB, Other (Other requires a custom name field).
- Statuses: Draft → Active → Completed / Archived / Cancelled.
- Project value is immutable after creation. Project Officer can be reassigned (log to `project_officer_history`).

**Audit Logs:**
Every create, update, delete, correction, login, and override must write to `audit_logs` with: `user_id`, `role`, `module_name`, `action_type`, `record_id`, `old_value`, `new_value`, `remarks`, `ip_address`, `created_at`.

---

## File Storage & External Services

- **AWS S3:** Employee documents, expense uploads, finance uploads, report exports
- **AWS SES:** Monthly report emails, future notifications
- **Infrastructure:** AWS EC2, Route53, Certificate Manager, CloudWatch
- **CI/CD:** GitHub Actions → AWS ECR → EC2 (Docker containers)

---

## Forecasting / ML

The EMS **consumes** forecast output — it does not run ML models itself. The ML team provides predicted values; the backend stores them in the `forecasts` table and the frontend displays them in Reports & Analysis (line charts, variance charts, summary tables). See `09_ML_Requirements.md`.

---

## Commit Convention

```
feat:     New feature
fix:      Bug fix
docs:     Documentation
style:    Formatting only
refactor: Code restructure without behavior change
test:     Tests
chore:    Maintenance
```
