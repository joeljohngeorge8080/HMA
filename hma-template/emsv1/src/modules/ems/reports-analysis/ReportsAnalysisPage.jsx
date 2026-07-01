/**
 * Reports & Analysis — dual-mode dashboard
 *
 * Top-level section switcher:
 *   ① HR Dashboard   — headcount KPIs, department breakdown, attendance trend,
 *                       payroll summary, gender split, employment type donut
 *   ② Projects SDP   — Power BI-style projects overview (existing dashboard)
 */

import React, { useState, useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

Chart.register(...registerables)

// ─── Shared helpers ───────────────────────────────────────────────────────────

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(n)

const fmtCompact = (n) =>
  new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(n)

// ═══════════════════════════════════════════════════════════════════════════════
// ─── PROJECT SDP DATA ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

const ALL_PROJECTS = [
  { id: 1,  name: 'Supply of Biomedical Equipment to PHCs',       type: 'Consultancy Project',  status: 'Ongoing',   fundingAgency: 'IOCL Kochi',             implementingPartner: 'HMA', value: 3200000, beneficiaries: 12000, location: { lat: 9.9312,  lng: 76.2673, label: 'Kochi' } },
  { id: 2,  name: 'Supply of Van (KSBT) for Mobile Medical Unit', type: 'Consultancy Project',  status: 'Ongoing',   fundingAgency: 'ALIMCO',                 implementingPartner: 'HCS', value: 2850000, beneficiaries: 8500,  location: { lat: 25.3176, lng: 82.9739, label: 'Varanasi' } },
  { id: 3,  name: 'Project Poshan – District Level',              type: 'Other Public Health',  status: 'Ongoing',   fundingAgency: 'CPCL',                   implementingPartner: 'H&ND', value: 1800000, beneficiaries: 5200, location: { lat: 13.0827, lng: 80.2707, label: 'Chennai' } },
  { id: 4,  name: 'Providing Health Care Services – Rural',       type: 'Other Public Health',  status: 'Ongoing',   fundingAgency: 'HLL',                    implementingPartner: 'HCD', value: 1456356, beneficiaries: 4100,  location: { lat: 28.6139, lng: 77.2090, label: 'Delhi' } },
  { id: 5,  name: 'Navajeevana – Inclusive Health Initiative',    type: 'Consultancy Project',  status: 'Ongoing',   fundingAgency: 'IOCL ERPL Kolkata',      implementingPartner: 'SPD', value: 1272000, beneficiaries: 3800,  location: { lat: 22.5726, lng: 88.3639, label: 'Kolkata' } },
  { id: 6,  name: 'CPCL Nilgiris Community Health',               type: 'Consultancy Project',  status: 'Ongoing',   fundingAgency: 'CPCL',                   implementingPartner: 'HMA', value: 2720000, beneficiaries: 6700,  location: { lat: 11.4064, lng: 76.6932, label: 'Nilgiris' } },
  { id: 7,  name: 'Promoting Menstrual Hygiene – District',       type: 'M Cup Project – CSR', status: 'Ongoing',   fundingAgency: 'IOCL SERP Bhubaneswar',  implementingPartner: 'HMA', value: 2519529, beneficiaries: 9200,  location: { lat: 20.2961, lng: 85.8245, label: 'Bhubaneswar' } },
  { id: 8,  name: 'Skill Advancement Training Program',           type: 'Other Public Health',  status: 'Ongoing',   fundingAgency: 'IREDA',                  implementingPartner: 'HCD', value: 2000000, beneficiaries: 3400,  location: { lat: 26.8467, lng: 80.9462, label: 'Lucknow' } },
  { id: 9,  name: 'Powergrid – Awareness & Livelihood',           type: 'Other Public Health',  status: 'Ongoing',   fundingAgency: 'Powergrid',              implementingPartner: 'H&ND', value: 1850100, beneficiaries: 2800, location: { lat: 17.3850, lng: 78.4867, label: 'Hyderabad' } },
  { id: 10, name: 'Providing Healthcare – Urban Slums',           type: 'Other Public Health',  status: 'Ongoing',   fundingAgency: 'Terumo F.',              implementingPartner: 'HCS', value: 1456356, beneficiaries: 5600,  location: { lat: 19.0760, lng: 72.8777, label: 'Mumbai' } },
  { id: 11, name: 'TB Nutrition Kit Project – Phase II',          type: 'Consultancy Project',  status: 'Ongoing',   fundingAgency: 'IOCL SERP Bhubaneswar',  implementingPartner: 'SPD', value: 1272000, beneficiaries: 1900,  location: { lat: 20.2961, lng: 85.8245, label: 'Bhubaneswar' } },
  { id: 12, name: 'Terumo Penpol – School Health Drive',          type: 'Other Public Health',  status: 'Ongoing',   fundingAgency: 'Terumo F.',              implementingPartner: 'HCS', value: 1260000, beneficiaries: 7800,  location: { lat: 8.5241,  lng: 76.9366, label: 'Trivandrum' } },
  { id: 13, name: 'HLL Beed – Thinkal Maternal Health',           type: 'Consultancy Project',  status: 'Ongoing',   fundingAgency: 'HLL',                    implementingPartner: 'HCD', value: 1000000, beneficiaries: 2300,  location: { lat: 18.9876, lng: 75.7597, label: 'Beed' } },
  { id: 14, name: 'Aksharam – Smart Anganwadi Initiative',        type: 'Other Public Health',  status: 'Approved',  fundingAgency: 'ALIMCO',                 implementingPartner: 'HMA', value: 1000000, beneficiaries: 4400,  location: { lat: 12.9716, lng: 77.5946, label: 'Bangalore' } },
  { id: 15, name: 'TB Mukt Bharat Abhiyan',                       type: 'Other Public Health',  status: 'Approved',  fundingAgency: 'ALIMCO',                 implementingPartner: 'H&ND', value: 1000000, beneficiaries: 3100, location: { lat: 23.2599, lng: 77.4126, label: 'Bhopal' } },
  { id: 16, name: 'Education Support – Tribal Districts',         type: 'Other Public Health',  status: 'Completed', fundingAgency: 'CPCL',                   implementingPartner: 'SPD', value: 212625,  beneficiaries: 1500,  location: { lat: 23.6102, lng: 85.2799, label: 'Ranchi' } },
]

const STATUSES        = ['Ongoing', 'Approved', 'Completed']
const TYPES           = ['Consultancy Project', 'M Cup Project – CSR', 'Other Public Health']
const FUNDING_AGENCIES = ['HLL', 'IOCL Kochi', 'ALIMCO', 'CPCL', 'IOCL ERPL Kolkata', 'IOCL SERP Bhubaneswar', 'IREDA', 'Powergrid', 'Terumo F.']
const IMPLEMENTING_PARTNERS = ['H&ND', 'HCD', 'HCS', 'HMA', 'SPD']

const STATUS_COLORS = { Ongoing: '#1e40af', Approved: '#7c3aed', Completed: '#059669' }

// ═══════════════════════════════════════════════════════════════════════════════
// ─── HR DEMO DATA ─────────────────────────────────────════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════

const HR_DEPARTMENTS = [
  { name: 'Field Operations', headcount: 42, male: 28, female: 14 },
  { name: 'Programme',        headcount: 18, male: 10, female: 8  },
  { name: 'Finance',          headcount: 11, male: 6,  female: 5  },
  { name: 'Admin & HR',       headcount: 9,  male: 4,  female: 5  },
  { name: 'IT & Data',        headcount: 6,  male: 5,  female: 1  },
  { name: 'Communications',   headcount: 5,  male: 2,  female: 3  },
  { name: 'M&E',              headcount: 4,  male: 2,  female: 2  },
]

const HR_ATTENDANCE_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
const HR_ATTENDANCE = {
  present: [88, 85, 90, 87, 82, 91],
  absent:  [7,  9,  6,  8,  11, 6 ],
  leave:   [5,  6,  4,  5,  7,  3 ],
}

const HR_PAYROLL_MONTHS   = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
const HR_PAYROLL_TOTALS   = [1820000, 1850000, 1900000, 1880000, 1920000, 1960000]

const HR_EMPLOYMENT_TYPES = { 'Full-time': 58, 'Part-time': 12, 'Contract': 15, 'Intern': 10 }
const HR_EMPLOYMENT_COLORS = ['#1e40af', '#0891b2', '#7c3aed', '#059669']

// ═══════════════════════════════════════════════════════════════════════════════
// ─── SHARED UI COMPONENTS ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/** KPI card (used by both sections) */
const KpiCard = ({ label, value, sub, accent = '#1e40af', icon }) => (
  <div style={{ ...S.kpiCard, borderColor: accent }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ ...S.kpiLabel, color: accent }}>{label}</div>
      {icon && <span style={{ fontSize: 18, opacity: 0.6 }}>{icon}</span>}
    </div>
    <div style={S.kpiValue}>{value}</div>
    {sub && <div style={S.kpiSub}>{sub}</div>}
  </div>
)

