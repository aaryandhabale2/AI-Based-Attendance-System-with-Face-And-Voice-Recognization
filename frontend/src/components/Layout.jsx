// src/components/Layout.jsx — Sidebar + main content shell
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, UserPlus, Camera, Bell, LogOut,
  GraduationCap, ChevronRight
} from 'lucide-react'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/enroll',    icon: UserPlus,        label: 'Enroll Students' },
  { to: '/attendance', icon: Camera,          label: 'Take Attendance' },
]

export default function Layout({ children }) {
  const { faculty, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* ── Sidebar ── */}
      <aside style={{
        width: 240,
        flexShrink: 0,
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
        gap: 4,
      }}>
        {/* Logo */}
        <div style={{ padding: '0 6px 24px', borderBottom: '1px solid var(--border)', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--gradient-blue)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <GraduationCap size={20} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>AttendAI</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Smart Attendance System</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              style={{ textDecoration: 'none' }}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </div>

        {/* Faculty info + logout */}
        <div style={{
          borderTop: '1px solid var(--border)',
          paddingTop: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          <div style={{ padding: '0 6px' }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{faculty?.full_name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {faculty?.is_superadmin ? 'Superadmin' : 'Faculty'}
              {faculty?.department ? ` · ${faculty.department}` : ''}
            </div>
          </div>
          <button className="btn-secondary" onClick={handleLogout} style={{ justifyContent: 'flex-start', padding: '8px 12px' }}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main style={{ flex: 1, overflow: 'auto', padding: '32px 40px' }}>
        {children}
      </main>
    </div>
  )
}
