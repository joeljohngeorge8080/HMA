import React from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  CAvatar,
  CDropdown,
  CDropdownDivider,
  CDropdownHeader,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
} from '@coreui/react'
import { cilAccountLogout, cilUser } from '@coreui/icons'
import CIcon from '@coreui/icons-react'

import useAuth from '../../hooks/useAuth'
import { logoutApi } from '../../services/auth'

const getInitials = (name) => {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const AVATAR_COLORS = ['primary', 'secondary', 'success', 'danger', 'warning', 'info']
const pickColor = (name) => {
  if (!name) return 'secondary'
  const code = name.charCodeAt(0) + (name.charCodeAt(1) || 0)
  return AVATAR_COLORS[code % AVATAR_COLORS.length]
}

const AppHeaderDropdown = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  // Resolve the profile path based on which system is active
  const profilePath = location.pathname.startsWith('/ems') ? '/ems/my-profile' : null

  const handleLogout = async () => {
    await logoutApi()
    localStorage.removeItem('hma_token')
    dispatch({ type: 'set', user: null, token: null })
    navigate('/login')
  }

  const initials = getInitials(user?.full_name)
  const avatarColor = pickColor(user?.full_name)

  return (
    <CDropdown variant="nav-item">
      <CDropdownToggle placement="bottom-end" className="py-0 pe-0" caret={false}>
        <CAvatar color={avatarColor} textColor="white" size="md">
          {initials}
        </CAvatar>
      </CDropdownToggle>
      <CDropdownMenu className="pt-0" placement="bottom-end">
        <CDropdownHeader className="bg-body-secondary fw-semibold mb-2">
          {user ? `${user.full_name} · ${user.role}` : 'Account'}
        </CDropdownHeader>
        {profilePath && (
          <CDropdownItem as="button" type="button" onClick={() => navigate(profilePath)}>
            <CIcon icon={cilUser} className="me-2" />
            My Profile
          </CDropdownItem>
        )}
        <CDropdownDivider />
        <CDropdownItem as="button" type="button" onClick={handleLogout}>
          <CIcon icon={cilAccountLogout} className="me-2" />
          Logout
        </CDropdownItem>
      </CDropdownMenu>
    </CDropdown>
  )
}

export default AppHeaderDropdown
