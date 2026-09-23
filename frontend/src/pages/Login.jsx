// src/pages/Login.jsx — Exact match to reference UI (with real campus photo)
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { login as apiLogin } from '../api/auth'
import { Eye, EyeOff, AlertCircle, Loader2, Mail, Lock, GraduationCap, Mic, BarChart2, Shield } from 'lucide-react'
import heroImg from '../assets/hero.png'
import { studentLogin } from '../api/student'
import { useStudent } from '../context/StudentContext'

/* ── College Crest SVG ─────────────────────────────────────────────── */
function CollegeCrest({ size = 36 }) {
  return (
    <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: size, height: size, flexShrink: 0 }}>
      <circle cx="22" cy="22" r="21" fill="white" stroke="#E8E5F5" strokeWidth="1"/>
      <circle cx="22" cy="22" r="20" fill="none" stroke="#6D4AE8" strokeWidth="1.5"/>
      <circle cx="22" cy="22" r="16" fill="none" stroke="#6D4AE8" strokeWidth="0.7" strokeDasharray="2 1.5"/>
      <circle cx="22" cy="22" r="13" fill="url(#lg2)"/>
      <defs>
        <linearGradient id="lg2" x1="12" y1="10" x2="32" y2="34">
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

/* ── Bottom feature chip ───────────────────────────────────────────── */
function FeatureChip({ icon: Icon, title, subtitle }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 16px',
      background: 'rgba(255,255,255,0.12)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,255,255,0.2)',
      borderRadius: 12,
      flex: 1,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: 'rgba(255,255,255,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={16} color="white" />
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>{title}</div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>{subtitle}</div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   MAIN LOGIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function Login() {
  const [tab, setTab]           = useState('teacher')
  const [form, setForm]         = useState({ username: '', password: '' })
  const [showPw, setShowPw]     = useState(false)
  const [remember, setRemember] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const { login }               = useAuth()
  const { loginStudent }        = useStudent()
  const navigate                = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (tab === 'student') {
        // Student login: roll_no + password
        const { data } = await studentLogin(form.username, form.password)
        loginStudent(data.access_token, data.student)
        navigate('/student/dashboard')
      } else {
        // Faculty login: username + password
        const { data } = await apiLogin(form.username, form.password)
        login(data.access_token, data.faculty)
        navigate('/home')
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', width: '100%', position: 'relative', overflow: 'hidden',
      fontFamily: "'Inter', system-ui, sans-serif",
      display: 'flex', flexDirection: 'column',
    }}>

      {/* ── Background campus photo ──────────────────────────── */}
      <img
        src={heroImg}
        alt="JD College Campus"
        style={{
          position: 'fixed', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: 'center 30%',
          zIndex: 0,
        }}
      />
      {/* Purple-tinted overlay — light so photo stays clear and vivid */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1,
        background: 'linear-gradient(135deg, rgba(45,15,90,0.65) 0%, rgba(80,35,160,0.50) 40%, rgba(109,74,232,0.30) 70%, rgba(150,100,255,0.15) 100%)',
      }} />

      {/* ── TOP NAVIGATION BAR ───────────────────────────────── */}
      <div style={{
        position: 'relative', zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 40px',
        background: 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        {/* Left: Logo + College Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <CollegeCrest size={40} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'white', lineHeight: 1.2 }}>
              J.D. College of Engineering &amp; Management
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Nagpur</div>
          </div>
        </div>

        {/* Center: AI Attendance System */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'white' }}>AI Attendance System</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>Face &nbsp;•&nbsp; Voice &nbsp;•&nbsp; Smarter Attendance</div>
        </div>

        {/* Right: Back to Home */}
        <button
          onClick={() => navigate('/home')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px',
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: 10, color: 'white', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit', backdropFilter: 'blur(4px)',
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
        >
          🏠 Back to Home
        </button>
      </div>

      {/* ── MAIN CONTENT ─────────────────────────────────────── */}
      <div style={{
        flex: 1, position: 'relative', zIndex: 5,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '40px 60px',
        gap: 40,
      }}>

        {/* LEFT: College welcome text */}
        <div style={{ flex: 1, maxWidth: 480 }}>
          {/* LEARN • GROW • ACHIEVE tagline */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20,
          }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.4)' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '2px' }}>
              LEARN &nbsp;•&nbsp; GROW &nbsp;•&nbsp; ACHIEVE
            </span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.4)' }} />
          </div>

          <div style={{ fontSize: 16, fontWeight: 500, color: 'rgba(255,255,255,0.85)', marginBottom: 8 }}>
            Welcome to
          </div>
          <h1 style={{
            fontSize: 40, fontWeight: 900, color: 'white', lineHeight: 1.1, marginBottom: 12,
            textShadow: '0 2px 20px rgba(0,0,0,0.3)',
          }}>
            J.D. College of<br />
            Engineering &amp; Management
          </h1>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginBottom: 16 }}>
            Nagpur
          </div>
          <p style={{
            fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, maxWidth: 360,
          }}>
            Empowering students with knowledge,<br />
            innovation and values for a better tomorrow.
          </p>
        </div>

        {/* RIGHT: Login card */}
        <div style={{
          width: 420, flexShrink: 0,
          background: 'white',
          borderRadius: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}>
          {/* Card top section */}
          <div style={{ padding: '28px 32px 20px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 40, height: 40,
                  background: 'linear-gradient(135deg, #EDE9FF, #C4B5FD)',
                  borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <GraduationCap size={20} color="#6D4AE8" />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#1F1B3A' }}>AI Attendance System</div>
                  <div style={{ fontSize: 10, color: '#9CA3AF' }}>J.D. College of Engineering &amp; Management, Nagpur</div>
                </div>
              </div>
              {/* "Better Together" handwritten style */}
              <div style={{
                fontFamily: "'Dancing Script', 'Brush Script MT', cursive",
                fontSize: 14, color: '#6D4AE8', fontWeight: 700, lineHeight: 1.2,
                textAlign: 'right',
              }}>
                Better<br />Together
              </div>
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1F1B3A', marginBottom: 4 }}>
              Login to Your Account
            </h2>
            <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 20 }}>
              Access your dashboard and manage your attendance system.
            </p>

            {/* Teacher / Student tabs */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderRadius: 10, overflow: 'hidden', border: '1.5px solid #6D4AE8' }}>
              {[
                { key: 'teacher', label: '👨‍🏫 Teacher', icon: GraduationCap },
                { key: 'student', label: '🎓 Student', icon: GraduationCap },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  style={{
                    flex: 1, padding: '10px 0',
                    background: tab === t.key ? '#6D4AE8' : 'white',
                    color: tab === t.key ? 'white' : '#6D4AE8',
                    border: 'none', fontWeight: 700, fontSize: 13,
                    cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'all 0.2s',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Error */}
            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#FEF2F2', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 8, padding: '9px 12px', marginBottom: 14,
                color: '#DC2626', fontSize: 13,
              }}>
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Email field */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  {tab === 'student' ? 'Roll Number' : 'College Email / Employee ID'}
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} style={{
                    position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
                    color: '#9CA3AF', pointerEvents: 'none',
                  }} />
                  <input
                    id="login-username"
                    type="text"
                    placeholder={tab === 'student' ? 'Enter your Roll Number (e.g. CSA001)' : 'Enter your email or ID'}
                    value={form.username}
                    onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                    required autoFocus
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '11px 14px 11px 40px',
                      background: '#F9FAFB', border: '1.5px solid #E5E7EB',
                      borderRadius: 10, fontSize: 14,
                      color: '#1F1B3A', fontFamily: 'inherit', outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={e => e.target.style.borderColor = '#6D4AE8'}
                    onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                  />
                </div>
              </div>

              {/* Password field */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={{
                    position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
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
                      padding: '11px 44px 11px 40px',
                      background: '#F9FAFB', border: '1.5px solid #E5E7EB',
                      borderRadius: 10, fontSize: 14,
                      color: '#1F1B3A', fontFamily: 'inherit', outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={e => e.target.style.borderColor = '#6D4AE8'}
                    onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)} style={{
                    position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 0, display: 'flex',
                  }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Remember me + Forgot */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13, color: '#6B7280' }}>
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={e => setRemember(e.target.checked)}
                    style={{ accentColor: '#6D4AE8', width: 15, height: 15 }}
                  />
                  Remember me
                </label>
                <button type="button" style={{
                  background: 'none', border: 'none', color: '#6D4AE8',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0,
                }}>
                  Forgot Password?
                </button>
              </div>

              {/* Login button */}
              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '13px',
                  background: loading ? '#A78BFA' : 'linear-gradient(90deg, #5538CC 0%, #7C3AED 100%)',
                  color: 'white', border: 'none', borderRadius: 12,
                  fontSize: 15, fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: '0 4px 20px rgba(109,74,232,0.4)',
                  transition: 'opacity 0.2s, transform 0.1s',
                  marginTop: 4,
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = '0.92' }}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                {loading
                  ? <><Loader2 size={16} className="spin" /> Signing in…</>
                  : 'Login  →'
                }
              </button>
            </form>

            {/* OR divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
              <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
              <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500 }}>OR</span>
              <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
            </div>

            {/* Google button */}
            <button
              type="button"
              style={{
                width: '100%', padding: '11px',
                background: 'white', border: '1.5px solid #E5E7EB', borderRadius: 12,
                fontSize: 14, fontWeight: 600, color: '#374151',
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                transition: 'border-color 0.2s, background 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F9FAFB'; e.currentTarget.style.borderColor = '#6D4AE8' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#E5E7EB' }}
            >
              {/* Google G logo */}
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Login with Google
            </button>
          </div>

          {/* Secure footer inside card */}
          <div style={{
            padding: '12px 32px 20px',
            display: 'flex', alignItems: 'center', gap: 10,
            borderTop: '1px solid #F3F4F6',
          }}>
            <Shield size={18} color="#6D4AE8" />
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>
                Secure &nbsp;•&nbsp; Reliable &nbsp;•&nbsp; Trusted
              </div>
              <div style={{ fontSize: 11, color: '#9CA3AF' }}>Your data is always protected.</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM FEATURE CHIPS ─────────────────────────────── */}
      <div style={{
        position: 'relative', zIndex: 5,
        display: 'flex', gap: 12,
        padding: '0 60px 28px',
        maxWidth: 540,
      }}>
        <FeatureChip icon={GraduationCap} title="Face Recognition" subtitle="Secure & Accurate" />
        <FeatureChip icon={Mic}           title="Voice Recognition" subtitle="Authentic Verification" />
        <FeatureChip icon={BarChart2}     title="Smart Reports" subtitle="Track & Improve" />
      </div>

      {/* ── BOTTOM FOOTER BAR ────────────────────────────────── */}
      <div style={{
        position: 'relative', zIndex: 5,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 40px',
        background: 'rgba(0,0,0,0.3)',
        backdropFilter: 'blur(8px)',
        fontSize: 11, color: 'rgba(255,255,255,0.65)',
      }}>
        <span>© 2025 J.D. College of Engineering &amp; Management, Nagpur &nbsp;|&nbsp; AI Attendance System</span>
        <span style={{ fontStyle: 'italic' }}>"Discipline today builds success tomorrow." ——</span>
      </div>
    </div>
  )
}
