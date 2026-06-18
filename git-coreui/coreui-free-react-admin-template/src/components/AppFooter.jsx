import React from 'react'
import { CFooter } from '@coreui/react'

const AppFooter = () => {
  return (
    <CFooter className="px-4">
      <div>
        <span className="fw-semibold">HMA IEMS</span>
        <span className="ms-1">&copy; 2026 HMA.</span>
      </div>
      <div className="ms-auto">
        <span>HMA Internal Enterprise Management System</span>
      </div>
    </CFooter>
  )
}

export default React.memo(AppFooter)
