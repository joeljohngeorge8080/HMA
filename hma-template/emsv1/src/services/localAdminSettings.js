// localStorage-based admin settings store.
// All keys are prefixed with hma_admin_ to avoid collision.

const KEY = 'hma_admin_settings_v1'

const DEFAULTS = {
  // System
  maintenance_mode: false,
  maintenance_message:
    'The system is currently under scheduled maintenance. We will be back shortly. Please contact your administrator for urgent matters.',
  app_display_name: 'HMA IEMS',

  // Security
  session_timeout_minutes: 60,
  max_login_attempts: 5,
  lockout_duration_minutes: 15,
  password_min_length: 8,
  password_require_special: true,
  force_2fa_admin: false,
  force_2fa_ceo: false,

  // Notifications
  email_notifications_enabled: true,
  system_alert_email: 'hmacommunicationsteam@gmail.com',
  digest_frequency: 'daily', // 'realtime' | 'daily' | 'weekly' | 'off'
  announcement_auto_expire_days: 30,

  // Data & Logs
  audit_log_retention_days: 90,
  auto_archive_after_days: 365,
}

const read = () => {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }
  } catch {
    return { ...DEFAULTS }
  }
}

const write = (settings) => localStorage.setItem(KEY, JSON.stringify(settings))

export const localAdminSettings = {
  get() {
    return read()
  },

  update(patch) {
    const current = read()
    const updated = { ...current, ...patch }
    write(updated)
    return updated
  },

  reset() {
    write(DEFAULTS)
    return { ...DEFAULTS }
  },
}
