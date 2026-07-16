const BODIES_KEY = 'hma_lsgb_bodies'
const FUNDS_KEY = 'hma_lsgb_fund_withdrawals'
const WORK_ORDERS_KEY = 'hma_lsgb_work_orders'

const read = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]')
  } catch {
    return []
  }
}
const write = (key, data) => localStorage.setItem(key, JSON.stringify(data))
const uid = (p) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
const now = () => new Date().toISOString()

export const BODY_TYPES = [
  'Gram Panchayat',
  'Block Panchayat',
  'District Panchayat',
  'Municipality',
  'Municipal Corporation',
  'Town Panchayat',
]

export const CONTACT_ROLES = ['President', 'Vice President', 'Secretary', 'Assistant Secretary']

export const FUND_PURPOSES = ['Core Expenses', 'HR Expenses', 'Other Operational Expenses']

export const PURPOSE_COLOR = {
  'Core Expenses': 'primary',
  'HR Expenses': 'success',
  'Other Operational Expenses': 'warning',
}

// ── LSGB Work Orders ────────────────────────────────────────────────────────
// One record per individual purchase order / work order dispatched to a
// health centre under an LSGB body — fields sourced from the AFT/Development
// Team tracking sheet ("LSGB projects.csv"). Seeded with 3 real sample rows;
// intentionally not a bulk import of the full sheet.

export const EMPTY_WORK_ORDER = {
  lsgb_body_id: '',
  project_type: 'LSGB',
  customer_code: '',
  so_number: '',
  customer_name: '',
  billing_address: '',
  pincode: '',
  district: '',
  local_body_name: '',
  fy: '',
  po_number: '',
  po_received_date: '',
  qty_small: 0,
  qty_medium: 0,
  qty_large: 0,
  total_qty: 0,
  rate_incl_gst: 0,
  total_amount: 0,
  seal: '',
  tan_no: '',
  contact_name: '',
  contact_designation: '',
  contact_phone: '',
  contact_email: '',
  order_status: '',
  pi_status: '',
  so_status: '',
  handover_status: '',
  dispatch_details: '',
  tentative_dispatch_date: '',
  ref: '',
  shipping_address: '',
  shipping_pincode: '',
  shipping_contact: '',
  payment_status: '',
  payment_utr: '',
  payment_details: '',
  invoice_no: '',
  hma_revenue: 0,
  pre_awareness_status: '',
  pre_awareness_medical_professional: '',
  pre_awareness_conveyance_expense: 0,
  pre_awareness_refreshment_expense: 0,
  pre_awareness_lodging_expense: 0,
  awareness_status: '',
  awareness_sessions_count: 0,
  awareness_person_engaged: '',
  awareness_conveyance_expense: 0,
  awareness_refreshment_expense: 0,
  awareness_printing_expense: 0,
  awareness_postal_expense: 0,
  awareness_misc_expense: 0,
  awareness_lodging_expense: 0,
  completion_date: '',
  completion_report_status: '',
  remarks: '',
  dev_remarks: '',
}

