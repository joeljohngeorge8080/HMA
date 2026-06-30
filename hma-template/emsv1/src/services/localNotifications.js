const NOTIFICATIONS_KEY = 'hma_notifications_v1'

function readAll() {
  try {
    const data = localStorage.getItem(NOTIFICATIONS_KEY)
    return data ? JSON.parse(data) : []
  } catch (e) {
    return []
  }
}

function writeAll(data) {
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(data))
  window.dispatchEvent(new Event('hma_notifications_changed'))
}

export const localNotifications = {
  addNotification({ message, roleTarget, relatedProjectId, type = 'warning' }) {
    const notifications = readAll()
    notifications.push({
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      message,
      roleTarget,
      relatedProjectId,
      type,
      read: false,
      created_at: new Date().toISOString(),
    })
    writeAll(notifications)
  },

  getNotifications(roleTarget) {
    const notifications = readAll()
    if (!roleTarget) return notifications
    return notifications.filter((n) => n.roleTarget === roleTarget || n.roleTarget === 'all')
  },

  getUnreadCount(roleTarget) {
    return this.getNotifications(roleTarget).filter((n) => !n.read).length
  },

  markAsRead(id) {
    const notifications = readAll()
    const idx = notifications.findIndex((n) => n.id === id)
    if (idx !== -1) {
      notifications[idx].read = true
      writeAll(notifications)
    }
  },

  markAllAsRead(roleTarget) {
    const notifications = readAll()
    notifications.forEach((n) => {
      if (!roleTarget || n.roleTarget === roleTarget || n.roleTarget === 'all') {
        n.read = true
      }
    })
    writeAll(notifications)
  },
}
