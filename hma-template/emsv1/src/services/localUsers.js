import { ROLES, ROLE } from '../constants/roles'

const STORAGE_KEY = 'hma_registered_users'

const defaultUsers = [
  {
    id: 'USR000',
    full_name: 'System Admin',
    google_email: 'admin@hma.com',
    role: ROLE.ADMIN,
    added_by: 'system',
    added_at: new Date().toISOString(),
  },
]

const load = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : defaultUsers
  } catch {
    return defaultUsers
  }
}

const save = (users) => localStorage.setItem(STORAGE_KEY, JSON.stringify(users))

export const getRegisteredUsers = () => load()

export const addRegisteredUser = (user) => {
  const users = load()
  const exists = users.some(
    (u) => u.google_email.toLowerCase() === user.google_email.toLowerCase(),
  )
  if (exists) throw new Error('A user with this Google email is already registered.')
  const newUser = {
    id: `USR${Date.now()}`,
    full_name: user.full_name,
    google_email: user.google_email.toLowerCase().trim(),
    role: user.role,
    added_by: user.added_by || 'admin',
    added_at: new Date().toISOString(),
  }
  save([...users, newUser])
  return newUser
}

export const removeRegisteredUser = (id) => {
  const users = load().filter((u) => u.id !== id)
  save(users)
}

export const isEmailRegistered = (email) =>
  load().some((u) => u.google_email === email?.toLowerCase())

export const getUserByEmail = (email) =>
  load().find((u) => u.google_email === email?.toLowerCase()) || null

export const ASSIGNABLE_ROLES = ROLES.filter((r) => r !== ROLE.ADMIN)
