/**
 * MyTasksPage — Field Personnel's assigned tasks view.
 *
 * Route: /pms/daily-reports/my-tasks
 * Shows assigned tasks with "Submit Report" button.
 */
import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CContainer,
  CRow,
  CCol,
  CCard,
  CCardBody,
  CFormSelect,
  CToaster,
  CToast,
  CToastBody,
  CToastClose,
} from '@coreui/react'

import TaskCard from './components/TaskCard'
import { localTasks } from '../../../services/localTasks'

const MyTasksPage = () => {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [toast, setToast] = useState(null)

  const loadTasks = useCallback(() => {
    localTasks.seedDemoData()
    // In a real app, filter by current user's ID
    // For demo, show all tasks
    const result = localTasks.list({ status: statusFilter })
    setTasks(result.items)
  }, [statusFilter])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  const handleSubmitReport = (taskId) => {
    // Navigate to report form with task pre-selected
    navigate(`/pms/daily-reports/new?task=${taskId}`)
  }

  const activeCount = tasks.filter((t) => t.status === 'active').length

  return (
    <CContainer lg className="py-3">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-1 fw-semibold">My Tasks</h4>
          <p className="text-body-secondary mb-0 small">
            {activeCount} active task{activeCount !== 1 ? 's' : ''} assigned to you
          </p>
        </div>
        <CFormSelect
          size="sm"
          style={{ width: 'auto' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Tasks</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </CFormSelect>
      </div>

      {/* Task list */}
      {tasks.length === 0 ? (
        <CCard className="shadow-sm">
          <CCardBody className="text-center py-5">
            <div className="text-body-secondary mb-3" style={{ fontSize: '3rem' }}>
              ✅
            </div>
            <h5 className="text-body-secondary">No tasks assigned</h5>
            <p className="text-body-tertiary">
              {statusFilter
                ? 'No tasks match this filter'
                : 'You have no tasks assigned. Check back later!'}
            </p>
          </CCardBody>
        </CCard>
      ) : (
        <div>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onSubmitReport={handleSubmitReport}
              showActions
              showAssignee={false}
            />
          ))}
        </div>
      )}

      <CToaster placement="top-end">
        {toast && (
          <CToast
            autohide
            delay={3000}
            visible
            color={toast.color}
            className="text-white"
            onClose={() => setToast(null)}
          >
            <div className="d-flex">
              <CToastBody>{toast.message}</CToastBody>
              <CToastClose className="me-2 m-auto" white />
            </div>
          </CToast>
        )}
      </CToaster>
    </CContainer>
  )
}

export default MyTasksPage
