// src/pages/StudentDashboard.jsx — Full student-facing dashboard
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudent } from '../context/StudentContext'
import { getStudentSummary, getStudentAttendance } from '../api/student'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from 'recharts'
import {
  GraduationCap, CalendarDays, CheckCircle, XCircle,
  LogOut, BookOpen, Clock, TrendingUp, AlertTriangle,
  ChevronRight, User, BarChart2,
} from 'lucide-react'
import heroImg from '../assets/hero.png'

/* ─── Mini helpers ───────────────────────────────────────────── */
function Skel({ w = '100%', h = 18, r = 8, mb = 0 }) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: r, marginBottom: mb }} />
}

/* ─── Stat Card ─────────────────────────────────────────────── */
function StatCard({ icon: Icon, value, label, sub, color = 'var(--primary)', bg = 'var(--primary-light)' }) {
  return (
    <div className="stat-card fade-in-up" style={{ flex: 1, minWidth: 160 }}>
      <div className="stat-card__icon" style={{ background: bg, color }}>
        <Icon size={22} />
      </div>
      <div>
        <div className="stat-card__value">{value ?? <Skel w={60} h={28} />}</div>
        <div className="stat-card__label">{label}</div>
        {sub && <div style={{ fontSize: 11, color, marginTop: 2, fontWeight: 600 }}>{sub}</div>}
      </div>
    </div>
  )
}

