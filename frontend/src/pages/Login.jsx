// src/pages/Login.jsx — Exact match to reference UI screenshot
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { login as apiLogin } from '../api/auth'
import { Eye, EyeOff, AlertCircle, Loader2, Mail, Lock, Monitor, Users2, Sparkles } from 'lucide-react'
import heroImg from '../assets/hero.png'

// ── College Crest (same as TopBar) ────────────────────────────────────────────
function CollegeCrest({ size = 44 }) {
  return (
    <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: size, height: size }}>
      <circle cx="22" cy="22" r="21" fill="white" stroke="#E8E5F5" strokeWidth="1"/>
      <circle cx="22" cy="22" r="20" fill="none" stroke="#6D4AE8" strokeWidth="1.5"/>
      <circle cx="22" cy="22" r="16" fill="none" stroke="#6D4AE8" strokeWidth="0.7" strokeDasharray="2 1.5"/>
      <circle cx="22" cy="22" r="13" fill="url(#lg1)"/>
      <defs>
        <linearGradient id="lg1" x1="12" y1="10" x2="32" y2="34">
          <stop offset="0%" stopColor="#3A1F8A"/>
          <stop offset="100%" stopColor="#6D4AE8"/>
        </linearGradient>
      </defs>
      <rect x="16" y="19" width="12" height="8" rx="1" fill="none" stroke="white" strokeWidth="1.2"/>
      <line x1="22" y1="19" x2="22" y2="27" stroke="white" strokeWidth="1.2"/>
      <path d="M16 20.5 C18 19.5 20.5 19.5 22 20.5 C23.5 19.5 26 19.5 28 20.5" stroke="#FFD700" strokeWidth="1" fill="none"/>
      <path d="M22 11 C21 13 20 14 20.5 15.5 C21 17 23 17 23.5 15.5 C24 14 23 13 22 11Z" fill="#FFD700" opacity="0.9"/>
      <circle cx="16" cy="15" r="0.8" fill="#FFD700"/>
      <circle cx="28" cy="15" r="0.8" fill="#FFD700"/>
      <text x="22" y="30.5" textAnchor="middle" fontSize="4.5" fontWeight="bold" fill="white" fontFamily="Inter,sans-serif" letterSpacing="0.5">JD</text>
    </svg>
  )
}

// ── Bottom feature cards ────────────────────────────────────────────────────
function FeatureCard({ icon, title }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      padding: '14px 12px',
      background: 'rgba(255,255,255,0.08)',
      borderRadius: 14,
      border: '1px solid rgba(255,255,255,0.15)',
      backdropFilter: 'blur(8px)',
      textAlign: 'center',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: 'rgba(255,255,255,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.9)', lineHeight: 1.4 }}>
        {title}
      </div>
    </div>
  )
}

