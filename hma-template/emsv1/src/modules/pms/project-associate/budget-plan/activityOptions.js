export const ACTIVITY_OPTIONS = [
  { value: 'conveyance', label: 'Conveyance' },
  { value: 'trainers_refreshment', label: 'Trainers Refreshment' },
  { value: 'lodging', label: 'Lodging' },
  { value: 'printing_stationery', label: 'Printing and Stationary' },
  { value: 'project_team_salary', label: 'Project Team Salary' },
  { value: 'procurement_materials', label: 'Procurement of Materials' },
  { value: 'courier_charges', label: 'Courier Charges' },
  { value: 'long_distance_travel', label: 'Long Distance Travel' },
  { value: 'beneficiary_refreshment', label: 'Beneficiary Refreshment' },
  { value: 'video_documentation', label: 'Video Documentation' },
  { value: 'digital_information_system', label: 'Digital Information System' },
  { value: 'other', label: 'Other' },
]

/** Display label for a stored activity value — the custom-typed name when
 * `value` is 'other', otherwise the matching option's label. */
export const activityLabelOf = (value, otherName) => {
  if (value === 'other') return (otherName || '').trim() || 'Other'
  return ACTIVITY_OPTIONS.find((a) => a.value === value)?.label || value
}
