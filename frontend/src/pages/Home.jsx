// src/pages/Home.jsx — AttendAI Home Dashboard with Live Session Management
import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  Users, CalendarDays, BarChart2, Bell,
  ChevronRight, Plus, Link2, FileText, UserCheck,
  TrendingUp, TrendingDown, CheckCircle, AlertTriangle,
  Clock, Activity, UserPlus, Zap, BookOpen,
  QrCode, Radio, Copy, Check, ExternalLink, X, Play, Loader, Shield
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '../context/AuthContext'
import {
  getHomeSummary, getHomeTrend, getHomeSubjects,
  getHomeSchedule, getHomeActivity, getHomeReport,
} from '../api/home'
import { createSession, getActiveSessions, endSession } from '../api/session'
import heroImg from '../assets/hero.png'

/* ─── tiny helpers ─────────────────────────────────────── */
function useData(fetcher, deps = []) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await fetcher(); setData(r.data) }
    catch { setData(null) }
    finally { setLoading(false) }
  }, deps) // eslint-disable-line
  useEffect(() => { load() }, [load])
  return { data, loading, reload: load }
}

function Skel({ w = '100%', h = 18, r = 8, mb = 0 }) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: r, marginBottom: mb }} />
}

/* ─── Live Countdown Tag ───────────────────────────────── */
function LiveCountdown({ expiresAt, onExpire }) {
  const [timeLeft, setTimeLeft] = useState('')
  useEffect(() => {
    if (!expiresAt) return
    const update = () => {
      const exp = new Date(expiresAt).getTime()
      const diff = Math.floor((exp - Date.now()) / 1000)
      if (diff <= 0) {
        setTimeLeft('Expired')
        onExpire?.()
      } else {
        const m = Math.floor(diff / 60)
        const s = diff % 60
        setTimeLeft(`${m}:${s < 10 ? '0' : ''}${s}`)
      }
    }
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [expiresAt, onExpire])

  return (
    <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
      {timeLeft || '...'}
    </span>
  )
}

/* ─── Stat Card ────────────────────────────────────────── */
function StatCard({ icon: Icon, value, label, delta, deltaLabel, colorClass = '', onClick }) {
  return (
    <div className="stat-card fade-in-up" onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default', flex: 1, minWidth: 0 }}>
      <div className="stat-card__icon" style={colorClass ? { background: colorClass, color: '#fff' } : {}}>
        <Icon size={22} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="stat-card__value">{value ?? <Skel w={60} h={28} />}</div>
        <div className="stat-card__label">{label}</div>
        {delta !== undefined && delta !== null && (
          <div className={`stat-card__delta ${delta >= 0 ? 'delta-up' : 'delta-down'}`}>
            {delta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(delta)}% {deltaLabel}
          </div>
        )}
        {typeof deltaLabel === 'object' && deltaLabel}
      </div>
    </div>
  )
}

/* ─── Subject Progress Bar ─────────────────────────────── */
function SubjectBar({ name, pct, color }) {
  const barColor = pct >= 75 ? 'var(--green)' : pct >= 60 ? 'var(--orange)' : 'var(--red)'
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: color || barColor, flexShrink: 0, display: 'inline-block' }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{name}</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{pct}%</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%`, background: color || barColor }} />
      </div>
    </div>
  )
}

/* ─── Quick Action Tile ────────────────────────────────── */
function QuickAction({ icon: Icon, title, subtitle, onClick, color = '#6D4AE8' }) {
  return (
    <div className="quick-action" onClick={onClick} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick?.()}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="quick-action__icon" style={{ background: `${color}18`, color }}>
          <Icon size={18} />
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{subtitle}</div>}
        </div>
      </div>
      <ChevronRight size={16} color="var(--text-muted)" />
    </div>
  )
}

/* ─── Upcoming Class Row ───────────────────────────────── */
function UpcomingClass({ item, onStartSession }) {
  return (
    <div className="upcoming-class">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'var(--primary-subtle)', color: 'var(--primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <CalendarDays size={16} />
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
            {item.start_time} – {item.end_time}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>
            {item.subject_name} ({item.class_name})
          </div>
        </div>
      </div>
      <button className="btn-join" onClick={() => onStartSession(item)}>
        <Radio size={12} style={{ marginRight: 4 }} /> Start Session
      </button>
    </div>
  )
}

/* ─── Activity Item ────────────────────────────────────── */
const ACTIVITY_ICONS = {
  attendance: CheckCircle,
  flagged:    AlertTriangle,
  enroll:     UserPlus,
  alert:      Bell,
}
function ActivityItem({ item }) {
  const Icon = ACTIVITY_ICONS[item.type] || Activity
  const ts = item.timestamp ? new Date(item.timestamp) : null
  const timeStr = ts
    ? ts.toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short', year: 'numeric' })
    : 'Unknown time'
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: `${item.color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: item.color, flexShrink: 0, marginTop: 1,
      }}>
        <Icon size={15} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4 }}>
          {item.title}
        </div>
        {item.subtitle && (
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>{item.subtitle}</div>
        )}
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{timeStr}</div>
      </div>
    </div>
  )
}