/** Card shell used by chart panels */
const ChartCard = ({ title, children, bodyStyle = {} }) => (
  <div style={S.chartCard}>
    <div style={S.chartCardHeader}>{title}</div>
    <div style={{ padding: '10px 12px', ...bodyStyle }}>{children}</div>
  </div>
)

/** Filter checkbox panel */
const FilterPanel = ({ title, items, selected, onToggle, onSelectAll }) => (
  <div style={S.chartCard}>
    <div style={S.chartCardHeader}>{title}</div>
    <div style={{ padding: '8px 12px' }}>
      <div style={{ cursor: 'pointer', marginBottom: 6, fontSize: 12, color: '#1e40af', fontWeight: 600 }} onClick={onSelectAll}>
        Select all
      </div>
      <div style={{ maxHeight: 150, overflowY: 'auto' }}>
        {items.map((item) => (
          <div key={item} style={{ display: 'flex', alignItems: 'center', padding: '3px 0' }}>
            <input
              type="checkbox"
              id={`f-${title}-${item}`}
              checked={selected.includes(item)}
              onChange={() => onToggle(item)}
              style={{ marginRight: 6, cursor: 'pointer', accentColor: '#1e40af' }}
            />
            <label htmlFor={`f-${title}-${item}`} style={{ fontSize: 12, cursor: 'pointer', color: '#374151' }}>
              {item.length > 20 ? item.slice(0, 20) + '…' : item}
            </label>
          </div>
        ))}
      </div>
    </div>
  </div>
)

