/**
 * AppHeader Component
 *
 * Application header with sidebar toggle, theme switcher (light/dark/auto),
 * user dropdown, and breadcrumb row. Sticky with a scroll-shadow effect.
 *
 * @component
 * @example
 * return (
 *   <AppHeader />
 * )
 */

import React, { useEffect, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import {
  CBadge,
  CContainer,
  CDropdown,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CHeader,
  CHeaderNav,
  CHeaderToggler,
  useColorModes,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilContrast, cilMenu, cilMoon, cilSun, cilBell } from '@coreui/icons'
import { localNotifications } from '../services/localNotifications'

import { AppBreadcrumb } from './index'
import { AppHeaderDropdown } from './header/index'

/**
 * AppHeader functional component
 *
 * @returns {React.ReactElement} Header with sidebar toggle, theme switcher,
 * user menu, and breadcrumb.
 */
const AppHeader = () => {
  const headerRef = useRef()
  const { colorMode, setColorMode } = useColorModes('coreui-free-react-admin-template-theme')

  const dispatch = useDispatch()
  const sidebarShow = useSelector((state) => state.sidebarShow)
  const user = useSelector((state) => state.user)

  const [notifications, setNotifications] = React.useState([])
  const [unreadCount, setUnreadCount] = React.useState(0)

  useEffect(() => {
    const fetchNotifs = () => {
      if (user?.role) {
        setNotifications(localNotifications.getNotifications(user.role))
        setUnreadCount(localNotifications.getUnreadCount(user.role))
      }
    }
    fetchNotifs()
    window.addEventListener('hma_notifications_changed', fetchNotifs)
    return () => window.removeEventListener('hma_notifications_changed', fetchNotifs)
  }, [user?.role])

  const handleMarkAsRead = (id) => {
    localNotifications.markAsRead(id)
  }

  useEffect(() => {
    const handleScroll = () => {
      headerRef.current &&
        headerRef.current.classList.toggle('shadow-sm', document.documentElement.scrollTop > 0)
    }

    document.addEventListener('scroll', handleScroll)
    return () => document.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <CHeader position="sticky" className="mb-4 p-0" ref={headerRef}>
      <CContainer className="border-bottom px-4" fluid>
        <CHeaderToggler
          onClick={() => dispatch({ type: 'set', sidebarShow: !sidebarShow })}
          style={{ marginInlineStart: '-14px' }}
        >
          <CIcon icon={cilMenu} size="lg" />
        </CHeaderToggler>
        <CHeaderNav className="ms-auto">
          <CDropdown variant="nav-item" placement="bottom-end">
            <CDropdownToggle caret={false}>
              {colorMode === 'dark' ? (
                <CIcon icon={cilMoon} size="lg" />
              ) : colorMode === 'auto' ? (
                <CIcon icon={cilContrast} size="lg" />
              ) : (
                <CIcon icon={cilSun} size="lg" />
              )}
            </CDropdownToggle>
            <CDropdownMenu>
              <CDropdownItem
                active={colorMode === 'light'}
                className="d-flex align-items-center"
                as="button"
                type="button"
                onClick={() => setColorMode('light')}
              >
                <CIcon className="me-2" icon={cilSun} size="lg" /> Light
              </CDropdownItem>
              <CDropdownItem
                active={colorMode === 'dark'}
                className="d-flex align-items-center"
                as="button"
                type="button"
                onClick={() => setColorMode('dark')}
              >
                <CIcon className="me-2" icon={cilMoon} size="lg" /> Dark
              </CDropdownItem>
              <CDropdownItem
                active={colorMode === 'auto'}
                className="d-flex align-items-center"
                as="button"
                type="button"
                onClick={() => setColorMode('auto')}
              >
                <CIcon className="me-2" icon={cilContrast} size="lg" /> Auto
              </CDropdownItem>
            </CDropdownMenu>
          </CDropdown>

          <CDropdown variant="nav-item" placement="bottom-end">
            <CDropdownToggle caret={false}>
              <div className="position-relative">
                <CIcon icon={cilBell} size="lg" />
                {unreadCount > 0 && (
                  <CBadge color="danger" position="top-end" shape="rounded-pill">
                    {unreadCount}
                  </CBadge>
                )}
              </div>
            </CDropdownToggle>
            <CDropdownMenu className="pt-0 shadow-sm" style={{ minWidth: '320px', maxHeight: '400px', overflowY: 'auto' }}>
              <div className="bg-light fw-semibold py-2 px-3 border-bottom d-flex justify-content-between align-items-center">
                <span>Notifications</span>
                {unreadCount > 0 && <CBadge color="danger">{unreadCount} New</CBadge>}
              </div>
              {notifications.length === 0 ? (
                <CDropdownItem disabled className="py-3 text-center text-body-secondary small">
                  No notifications
                </CDropdownItem>
              ) : (
                notifications.slice().reverse().map(n => (
                  <CDropdownItem key={n.id} onClick={() => handleMarkAsRead(n.id)} className={`border-bottom text-wrap ${n.read ? 'bg-transparent text-body-secondary' : 'bg-light'}`} style={{ whiteSpace: 'normal', padding: '0.75rem 1rem' }}>
                    <div className={`text-${n.type || 'primary'} fw-bold mb-1`} style={{ fontSize: '0.75rem' }}>
                      {new Date(n.created_at).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.85rem' }}>{n.message}</div>
                  </CDropdownItem>
                ))
              )}
            </CDropdownMenu>
          </CDropdown>

          <li className="nav-item py-1">
            <div className="vr h-100 mx-2 text-body text-opacity-75"></div>
          </li>
          <AppHeaderDropdown />
        </CHeaderNav>
      </CContainer>
      <CContainer className="px-4" fluid>
        <AppBreadcrumb />
      </CContainer>
    </CHeader>
  )
}

export default AppHeader
