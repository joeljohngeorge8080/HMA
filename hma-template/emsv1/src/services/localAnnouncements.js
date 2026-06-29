// localStorage-based announcements + CEO personal notes store.

const ANNOUNCEMENTS_KEY = 'hma_announcements_v1'
const NOTES_KEY = 'hma_ceo_notes_v1'

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

const now = () => new Date().toISOString()

// ── Message types ──────────────────────────────────────────────────────────────

export const MSG_TYPE = {
  ANNOUNCEMENT: 'announcement',
  ALERT: 'alert',
  WARNING: 'warning',
  REPORT: 'report',
  INFO: 'info',
  REMINDER: 'reminder',
}

export const MSG_TYPE_META = {
  [MSG_TYPE.ANNOUNCEMENT]: { label: 'Announcement', color: 'primary', icon: '📢' },
  [MSG_TYPE.ALERT]: { label: 'Alert', color: 'danger', icon: '🚨' },
  [MSG_TYPE.WARNING]: { label: 'Warning', color: 'warning', icon: '⚠️' },
  [MSG_TYPE.REPORT]: { label: 'Report', color: 'info', icon: '📊' },
  [MSG_TYPE.INFO]: { label: 'Information', color: 'secondary', icon: 'ℹ️' },
  [MSG_TYPE.REMINDER]: { label: 'Reminder', color: 'success', icon: '🔔' },
}

// ── Announcements ──────────────────────────────────────────────────────────────

const readAnnouncements = () => {
  try {
    return JSON.parse(localStorage.getItem(ANNOUNCEMENTS_KEY) || '[]')
  } catch {
    return []
  }
}

const writeAnnouncements = (rows) => localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(rows))

export const localAnnouncements = {
  listAll({ type = '' } = {}) {
    let rows = readAnnouncements()
    if (type) rows = rows.filter((r) => r.type === type)
    return rows.sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at))
  },

  listForRole(role) {
    return readAnnouncements()
      .filter((r) => r.target_roles.includes('all') || r.target_roles.includes(role))
      .sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at))
  },

  getById(id) {
    return readAnnouncements().find((r) => r.id === id) || null
  },

  send(data) {
    const rows = readAnnouncements()
    const msg = {
      id: uid(),
      type: data.type || MSG_TYPE.ANNOUNCEMENT,
      title: data.title.trim(),
      body: data.body.trim(),
      target_roles: data.target_roles?.length ? data.target_roles : ['all'],
      sent_at: now(),
      sent_by: data.sent_by || 'CEO',
      read_by: [],
    }
    writeAnnouncements([...rows, msg])
    return msg
  },

  markRead(id, userId) {
    const rows = readAnnouncements()
    const idx = rows.findIndex((r) => r.id === id)
    if (idx === -1) return
    if (!rows[idx].read_by.includes(userId)) {
      rows[idx] = { ...rows[idx], read_by: [...rows[idx].read_by, userId] }
    }
    writeAnnouncements(rows)
  },

  markAllRead(role, userId) {
    const rows = readAnnouncements().map((r) => {
      if (
        (r.target_roles.includes('all') || r.target_roles.includes(role)) &&
        !r.read_by.includes(userId)
      ) {
        return { ...r, read_by: [...r.read_by, userId] }
      }
      return r
    })
    writeAnnouncements(rows)
  },

  delete(id) {
    writeAnnouncements(readAnnouncements().filter((r) => r.id !== id))
  },

  unreadCount(role, userId) {
    return readAnnouncements().filter(
      (r) =>
        (r.target_roles.includes('all') || r.target_roles.includes(role)) &&
        !r.read_by.includes(userId),
    ).length
  },
}

// ── CEO personal notes ─────────────────────────────────────────────────────────

const readNotes = () => {
  try {
    return JSON.parse(localStorage.getItem(NOTES_KEY) || '[]')
  } catch {
    return []
  }
}

const writeNotes = (rows) => localStorage.setItem(NOTES_KEY, JSON.stringify(rows))

export const NOTE_COLORS = ['default', 'primary', 'success', 'warning', 'danger', 'info']

export const localCeoNotes = {
  list() {
    return readNotes().sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
  },

  getById(id) {
    return readNotes().find((n) => n.id === id) || null
  },

  create(data) {
    const ts = now()
    const note = {
      id: uid(),
      title: data.title?.trim() || 'Untitled Note',
      body: data.body?.trim() || '',
      color: data.color || 'default',
      created_at: ts,
      updated_at: ts,
    }
    writeNotes([...readNotes(), note])
    return note
  },

  update(id, data) {
    const notes = readNotes()
    const idx = notes.findIndex((n) => n.id === id)
    if (idx === -1) throw new Error('Note not found')
    notes[idx] = { ...notes[idx], ...data, updated_at: now() }
    writeNotes(notes)
    return notes[idx]
  },

  delete(id) {
    writeNotes(readNotes().filter((n) => n.id !== id))
  },
}
