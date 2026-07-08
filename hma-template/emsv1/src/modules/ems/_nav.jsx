import React from 'react'
import CIcon from '@coreui/icons-react'
import {
  cilSpeedometer,
  cilPeople,
  cilCalendar,
  cilMoney,
  cilCash,
  cilChartPie,
  cilListRich,
  cilTransfer,
  cilTags,
  cilUser,
  cilSettings,
  cilBell,
  cilNotes,
  cilOptions,
} from '@coreui/icons'
import { CNavGroup, CNavItem } from '@coreui/react'

import { ROLE } from '../../constants/roles'

const STAFF_ROLES = [ROLE.ADMIN, ROLE.CEO, ROLE.HEADS, ROLE.HR]

const emsNav = [
  {
    component: CNavItem,
    name: 'My Profile',
    to: '/ems/my-profile',
    icon: <CIcon icon={cilUser} customClassName="nav-icon" />,
    roles: [ROLE.EMPLOYEE],
  },
  {
    component: CNavItem,
    name: 'Dashboard',
    to: '/ems/dashboard',
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
    roles: STAFF_ROLES,
  },

  // ── HR Admin group ─────────────────────────────────────────────────
  {
    component: CNavGroup,
    name: 'HR Admin',
    icon: <CIcon icon={cilPeople} customClassName="nav-icon" />,
    roles: STAFF_ROLES,
    items: [
      {
        component: CNavItem,
        name: 'Staff & Payroll',
        to: '/ems/staff-payroll',
        icon: <CIcon icon={cilUser} customClassName="nav-icon" />,
      },
      {
        component: CNavGroup,
        name: 'Attendance',
        icon: <CIcon icon={cilCalendar} customClassName="nav-icon" />,
        items: [
          { component: CNavItem, name: 'Overview', to: '/ems/attendance' },
          { component: CNavItem, name: 'Import Excel', to: '/ems/attendance/import' },
          { component: CNavItem, name: 'Corrections', to: '/ems/attendance/corrections' },
        ],
      },
      {
        component: CNavGroup,
        name: 'Activity',
        items: [
          { component: CNavItem, name: 'Internship', to: '/ems/internship' },
          { component: CNavItem, name: 'Recruitment & Training', to: '/ems/recruitment' },
        ],
      },
    ],
  },

  // ── Overheads & Pools ──────────────────────────────────────────────
  {
    component: CNavItem,
    name: 'Expense Pools',
    to: '/ems/hr-pool/global',
    icon: <CIcon icon={cilPeople} customClassName="nav-icon" />,
    roles: STAFF_ROLES,
  },
  {
    component: CNavItem,
    name: 'Global Core Pool',
    to: '/ems/core-pool/global',
    icon: <CIcon icon={cilMoney} customClassName="nav-icon" />,
    roles: STAFF_ROLES,
  },
  // ── Expenses ───────────────────────────────────────────────────────
  {
    component: CNavItem,
    name: 'Expense Management',
    to: '/ems/expense-management',
    icon: <CIcon icon={cilMoney} customClassName="nav-icon" />,
    roles: STAFF_ROLES,
  },
  {
    component: CNavGroup,
    name: 'General Expenses',
    icon: <CIcon icon={cilCash} customClassName="nav-icon" />,
    roles: STAFF_ROLES,
    items: [
      { component: CNavItem, name: 'Divisions', to: '/ems/general-expenses' },
      {
        component: CNavItem,
        name: 'Categories',
        to: '/ems/general-expenses/categories',
        icon: <CIcon icon={cilTags} customClassName="nav-icon" />,
      },
    ],
  },

  // ── User Management (Admin + HR) ───────────────────────────────────
  {
    component: CNavGroup,
    name: 'User Management',
    icon: <CIcon icon={cilSettings} customClassName="nav-icon" />,
    roles: [ROLE.ADMIN, ROLE.HR],
    items: [
      { component: CNavItem, name: 'Registered Users', to: '/ems/user-management' },
      { component: CNavItem, name: 'Add User', to: '/ems/user-management/add' },
    ],
  },
  {
    component: CNavGroup,
    name: 'Reports & Analysis',
    icon: <CIcon icon={cilChartPie} customClassName="nav-icon" />,
    roles: STAFF_ROLES,
    items: [
      { component: CNavItem, name: 'Visual Model', to: '/ems/reports-analysis/visual-model' },
      {
        component: CNavItem,
        name: 'Profit / Loss vs LSGB',
        to: '/ems/reports-analysis/lsgb-dependency',
      },
    ],
  },
  {
    component: CNavItem,
    name: 'Audit Logs',
    to: '/ems/audit-logs',
    icon: <CIcon icon={cilListRich} customClassName="nav-icon" />,
    roles: STAFF_ROLES,
  },
  // ── Admin Settings (Admin only) ───────────────────────────────────────────
  {
    component: CNavItem,
    name: 'Admin Settings',
    to: '/ems/admin-settings',
    icon: <CIcon icon={cilOptions} customClassName="nav-icon" />,
    roles: [ROLE.ADMIN],
  },

  // ── CEO Announcements (CEO + Admin) ───────────────────────────────────────
  {
    component: CNavGroup,
    name: 'Announcements',
    icon: <CIcon icon={cilBell} customClassName="nav-icon" />,
    roles: [ROLE.CEO, ROLE.ADMIN],
    items: [
      {
        component: CNavItem,
        name: 'Personal Notes',
        to: '/ems/announcements',
        icon: <CIcon icon={cilNotes} customClassName="nav-icon" />,
      },
      {
        component: CNavItem,
        name: 'Compose & Send',
        to: '/ems/announcements/compose',
        icon: <CIcon icon={cilBell} customClassName="nav-icon" />,
      },
      {
        component: CNavItem,
        name: 'Sent Messages',
        to: '/ems/announcements/sent',
        icon: <CIcon icon={cilListRich} customClassName="nav-icon" />,
      },
    ],
  },

  // ── Notifications inbox (non-CEO, non-Admin staff) ─────────────────────────
  {
    component: CNavItem,
    name: 'Notifications',
    to: '/ems/notifications',
    icon: <CIcon icon={cilBell} customClassName="nav-icon" />,
    roles: [ROLE.HEADS, ROLE.HR, ROLE.EMPLOYEE, ROLE.PROJECT_ASSOCIATE, ROLE.PROJECT_OFFICER],
  },

  {
    component: CNavItem,
    name: 'Switch to PMS',
    to: '/select-system',
    icon: <CIcon icon={cilTransfer} customClassName="nav-icon" />,
  },
]

export default emsNav