const SEED_WORK_ORDERS = [
  {
    ...EMPTY_WORK_ORDER,
    customer_code: '106175',
    so_number: '61423',
    customer_name: 'PHC East Kallada',
    billing_address: 'Medical Officer, Primary Health Centre East Kallada, Kollam',
    pincode: '691502',
    district: 'Kollam',
    local_body_name: 'East Kallada Grama Panchayat',
    fy: 'Carry Forward 2025-2026',
    po_number: '135/25',
    po_received_date: '2026-05-11',
    qty_small: 120,
    qty_medium: 0,
    qty_large: 250,
    total_qty: 370,
    rate_incl_gst: 281.25,
    total_amount: 104063,
    seal: 'Institutional supply Not for sale',
    tan_no: 'TVDP00986G',
    contact_name: 'Dr. Giron S',
    contact_designation: 'Medical Officer',
    contact_phone: '9526172526',
    contact_email: 'eastkph@gmail.com',
    order_status: 'Received Work Order',
    pi_status: 'Received from AFT',
    so_status: 'Punched',
    handover_status: 'Handover',
    dispatch_details: 'Gati Ltd, LR: 240575700, DT: 13.05.2026',
    shipping_address: 'Medical Officer, Primary Health Centre East Kallada, Kollam',
    shipping_pincode: '691502',
    shipping_contact: '9526172526',
    payment_status: 'received',
    payment_utr: '/XUTR/RBISH00158575331 (₹104063/-) credited on 20.11.2025',
    hma_revenue: 41625,
    awareness_status: 'Will inform',
    dev_remarks: 'Payment against proforma invoice',
  },
  {
    ...EMPTY_WORK_ORDER,
    customer_code: '106833',
    customer_name: 'FHC Pothanicadu',
    billing_address:
      'Medical Officer In Charge, Family Health Centre Pothanicadu, Pothanicadu.P.O, Ernakulam',
    pincode: '686671',
    district: 'Ernakulam',
    local_body_name: 'Pothanicadu Grama Panchayat',
    fy: '2025-26',
    po_received_date: '2026-01-03',
    qty_small: 24,
    qty_medium: 63,
    qty_large: 6,
    total_qty: 93,
    rate_incl_gst: 281.25,
    total_amount: 26157,
    seal: 'Institutional Supply, Not for Sale',
    tan_no: 'CHNG04155E',
    contact_name: 'Lincy',
    contact_designation: 'Medical Officer',
    contact_phone: '9447428339',
    contact_email: 'pothanicadphc@gmail.com',
    order_status: 'Recieved work order',
    so_status: 'Not punched',
    shipping_address:
      'Medical Officer In Charge, Family Health Centre Pothanicadu, Pothanicadu.P.O, Ernakulam',
    shipping_pincode: '686671',
    shipping_contact: '9447428339',
    payment_status: 'not received',
    hma_revenue: 10462.5,
    awareness_status: 'Upcoming',
    dev_remarks: 'Payment  against Proforma Invoice',
    remarks:
      'PI Shared / as on follow up made on 15.06.2026, the medical officer conveyed that the project should be cancelled due to no fund allocation',
  },
  {
    ...EMPTY_WORK_ORDER,
    customer_code: '107568',
    so_number: '61422',
    customer_name: 'Thodupuzha Municipality',
    billing_address:
      'Clean City Manager, Thodupuzha Municipality, Near Police Station, Thodupuzha PO, Idukki',
    pincode: '685584',
    district: 'Idukki',
    local_body_name: 'Thodupuzha Municipality',
    fy: '2025-26',
    po_number: '4514407/2025',
    po_received_date: '2026-05-12',
    qty_small: 80,
    qty_medium: 80,
    qty_large: 55,
    total_qty: 215,
    rate_incl_gst: 281.25,
    total_amount: 60469,
    seal: 'Institutional Supply, Not for Sale',
    tan_no: 'CHNM01621E',
    contact_name: 'Mr. Devasenan',
    contact_designation: 'Health Inspector',
    contact_phone: '9961450915',
    contact_email: 'musectdpa@gmail.com',
    order_status: 'Received Work Order',
    pi_status: 'PAS',
    so_status: 'Punched',
    handover_status: 'Handover',
    dispatch_details: 'Gati Ltd, LR: 240575717, DT: 13.05.2026',
    shipping_address:
      'Clean City Manager, Thodupuzha Municipality, Near Police Station, Thodupuzha PO, Idukki',
    shipping_pincode: '685584',
    shipping_contact: '9961450915',
    payment_status: 'not received',
    hma_revenue: 24187.5,
    awareness_status: 'Completed',
    awareness_sessions_count: 1,
    awareness_person_engaged: 'Dr Navami',
    completion_date: '2026-05-30',
    dev_remarks:
      'Payment after supply (the customer requested dispatch of M-cups with Monocart before 19.05.2026).',
  },
]

