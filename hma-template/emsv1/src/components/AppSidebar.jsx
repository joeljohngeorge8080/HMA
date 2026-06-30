import React, { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'

import {
  CCloseButton,
  CSidebar,
  CSidebarBrand,
  CSidebarFooter,
  CSidebarHeader,
  CSidebarToggler,
} from '@coreui/react'
import { AppSidebarNav } from './AppSidebarNav'

import hmaLogo from 'src/assets/brand/hma-logo.png'

import useRole from '../hooks/useRole'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const SidebarClock = () => {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const day = DAYS[now.getDay()]
  const date = now.getDate()
  const month = MONTHS[now.getMonth()]
  const year = now.getFullYear()
  const hours = now.getHours()
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHours = String(hours % 12 || 12).padStart(2, '0')

  return (
    <div className="sidebar-clock">
      <div className="sidebar-clock__time">
        {displayHours}:{minutes}:{seconds}
        <span className="sidebar-clock__ampm">{ampm}</span>
      </div>
      <div>{day}</div>
      <div>{date} {month} {year}</div>
    </div>
  )
}

// Recursively collect all routable items with their parent group name
const flattenNav = (items, parentName = null) => {
  const results = []
  for (const item of items) {
    if (item.to) {
      results.push({ name: item.name, to: item.to, parent: parentName })
    }
    if (item.items?.length) {
      results.push(...flattenNav(item.items, item.name))
    }
  }
  return results
}

const SidebarSearch = ({ nav }) => {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const role = useRole()
  const ref = useRef(null)

  const visibleNav = nav.filter((item) => !item.roles || !role || item.roles.includes(role))
  const allItems = flattenNav(visibleNav)

  const results = query.trim()
    ? allItems.filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase()))
    : []

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (to) => {
    navigate(to)
    setQuery('')
    setOpen(false)
  }

  return (
    <div className="px-3 py-2 border-bottom position-relative" ref={ref}>
      <input
        type="text"
        className="form-control form-control-sm"
        placeholder="Search menu…"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => query.trim() && setOpen(true)}
        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
      />
      {open && results.length > 0 && (
        <div
          className="position-absolute rounded shadow"
          style={{
            top: 'calc(100% - 8px)',
            left: 12,
            right: 12,
            zIndex: 1100,
            maxHeight: 260,
            overflowY: 'auto',
            background: '#fff',
            border: '1px solid #dee2e6',
          }}
        >
          {results.map((item, idx) => (
            <button
              key={idx}
              className="d-block w-100 text-start px-3 py-2 border-0 bg-transparent"
              style={{ cursor: 'pointer' }}
              onMouseDown={() => handleSelect(item.to)}
            >
              <div className="fw-semibold text-dark small">{item.name}</div>
              {item.parent && (
                <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                  {item.parent}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
      {open && query.trim() && results.length === 0 && (
        <div
          className="position-absolute rounded shadow px-3 py-2 small text-muted"
          style={{
            top: 'calc(100% - 8px)',
            left: 12,
            right: 12,
            zIndex: 1100,
            background: '#fff',
            border: '1px solid #dee2e6',
          }}
        >
          No results found
        </div>
      )}
    </div>
  )
}

const AppSidebar = ({ nav = [] }) => {
  const dispatch = useDispatch()
  const unfoldable = useSelector((state) => state.sidebarUnfoldable)
  const sidebarShow = useSelector((state) => state.sidebarShow)
  const role = useRole()
  const { pathname } = useLocation()
  const dashboardPath = pathname.startsWith('/pms') ? '/pms/dashboard' : '/ems/dashboard'

  const visibleNavigation = nav
    .filter((item) => !item.roles || !role || item.roles.includes(role))
    .map(({ roles, ...item }) => item)

  return (
    <CSidebar
      className="border-end"
      colorScheme="dark"
      position="fixed"
      unfoldable={unfoldable}
      visible={sidebarShow}
      onVisibleChange={(visible) => {
        dispatch({ type: 'set', sidebarShow: visible })
      }}
    >
      <CSidebarHeader className="border-bottom">
        <CSidebarBrand as={Link} to={dashboardPath}>
          <img
            src={hmaLogo}
            alt="HMA"
            height={40}
            className="sidebar-brand-full"
            style={{ objectFit: 'contain' }}
          />
          <img
            src={hmaLogo}
            alt="HMA"
            height={32}
            className="sidebar-brand-narrow"
            style={{ objectFit: 'contain' }}
          />
        </CSidebarBrand>
        <CCloseButton
          className="d-lg-none"
          dark
          onClick={() => dispatch({ type: 'set', sidebarShow: false })}
        />
      </CSidebarHeader>

      {!unfoldable && <SidebarSearch nav={nav} />}

      <AppSidebarNav items={visibleNavigation} />
      <CSidebarFooter className="border-top d-none d-lg-flex flex-column p-0">
        {!unfoldable && <SidebarClock />}
        <div className="d-flex">
          <CSidebarToggler
            onClick={() => dispatch({ type: 'set', sidebarUnfoldable: !unfoldable })}
          />
        </div>
      </CSidebarFooter>
    </CSidebar>
  )
}

export default React.memo(AppSidebar)
