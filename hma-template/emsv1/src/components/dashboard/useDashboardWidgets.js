import { useState, useCallback } from 'react'

const storageKey = (dashboardId) => `hma_dashboard_widgets_${dashboardId}`

const read = (key, defaults) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : defaults
  } catch {
    return defaults
  }
}

const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // silent — non-critical persistence
  }
}

const useDashboardWidgets = (dashboardId, allWidgets) => {
  const key = storageKey(dashboardId)
  const defaultIds = allWidgets.map((w) => w.id)

  const [activeIds, setActiveIds] = useState(() => read(key, defaultIds))

  const toggleWidget = useCallback(
    (widgetId) => {
      setActiveIds((prev) => {
        const next = prev.includes(widgetId)
          ? prev.filter((id) => id !== widgetId)
          : [...prev, widgetId]
        write(key, next)
        return next
      })
    },
    [key],
  )

  const resetWidgets = useCallback(() => {
    write(key, defaultIds)
    setActiveIds(defaultIds)
  }, [key, defaultIds])

  const activeWidgets = allWidgets.filter((w) => activeIds.includes(w.id))

  return { activeIds, activeWidgets, toggleWidget, resetWidgets }
}

export default useDashboardWidgets
