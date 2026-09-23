// src/pages/Home.jsx — AttendAI Home Dashboard
import { useEffect, useState, useCallback } from 'react'
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
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  getHomeSummary, getHomeTrend, getHomeSubjects,
  getHomeSchedule, getHomeActivity, getHomeReport,
} from '../api/home'
import heroImg from '../assets/hero.png'

/* ─── tiny helpers ─────────────────────────────────────── */
function useData(fetcher, deps = []) {
  const [data, setData]     = useState(null)
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
function UpcomingClass({ item, onJoin }) {
  const icons = { DS: BookOpen, DBMS: BarChart2, WT: Zap, CN: Activity, OS: CheckCircle }
  const Icon = icons[item.subject_code] || BookOpen
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 0', borderBottom: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `${item.color || '#6D4AE8'}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: item.color || '#6D4AE8', flexShrink: 0,
        }}>
          <Icon size={16} />
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
      <button className="btn-join" onClick={() => onJoin(item)}>Join</button>
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

  const firstName = faculty?.full_name?.split(' ')[0] || 'Faculty'
  const dept = faculty?.department || 'CSE (Data Science)'

  const handleJoin = (cls) => {
    navigate(`/attendance?session_id=${encodeURIComponent(cls.session_id)}&session_label=${encodeURIComponent(cls.subject_name)}`)
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
          <div style={{
            fontSize: 12, color: 'rgba(255,255,255,0.65)', fontStyle: 'italic', marginBottom: 16,
            borderLeft: '2px solid rgba(255,255,255,0.3)', paddingLeft: 10,
          }}>
            "Education is not the filling of a pail,<br />but the lighting of a fire."
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
        <div className="stat-card fade-in-up" style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => navigate('/students')}>
          <div className="stat-card__icon" style={{ background: '#EFF6FF', color: '#3B82F6' }}><Users size={22} /></div>
          <div style={{ minWidth: 0 }}>
            <div className="stat-card__value">{summary?.total_students ?? '—'}</div>
            <div className="stat-card__label">Total Students</div>
            <div style={{ fontSize: 11, color: '#3B82F6', marginTop: 2, fontWeight: 600 }}>View Students →</div>
          </div>
        </div>
        <div className="stat-card fade-in-up" style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => navigate('/reports')}>
          <div className="stat-card__icon" style={{ background: 'var(--green-bg)', color: 'var(--green)' }}><CheckCircle size={22} /></div>
          <div style={{ minWidth: 0 }}>
            <div className="stat-card__value">{summary ? `${summary.average_attendance_pct}%` : '—'}</div>
            <div className="stat-card__label">Overall Attendance</div>
            <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 2, fontWeight: 600 }}>View Report →</div>
          </div>
        </div>
        <div className="stat-card fade-in-up" style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => navigate('/classes')}>
          <div className="stat-card__icon" style={{ background: 'var(--blue-bg)', color: 'var(--blue)' }}><CalendarDays size={22} /></div>
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
              <QuickAction icon={Plus}      title="Create / Manage Subject"  subtitle="Add or edit subjects"        onClick={() => navigate('/subjects')} />
              <QuickAction icon={Link2}     title="Generate Class Link"       subtitle="QR / Code for kiosk"         onClick={() => navigate('/attendance-records')} color="#3B82F6" />
              <QuickAction icon={FileText}  title="View Attendance Reports"   subtitle="Charts & CSV export"         onClick={() => navigate('/reports')}   color="#22C55E" />
              <QuickAction icon={UserCheck} title="Manage Students"           subtitle="Search, filter, enroll"      onClick={() => navigate('/students')}  color="#F59E0B" />
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
                  <UpcomingClass key={i} item={cls} onJoin={handleJoin} />
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
    </div>
  )
}
