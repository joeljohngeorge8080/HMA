import React from 'react'
import maintenanceImg from '../../../assets/maintenance.png'

const MaintenancePage = ({ message }) => (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      background: 'linear-gradient(135deg, #f5a623 0%, #f7c94b 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: 24,
    }}
  >
    <div
      style={{
        background: '#fff',
        borderRadius: 20,
        padding: '40px 36px 36px',
        maxWidth: 540,
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
      }}
    >
      <img
        src={maintenanceImg}
        alt="System under maintenance"
        style={{
          width: '100%',
          maxHeight: 300,
          objectFit: 'contain',
          marginBottom: 24,
          borderRadius: 10,
        }}
      />
      <h2
        style={{
          fontSize: 24,
          fontWeight: 800,
          color: '#1a1a2e',
          marginBottom: 10,
        }}
      >
        Website is under maintenance
      </h2>
      <p
        style={{
          fontSize: 14,
          color: '#666',
          lineHeight: 1.7,
          marginBottom: message ? 16 : 0,
        }}
      >
        Our website is currently undergoing scheduled maintenance.
        <br />
        We will be right back shortly. Thank you for your patience.
      </p>
      {message && (
        <div
          style={{
            background: '#fff8e1',
            border: '1px solid #f5a623',
            borderRadius: 10,
            padding: '12px 16px',
            fontSize: 13,
            color: '#7a5200',
            fontWeight: 500,
          }}
        >
          {message}
        </div>
      )}
      <div
        style={{
          marginTop: 24,
          fontSize: 11,
          color: '#aaa',
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}
      >
        HMA Internal Enterprise Management System
      </div>
    </div>
  </div>
)

export default MaintenancePage