/* ─── Subject progress bar ───────────────────────────────────── */
function SubjectBar({ name, pct, color, eligible }) {
  const barColor = pct >= 75 ? '#22C55E' : pct >= 60 ? '#F97316' : '#EF4444'
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: color || barColor, display: 'inline-block' }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{pct}%</span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
            background: eligible ? '#F0FDF4' : '#FEF2F2',
            color: eligible ? '#16A34A' : '#DC2626',
            border: `1px solid ${eligible ? '#BBF7D0' : '#FECACA'}`,
          }}>
            {eligible ? '✓ Eligible' : '✗ At Risk'}
          </span>
        </div>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%`, background: color || barColor }} />
      </div>
    </div>
  )
}

/* ─── Attendance row ─────────────────────────────────────────── */
function AttRow({ record }) {
  const date = record.attendance_date
    ? new Date(record.attendance_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 0', borderBottom: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: record.is_present ? '#F0FDF4' : '#FEF2F2',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {record.is_present
            ? <CheckCircle size={16} color="#22C55E" />
            : <XCircle size={16} color="#EF4444" />
          }
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
            {record.session_label || 'Class'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{date}</div>
        </div>
      </div>
      <span style={{
        fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
        background: record.is_present ? '#F0FDF4' : '#FEF2F2',
        color: record.is_present ? '#16A34A' : '#DC2626',
        border: `1px solid ${record.is_present ? '#BBF7D0' : '#FECACA'}`,
      }}>
        {record.is_present ? 'Present' : 'Absent'}
      </span>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function StudentDashboard() {
  const { student, logoutStudent } = useStudent()
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [records, setRecords] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getStudentSummary(), getStudentAttendance()])
      .then(([s, r]) => { setSummary(s.data); setRecords(r.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleLogout = () => { logoutStudent(); navigate('/login') }

  const DONUT_COLORS = ['#6D4AE8', '#EF4444', '#F59E0B']
  const donutData = summary ? [
    { name: 'Present', value: summary.present },
    { name: 'Absent',  value: summary.absent },
  ] : []

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-app)', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── TopBar ─────────────────────────────────────────── */}
      <header style={{
        height: 64, background: 'white',
        boxShadow: '0 2px 16px rgba(109,74,232,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px', position: 'sticky', top: 0, zIndex: 100,
      }}>
        {/* Left: logo + college */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'linear-gradient(135deg, #3A1F8A, #6D4AE8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <GraduationCap size={20} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
              J.D. College of Engineering &amp; Management
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              AI Attendance System &nbsp;•&nbsp; <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Student Portal</span>
            </div>
          </div>
        </div>

        {/* Right: student name + logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{student?.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {student?.roll_no} &nbsp;•&nbsp; {student?.class_name}
            </div>
          </div>
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: 'var(--primary-light)', color: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 14,
          }}>
            {student?.name?.charAt(0) || 'S'}
          </div>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 8,
              background: '#FEF2F2', border: '1px solid #FECACA',
              color: '#DC2626', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px' }}>

        {/* ── Hero Banner ──────────────────────────────────── */}
        <div className="hero-banner" style={{ minHeight: 160, marginBottom: 24 }}>
          <img src={heroImg} alt="Campus" className="hero-banner__bg" />
          <div className="hero-banner__overlay" />
          <div className="hero-banner__content" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginBottom: 4 }}>Welcome back,</div>
            <div style={{ color: 'white', fontWeight: 800, fontSize: 24, lineHeight: 1.2, marginBottom: 6 }}>
              {student?.name} 👋
            </div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
              {student?.roll_no} &nbsp;•&nbsp; {student?.class_name} &nbsp;•&nbsp; JD College of Engineering &amp; Management
            </div>
            {summary && (
              <div style={{ marginTop: 10 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '4px 14px',
                  background: summary.eligible ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                  border: `1px solid ${summary.eligible ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
                  borderRadius: 20, fontSize: 12, fontWeight: 700,
                  color: summary.eligible ? '#86EFAC' : '#FCA5A5',
                }}>
                  {summary.eligible ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                  {summary.eligible ? 'MSE Eligible' : 'At Risk — Below 75%'}
                </span>
              </div>
            )}
          </div>
          <div style={{
            position: 'absolute', bottom: 12, right: 16, zIndex: 1,
            background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '5px 10px',
            fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 600,
          }}>
            🏛 J.D. College of Engineering &amp; Management, Nagpur
          </div>
        </div>

        {/* ── 4 Stat Cards ─────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
          <StatCard
            icon={CalendarDays}
            value={summary?.total_classes ?? '—'}
            label="Total Classes"
            sub="This semester"
          />
          <StatCard
            icon={CheckCircle}
            value={summary?.present ?? '—'}
            label="Classes Present"
            color="#22C55E" bg="#F0FDF4"
            sub="Days attended"
          />
          <StatCard
            icon={XCircle}
            value={summary?.absent ?? '—'}
            label="Classes Absent"
            color="#EF4444" bg="#FEF2F2"
            sub="Days missed"
          />
          <StatCard
            icon={TrendingUp}
            value={summary ? `${summary.attendance_pct}%` : '—'}
            label="Attendance %"
            color={summary?.eligible ? '#22C55E' : '#F97316'}
            bg={summary?.eligible ? '#F0FDF4' : '#FFF7ED'}
            sub={summary?.eligible ? 'Eligible ✓' : 'Below 75% ⚠'}
          />
        </div>

        {/* ── 2-column layout ───────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>

          {/* LEFT: Subject-wise + Recent Attendance */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Subject-wise Attendance */}
            <div className="card card-p">
              <div className="section-header">
                <div className="section-title">
                  <div className="section-title__icon"><BookOpen size={15} /></div>
                  Subject-wise Attendance
                </div>
              </div>
              {loading
                ? [1,2,3,4,5].map(i => <Skel key={i} h={40} mb={16} />)
                : summary?.subjects?.length > 0
                  ? summary.subjects.map((s, i) => (
                      <SubjectBar key={i} name={s.name} pct={s.pct} color={s.color} eligible={s.eligible} />
                    ))
                  : <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>
                      No attendance records yet
                    </div>
              }
            </div>

            {/* Recent Attendance Records */}
            <div className="card card-p">
              <div className="section-header">
                <div className="section-title">
                  <div className="section-title__icon"><Clock size={15} /></div>
                  Recent Attendance
                </div>
              </div>
              {loading
                ? [1,2,3,4].map(i => (
                    <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                      <Skel w={32} h={32} r={16} />
                      <div style={{ flex: 1 }}><Skel w="80%" h={13} mb={6} /><Skel w="50%" h={11} /></div>
                    </div>
                  ))
                : records?.length > 0
                  ? records.slice(0, 10).map((r, i) => <AttRow key={i} record={r} />)
                  : <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>
                      No attendance records yet
                    </div>
              }
            </div>
          </div>

          {/* RIGHT: Donut chart + Eligibility + Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Attendance Donut */}
            <div className="card card-p">
              <div className="section-title" style={{ marginBottom: 12 }}>
                <div className="section-title__icon"><BarChart2 size={15} /></div>
                Attendance Overview
              </div>
              {summary && summary.total_classes > 0 ? (
                <>
                  <div style={{ position: 'relative', height: 150 }}>
                    <ResponsiveContainer width="100%" height={150}>
                      <PieChart>
                        <Pie
                          data={donutData} cx="50%" cy="50%"
                          innerRadius={44} outerRadius={62}
                          dataKey="value" paddingAngle={3}
                        >
                          <Cell fill="#6D4AE8" />
                          <Cell fill="#EF4444" />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{
                      position: 'absolute', top: '50%', left: '50%',
                      transform: 'translate(-50%, -50%)', textAlign: 'center',
                    }}>
                      <div style={{ fontWeight: 900, fontSize: 20, color: 'var(--primary)' }}>
                        {summary.attendance_pct}%
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Present</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                    {[
                      { label: 'Present', count: summary.present, color: '#6D4AE8' },
                      { label: 'Absent',  count: summary.absent,  color: '#EF4444' },
                    ].map(({ label, count, color }) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 8, height: 8, background: color, borderRadius: 2, display: 'inline-block' }} />
                          <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                        </div>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{count}</span>
                      </div>
                    ))}
                    <div style={{
                      marginTop: 8, padding: '10px 14px',
                      background: summary.eligible ? '#F0FDF4' : '#FEF2F2',
                      borderRadius: 10,
                      border: `1px solid ${summary.eligible ? '#BBF7D0' : '#FECACA'}`,
                      textAlign: 'center',
                    }}>
                      <div style={{
                        fontSize: 13, fontWeight: 700,
                        color: summary.eligible ? '#16A34A' : '#DC2626',
                      }}>
                        {summary.eligible ? '✅ MSE Eligible' : '⚠️ Not Eligible'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        Min. required: 75%
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                  {loading ? <Skel h={140} /> : 'No data yet'}
                </div>
              )}
            </div>

            {/* Student Info Card */}
            <div className="card card-p">
              <div className="section-title" style={{ marginBottom: 14 }}>
                <div className="section-title__icon"><User size={15} /></div>
                My Profile
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Full Name',  value: student?.name },
                  { label: 'Roll No.',   value: student?.roll_no },
                  { label: 'Class',      value: student?.class_name },
                  { label: 'Biometric', value: student?.is_enrolled ? '✅ Enrolled' : '❌ Not Enrolled' },
                ].map(({ label, value }) => (
                  <div key={label} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 0', borderBottom: '1px solid var(--border)',
                    fontSize: 13,
                  }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{value || '—'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Motivational quote */}
            <div style={{
              background: 'linear-gradient(135deg, #3A1F8A, #6D4AE8)',
              borderRadius: 16, padding: '20px',
              color: 'white', textAlign: 'center',
            }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>📚</div>
              <div style={{ fontSize: 13, lineHeight: 1.6, fontStyle: 'italic', opacity: 0.9 }}>
                "Education is the most powerful weapon which you can use to change the world."
              </div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 8 }}>— Dr. A.P.J. Abdul Kalam</div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
