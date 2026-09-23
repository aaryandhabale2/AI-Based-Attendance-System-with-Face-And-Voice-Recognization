// src/components/Sidebar.jsx — 9-item navigation sidebar with footer illustration
import { NavLink } from 'react-router-dom'
import {
  Home, BookOpen, Layers, Users, CalendarCheck,
  BarChart2, Bell, Settings, GraduationCap, UserCircle2,
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/home',          icon: Home,          label: 'Home' },
  { to: '/classes',       icon: GraduationCap, label: 'My Classes' },
  { to: '/subjects',      icon: Layers,        label: 'Subjects' },
  { to: '/students',      icon: Users,         label: 'Students' },
  { to: '/attendance',    icon: CalendarCheck, label: 'Attendance' },
  { to: '/reports',       icon: BarChart2,     label: 'Reports' },
  { to: '/notifications', icon: Bell,          label: 'Notifications' },
  { to: '/profile',       icon: UserCircle2,   label: 'Profile' },
  { to: '/settings',      icon: Settings,      label: 'Settings' },
]

// College building silhouette illustration for sidebar footer
function FooterIllustration() {
  return (
    <svg viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', maxWidth: 160, opacity: 0.9 }}>
      {/* Sky background */}
      <rect x="0" y="40" width="160" height="60" rx="4" fill="#EDE9FF" opacity="0.5"/>
      {/* Ground */}
      <rect x="0" y="82" width="160" height="18" rx="4" fill="#D4CCFF" opacity="0.4"/>
      {/* Main building body */}
      <rect x="30" y="38" width="100" height="46" rx="2" fill="#6D4AE8" opacity="0.85"/>
      {/* Building lighter facade */}
      <rect x="32" y="40" width="96" height="44" rx="1" fill="#7B5CF0" opacity="0.5"/>
      {/* Roof line / parapet */}
      <rect x="28" y="34" width="104" height="6" rx="2" fill="#5538CC"/>
      {/* Center entrance arch */}
      <rect x="68" y="60" width="24" height="24" rx="1" fill="#2D1B6E"/>
      <ellipse cx="80" cy="60" rx="12" ry="8" fill="#2D1B6E"/>
      {/* Entrance steps */}
      <rect x="64" y="82" width="32" height="3" rx="1" fill="#4A2DB8"/>
      <rect x="67" y="79" width="26" height="3" rx="1" fill="#5538CC"/>
      {/* Windows row 1 */}
      <rect x="38" y="45" width="12" height="9" rx="1" fill="white" opacity="0.3"/>
      <rect x="55" y="45" width="9" height="9" rx="1" fill="white" opacity="0.3"/>
      <rect x="96" y="45" width="9" height="9" rx="1" fill="white" opacity="0.3"/>
      <rect x="110" y="45" width="12" height="9" rx="1" fill="white" opacity="0.3"/>
      {/* Windows row 2 */}
      <rect x="38" y="60" width="12" height="9" rx="1" fill="white" opacity="0.25"/>
      <rect x="55" y="60" width="9" height="9" rx="1" fill="white" opacity="0.25"/>
      <rect x="96" y="60" width="9" height="9" rx="1" fill="white" opacity="0.25"/>
      <rect x="110" y="60" width="12" height="9" rx="1" fill="white" opacity="0.25"/>
      {/* Side wings */}
      <rect x="4" y="52" width="28" height="32" rx="2" fill="#6D4AE8" opacity="0.6"/>
      <rect x="128" y="52" width="28" height="32" rx="2" fill="#6D4AE8" opacity="0.6"/>
      {/* Palm trees */}
      <rect x="18" y="62" width="3" height="20" rx="1" fill="#4A2DB8"/>
      <ellipse cx="19.5" cy="60" rx="9" ry="6" fill="#22C55E" opacity="0.7"/>
      <rect x="139" y="62" width="3" height="20" rx="1" fill="#4A2DB8"/>
      <ellipse cx="140.5" cy="60" rx="9" ry="6" fill="#22C55E" opacity="0.7"/>
      {/* Flag pole */}
      <line x1="80" y1="10" x2="80" y2="34" stroke="#5538CC" strokeWidth="1.5"/>
      <rect x="80" y="10" width="14" height="9" rx="1" fill="#6D4AE8"/>
      {/* Stars in sky */}
      <circle cx="12" cy="15" r="1.5" fill="#6D4AE8" opacity="0.5"/>
      <circle cx="148" cy="20" r="1.5" fill="#6D4AE8" opacity="0.5"/>
      <circle cx="90" cy="8" r="1" fill="#A78BFA" opacity="0.6"/>
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