// ═══════════════════════════════════════════════════════════════════════════════
// ─── CHART COMPONENTS ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/** Re-usable hook to destroy previous chart instance */
const useChart = (ref, builder, deps) => {
  const instance = useRef(null)
  useEffect(() => {
    if (!ref.current) return
    if (instance.current) instance.current.destroy()
    instance.current = builder(ref.current)
    return () => { if (instance.current) instance.current.destroy() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

/** Status donut */
const StatusDonut = ({ data }) => {
  const ref = useRef(null)
  useChart(ref, (canvas) => new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: Object.keys(data),
      datasets: [{ data: Object.values(data), backgroundColor: Object.keys(data).map(l => STATUS_COLORS[l] || '#6b7280'), borderWidth: 2, borderColor: '#fff', hoverOffset: 6 }],
    },
    options: { responsive: true, cutout: '60%', plugins: { legend: { position: 'right', labels: { boxWidth: 12, padding: 8, font: { size: 11 } } }, tooltip: { callbacks: { label: (c) => ` ${c.label}: ${c.parsed}` } } } },
  }), [JSON.stringify(data)])
  return <canvas ref={ref} height={160} />
}

/** Horizontal bar – project value */
const ValueBar = ({ data }) => {
  const ref = useRef(null)
  const sorted = [...data].sort((a, b) => b.value - a.value).slice(0, 12)
  useChart(ref, (canvas) => new Chart(canvas, {
    type: 'bar',
    data: {
      labels: sorted.map(p => p.name.length > 28 ? p.name.slice(0, 28) + '…' : p.name),
      datasets: [{ data: sorted.map(p => p.value), backgroundColor: '#3b82f6', borderRadius: 3, barThickness: 14 }],
    },
    options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ₹${fmt(c.parsed.x)}` } } }, scales: { x: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 }, callback: v => fmtCompact(v) } }, y: { grid: { display: false }, ticks: { font: { size: 10 } } } } },
  }), [sorted.map(p => p.id).join()])
  return <canvas ref={ref} />
}

/** Vertical bar – funding agency */
const FundingBar = ({ data }) => {
  const ref = useRef(null)
  useChart(ref, (canvas) => new Chart(canvas, {
    type: 'bar',
    data: {
      labels: Object.keys(data),
      datasets: [{ label: 'Projects', data: Object.values(data), backgroundColor: '#3b82f6', borderRadius: 4, barThickness: 28 }],
    },
    options: { responsive: true, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${c.parsed.y} project${c.parsed.y !== 1 ? 's' : ''}` } } }, scales: { y: { grid: { color: '#f1f5f9' }, ticks: { stepSize: 1, font: { size: 11 } }, title: { display: true, text: 'Count', font: { size: 11 }, color: '#6b7280' } }, x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 30 }, title: { display: true, text: 'Funding Agency', font: { size: 11 }, color: '#6b7280' } } } },
  }), [JSON.stringify(data)])
  return <canvas ref={ref} height={180} />
}