export const localLsgb = {
  // ── LSGB Bodies ──────────────────────────────────────────────────────────────

  listBodies(filters = {}) {
    let items = read(BODIES_KEY)
    if (filters.officer_id) items = items.filter((b) => b.officer_id === filters.officer_id)
    if (filters.body_type) items = items.filter((b) => b.body_type === filters.body_type)
    if (filters.search) {
      const q = filters.search.toLowerCase()
      items = items.filter(
        (b) => b.body_name?.toLowerCase().includes(q) || b.body_type?.toLowerCase().includes(q),
      )
    }
    return items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  },

  getBody(id) {
    return read(BODIES_KEY).find((b) => b.id === id) || null
  },

  createBody(data) {
    const bodies = read(BODIES_KEY)
    const record = {
      id: uid('lsgb'),
      officer_id: '',
      project_id: '',
      body_name: '',
      body_type: '',
      sanction_number: '',
      sanction_date: '',
      sanctioned_amount: 0,
      work_order_number: '',
      agreement_date: '',
      validity_period: '',
      office_address: '',
      contact_person: '',
      contact_role: '',
      contact_phone: '',
      ...data,
      created_at: now(),
      updated_at: now(),
    }
    bodies.push(record)
    write(BODIES_KEY, bodies)
    return record
  },

  updateBody(id, data) {
    const bodies = read(BODIES_KEY)
    const idx = bodies.findIndex((b) => b.id === id)
    if (idx === -1) throw new Error('LSGB body not found')
    bodies[idx] = { ...bodies[idx], ...data, updated_at: now() }
    write(BODIES_KEY, bodies)
    return bodies[idx]
  },

  removeBody(id) {
    write(
      BODIES_KEY,
      read(BODIES_KEY).filter((b) => b.id !== id),
    )
    write(
      FUNDS_KEY,
      read(FUNDS_KEY).filter((f) => f.lsgb_body_id !== id),
    )
  },

  // ── Fund Withdrawals ──────────────────────────────────────────────────────────

  listWithdrawals(filters = {}) {
    let items = read(FUNDS_KEY)
    if (filters.lsgb_body_id) items = items.filter((f) => f.lsgb_body_id === filters.lsgb_body_id)
    if (filters.officer_id) items = items.filter((f) => f.officer_id === filters.officer_id)
    if (filters.purpose) items = items.filter((f) => f.purpose === filters.purpose)
    return items.sort((a, b) => new Date(b.withdrawal_date) - new Date(a.withdrawal_date))
  },

  addWithdrawal(data) {
    const items = read(FUNDS_KEY)
    const record = {
      id: uid('lfw'),
      lsgb_body_id: '',
      lsgb_body_name: '',
      officer_id: '',
      project_id: '',
      amount: 0,
      withdrawal_date: now().slice(0, 10),
      purpose: 'Core Expenses',
      description: '',
      ...data,
      created_at: now(),
    }
    items.push(record)
    write(FUNDS_KEY, items)
    return record
  },

  updateWithdrawal(id, data) {
    const items = read(FUNDS_KEY)
    const idx = items.findIndex((f) => f.id === id)
    if (idx === -1) throw new Error('Withdrawal not found')
    items[idx] = { ...items[idx], ...data }
    write(FUNDS_KEY, items)
    return items[idx]
  },

  removeWithdrawal(id) {
    write(
      FUNDS_KEY,
      read(FUNDS_KEY).filter((f) => f.id !== id),
    )
  },

  // ── Work Orders (individual project/PO records) ──────────────────────────────

  seedWorkOrders() {
    if (!localStorage.getItem(WORK_ORDERS_KEY)) {
      write(
        WORK_ORDERS_KEY,
        SEED_WORK_ORDERS.map((wo) => ({
          id: uid('lwo'),
          ...wo,
          created_at: now(),
          updated_at: now(),
        })),
      )
    }
  },

  listWorkOrders(filters = {}) {
    let items = read(WORK_ORDERS_KEY)
    if (filters.lsgb_body_id) items = items.filter((w) => w.lsgb_body_id === filters.lsgb_body_id)
    if (filters.district) items = items.filter((w) => w.district === filters.district)
    if (filters.search) {
      const q = filters.search.toLowerCase()
      items = items.filter(
        (w) =>
          w.customer_name?.toLowerCase().includes(q) ||
          w.local_body_name?.toLowerCase().includes(q) ||
          w.po_number?.toLowerCase().includes(q) ||
          w.district?.toLowerCase().includes(q),
      )
    }
    return items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  },

  getWorkOrder(id) {
    return read(WORK_ORDERS_KEY).find((w) => w.id === id) || null
  },

  createWorkOrder(data) {
    const items = read(WORK_ORDERS_KEY)
    const record = {
      id: uid('lwo'),
      ...EMPTY_WORK_ORDER,
      ...data,
      created_at: now(),
      updated_at: now(),
    }
    items.push(record)
    write(WORK_ORDERS_KEY, items)
    return record
  },

  updateWorkOrder(id, data) {
    const items = read(WORK_ORDERS_KEY)
    const idx = items.findIndex((w) => w.id === id)
    if (idx === -1) throw new Error('Work order not found')
    items[idx] = { ...items[idx], ...data, updated_at: now() }
    write(WORK_ORDERS_KEY, items)
    return items[idx]
  },

  removeWorkOrder(id) {
    write(
      WORK_ORDERS_KEY,
      read(WORK_ORDERS_KEY).filter((w) => w.id !== id),
    )
  },

  // ── Summary ───────────────────────────────────────────────────────────────────

  getSummary() {
    const bodies = read(BODIES_KEY)
    const withdrawals = read(FUNDS_KEY)
    const totalSanctioned = bodies.reduce((s, b) => s + (parseFloat(b.sanctioned_amount) || 0), 0)
    const totalWithdrawn = withdrawals.reduce((s, f) => s + (parseFloat(f.amount) || 0), 0)
    const byPurpose = {}
    withdrawals.forEach((f) => {
      byPurpose[f.purpose] = (byPurpose[f.purpose] || 0) + (parseFloat(f.amount) || 0)
    })
    const byBody = {}
    withdrawals.forEach((f) => {
      if (!byBody[f.lsgb_body_id]) byBody[f.lsgb_body_id] = { name: f.lsgb_body_name, total: 0 }
      byBody[f.lsgb_body_id].total += parseFloat(f.amount) || 0
    })
    return {
      totalBodies: bodies.length,
      totalSanctioned,
      totalWithdrawn,
      remaining: totalSanctioned - totalWithdrawn,
      byPurpose,
      byBody,
    }
  },
}
