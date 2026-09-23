// src/components/TopBar.jsx — College-branded top navigation bar
import { Bell, ChevronDown, Menu } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// Circular JD College crest logo — matches reference screenshot exactly
function CollegeLogo() {
  return (
    <div style={{ width: 44, height: 44, flexShrink: 0, position: 'relative' }}>
      <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        {/* Outer ring */}
        <circle cx="22" cy="22" r="21" fill="white" stroke="#E8E5F5" strokeWidth="1"/>
        <circle cx="22" cy="22" r="20" fill="none" stroke="#6D4AE8" strokeWidth="1.5"/>
        {/* Middle decorative ring */}
        <circle cx="22" cy="22" r="16" fill="none" stroke="#6D4AE8" strokeWidth="0.7" strokeDasharray="2 1.5"/>
        {/* Inner filled circle */}
        <circle cx="22" cy="22" r="13" fill="linear-gradient(135deg,#2D1B6E,#6D4AE8)"/>
        <circle cx="22" cy="22" r="13" fill="url(#crestGrad)"/>
        <defs>
          <linearGradient id="crestGrad" x1="12" y1="10" x2="32" y2="34">
            <stop offset="0%" stopColor="#3A1F8A"/>
            <stop offset="100%" stopColor="#6D4AE8"/>
          </linearGradient>
        </defs>
        {/* Book (knowledge symbol) */}
        <rect x="16" y="19" width="12" height="8" rx="1" fill="none" stroke="white" strokeWidth="1.2"/>
        <line x1="22" y1="19" x2="22" y2="27" stroke="white" strokeWidth="1.2"/>
        <path d="M16 20.5 C18 19.5 20.5 19.5 22 20.5 C23.5 19.5 26 19.5 28 20.5" stroke="#FFD700" strokeWidth="1" fill="none"/>
        {/* Flame / torch on top */}
        <path d="M22 11 C21 13 20 14 20.5 15.5 C21 17 23 17 23.5 15.5 C24 14 23 13 22 11Z" fill="#FFD700" opacity="0.9"/>
        {/* Stars */}
        <circle cx="16" cy="15" r="0.8" fill="#FFD700"/>
        <circle cx="28" cy="15" r="0.8" fill="#FFD700"/>
        <circle cx="13" cy="22" r="0.6" fill="#FFD700" opacity="0.7"/>
        <circle cx="31" cy="22" r="0.6" fill="#FFD700" opacity="0.7"/>
        {/* Bottom arc label: JD */}
        <text x="22" y="30.5" textAnchor="middle" fontSize="4.5" fontWeight="bold" fill="white" fontFamily="Inter,sans-serif" letterSpacing="0.5">JD</text>
      </svg>
    </div>
  )
}


function AvatarInitials({ name, size = 36 }) {
  const initials = (name || 'FA')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className="avatar-initials" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials}
    </div>
  )
}

export default function TopBar({ onMenuClick }) {
  const { faculty, logout } = useAuth()
  const navigate = useNavigate()
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const role = faculty?.is_superadmin ? 'Head Faculty' : 'Teacher'
  const dept = faculty?.department || 'Faculty'

  return (
    <header className="topbar">
      {/* Left: hamburger (mobile) + college branding */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Hamburger (mobile only) */}
        <button
          className="btn-ghost"
          onClick={onMenuClick}
          aria-label="Toggle sidebar"
          style={{
            display: 'none',
            padding: '8px',
            '@media (maxWidth: 768px)': { display: 'flex' },
          }}
          id="topbar-menu-btn"
        >
          <Menu size={20} color="var(--text-secondary)" />
        </button>

        <CollegeLogo />

        <div style={{ lineHeight: 1.2 }}>
          <div style={{
            fontWeight: 700,
            fontSize: 15,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
          }}>
            J.D. College of Engineering &amp; Management
          </div>
          <div style={{
            fontSize: 11,
            color: 'var(--text-secondary)',
            fontWeight: 400,
          }}>
            Nagpur&nbsp;&nbsp;|&nbsp;&nbsp;
            <span style={{ color: 'var(--primary)' }}>Knowledge</span>
            {' • '}Discipline{' • '}Progress
          </div>
        </div>
      </div>

      {/* Right: bell + profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Notification Bell */}
        <button
          className="btn-ghost"
          style={{ padding: '8px', borderRadius: '50%', position: 'relative' }}
          aria-label="Notifications"
          onClick={() => navigate('/notifications')}
        >
          <Bell size={20} color="var(--text-secondary)" />
          <span style={{
            position: 'absolute', top: 6, right: 6,
            width: 8, height: 8,
            background: 'var(--red)',
            borderRadius: '50%',
            border: '2px solid var(--bg-topbar)',
          }} />
        </button>

        {/* Profile dropdown */}
        <div ref={profileRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setProfileOpen(p => !p)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 10px',
              borderRadius: 10,
              transition: 'background var(--transition)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-app)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <AvatarInitials name={faculty?.full_name} size={36} />
            <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                {faculty?.full_name || 'Faculty'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{role}</div>
            </div>
            <ChevronDown
              size={14}
              color="var(--text-muted)"
              style={{ transform: profileOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
            />
          </button>

          {/* Dropdown */}
          {profileOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 8px)',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              boxShadow: 'var(--shadow-card-lg)',
              minWidth: 200,
              zIndex: 500,
              animation: 'fadeInUp 0.15s ease',
              overflow: 'hidden',
            }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                  {faculty?.full_name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {dept} · {role}
                </div>
              </div>
              <div style={{ padding: '6px' }}>
                <button
                  onClick={() => { setProfileOpen(false); navigate('/profile') }}
                  style={{
                    width: '100%', padding: '9px 12px',
                    background: 'transparent', border: 'none',
                    borderRadius: 8, cursor: 'pointer',
                    textAlign: 'left', fontSize: 13,
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-app)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  My Profile
                </button>
                <button
                  onClick={() => { setProfileOpen(false); navigate('/settings') }}
                  style={{
                    width: '100%', padding: '9px 12px',
                    background: 'transparent', border: 'none',
                    borderRadius: 8, cursor: 'pointer',
                    textAlign: 'left', fontSize: 13,
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-app)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  Settings
                </button>
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%', padding: '9px 12px',
                    background: 'transparent', border: 'none',
                    borderRadius: 8, cursor: 'pointer',
                    textAlign: 'left', fontSize: 13,
                    color: 'var(--red)',
                    fontFamily: 'inherit',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--red-bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