/** Real Leaflet map */
const IndiaMap = ({ projects }) => {
  const popupStyle = { fontSize: 12, lineHeight: 1.5, minWidth: 160 }
  return (
    <div style={{ width: '100%', height: '100%', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
      <MapContainer center={[22.5, 80.5]} zoom={4} style={{ width: '100%', height: '100%' }} scrollWheelZoom={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
        {projects.map(p => (
          <CircleMarker key={p.id} center={[p.location.lat, p.location.lng]} radius={10} pathOptions={{ fillColor: STATUS_COLORS[p.status] || '#3b82f6', fillOpacity: 0.88, color: '#fff', weight: 2 }}>
            <Popup>
              <div style={popupStyle}>
                <div style={{ fontWeight: 700, marginBottom: 4, color: '#1e40af' }}>{p.location.label}</div>
                <div style={{ marginBottom: 2 }}>{p.name}</div>
                <div style={{ marginTop: 4 }}>
                  <span style={{ background: STATUS_COLORS[p.status], color: '#fff', borderRadius: 10, padding: '1px 8px', fontSize: 11, fontWeight: 600 }}>{p.status}</span>
                </div>
                <div style={{ marginTop: 4, color: '#64748b', fontSize: 11 }}>
                  <div>Funding: {p.fundingAgency}</div>
                  <div>Value: ₹{p.value.toLocaleString('en-IN')}</div>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      <div style={{ position: 'absolute', bottom: 28, left: 8, background: 'rgba(255,255,255,0.92)', borderRadius: 6, padding: '5px 10px', fontSize: 11, zIndex: 1000, boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}>
        {Object.entries(STATUS_COLORS).map(([s, c]) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: c, border: '1.5px solid #fff' }} />
            <span style={{ fontWeight: 500 }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── HR CHART COMPONENTS ──────────────────────────────────────────────────────

/** Grouped bar – department headcount by gender */
const DeptBar = () => {
  const ref = useRef(null)
  useChart(ref, (canvas) => new Chart(canvas, {
    type: 'bar',
    data: {
      labels: HR_DEPARTMENTS.map(d => d.name),
      datasets: [
        { label: 'Male',   data: HR_DEPARTMENTS.map(d => d.male),   backgroundColor: '#3b82f6', borderRadius: 4, barThickness: 16 },
        { label: 'Female', data: HR_DEPARTMENTS.map(d => d.female), backgroundColor: '#ec4899', borderRadius: 4, barThickness: 16 },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 25 } },
        y: { grid: { color: '#f1f5f9' }, ticks: { stepSize: 5, font: { size: 11 } }, title: { display: true, text: 'Headcount', font: { size: 11 }, color: '#6b7280' } },
      },
    },
  }), [])
  return <canvas ref={ref} height={200} />
}

/** Stacked area line – attendance trend */
const AttendanceTrend = () => {
  const ref = useRef(null)
  useChart(ref, (canvas) => new Chart(canvas, {
    type: 'line',
    data: {
      labels: HR_ATTENDANCE_MONTHS,
      datasets: [
        { label: 'Present %', data: HR_ATTENDANCE.present, borderColor: '#059669', backgroundColor: 'rgba(5,150,105,0.08)', fill: true, tension: 0.4, pointRadius: 4, borderWidth: 2 },
        { label: 'Absent %',  data: HR_ATTENDANCE.absent,  borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)',  fill: true, tension: 0.4, pointRadius: 4, borderWidth: 2 },
        { label: 'On Leave %',data: HR_ATTENDANCE.leave,   borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.08)',  fill: true, tension: 0.4, pointRadius: 4, borderWidth: 2 },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } } },
      scales: {
        y: { grid: { color: '#f1f5f9' }, ticks: { callback: v => v + '%', font: { size: 11 } }, min: 0, max: 100 },
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
      },
    },
  }), [])
  return <canvas ref={ref} height={180} />
}

/** Bar – monthly payroll */
const PayrollBar = () => {
  const ref = useRef(null)
  useChart(ref, (canvas) => new Chart(canvas, {
    type: 'bar',
    data: {
      labels: HR_PAYROLL_MONTHS,
      datasets: [{ label: 'Payroll (₹)', data: HR_PAYROLL_TOTALS, backgroundColor: '#6366f1', borderRadius: 5, barThickness: 32 }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ₹${fmtCompact(c.parsed.y)}` } } },
      scales: {
        y: { grid: { color: '#f1f5f9' }, ticks: { callback: v => '₹' + fmtCompact(v), font: { size: 11 } } },
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
      },
    },
  }), [])
  return <canvas ref={ref} height={180} />
}

/** Doughnut – employment type */
const EmploymentDonut = () => {
  const ref = useRef(null)
  useChart(ref, (canvas) => new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: Object.keys(HR_EMPLOYMENT_TYPES),
      datasets: [{ data: Object.values(HR_EMPLOYMENT_TYPES), backgroundColor: HR_EMPLOYMENT_COLORS, borderWidth: 2, borderColor: '#fff', hoverOffset: 6 }],
    },
    options: { responsive: true, cutout: '62%', plugins: { legend: { position: 'right', labels: { boxWidth: 12, padding: 10, font: { size: 11 } } } } },
  }), [])
  return <canvas ref={ref} height={160} />
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── STYLES ───────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

const S = {
  page: { fontFamily: "'Inter', -apple-system, sans-serif", background: '#f0f4f8', minHeight: '100vh', padding: '0 0 40px' },

  /* ── Section switcher ── */
  switcherWrap: { background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 12 },
  switcherLabel: { fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginRight: 4 },
  switcherBtn: (active, color) => ({
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '9px 20px',
    borderRadius: 8,
    border: `2px solid ${active ? color : '#e2e8f0'}`,
    background: active ? color : '#fff',
    color: active ? '#fff' : '#374151',
    fontWeight: 700, fontSize: 13, cursor: 'pointer',
    boxShadow: active ? `0 4px 14px ${color}55` : 'none',
    transition: 'all 0.2s',
  }),

  /* ── Shared card atoms ── */
  kpiCard: { background: '#fff', border: '2px solid #1e40af', borderRadius: 8, padding: '12px 14px', minWidth: 0 },
  kpiLabel: { fontSize: 11, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  kpiValue: { fontSize: 20, fontWeight: 800, color: '#0f172a', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  kpiSub:   { fontSize: 10, color: '#64748b', marginTop: 2 },
  chartCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  chartCardHeader: { background: '#1e40af', color: '#fff', padding: '8px 12px', fontSize: 12, fontWeight: 700, textAlign: 'center', letterSpacing: 0.3, textTransform: 'uppercase' },

  /* ── Page header ── */
  header: { background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 60%, #2563eb 100%)', color: '#fff', padding: '18px 28px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 12px rgba(30,64,175,0.25)' },
  headerTitle: { fontSize: 22, fontWeight: 700, letterSpacing: 0.5, margin: 0 },

  /* ── PBI sub-tabs ── */
  tabBar: { background: '#f8fafc', borderBottom: '2px solid #e2e8f0', display: 'flex', padding: '0 20px' },
  tab: (active) => ({ padding: '10px 20px', fontSize: 13, fontWeight: active ? 700 : 500, color: active ? '#1e40af' : '#64748b', borderBottom: active ? '3px solid #1e40af' : '3px solid transparent', cursor: 'pointer', background: 'none', border: 'none', outline: 'none', transition: 'color 0.15s' }),

  /* ── Layout grids ── */
  body: { padding: '16px 20px' },
  kpiRow6: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 14 },
  kpiRow4: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 },
  mainGrid: { display: 'grid', gridTemplateColumns: '220px 1fr 1fr 1fr', gap: 12, marginBottom: 12 },
  bottomGrid: { display: 'grid', gridTemplateColumns: '200px 200px 1fr', gap: 12 },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 },
  threeCol: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 },
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── HR DASHBOARD SECTION ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

const totalHeadcount  = HR_DEPARTMENTS.reduce((s, d) => s + d.headcount, 0)
const totalMale       = HR_DEPARTMENTS.reduce((s, d) => s + d.male, 0)
const totalFemale     = HR_DEPARTMENTS.reduce((s, d) => s + d.female, 0)
const avgAttendance   = Math.round(HR_ATTENDANCE.present.reduce((s, v) => s + v, 0) / HR_ATTENDANCE.present.length)
const latestPayroll   = HR_PAYROLL_TOTALS[HR_PAYROLL_TOTALS.length - 1]

const HRDashboard = () => (
  <>
    {/* KPI row */}
    <div style={S.kpiRow4}>
      <KpiCard label="Total Employees" value={totalHeadcount}    icon="👥" accent="#1e40af" />
      <KpiCard label="Avg Attendance"  value={`${avgAttendance}%`} icon="📅" accent="#059669" />
      <KpiCard label="Monthly Payroll" value={`₹${fmtCompact(latestPayroll)}`} sub={`₹${fmt(latestPayroll)}`} icon="💰" accent="#6366f1" />
      <KpiCard label="Gender Split"    value={`${totalMale}M / ${totalFemale}F`} icon="⚖️" accent="#0891b2" />
    </div>

    {/* Row 1: Dept bar + Employment type donut */}
    <div style={S.twoCol}>
      <ChartCard title="Headcount by Department & Gender">
        <DeptBar />
      </ChartCard>
      <ChartCard title="Employment Type Breakdown">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <EmploymentDonut />
          {/* Totals under donut */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 8 }}>
            {Object.entries(HR_EMPLOYMENT_TYPES).map(([type, count], i) => (
              <div key={type} style={{ background: HR_EMPLOYMENT_COLORS[i] + '15', borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: HR_EMPLOYMENT_COLORS[i] }}>{count}</div>
                <div style={{ fontSize: 10, color: '#64748b' }}>{type}</div>
              </div>
            ))}
          </div>
        </div>
      </ChartCard>
    </div>

    {/* Row 2: Attendance trend + Payroll bar */}
    <div style={S.twoCol}>
      <ChartCard title="Attendance Trend (%) — Last 6 Months">
        <AttendanceTrend />
      </ChartCard>
      <ChartCard title="Monthly Payroll Outflow — Last 6 Months">
        <PayrollBar />
      </ChartCard>
    </div>

    {/* Row 3: Department detail table */}
    <ChartCard title="Department Summary">
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Department', 'Total', 'Male', 'Female', 'Gender Ratio', 'Share'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#374151', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HR_DEPARTMENTS.map((d, i) => {
              const pct = Math.round((d.headcount / totalHeadcount) * 100)
              return (
                <tr key={d.name} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: '#1e40af' }}>{d.name}</td>
                  <td style={{ padding: '8px 12px', fontWeight: 700 }}>{d.headcount}</td>
                  <td style={{ padding: '8px 12px', color: '#3b82f6' }}>{d.male}</td>
                  <td style={{ padding: '8px 12px', color: '#ec4899' }}>{d.female}</td>
                  <td style={{ padding: '8px 12px', color: '#64748b' }}>{d.male}:{d.female}</td>
                  <td style={{ padding: '8px 12px', minWidth: 140 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 3 }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: '#1e40af', borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 11, color: '#64748b', minWidth: 28 }}>{pct}%</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: '#1e40af', color: '#fff' }}>
              <td style={{ padding: '8px 12px', fontWeight: 700 }}>Total</td>
              <td style={{ padding: '8px 12px', fontWeight: 700 }}>{totalHeadcount}</td>
              <td style={{ padding: '8px 12px', fontWeight: 700 }}>{totalMale}</td>
              <td style={{ padding: '8px 12px', fontWeight: 700 }}>{totalFemale}</td>
              <td style={{ padding: '8px 12px', fontWeight: 700 }}>{totalMale}:{totalFemale}</td>
              <td style={{ padding: '8px 12px', fontWeight: 700 }}>100%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </ChartCard>
  </>
)

// ═══════════════════════════════════════════════════════════════════════════════
// ─── PROJECTS SDP SECTION ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

const SDP_TABS = ['Overview', 'Milestone', 'Finance', 'LSGB']

const ProjectsSDP = () => {
  const [activeTab, setActiveTab]       = useState('Overview')
  const [selectedTypes, setSelectedTypes]       = useState([...TYPES])
  const [selectedFunding, setSelectedFunding]   = useState([...FUNDING_AGENCIES])
  const [selectedPartners, setSelectedPartners] = useState([...IMPLEMENTING_PARTNERS])

  const toggle = (list, setList, item) =>
    setList(prev => prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item])

  const filtered = ALL_PROJECTS.filter(p =>
    selectedTypes.includes(p.type) &&
    selectedFunding.includes(p.fundingAgency) &&
    selectedPartners.includes(p.implementingPartner)
  )

  const totalProjects     = filtered.length
  const totalValue        = filtered.reduce((s, p) => s + p.value, 0)
  const totalBeneficiaries= filtered.reduce((s, p) => s + p.beneficiaries, 0)
  const completed         = filtered.filter(p => p.status === 'Completed').length
  const ongoing           = filtered.filter(p => p.status === 'Ongoing').length
  const approved          = filtered.filter(p => p.status === 'Approved').length

  const statusData = { Ongoing: ongoing, Approved: approved, Completed: completed }

  const fundingCount = {}
  filtered.forEach(p => { fundingCount[p.fundingAgency] = (fundingCount[p.fundingAgency] || 0) + 1 })

  return (
    <>
      {/* PBI sub-tabs */}
      <div style={S.tabBar}>
        {SDP_TABS.map(tab => (
          <button key={tab} style={S.tab(tab === activeTab)} onClick={() => setActiveTab(tab)}>{tab}</button>
        ))}
      </div>

      <div style={S.body}>
        {activeTab === 'Overview' ? (
          <>
            {/* KPI row */}
            <div style={S.kpiRow6}>
              <KpiCard label="Total Projects"        value={totalProjects} />
              <KpiCard label="Total Project Value"   value={`₹${fmtCompact(totalValue)}`}             sub={`₹${fmt(totalValue)}`} />
              <KpiCard label="Total Beneficiaries"   value={totalBeneficiaries.toLocaleString('en-IN')} />
              <KpiCard label="Completed Projects"    value={completed} />
              <KpiCard label="Ongoing Projects"      value={ongoing} />
              <KpiCard label="Approved Projects"     value={approved} />
            </div>

            {/* Main grid */}
            <div style={S.mainGrid}>
              <FilterPanel title="Project Type"        items={TYPES}               selected={selectedTypes}    onToggle={i => toggle(selectedTypes, setSelectedTypes, i)}       onSelectAll={() => setSelectedTypes([...TYPES])} />
              <ChartCard title="Project by Status"     bodyStyle={{ minHeight: 200, display: 'flex', alignItems: 'center' }}><StatusDonut key={JSON.stringify(statusData)} data={statusData} /></ChartCard>
              <div style={S.chartCard}>
                <div style={S.chartCardHeader}>Project Location</div>
                <div style={{ padding: 0, height: 260 }}><IndiaMap projects={filtered} /></div>
              </div>
              <ChartCard title="Project by Value"      bodyStyle={{ overflowY: 'auto', maxHeight: 240 }}><ValueBar key={filtered.map(p => p.id).join()} data={filtered} /></ChartCard>
            </div>

            {/* Bottom grid */}
            <div style={S.bottomGrid}>
              <FilterPanel title="Funding Agency"        items={FUNDING_AGENCIES}        selected={selectedFunding}  onToggle={i => toggle(selectedFunding, setSelectedFunding, i)}   onSelectAll={() => setSelectedFunding([...FUNDING_AGENCIES])} />
              <FilterPanel title="Implementing Partner"  items={IMPLEMENTING_PARTNERS}   selected={selectedPartners} onToggle={i => toggle(selectedPartners, setSelectedPartners, i)} onSelectAll={() => setSelectedPartners([...IMPLEMENTING_PARTNERS])} />
              <ChartCard title="Project by Funding Agency"><FundingBar key={JSON.stringify(fundingCount)} data={fundingCount} /></ChartCard>
            </div>
          </>
        ) : (
          <div style={{ background: '#fff', borderRadius: 10, padding: 48, textAlign: 'center', border: '2px dashed #e2e8f0', marginTop: 16 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#64748b' }}>{activeTab} View</div>
            <div style={{ fontSize: 13, marginTop: 4, color: '#94a3b8' }}>This section is under development.</div>
          </div>
        )}
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── ROOT PAGE COMPONENT ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

const SECTIONS = [
  { id: 'hr',  label: 'HR Dashboard',   icon: '👥', color: '#1e40af', sub: 'People & Payroll Analytics' },
  { id: 'sdp', label: 'Projects SDP',   icon: '📊', color: '#7c3aed', sub: 'SDP Projects Overview' },
]

const ReportsAnalysisPage = () => {
  const [section, setSection] = useState('hr')

  const active = SECTIONS.find(s => s.id === section)

  return (
    <div style={S.page}>
      {/* Page header */}
      <div style={{ ...S.header, background: `linear-gradient(135deg, ${active.color}ee 0%, ${active.color} 100%)` }}>
        <div>
          <h1 style={S.headerTitle}>
            {active.icon} {active.sub}
          </h1>
          <p style={{ margin: 0, fontSize: 12, opacity: 0.8, marginTop: 2 }}>
            Reports &amp; Analysis · HMA IEMS
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, opacity: 0.8 }}>
            {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
          <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>
            LIVE
          </div>
        </div>
      </div>

      {/* ── Section Switcher ── */}
      <div style={S.switcherWrap}>
        <span style={S.switcherLabel}>View:</span>
        {SECTIONS.map(sec => (
          <button
            key={sec.id}
            onClick={() => setSection(sec.id)}
            style={S.switcherBtn(section === sec.id, sec.color)}
          >
            <span style={{ fontSize: 16 }}>{sec.icon}</span>
            {sec.label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', fontSize: 12, color: '#94a3b8' }}>
          Switch between HR analytics and project intelligence reports
        </div>
      </div>

      {/* ── Section Content ── */}
      {section === 'hr' ? (
        <div style={S.body}><HRDashboard /></div>
      ) : (
        <ProjectsSDP />
      )}
    </div>
  )
}

export default ReportsAnalysisPage
