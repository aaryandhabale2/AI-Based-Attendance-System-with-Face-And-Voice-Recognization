// src/pages/Dashboard.jsx
import { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  Users, TrendingUp, AlertTriangle, BellOff, Bell,
  Download, Search, RefreshCw, Filter, CheckCircle,
  XCircle, AlertCircle, Send, Check
} from 'lucide-react'
import { getDashboardStats, getAttendanceTrend, getClassSummary, getStudentTable } from '../api/dashboard'
import { getAlerts, triggerAlerts } from '../api/alerts'
import { exportAttendanceCSV } from '../api/attendance'

/* ── Sub-components ───────────────────────────────────────────────────────── */
function StatCard({ title, value, subtitle, icon: Icon, gradient, loading }) {
  if (loading) return (
    <div className="glass-card" style={{ padding: 24 }}>
      <div className="skeleton" style={{ height: 16, width: 80, marginBottom: 12 }} />
      <div className="skeleton" style={{ height: 40, width: 60, marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 12, width: 120 }} />
    </div>
  )
  return (
    <div className="glass-card fade-in-up" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.4px', textTransform: 'uppercase' }}>{title}</span>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} color="white" />
        </div>
      </div>
      <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-1px' }}>{value}</div>
      {subtitle && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{subtitle}</div>}
    </div>
  )
}

function EligibilityBadge({ status, isEligible, isAtRisk }) {
  const s = status || (isEligible ? 'eligible' : isAtRisk ? 'at_risk' : 'not_eligible')
  if (s === 'eligible') return <span className="badge badge-green"><CheckCircle size={10} />Eligible</span>
  if (s === 'at_risk')  return <span className="badge badge-amber"><AlertCircle size={10} />At Risk</span>
  return                       <span className="badge badge-rose"><XCircle size={10} />Not Eligible</span>
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color, fontSize: 13, fontWeight: 600 }}>
          {p.name}: {p.value}{p.name.includes('pct') ? '%' : ''}
        </div>
      ))}
    </div>
  )
}

