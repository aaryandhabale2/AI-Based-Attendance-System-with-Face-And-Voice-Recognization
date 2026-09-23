// src/components/Sidebar.jsx — 9-item navigation sidebar with footer illustration
import { NavLink } from 'react-router-dom'
import {
  Home, BookOpen, Layers, Users, CalendarCheck,
  BarChart2, Bell, Settings, GraduationCap,
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/home',          icon: Home,          label: 'Home' },
  { to: '/classes',       icon: GraduationCap, label: 'My Classes' },
  { to: '/subjects',      icon: Layers,        label: 'Subjects' },
  { to: '/students',      icon: Users,         label: 'Students' },
  { to: '/attendance',    icon: CalendarCheck, label: 'Attendance' },
  { to: '/reports',       icon: BarChart2,     label: 'Reports' },
  { to: '/notifications', icon: Bell,          label: 'Notifications' },
  { to: '/settings',      icon: Settings,      label: 'Settings' },
]

// Simple SVG illustration for footer (student at desk, bookshelf)
function FooterIllustration() {
  return (
    <svg viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', maxWidth: 160, opacity: 0.85 }}>
      {/* Background circle */}
      <circle cx="80" cy="85" r="60" fill="#EDE9FF" opacity="0.6"/>
      {/* Bookshelf */}
      <rect x="20" y="55" width="120" height="6" rx="3" fill="#C4B5FD"/>
      <rect x="20" y="72" width="120" height="6" rx="3" fill="#C4B5FD"/>
      {/* Books */}
      <rect x="25" y="37" width="10" height="18" rx="2" fill="#6D4AE8"/>
      <rect x="37" y="40" width="8" height="15" rx="2" fill="#8B5CF6"/>
      <rect x="47" y="35" width="12" height="20" rx="2" fill="#A78BFA"/>
      <rect x="61" y="39" width="9" height="16" rx="2" fill="#7C3AED"/>
      <rect x="72" y="36" width="11" height="19" rx="2" fill="#6D4AE8"/>
      {/* Monitor */}
      <rect x="88" y="30" width="40" height="28" rx="4" fill="#1F1B3A" opacity="0.8"/>
      <rect x="91" y="33" width="34" height="22" rx="3" fill="#6D4AE8" opacity="0.3"/>
      <rect x="98" y="38" width="20" height="2" rx="1" fill="white" opacity="0.5"/>
      <rect x="98" y="43" width="14" height="2" rx="1" fill="white" opacity="0.4"/>
      <rect x="98" y="48" width="17" height="2" rx="1" fill="white" opacity="0.3"/>
      {/* Monitor stand */}
      <rect x="103" y="58" width="6" height="6" rx="1" fill="#1F1B3A" opacity="0.5"/>
      <rect x="98" y="62" width="16" height="2" rx="1" fill="#1F1B3A" opacity="0.4"/>
      {/* Stars / sparkles */}
      <circle cx="140" cy="25" r="2" fill="#6D4AE8" opacity="0.5"/>
      <circle cx="30" cy="20" r="1.5" fill="#A78BFA" opacity="0.6"/>
      <circle cx="155" cy="50" r="1.5" fill="#6D4AE8" opacity="0.4"/>
    </svg>
  )
}

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={onClose}
          style={{ display: 'block' }}
        />
      )}

      <aside className={`sidebar${isOpen ? ' open' : ''}`}>
        {/* Nav items */}
        <nav style={{ flex: 1, padding: '12px 12px 0' }}>
          <div style={{ marginBottom: 4 }}>
            {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                style={{ display: 'flex', marginBottom: 2 }}
                onClick={onClose}
              >
                <Icon size={18} style={{ flexShrink: 0 }} />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Footer illustration */}
        <div style={{
          padding: '16px 16px 20px',
          borderTop: '1px solid var(--border)',
          textAlign: 'center',
          marginTop: 'auto',
        }}>
          <FooterIllustration />
          <div style={{
            fontWeight: 700,
            fontSize: 12,
            color: 'var(--primary)',
            marginTop: 8,
            lineHeight: 1.3,
          }}>
            "Learn Today,<br />Lead Tomorrow"
          </div>
          <div style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            marginTop: 4,
            lineHeight: 1.4,
          }}>
            J.D. College of Engineering<br />&amp; Management, Nagpur
          </div>
        </div>
      </aside>
    </>
  )
}
