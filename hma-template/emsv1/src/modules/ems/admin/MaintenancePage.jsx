import React from 'react'

// Construction-crane + monitor illustration — matches the reference design
const MaintenanceIllustration = () => (
  <svg
    viewBox="0 0 420 260"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ width: '100%', maxWidth: 380, height: 'auto' }}
    aria-hidden="true"
  >
    {/* ── Monitor body ───────────────────────────────────────────── */}
    <rect x="80" y="60" width="220" height="148" rx="12" fill="#b8d4f0" />
    <rect x="92" y="72" width="196" height="118" rx="6" fill="#e8f2fc" />
    {/* Screen content – image placeholders */}
    <rect x="104" y="84" width="80" height="54" rx="5" fill="#9ec5e8" />
    <polygon points="124,110 144,88 164,110" fill="#6aaad6" />
    <circle cx="150" cy="100" r="7" fill="#fff" opacity="0.6" />
    <rect x="196" y="84" width="80" height="24" rx="4" fill="#9ec5e8" />
    <rect x="196" y="114" width="80" height="12" rx="3" fill="#c5ddf5" />
    <rect x="196" y="132" width="56" height="12" rx="3" fill="#c5ddf5" />
    {/* Monitor stand */}
    <rect x="172" y="208" width="36" height="14" rx="3" fill="#9ab8d4" />
    <rect x="154" y="220" width="72" height="8" rx="4" fill="#8aafc9" />

    {/* ── Crane tower ─────────────────────────────────────────────── */}
    {/* Vertical mast */}
    <rect x="316" y="80" width="14" height="148" rx="3" fill="#6aaad6" />
    {/* Horizontal boom */}
    <rect x="240" y="80" width="90" height="12" rx="3" fill="#6aaad6" />
    {/* Counter-weight arm */}
    <rect x="316" y="80" width="40" height="10" rx="3" fill="#5b9bd5" />
    <rect x="350" y="88" width="8" height="30" rx="2" fill="#5b9bd5" />
    <rect x="346" y="116" width="16" height="20" rx="3" fill="#4a88c0" />
    {/* Crane cabin */}
    <rect x="300" y="86" width="22" height="20" rx="3" fill="#4a88c0" />
    {/* Hook cable */}
    <line x1="270" y1="92" x2="270" y2="136" stroke="#5b9bd5" strokeWidth="2.5" />
    {/* Hook */}
    <path
      d="M266 136 Q270 148 274 136"
      stroke="#4a88c0"
      strokeWidth="2.5"
      fill="none"
      strokeLinecap="round"
    />
    {/* Crane legs / base */}
    <rect x="310" y="224" width="26" height="10" rx="2" fill="#5b9bd5" />
    <line
      x1="312"
      y1="228"
      x2="304"
      y2="234"
      stroke="#5b9bd5"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <line
      x1="334"
      y1="228"
      x2="342"
      y2="234"
      stroke="#5b9bd5"
      strokeWidth="3"
      strokeLinecap="round"
    />

    {/* ── Ground line ─────────────────────────────────────────────── */}
    <rect x="60" y="234" width="300" height="6" rx="3" fill="#c5ddf5" />

    {/* ── Gear / cog on screen (maintenance hint) ─────────────────── */}
    <circle cx="144" cy="152" r="16" fill="#9ec5e8" />
    <circle cx="144" cy="152" r="9" fill="#e8f2fc" />
    {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
      const rad = (deg * Math.PI) / 180
      const x1 = 144 + 12 * Math.cos(rad)
      const y1 = 152 + 12 * Math.sin(rad)
      const x2 = 144 + 17 * Math.cos(rad)
      const y2 = 152 + 17 * Math.sin(rad)
      return (
        <line
          key={i}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="#6aaad6"
          strokeWidth="4"
          strokeLinecap="round"
        />
      )
    })}

    {/* ── Small decorative dots ────────────────────────────────────── */}
    <circle cx="60" cy="100" r="5" fill="#f5c842" opacity="0.7" />
    <circle cx="48" cy="130" r="3" fill="#f5c842" opacity="0.5" />
    <circle cx="375" cy="160" r="4" fill="#f5c842" opacity="0.6" />
    <circle cx="388" cy="195" r="3" fill="#f5c842" opacity="0.4" />
  </svg>
)

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
        padding: '36px 40px 32px',
        maxWidth: 520,
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
      }}
    >
      <MaintenanceIllustration />

      <h2
        style={{
          fontSize: 26,
          fontWeight: 800,
          color: '#1a1a2e',
          margin: '20px 0 10px',
        }}
      >
        Website is under maintenance
      </h2>

      <p style={{ fontSize: 14, color: '#777', lineHeight: 1.75, marginBottom: 0 }}>
        Our website is currently undergoing scheduled maintenance.
        <br />
        We&rsquo;ll be right back in a few minutes. Thank you for your patience.
      </p>

      {message && (
        <div
          style={{
            marginTop: 18,
            background: '#fff8e1',
            border: '1px solid #f5a623',
            borderRadius: 10,
            padding: '11px 16px',
            fontSize: 13,
            color: '#7a5200',
            fontWeight: 500,
            lineHeight: 1.6,
          }}
        >
          {message}
        </div>
      )}

      <div
        style={{
          marginTop: 24,
          display: 'inline-block',
          background: '#1a2744',
          color: '#fff',
          borderRadius: 8,
          padding: '10px 32px',
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: 0.4,
        }}
      >
        Please check back later
      </div>

      <div
        style={{
          marginTop: 20,
          fontSize: 11,
          color: '#bbb',
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