/* ── Main Dashboard ───────────────────────────────────────────────────────── */
export default function Dashboard() {
  const [stats, setStats]     = useState(null)
  const [trend, setTrend]     = useState([])
  const [classes, setClasses] = useState([])
  const [students, setStudents] = useState([])
  const [alerts, setAlerts]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [alertTriggering, setAlertTriggering] = useState(false)
  const [activeTab, setActiveTab] = useState('students') // students | alerts

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, t, c, st, al] = await Promise.all([
        getDashboardStats(),
        getAttendanceTrend(8),
        getClassSummary(),
        getStudentTable({ search, status: statusFilter || undefined }),
        getAlerts(20),
      ])
      setStats(s.data)
      setTrend(t.data)
      setClasses(c.data)
      setStudents(st.data)
      setAlerts(al.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [search, statusFilter])

  useEffect(() => { load() }, [load])

  const handleExport = async () => {
    try {
      const { data } = await exportAttendanceCSV({})
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url; a.download = 'attendance_export.csv'; a.click()
      URL.revokeObjectURL(url)
    } catch (e) { alert('Export failed') }
  }

  const handleTriggerAlerts = async () => {
    if (!window.confirm('Send SMS alerts to all at-risk and ineligible students?')) return
    setAlertTriggering(true)
    try {
      const { data } = await triggerAlerts()
      alert(`Alerts sent: ${data.sent} | Failed: ${data.failed} | Provider: ${data.provider}`)
      load()
    } catch (e) { alert('Alert trigger failed') }
    finally { setAlertTriggering(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>Dashboard</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
            Real-time attendance overview and analytics
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-secondary" onClick={load} title="Refresh">
            <RefreshCw size={16} />
          </button>
          <button className="btn-secondary" onClick={handleExport}>
            <Download size={16} /> Export CSV
          </button>
          <button className="btn-primary" onClick={handleTriggerAlerts} disabled={alertTriggering}>
            <Send size={16} /> {alertTriggering ? 'Sending…' : 'Send Alerts'}
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard title="Total Students" value={stats?.total_students ?? '—'} subtitle="Enrolled" icon={Users} gradient="var(--gradient-blue)" loading={loading} />
        <StatCard title="Avg Attendance" value={stats ? `${stats.average_attendance_pct}%` : '—'} subtitle="Across all classes" icon={TrendingUp} gradient="var(--gradient-green)" loading={loading} />
        <StatCard title="MSE Eligible" value={stats?.eligible_count ?? '—'} subtitle={`≥ ${(stats?.attendance_cutoff ?? 55) + (stats?.at_risk_margin ?? 5)}% threshold`} icon={CheckCircle} gradient="linear-gradient(135deg, #10b981, #059669)" loading={loading} />
        <StatCard title="At Risk / Ineligible" value={stats ? ((stats.at_risk_count ?? 0) + (stats.not_eligible_count ?? 0)) : '—'} subtitle={`${stats?.at_risk_count ?? 0} at risk · ${stats?.not_eligible_count ?? 0} not eligible`} icon={AlertTriangle} gradient="var(--gradient-amber)" loading={loading} />
      </div>

      {/* ── Charts ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr', gap: 20 }}>
        {/* Trend line */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Weekly Attendance Trend</h3>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 12 }}>Percentage of sessions attended</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="week" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="attendance_pct" name="Attendance" stroke="#4f8ef7" strokeWidth={2.5} dot={{ fill: '#4f8ef7', r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Class bar */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Class-wise Attendance</h3>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 12 }}>Average per class</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={classes} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="class_name" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="attendance_pct" name="attendance_pct" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#4f8ef7" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* MSE Eligibility Breakdown Pie */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>MSE Eligibility Status</h3>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 12 }}>Breakdown by cutoff policy</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Eligible', value: stats?.eligible_count ?? 0, color: '#10b981' },
                  { name: 'At Risk', value: stats?.at_risk_count ?? 0, color: '#f59e0b' },
                  { name: 'Not Eligible', value: stats?.not_eligible_count ?? 0, color: '#f43f5e' },
                ]}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="45%"
                outerRadius={65}
                innerRadius={38}
                paddingAngle={4}
              >
                {[
                  { name: 'Eligible', color: '#10b981' },
                  { name: 'At Risk', color: '#f59e0b' },
                  { name: 'Not Eligible', color: '#f43f5e' },
                ].map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Tabs: Students | Alerts ── */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 24px' }}>
          {[['students', 'Students'], ['alerts', 'Sent Alerts']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '16px 20px 14px',
                fontSize: 14, fontWeight: 600,
                color: activeTab === key ? 'var(--accent-blue)' : 'var(--text-muted)',
                borderBottom: activeTab === key ? '2px solid var(--accent-blue)' : '2px solid transparent',
                transition: 'color 0.2s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'students' && (
          <>
            {/* Filters */}
            <div style={{ padding: '16px 24px', display: 'flex', gap: 12, borderBottom: '1px solid var(--border)' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="input-field"
                  placeholder="Search by name or roll no…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ paddingLeft: 36 }}
                />
              </div>
              <select
                className="input-field"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: 160 }}
              >
                <option value="">All Students</option>
                <option value="eligible">Eligible</option>
                <option value="at_risk">At Risk</option>
                <option value="not_eligible">Not Eligible</option>
              </select>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Roll No</th>
                    <th>Name</th>
                    <th>Class</th>
                    <th>Present</th>
                    <th>Total</th>
                    <th>Attendance %</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j}><div className="skeleton" style={{ height: 14, width: '70%' }} /></td>
                        ))}
                      </tr>
                    ))
                  ) : students.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No students found</td></tr>
                  ) : (
                    students.map((s) => (
                      <tr key={s.student_id}>
                        <td><code style={{ fontSize: 12, background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4 }}>{s.roll_no}</code></td>
                        <td style={{ fontWeight: 500 }}>{s.name}</td>
                        <td><span className="badge badge-blue">{s.class_name}</span></td>
                        <td>{s.present_count}</td>
                        <td>{s.total_sessions}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="score-bar-track" style={{ width: 80 }}>
                              <div
                                className="score-bar-fill"
                                style={{
                                  width: `${s.attendance_pct}%`,
                                  background: (s.status === 'eligible' || s.is_eligible) ? 'var(--accent-green)' : (s.status === 'at_risk' || s.is_at_risk) ? 'var(--accent-amber)' : 'var(--accent-rose)',
                                }}
                              />
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{s.attendance_pct}%</span>
                          </div>
                        </td>
                        <td><EligibilityBadge status={s.status} isEligible={s.is_eligible} isAtRisk={s.is_at_risk} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'alerts' && (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Phone</th>
                  <th>Type</th>
                  <th>Provider</th>
                  <th>Status</th>
                  <th>Sent At</th>
                </tr>
              </thead>
              <tbody>
                {alerts.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No alerts sent yet</td></tr>
                ) : (
                  alerts.map((a) => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 500 }}>{a.student_name}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{a.phone_number}</td>
                      <td><span className={`badge ${a.alert_type === 'below_threshold' ? 'badge-rose' : 'badge-amber'}`}>{a.alert_type.replace('_', ' ')}</span></td>
                      <td><span className="badge badge-violet">{a.provider}</span></td>
                      <td><span className={`badge ${a.status === 'sent' ? 'badge-green' : 'badge-rose'}`}>{a.status}</span></td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{new Date(a.sent_at).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
