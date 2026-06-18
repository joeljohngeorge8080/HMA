// localStorage-based employee store.
// Mirrors the 13-table DB schema in a single embedded document per employee.
// EmployeeList and EmployeeForm fall back to this when the backend API is not reachable.
// Swap out by replacing `localEmployees.*` calls with real API calls once the backend is running.

const KEY = 'hma_employees'

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

const now = () => new Date().toISOString()

const readAll = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

const writeAll = (rows) => {
  localStorage.setItem(KEY, JSON.stringify(rows))
}

export const localEmployees = {
  // ── list ────────────────────────────────────────────────────────────────────
  list({ search = '', status = '', department = '', category = '', page = 1, pageSize = 25 } = {}) {
    let rows = readAll()

    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter(
        (e) =>
          e.employee_id?.toLowerCase().includes(q) || e.employee_name?.toLowerCase().includes(q),
      )
    }
    if (status) rows = rows.filter((e) => e.status === status)
    if (department) rows = rows.filter((e) => e.employment?.department === department)
    if (category) rows = rows.filter((e) => e.employee_category === category)

    const total = rows.length
    const total_pages = Math.max(1, Math.ceil(total / pageSize))
    const start = (page - 1) * pageSize
    return { items: rows.slice(start, start + pageSize), total, total_pages }
  },

  // ── getById ─────────────────────────────────────────────────────────────────
  getById(id) {
    return readAll().find((e) => e.id === id) || null
  },

  // ── create ──────────────────────────────────────────────────────────────────
  create(data) {
    const rows = readAll()

    if (rows.some((e) => e.employee_id === data.employee_id)) {
      throw new Error(`Employee ID "${data.employee_id}" already exists`)
    }

    const ts = now()
    const initialSalary = parseFloat(data.initial_salary) || 0

    const employee = {
      id: uid(),
      employee_id: data.employee_id,
      first_name: data.first_name,
      middle_name: data.middle_name || '',
      last_name: data.last_name,
      employee_name: [data.first_name, data.middle_name, data.last_name].filter(Boolean).join(' '),
      gender: data.gender || '',
      marital_status: data.marital_status || '',
      blood_group: data.blood_group || '',
      date_of_birth: data.date_of_birth || '',
      employee_category: data.employee_category || '',
      status: data.status || 'Active',
      joined_date: data.joined_date || '',
      created_at: ts,
      updated_at: ts,

      // employee_contacts
      contact: {
        personal_email: data.contact?.personal_email || '',
        working_email: data.contact?.working_email || '',
        mobile: data.contact?.mobile || '',
        phone: data.contact?.phone || '',
        emergency_contact: data.contact?.emergency_contact || '',
      },

      // employee_addresses
      address: {
        resident_location: data.address?.resident_location || '',
        present_address: data.address?.present_address || '',
        permanent_address: data.address?.permanent_address || '',
        state: data.address?.state || '',
      },

      // employee_employment
      employment: {
        designation: data.employment?.designation || '',
        department: data.employment?.department || '',
        reporting_to: data.employment?.reporting_to || '',
        employee_category: data.employee_category || '',
        status: data.status || 'Active',
        working_region: data.employment?.working_region || '',
        working_state: data.employment?.working_state || '',
        start_date: data.employment?.start_date || data.joined_date || '',
        end_date: '',
      },

      // employee_identification
      identification: {
        pan_number: data.identification?.pan_number || '',
        aadhar_number: data.identification?.aadhar_number || '',
        passport_number: data.identification?.passport_number || '',
        uan_number: data.identification?.uan_number || '',
        esi_number: data.identification?.esi_number || '',
        pf_number: data.identification?.pf_number || '',
      },

      // employee_bank_accounts
      bank_accounts: (data.bank_accounts || []).map((b) => ({ id: uid(), ...b })),

      // employee_family_members
      family_members: (data.family_members || []).map((f) => ({ id: uid(), ...f })),

      // salary_history (first entry = initial salary)
      salary_history: initialSalary
        ? [
            {
              id: uid(),
              previous_salary: 0,
              increment_percentage: null,
              increment_amount: initialSalary,
              new_salary: initialSalary,
              effective_date: data.joined_date || ts.split('T')[0],
              remarks: 'Initial salary on joining',
              created_at: ts,
            },
          ]
        : [],

      current_salary: initialSalary,

      // profile photo (base64 data URL; S3 URL when backend is live)
      photo_url: data.photo_url || null,

      // employee_documents (uploaded later)
      documents: [],

      // employee_project_assignments (current + history)
      project_assignments: data.initial_project
        ? [
            {
              id: uid(),
              project_name: data.initial_project,
              assigned_date: data.initial_project_date || ts.split('T')[0],
              end_date: null,
              status: 'Active',
              remarks: data.initial_project_remarks || '',
              assigned_by: data.assigned_by || 'HR',
              created_at: ts,
            },
          ]
        : [],

      // employee_status_history
      status_history: [],

      // employee_department_history
      department_history: [],
    }

    writeAll([...rows, employee])
    return employee
  },

  // ── update ──────────────────────────────────────────────────────────────────
  update(id, data) {
    const rows = readAll()
    const idx = rows.findIndex((e) => e.id === id)
    if (idx === -1) throw new Error('Employee not found')

    const old = rows[idx]
    const ts = now()

    // Track department change
    const newDept = data.employment?.department
    const deptHistory =
      newDept && newDept !== old.employment?.department
        ? [
            ...old.department_history,
            {
              id: uid(),
              old_department: old.employment?.department || '',
              new_department: newDept,
              effective_date: ts.split('T')[0],
              remarks: '',
            },
          ]
        : old.department_history

    rows[idx] = {
      ...old,
      ...data,
      employee_name: [
        data.first_name || old.first_name,
        data.middle_name || old.middle_name,
        data.last_name || old.last_name,
      ]
        .filter(Boolean)
        .join(' '),
      employment: { ...(old.employment || {}), ...(data.employment || {}) },
      contact: { ...(old.contact || {}), ...(data.contact || {}) },
      address: { ...(old.address || {}), ...(data.address || {}) },
      identification: { ...(old.identification || {}), ...(data.identification || {}) },
      department_history: deptHistory,
      updated_at: ts,
    }

    writeAll(rows)
    return rows[idx]
  },

  // ── updateStatus ─────────────────────────────────────────────────────────────
  updateStatus(id, { status, exit_date, remarks }) {
    const rows = readAll()
    const idx = rows.findIndex((e) => e.id === id)
    if (idx === -1) throw new Error('Employee not found')

    const old = rows[idx]
    const ts = now()

    rows[idx] = {
      ...old,
      status,
      exit_date: exit_date || old.exit_date || '',
      status_history: [
        ...(old.status_history || []),
        {
          id: uid(),
          old_status: old.status,
          new_status: status,
          remarks: remarks || '',
          changed_at: ts,
        },
      ],
      updated_at: ts,
    }

    writeAll(rows)
    return rows[idx]
  },

  // ── applySalaryIncrement ──────────────────────────────────────────────────────
  applySalaryIncrement(id, { increment_percentage, effective_date, remarks }) {
    const rows = readAll()
    const idx = rows.findIndex((e) => e.id === id)
    if (idx === -1) throw new Error('Employee not found')

    const old = rows[idx]
    const previous = parseFloat(old.current_salary || 0)
    const pct = parseFloat(increment_percentage)
    const amount = (previous * pct) / 100
    const newSal = previous + amount
    const ts = now()

    rows[idx] = {
      ...old,
      current_salary: newSal,
      salary_history: [
        ...(old.salary_history || []),
        {
          id: uid(),
          previous_salary: previous,
          increment_percentage: pct,
          increment_amount: amount,
          new_salary: newSal,
          effective_date,
          remarks: remarks || '',
          created_at: ts,
        },
      ],
      updated_at: ts,
    }

    writeAll(rows)
    return rows[idx]
  },

  // ── addFamilyMember ───────────────────────────────────────────────────────────
  addFamilyMember(employeeId, member) {
    const rows = readAll()
    const idx = rows.findIndex((e) => e.id === employeeId)
    if (idx === -1) throw new Error('Employee not found')
    const entry = { id: uid(), ...member }
    rows[idx] = {
      ...rows[idx],
      family_members: [...(rows[idx].family_members || []), entry],
      updated_at: now(),
    }
    writeAll(rows)
    return entry
  },

  // ── updatePhoto ──────────────────────────────────────────────────────────────
  updatePhoto(id, photoUrl) {
    const rows = readAll()
    const idx = rows.findIndex((e) => e.id === id)
    if (idx === -1) throw new Error('Employee not found')
    rows[idx] = { ...rows[idx], photo_url: photoUrl, updated_at: now() }
    writeAll(rows)
    return rows[idx]
  },

  // ── assignProject ─────────────────────────────────────────────────────────────
  assignProject(id, { project_name, assigned_date, remarks = '', assigned_by = 'HR' }) {
    const rows = readAll()
    const idx = rows.findIndex((e) => e.id === id)
    if (idx === -1) throw new Error('Employee not found')
    const ts = now()
    const today = ts.split('T')[0]
    const prev = rows[idx].project_assignments || []

    // End the current active assignment
    const updated = prev.map((a) =>
      a.status === 'Active' ? { ...a, status: 'Ended', end_date: assigned_date || today } : a,
    )

    const newEntry = {
      id: uid(),
      project_name,
      assigned_date: assigned_date || today,
      end_date: null,
      status: 'Active',
      remarks,
      assigned_by,
      created_at: ts,
    }

    rows[idx] = {
      ...rows[idx],
      project_assignments: [...updated, newEntry],
      updated_at: ts,
    }
    writeAll(rows)
    return rows[idx]
  },

  // ── addBankAccount ────────────────────────────────────────────────────────────
  addBankAccount(employeeId, account) {
    const rows = readAll()
    const idx = rows.findIndex((e) => e.id === employeeId)
    if (idx === -1) throw new Error('Employee not found')
    const entry = { id: uid(), ...account }
    rows[idx] = {
      ...rows[idx],
      bank_accounts: [...(rows[idx].bank_accounts || []), entry],
      updated_at: now(),
    }
    writeAll(rows)
    return entry
  },
}
