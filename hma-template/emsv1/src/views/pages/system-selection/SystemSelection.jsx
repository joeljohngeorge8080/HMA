import React from 'react'
import { useNavigate } from 'react-router-dom'
import { CButton } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilBuilding, cilFolder } from '@coreui/icons'

const SystemSelection = () => {
  const navigate = useNavigate()

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f0f2f5',
        padding: 24,
      }}
    >
      <div style={{ marginBottom: 8 }}>
        <img
          src="/logo.png"
          alt="HMA"
          style={{ height: 48, objectFit: 'contain' }}
          onError={(e) => {
            e.target.style.display = 'none'
          }}
        />
      </div>
      <h2 style={{ fontWeight: 700, fontSize: 28, marginBottom: 4, color: '#1a2035' }}>
        HMA Systems
      </h2>
      <p style={{ color: '#6b7280', marginBottom: 40, fontSize: 15 }}>
        Select a system to continue
      </p>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
        {/* EMS Card */}
        <div
          onClick={() => navigate('/ems/dashboard')}
          style={{
            width: 280,
            background: '#fff',
            borderRadius: 16,
            padding: '36px 32px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            cursor: 'pointer',
            border: '2px solid transparent',
            transition: 'all 0.18s',
            textAlign: 'center',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.border = '2px solid #3b82f6'
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(59,130,246,0.18)'
            e.currentTarget.style.transform = 'translateY(-2px)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.border = '2px solid transparent'
            e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.08)'
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <CIcon icon={cilBuilding} style={{ width: 28, height: 28, color: '#3b82f6' }} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 18, color: '#1a2035', marginBottom: 8 }}>EMS</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20, lineHeight: 1.5 }}>
            Enterprise Management System
            <br />
            Staff, Payroll, Attendance & Finance
          </div>
          <CButton color="primary" style={{ width: '100%' }}>
            Enter EMS
          </CButton>
        </div>

        {/* PMS Card */}
        <div
          onClick={() => navigate('/pms/dashboard')}
          style={{
            width: 280,
            background: '#fff',
            borderRadius: 16,
            padding: '36px 32px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            cursor: 'pointer',
            border: '2px solid transparent',
            transition: 'all 0.18s',
            textAlign: 'center',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.border = '2px solid #10b981'
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(16,185,129,0.18)'
            e.currentTarget.style.transform = 'translateY(-2px)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.border = '2px solid transparent'
            e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.08)'
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: '#ecfdf5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <CIcon icon={cilFolder} style={{ width: 28, height: 28, color: '#10b981' }} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 18, color: '#1a2035', marginBottom: 8 }}>PMS</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20, lineHeight: 1.5 }}>
            Project Management System
            <br />
            Projects, Lifecycle, Expenses & Reports
          </div>
          <CButton color="success" style={{ width: '100%' }}>
            Enter PMS
          </CButton>
        </div>
      </div>
    </div>
  )
}

export default SystemSelection