/* ─── Custom Tooltip ───────────────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '10px 14px', boxShadow: 'var(--shadow-card-lg)',
    }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary)' }}>
        {payload[0]?.value}%
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════ */
export default function Home() {
  const { faculty } = useAuth()
  const navigate = useNavigate()
  const [trendDays, setTrendDays] = useState(7)

  const { data: summary }   = useData(getHomeSummary)
  const { data: trend }     = useData(() => getHomeTrend(trendDays), [trendDays])
  const { data: subjects }  = useData(getHomeSubjects)
  const { data: schedule }  = useData(getHomeSchedule)
  const { data: activity }  = useData(getHomeActivity)
  const { data: report }    = useData(getHomeReport)

  // ── Live Session Management State ─────────────────────────
  const [activeSessions, setActiveSessions] = useState([])
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [selectedSession, setSelectedSession] = useState(null)
  const [submittingSession, setSubmittingSession] = useState(false)
  const [sessionError, setSessionError] = useState('')
  const [copiedCode, setCopiedCode] = useState(false)
  const [sessionFormData, setSessionFormData] = useState({
    subject_id: '',
    class_name: 'B.Tech CSE - 6A',
    section: 'A',
    duration_minutes: 30,
  })

  // Poll / fetch active sessions
  const fetchActiveSessions = useCallback(async () => {
    try {
      const { data } = await getActiveSessions()
      setActiveSessions(data || [])
    } catch {
      setActiveSessions([])
    }
  }, [])

  useEffect(() => {
    fetchActiveSessions()
    const timer = setInterval(fetchActiveSessions, 15000)
    return () => clearInterval(timer)
  }, [fetchActiveSessions])

  const openStartSession = (cls = null) => {
    if (cls) {
      setSessionFormData({
        subject_id: cls.subject_id || '',
        class_name: cls.class_name || 'B.Tech CSE - 6A',
        section: cls.section || 'A',
        duration_minutes: 45,
      })
    } else {
      setSessionFormData({
        subject_id: subjects && subjects.length > 0 ? subjects[0].subject_id : '',
        class_name: 'B.Tech CSE - 6A',
        section: 'A',
        duration_minutes: 30,
      })
    }
    setSessionError('')
    setSelectedSession(null)
    setShowSessionModal(true)
  }

  const handleCreateSession = async (e) => {
    e?.preventDefault()
    setSubmittingSession(true)
    setSessionError('')
    try {
      const payload = {
        subject_id: sessionFormData.subject_id ? Number(sessionFormData.subject_id) : null,
        class_name: sessionFormData.class_name.trim() || 'Class',
        section: sessionFormData.section.trim() || 'A',
        duration_minutes: Number(sessionFormData.duration_minutes) || 30,
      }
      const { data } = await createSession(payload)
      setSelectedSession(data)
      setActiveSessions(prev => [data, ...prev.filter(s => s.session_id !== data.session_id)])
    } catch (err) {
      setSessionError(err.response?.data?.detail || 'Failed to start session. Please try again.')
    } finally {
      setSubmittingSession(false)
    }
  }

  const handleEndSession = async (code) => {
    try {
      await endSession(code)
      setActiveSessions(prev => prev.filter(s => s.session_id !== code))
      if (selectedSession?.session_id === code) {
        setSelectedSession(null)
      }
    } catch (err) {
      console.error('Failed to end session:', err)
    }
  }

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  // Donut colours
  const DONUT_COLORS = ['#6D4AE8', '#EF4444', '#F59E0B']
  const donutData = report ? [
    { name: 'Present', value: report.present },
    { name: 'Absent',  value: report.absent },
    { name: 'Late',    value: report.late },
  ] : []

  return (
    <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Hero Banner ─────────────────────────────────────── */}
      <div className="hero-banner" style={{ minHeight: 185, alignItems: 'stretch' }}>
        <img src={heroImg} alt="College campus" className="hero-banner__bg" />
        <div className="hero-banner__overlay" />
        <div className="hero-banner__content" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {/* Date top-right */}
          <div style={{
            position: 'absolute', top: 14, right: 18, zIndex: 2,
            background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 8, padding: '5px 12px',
            fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: 500,
          }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
          </div>

          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, marginBottom: 4 }}>
            {new Date().getHours() < 12 ? 'Good Morning,' : new Date().getHours() < 17 ? 'Good Afternoon,' : 'Good Evening,'}
          </div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 26, lineHeight: 1.2, marginBottom: 6 }}>
            Prof. {faculty?.full_name} 👋
          </div>
          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginBottom: 14 }}>
            Your guidance builds brighter futures.<br />
            Let's make attendance easier and smarter.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
            <button
              onClick={() => openStartSession()}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.3)',
                padding: '10px 18px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
              }}
            >
              <Radio size={16} /> Start Live Attendance Session
            </button>
          </div>
        </div>

        {/* Campus watermark */}
        <div style={{
          position: 'absolute', bottom: 12, right: 16, zIndex: 1,
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '5px 10px',
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 10 }}>🏛</span>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, textAlign: 'right' }}>
            <div style={{ fontWeight: 600 }}>J.D. College of Engineering &amp; Management</div>
            <div style={{ fontSize: 10, opacity: 0.8 }}>Nagpur</div>
          </div>
        </div>
      </div>

      {/* ── Active Live Session Banner (if running) ─────────── */}
      {activeSessions.length > 0 && (
        <div className="card fade-in-up" style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0.15) 100%)',
          border: '1.5px solid rgba(139, 92, 246, 0.4)',
          borderRadius: 16,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          boxShadow: '0 10px 30px rgba(124, 58, 237, 0.12)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
              animation: 'pulse 2s infinite',
            }}>
              <Radio size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#ef4444', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  🔴 Live Attendance In Progress
                </span>
                <span style={{
                  background: 'var(--primary)', color: 'white', padding: '2px 8px',
                  borderRadius: 6, fontSize: 12, fontWeight: 800, letterSpacing: '0.08em',
                }}>
                  CODE: {activeSessions[0].session_id}
                </span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                {activeSessions[0].subject_name || activeSessions[0].class_name} · {activeSessions[0].class_name} (Sec {activeSessions[0].section || 'A'})
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={12} />
                <span>Time Remaining: <LiveCountdown expiresAt={activeSessions[0].expires_at} onExpire={fetchActiveSessions} /></span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => {
                setSelectedSession(activeSessions[0])
                setShowSessionModal(true)
              }}
              className="btn-primary"
              style={{ padding: '9px 16px', fontSize: 13, gap: 6 }}
            >
              <QrCode size={15} /> Show QR & Code
            </button>
            <button
              onClick={() => window.open(`/attendance?code=${activeSessions[0].session_id}`, '_blank')}
              className="btn-secondary"
              style={{ padding: '9px 14px', fontSize: 13, gap: 6 }}
              title="Open student kiosk in new tab"
            >
              <ExternalLink size={15} /> Open Kiosk
            </button>
            <button
              onClick={() => handleEndSession(activeSessions[0].session_id)}
              className="btn-danger"
              style={{ padding: '9px 14px', fontSize: 13 }}
            >
              End Session
            </button>
          </div>
        </div>
      )}

      {/* ── 4 Stat Cards ─────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div className="stat-card fade-in-up" style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => navigate('/classes')}>
          <div className="stat-card__icon"><Users size={22} /></div>
          <div style={{ minWidth: 0 }}>
            <div className="stat-card__value">{summary?.total_classes_today ?? '—'}</div>
            <div className="stat-card__label">My Classes</div>
            <div style={{ fontSize: 11, color: 'var(--primary)', marginTop: 2, fontWeight: 600 }}>View All →</div>
          </div>
        </div>

        <div className="stat-card fade-in-up" style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => navigate('/attendance-records')}>
          <div className="stat-card__icon" style={{ background: 'var(--green-bg)', color: 'var(--green)' }}>
            <UserCheck size={22} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="stat-card__value">{summary?.attendance_today_pct !== undefined ? `${summary.attendance_today_pct}%` : '—'}</div>
            <div className="stat-card__label">Today's Attendance</div>
            <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 2, fontWeight: 600 }}>
              {summary?.students_present_today ?? 0} present
            </div>
          </div>
        </div>

        <div className="stat-card fade-in-up" style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => navigate('/notifications')}>
          <div className="stat-card__icon" style={{ background: 'var(--amber-bg)', color: 'var(--amber)' }}>
            <AlertTriangle size={22} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="stat-card__value">{summary?.flagged_today ?? 0}</div>
            <div className="stat-card__label">Flagged Events</div>
            <div style={{ fontSize: 11, color: summary?.flagged_today > 0 ? 'var(--amber)' : 'var(--text-muted)', marginTop: 2, fontWeight: 600 }}>
              {summary?.flagged_today > 0 ? 'Requires Review →' : 'All Clear'}
            </div>
          </div>
        </div>

        <div className="stat-card fade-in-up" style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => navigate('/classes')}>
          <div className="stat-card__icon" style={{ background: 'var(--blue-bg)', color: 'var(--blue)' }}>
            <CalendarDays size={22} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="stat-card__value">{summary?.completed_today ?? '—'}</div>
            <div className="stat-card__label">Classes Today</div>
            <div style={{ fontSize: 11, color: 'var(--blue)', marginTop: 2, fontWeight: 600 }}>View Schedule →</div>
          </div>
        </div>
      </div>

      {/* ── Main 2-column grid ──────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>

        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Attendance Overview Chart */}
          <div className="card card-p">
            <div className="section-header">
              <div className="section-title">
                <div className="section-title__icon"><BarChart2 size={15} /></div>
                Attendance Overview
              </div>
              <select
                className="dropdown-select"
                value={trendDays}
                onChange={e => setTrendDays(Number(e.target.value))}
              >
                <option value={7}>Last 7 Days</option>
                <option value={30}>Last 30 Days</option>
                <option value={112}>Semester</option>
              </select>
            </div>

            {trend && trend.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={trend} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6D4AE8" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#6D4AE8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                    axisLine={false} tickLine={false}
                    tickFormatter={v => v.split('\n')[0]} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                    domain={[0, 100]} tickFormatter={v => `${v}%`}
                    axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="pct" stroke="#6D4AE8" strokeWidth={2.5}
                    fill="url(#areaGrad)" dot={{ fill: '#6D4AE8', r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#6D4AE8' }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Skel w="100%" h={160} />
              </div>
            )}
          </div>

          {/* Subject-wise Attendance */}
          <div className="card card-p">
            <div className="section-header">
              <div className="section-title">
                <div className="section-title__icon"><BookOpen size={15} /></div>
                Subject-wise Attendance
              </div>
            </div>
            {subjects && subjects.length > 0 ? subjects.map(s => (
              <SubjectBar key={s.subject_id} name={s.name} pct={s.attendance_pct} color={s.color} />
            )) : (
              [1,2,3,4,5].map(i => <Skel key={i} h={36} mb={12} />)
            )}
          </div>

          {/* Bottom row: Recent Activity */}
          <div className="card card-p">
            <div className="section-header">
              <div className="section-title">
                <div className="section-title__icon"><Clock size={15} /></div>
                Recent Activity
              </div>
              <button className="btn-ghost btn-sm" onClick={() => navigate('/notifications')}>
                View All →
              </button>
            </div>
            {activity && activity.length > 0
              ? activity.slice(0, 5).map((item, i) => (
                  <ActivityItem key={i} item={item} />
                ))
              : [1,2,3].map(i => (
                  <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <Skel w={32} h={32} r={16} />
                    <div style={{ flex: 1 }}><Skel w="80%" h={13} mb={6} /><Skel w="50%" h={11} /></div>
                  </div>
                ))
            }
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Quick Actions */}
          <div className="card card-p">
            <div className="section-title" style={{ marginBottom: 14 }}>
              <div className="section-title__icon"><Zap size={15} /></div>
              Quick Actions
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <QuickAction
                icon={Radio}
                title="Start Live Attendance Session"
                subtitle="Generate QR & 6-char session code"
                onClick={() => openStartSession()}
                color="#8B5CF6"
              />
              <QuickAction
                icon={Plus}
                title="Create / Manage Subject"
                subtitle="Add or edit subjects"
                onClick={() => navigate('/subjects')}
              />
              <QuickAction
                icon={FileText}
                title="View Attendance Reports"
                subtitle="Charts & CSV export"
                onClick={() => navigate('/reports')}
                color="#22C55E"
              />
              <QuickAction
                icon={UserCheck}
                title="Manage Students"
                subtitle="Search, filter, enroll"
                onClick={() => navigate('/students')}
                color="#F59E0B"
              />
            </div>
          </div>

          {/* Upcoming Classes */}
          <div className="card card-p">
            <div className="section-header">
              <div className="section-title">
                <div className="section-title__icon"><CalendarDays size={15} /></div>
                Upcoming Classes
              </div>
              <button className="btn-ghost btn-sm" onClick={() => navigate('/classes')}>View All →</button>
            </div>
            {schedule && schedule.length > 0
              ? schedule.slice(0, 5).map((cls, i) => (
                  <UpcomingClass key={i} item={cls} onStartSession={openStartSession} />
                ))
              : (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                  No upcoming classes scheduled
                </div>
              )
            }
          </div>

          {/* MSE Eligibility Summary */}
          <div className="card card-p">
            <div className="section-title" style={{ marginBottom: 14 }}>
              <div className="section-title__icon"><CheckCircle size={15} /></div>
              MSE Eligibility
            </div>
            {summary ? (
              <>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
                  Cutoff: <strong style={{ color: 'var(--text-primary)' }}>{summary.attendance_cutoff}%</strong>
                  &nbsp;&nbsp;|&nbsp;&nbsp;
                  Eligible ≥ <strong style={{ color: 'var(--text-primary)' }}>{summary.eligible_threshold}%</strong>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--green-bg)', borderRadius: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, background: 'var(--green)', borderRadius: '50%', display: 'inline-block' }} />
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#166534' }}>Eligible</span>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 15, color: '#166534' }}>{summary.eligible_count}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--amber-bg)', borderRadius: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, background: 'var(--amber)', borderRadius: '50%', display: 'inline-block' }} />
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#92400E' }}>At Risk</span>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 15, color: '#92400E' }}>{summary.at_risk_count}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--red-bg)', borderRadius: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, background: 'var(--red)', borderRadius: '50%', display: 'inline-block' }} />
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#991B1B' }}>Not Eligible</span>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 15, color: '#991B1B' }}>{summary.not_eligible_count}</span>
                  </div>
                </div>
                <button className="btn btn-outline btn-sm" style={{ width: '100%', marginTop: 12 }}
                  onClick={() => navigate('/students?status=needs_attention')}>
                  View At-Risk Students
                </button>
              </>
            ) : (
              <><Skel h={20} mb={8} /><Skel h={20} mb={8} /><Skel h={20} /></>
            )}
          </div>

          {/* Attendance Report Donut */}
          <div className="card card-p">
            <div className="section-title" style={{ marginBottom: 4 }}>
              <div className="section-title__icon"><BarChart2 size={15} /></div>
              Attendance Report
            </div>
            {report && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>{report.week_label}</div>
            )}
            {report && report.total > 0 ? (
              <>
                <div style={{ position: 'relative', height: 130 }}>
                  <ResponsiveContainer width="100%" height={130}>
                    <PieChart>
                      <Pie data={donutData} cx="50%" cy="50%" innerRadius={38} outerRadius={55}
                        dataKey="value" paddingAngle={2}>
                        {donutData.map((_, i) => (
                          <Cell key={i} fill={DONUT_COLORS[i]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Centre label */}
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center', pointerEvents: 'none',
                  }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--primary)' }}>
                      {report.present_pct}%
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Present</div>
                  </div>
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                  {[
                    { label: 'Present', count: report.present, pct: report.present_pct, color: DONUT_COLORS[0] },
                    { label: 'Absent',  count: report.absent,  pct: report.absent_pct,  color: DONUT_COLORS[1] },
                    { label: 'Late',    count: report.late,    pct: report.late_pct,    color: DONUT_COLORS[2] },
                  ].map(({ label, count, pct, color }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, background: color, borderRadius: 2, display: 'inline-block' }} />
                        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                      </div>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {count.toLocaleString()} ({pct}%)
                      </span>
                    </div>
                  ))}
                </div>
                <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 10 }}
                  onClick={() => navigate('/reports')}>
                  View Full Report →
                </button>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                No data for this week
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
         LIVE ATTENDANCE SESSION MODAL (Start or View QR/Code)
         ══════════════════════════════════════════════════════════════ */}
      {showSessionModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }}>
          <div className="card fade-in-up" style={{
            maxWidth: 520, width: '100%', borderRadius: 20,
            padding: '28px 24px', position: 'relative',
            maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
            border: '1px solid var(--border)',
          }}>
            <button
              onClick={() => setShowSessionModal(false)}
              style={{
                position: 'absolute', top: 18, right: 18,
                background: 'var(--bg-subtle, rgba(255,255,255,0.08))',
                border: 'none', borderRadius: '50%', width: 32, height: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--text-muted)',
              }}
            >
              <X size={18} />
            </button>

            {selectedSession ? (
              /* ── View Active QR Code & Session Details ── */
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444',
                  padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                  marginBottom: 10,
                }}>
                  <Radio size={14} className="pulse" /> LIVE SESSION ACTIVE
                </div>

                <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px', color: 'var(--text-primary)' }}>
                  {selectedSession.subject_name || selectedSession.class_name}
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 18px' }}>
                  {selectedSession.class_name} · Section {selectedSession.section || 'A'} · Prof. {selectedSession.teacher_name || faculty?.full_name}
                </p>

                {/* 6-char Session Code with Copy */}
                <div style={{
                  background: 'rgba(99, 102, 241, 0.08)',
                  border: '2px dashed var(--primary)',
                  borderRadius: 14,
                  padding: '14px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 16,
                  marginBottom: 20,
                }}>
                  <div>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', fontWeight: 700 }}>
                      Class Session Code
                    </div>
                    <div style={{
                      fontSize: 32, fontWeight: 900, letterSpacing: '0.2em',
                      color: 'var(--primary)', fontFamily: 'monospace',
                    }}>
                      {selectedSession.session_id}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopyCode(selectedSession.session_id)}
                    className="btn-secondary"
                    style={{ padding: '8px 12px', fontSize: 12, gap: 6 }}
                    title="Copy session code"
                  >
                    {copiedCode ? <Check size={16} color="var(--green)" /> : <Copy size={16} />}
                    {copiedCode ? 'Copied' : 'Copy'}
                  </button>
                </div>

                {/* QR Code Container */}
                <div style={{
                  background: '#ffffff',
                  padding: 16,
                  borderRadius: 16,
                  display: 'inline-block',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                  marginBottom: 14,
                }}>
                  <QRCodeSVG
                    value={`${window.location.origin}/attendance?code=${selectedSession.session_id}`}
                    size={200}
                    level="Q"
                    includeMargin={true}
                  />
                </div>

                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20 }}>
                  Students can point their camera at this QR code, or open <strong>/attendance</strong> and enter code <strong>{selectedSession.session_id}</strong>
                </div>

                {/* Countdown pill */}
                <div style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: 10,
                  padding: '8px 16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 20,
                }}>
                  <Clock size={15} />
                  <span>Time Remaining: <LiveCountdown expiresAt={selectedSession.expires_at} onExpire={fetchActiveSessions} /></span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => window.open(`/attendance?code=${selectedSession.session_id}`, '_blank')}
                    className="btn-primary"
                    style={{ flex: 1.5, justifyContent: 'center', padding: 12 }}
                  >
                    <ExternalLink size={16} /> Open Student Kiosk
                  </button>
                  <button
                    onClick={() => {
                      handleEndSession(selectedSession.session_id)
                      setShowSessionModal(false)
                    }}
                    className="btn-danger"
                    style={{ flex: 1, justifyContent: 'center', padding: 12 }}
                  >
                    End Session
                  </button>
                </div>
              </div>
            ) : (
              /* ── Form: Create New Attendance Session ── */
              <form onSubmit={handleCreateSession}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white',
                  }}>
                    <Radio size={22} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Start Live Attendance Session</h2>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Generate dynamic QR code & 6-character code for students</p>
                  </div>
                </div>

                {sessionError && (
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 10, padding: '10px 14px', color: '#f87171', fontSize: 13,
                    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
                  }}>
                    <AlertTriangle size={16} /> {sessionError}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                      Subject
                    </label>
                    <select
                      className="dropdown-select"
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 10 }}
                      value={sessionFormData.subject_id}
                      onChange={(e) => setSessionFormData({ ...sessionFormData, subject_id: e.target.value })}
                    >
                      <option value="">Select a Subject (Optional)</option>
                      {subjects?.map(s => (
                        <option key={s.subject_id} value={s.subject_id}>
                          {s.name} ({s.code || s.class_name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                        Class Name
                      </label>
                      <input
                        className="input-field"
                        placeholder="e.g. B.Tech CSE - 6A"
                        value={sessionFormData.class_name}
                        onChange={(e) => setSessionFormData({ ...sessionFormData, class_name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                        Section
                      </label>
                      <input
                        className="input-field"
                        placeholder="A"
                        value={sessionFormData.section}
                        onChange={(e) => setSessionFormData({ ...sessionFormData, section: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                      Session Duration
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                      {[15, 30, 45, 60].map(mins => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => setSessionFormData({ ...sessionFormData, duration_minutes: mins })}
                          style={{
                            padding: '10px 0',
                            borderRadius: 10,
                            border: sessionFormData.duration_minutes === mins ? '2px solid var(--primary)' : '1px solid var(--border)',
                            background: sessionFormData.duration_minutes === mins ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-card)',
                            color: sessionFormData.duration_minutes === mins ? 'var(--primary)' : 'var(--text-secondary)',
                            fontWeight: 700,
                            fontSize: 13,
                            cursor: 'pointer',
                          }}
                        >
                          {mins} mins
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowSessionModal(false)}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={submittingSession || !sessionFormData.class_name.trim()}
                    style={{ flex: 1.5, justifyContent: 'center', padding: 12 }}
                  >
                    {submittingSession ? (
                      <><Loader size={16} className="spin" /> Starting…</>
                    ) : (
                      <><Play size={16} /> Launch Session &amp; QR</>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
