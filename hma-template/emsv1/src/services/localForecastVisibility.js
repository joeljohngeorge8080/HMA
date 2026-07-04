// Local store for Forecast Expense tab display preferences.
// Lets HR hide a line item from the forecast (cards/totals/WMA) without
// touching the underlying expense record, and opt an existing Admin
// Expenses vendor entry into the Forecast Expense view.
// Row keys: 'admin:<entryId>' or 'general:<vendor>|<expenseName>'

const KEY = 'hma_forecast_visibility_v1'

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}')
  } catch {
    return {}
  }
}
const write = (data) => localStorage.setItem(KEY, JSON.stringify(data))

export const localForecastVisibility = {
  get() {
    const data = read()
    return { hidden: data.hidden || [], included: data.included || [] }
  },

  /** Persisted 'From' / 'To' month range HR picked for the forecast. */
  getRange() {
    const data = read()
    return data.range || null
  },

  setRange(start, end) {
    const data = read()
    write({ ...data, range: { start, end } })
  },

  hide(rowKey) {
    const data = this.get()
    if (!data.hidden.includes(rowKey)) {
      write({ ...data, hidden: [...data.hidden, rowKey] })
    }
  },

  unhide(rowKey) {
    const data = this.get()
    write({ ...data, hidden: data.hidden.filter((k) => k !== rowKey) })
  },

  include(rowKey) {
    const data = this.get()
    if (!data.included.includes(rowKey)) {
      write({ ...data, included: [...data.included, rowKey] })
    }
  },
}