export default function Login() {
  const [tab, setTab]         = useState('teacher') // 'student' | 'teacher'
  const [form, setForm]       = useState({ username: '', password: '' })
  const [showPw, setShowPw]   = useState(false)
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const { login }             = useAuth()
  const navigate              = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await apiLogin(form.username, form.password)
      login(data.access_token, data.faculty)
      navigate('/home')
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', width: '100%',
      display: 'flex', position: 'relative', overflow: 'hidden',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* ── Full-screen background photo ─────────────────────── */}
      <img
        src={heroImg}
        alt="JD College Campus"
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: 'center',
          zIndex: 0,
        }}
      />
      {/* Dark overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'linear-gradient(135deg, rgba(20,8,60,0.82) 0%, rgba(45,27,110,0.75) 40%, rgba(109,74,232,0.55) 100%)',
      }} />

      {/* ── Content wrapper ───────────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 2, width: '100%', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* TopBar inside login */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 40px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <CollegeCrest size={44} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'white', lineHeight: 1.2 }}>
                J.D. College of Engineering &amp; Management
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Nagpur</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>Smarter Attendance</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Brighter Tomorrows</div>
          </div>
        </div>

        {/* ── Main content: quote left + form right ─────────── */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 60px',
          gap: 40,
        }}>
          {/* Left: quote / branding */}
          <div style={{ flex: 1, maxWidth: 420 }}>
            <div style={{ fontSize: 44, fontWeight: 900, color: 'white', lineHeight: 1.15, marginBottom: 16 }}>
              Learn<br />Today<br />Lead<br />Tomorrow
            </div>
            <div style={{ width: 40, height: 3, background: 'rgba(255,255,255,0.5)', borderRadius: 2 }} />
          </div>

          {/* Right: login card */}
          <div style={{
            width: 420,
            background: 'rgba(255,255,255,0.97)',
            borderRadius: 20,
            padding: '36px 36px 28px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
            flexShrink: 0,
            animation: 'fadeInUp 0.35s ease',
          }}>
            {/* Card header */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ marginBottom: 12 }}>
                <CollegeCrest size={52} />
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1F1B3A', marginBottom: 4 }}>
                Welcome to<br />
                <span style={{ color: '#6D4AE8' }}>AI Attendance System</span>
              </h1>
              <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 2 }}>
                J.D. College of Engineering &amp; Management, Nagpur
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 8, fontSize: 11, color: '#9CA3AF' }}>
                <span>Secure</span>
                <span>•</span>
                <span>Simple</span>
                <span>•</span>
                <span>Smart</span>
              </div>
            </div>

            {/* Student / Teacher tabs */}
            <div style={{
              display: 'flex', gap: 0,
              background: '#F3F4F6', borderRadius: 12, padding: 4,
              marginBottom: 24,
            }}>
              {['student', 'teacher'].map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    flex: 1, padding: '9px 0',
                    background: tab === t ? '#6D4AE8' : 'transparent',
                    color: tab === t ? 'white' : '#6B7280',
                    border: 'none', borderRadius: 9,
                    fontWeight: 700, fontSize: 13,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s ease',
                    textTransform: 'capitalize',
                  }}
                >
                  {t === 'student' ? '🎓 Student' : '👨‍🏫 Teacher'}
                </button>
              ))}
            </div>

            {/* Error */}
            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: '#FEF2F2', border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 10, padding: '10px 14px', marginBottom: 16,
                color: '#EF4444', fontSize: 13,
              }}>
                <AlertCircle size={15} /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Email / Username */}
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{
                  position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                  color: '#9CA3AF', pointerEvents: 'none',
                }} />
                <input
                  id="login-username"
                  type="text"
                  placeholder="Enter your email"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  required autoFocus
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '12px 14px 12px 42px',
                    background: '#F9FAFB',
                    border: '1.5px solid #E5E7EB',
                    borderRadius: 10, fontSize: 14,
                    color: '#1F1B3A', fontFamily: 'inherit',
                    outline: 'none', transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#6D4AE8'}
                  onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                />
              </div>

              {/* Password */}
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{
                  position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                  color: '#9CA3AF', pointerEvents: 'none',
                }} />
                <input
                  id="login-password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '12px 44px 12px 42px',
                    background: '#F9FAFB',
                    border: '1.5px solid #E5E7EB',
                    borderRadius: 10, fontSize: 14,
                    color: '#1F1B3A', fontFamily: 'inherit',
                    outline: 'none', transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#6D4AE8'}
                  onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                />
                <button type="button" onClick={() => setShowPw(v => !v)} style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 0, display: 'flex',
                }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Remember me + Forgot */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#6B7280' }}>
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={e => setRemember(e.target.checked)}
                    style={{ accentColor: '#6D4AE8', width: 15, height: 15 }}
                  />
                  Remember me
                </label>
                <button type="button" style={{
                  background: 'none', border: 'none', color: '#6D4AE8', fontSize: 13,
                  fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0,
                }}>
                  Forgot password?
                </button>
              </div>

              {/* Login button */}
              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '13px',
                  background: loading ? '#A78BFA' : 'linear-gradient(135deg, #5538CC, #6D4AE8)',
                  color: 'white', border: 'none', borderRadius: 12,
                  fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'opacity 0.2s',
                  boxShadow: '0 4px 16px rgba(109,74,232,0.35)',
                  marginTop: 4,
                }}
              >
                {loading ? <><Loader2 size={16} className="spin" /> Signing in…</> : 'Login'}
              </button>
            </form>

            {/* Footer */}
            <div style={{
              marginTop: 20, paddingTop: 16, borderTop: '1px solid #F3F4F6',
              textAlign: 'center', fontSize: 11, color: '#9CA3AF', lineHeight: 1.6,
            }}>
              © 2025 J.D. College of Engineering &amp; Management, Nagpur<br />
              Building a Smarter Campus with AI
            </div>
          </div>
        </div>

        {/* ── Bottom feature cards ──────────────────────────────── */}
        <div style={{
          padding: '20px 60px 28px',
          display: 'flex', gap: 16,
          maxWidth: 540,
        }}>
          <FeatureCard
            icon={<Monitor size={18} color="white" />}
            title="Modern Technology for Education"
          />
          <FeatureCard
            icon={<Users2 size={18} color="white" />}
            title="Efficient Attendance Management"
          />
          <FeatureCard
            icon={<Sparkles size={18} color="white" />}
            title="A Smarter Tomorrow"
          />
        </div>
      </div>
    </div>
  )
}
