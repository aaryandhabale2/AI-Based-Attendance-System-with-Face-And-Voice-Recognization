// src/pages/Login.jsx — Light theme, two-panel college-branded login
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { login as apiLogin } from '../api/auth'
import { GraduationCap, Eye, EyeOff, AlertCircle, Loader, Shield, Users, BarChart2 } from 'lucide-react'

function Feature({ icon: Icon, title, desc }) {
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={18} color="white" />
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'white', marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
  )
}

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await apiLogin(form.username, form.password)
      login(data.access_token, data.faculty)
      navigate('/home')
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-shell">
      {/* ── Left branding panel ──────────────────────────── */}
      <div className="login-left">
        {/* Decorative circles */}
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)', top: -100, right: -100 }} />
        <div style={{ position: 'absolute', width: 250, height: 250, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.12)', bottom: 60, left: -60 }} />

        <div style={{ position: 'relative', maxWidth: 400 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 48 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GraduationCap size={28} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 20, color: 'white' }}>AttendAI</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>J.D. College of Engineering &amp; Management</div>
            </div>
          </div>

          <h1 style={{ fontSize: 32, fontWeight: 800, color: 'white', marginBottom: 12, lineHeight: 1.2 }}>
            Smart Attendance<br />for Smarter Education
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', marginBottom: 48, lineHeight: 1.7 }}>
            AI-powered biometric attendance — face recognition + voice verification — with MSE eligibility tracking, 
            real-time analytics, and parent SMS alerts.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <Feature icon={Shield}   title="Dual Biometric Verification"   desc="ArcFace + ECAPA-TDNN voice, anti-replay challenge phrase" />
            <Feature icon={Users}    title="MSE Eligibility Tracking"       desc="55% cutoff with At-Risk early warning system" />
            <Feature icon={BarChart2} title="Real-time Analytics Dashboard"  desc="Subject-wise attendance, trend charts, and CSV export" />
          </div>
        </div>
      </div>

      {/* ── Right login form ─────────────────────────────── */}
      <div className="login-right">
        <div className="fade-in-up" style={{ width: '100%', maxWidth: 360 }}>
          {/* College shield icon */}
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: 'var(--primary-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 24,
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"
                fill="#6D4AE8" opacity="0.9"/>
              <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
            Faculty Sign In
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 28, lineHeight: 1.5 }}>
            Sign in to access the AttendAI teacher dashboard
          </p>

          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--red-bg)',
              border: '1px solid var(--red-border)',
              borderRadius: 10, padding: '12px 14px', marginBottom: 20,
              color: 'var(--red)', fontSize: 13,
            }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, letterSpacing: '0.4px' }}>
                USERNAME
              </label>
              <input
                className="input-field"
                type="text"
                id="login-username"
                placeholder="e.g. admin, prof_cs"
                value={form.username}
                onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))}
                required autoFocus
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, letterSpacing: '0.4px' }}>
                PASSWORD
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input-field"
                  type={showPw ? 'text' : 'password'}
                  id="login-password"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                  style={{ paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowPw(v => !v)} style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                  padding: 0, display: 'flex',
                }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button id="login-submit" className="btn btn-primary" type="submit" disabled={loading}
              style={{ marginTop: 4, justifyContent: 'center', padding: '12px' }}>
              {loading ? <><Loader size={16} className="spin" /> Signing in…</> : 'Sign In →'}
            </button>
          </form>

          {/* Demo accounts hint */}
          <div style={{ marginTop: 24, padding: '14px 16px', background: 'var(--bg-app)', borderRadius: 12, fontSize: 12, color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            <strong style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Demo accounts:</strong>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span>🔑 <code>admin</code> / <code>admin123</code> — Superadmin</span>
              <span>🔑 <code>prof_cs</code> / <code>prof123</code> — Faculty</span>
            </div>
          </div>

          <p style={{ marginTop: 20, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
            J.D. College of Engineering &amp; Management, Nagpur
          </p>
        </div>
      </div>
    </div>
  )
}
