/**
 * ReportSubmitPage — New daily report submission page.
 *
 * Route: /pms/daily-reports/new
 * Supports ?task=<taskId> query param to pre-select a task.
 */
import React, { useState, useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CContainer, CRow, CCol, CToaster, CToast, CToastBody, CToastClose } from '@coreui/react'

import ReportForm from './components/ReportForm'
import { localReports } from '../../../services/localReports'
import { localTasks } from '../../../services/localTasks'

const ReportSubmitPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [activeTasks, setActiveTasks] = useState([])

  const preselectedTaskId = searchParams.get('task') || null

  useEffect(() => {
    localTasks.seedDemoData()
    const tasks = localTasks.getActiveTasks()
    setActiveTasks(tasks)
  }, [])

  const handleSubmit = useCallback(
    async (data) => {
      setLoading(true)
      try {
        localReports.create(data)
        setToast({ color: 'success', message: '✅ Report submitted successfully!' })
        setTimeout(() => navigate('/pms/daily-reports/history'), 1200)
      } catch (err) {
        setToast({ color: 'danger', message: err.message || 'Failed to submit' })
        setLoading(false)
      }
    },
    [navigate],
  )

  const handleSaveDraft = useCallback((data) => {
    try {
      localReports.saveDraft(data)
      setToast({ color: 'info', message: '📝 Draft saved' })
    } catch (err) {
      setToast({ color: 'danger', message: err.message || 'Failed to save draft' })
    }
  }, [])

  return (
    <CContainer lg className="py-3">
      <CRow className="justify-content-center">
        <CCol xs={12} lg={8} xl={7}>
          <ReportForm
            onSubmit={handleSubmit}
            onSaveDraft={handleSaveDraft}
            loading={loading}
            tasks={activeTasks}
            preselectedTaskId={preselectedTaskId}
          />
        </CCol>
      </CRow>

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

export default ReportSubmitPage
