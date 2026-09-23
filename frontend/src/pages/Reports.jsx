// src/pages/Reports.jsx — Charts + eligibility list + CSV export + SMS
import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Download, Send } from 'lucide-react'
import { getDashboardStats, getAtRiskStudents } from '../api/dashboard'
import { sendDefaulters } from '../api/alerts'

function StatusBadge({ status }) {
  if (status === 'eligible')     return <span className="badge badge-green">Eligible</span>
  if (status === 'at_risk')      return <span className="badge badge-amber">At Risk</span>
  if (status === 'not_eligible') return <span className="badge badge-red">Not Eligible</span>
  return <span className="badge badge-gray">{status}</span>
}

export default function Reports() {
  const [stats, setStats]     = useState(null)
  const [atRisk, setAtRisk]   = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [msg, setMsg]         = useState('')

  useEffect(() => {
    Promise.all([getDashboardStats(), getAtRiskStudents()])
      .then(([s, r]) => { setStats(s.data); setAtRisk(r.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSendSMS = async () => {
    setSending(true); setMsg('')
    try {
      const r = await sendDefaulters()
      setMsg(`✓ Sent ${r.data?.sent_count ?? 'multiple'} alerts successfully.`)
    } catch { setMsg('Failed to send alerts. Check SMS provider config.') }
    finally { setSending(false) }
  }

  const chartData = stats ? [
    { name: 'Eligible',     count: stats.eligible_count,     fill: '#22C55E' },
    { name: 'At Risk',      count: stats.at_risk_count,      fill: '#F59E0B' },
    { name: 'Not Eligible', count: stats.not_eligible_count, fill: '#EF4444' },
  ] : []

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Reports</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 2 }}>Attendance analytics &amp; eligibility</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => window.open('/api/attendance/export', '_blank')}>
            <Download size={15} /> Export CSV
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleSendSMS} disabled={sending}>
            <Send size={15} /> {sending ? 'Sending…' : 'Send At-Risk SMS'}
          </button>
        </div>
      </div>
      {msg && <div style={{ marginBottom: 16, padding: '10px 16px', background: 'var(--green-bg)', color: '#166534', borderRadius: 10, fontSize: 13 }}>{msg}</div>}

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Overall Attendance', value: stats ? `${stats.average_attendance_pct}%` : '—', color: 'var(--primary)' },
          { label: 'Eligible',           value: stats?.eligible_count ?? '—',     color: 'var(--green)' },
          { label: 'At Risk',            value: stats?.at_risk_count ?? '—',      color: 'var(--amber)' },
          { label: 'Not Eligible',       value: stats?.not_eligible_count ?? '—', color: 'var(--red)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card card-p" style={{ flex: 1, minWidth: 120, textAlign: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="card card-p" style={{ marginBottom: 20 }}>
        <div className="section-title" style={{ marginBottom: 16 }}>MSE Eligibility Distribution</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} barSize={60}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <Tooltip />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {chartData.map((entry, i) => (
                <rect key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* At-risk table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>At-Risk &amp; Not Eligible Students</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{atRisk.length} students</span>
        </div>
        <table className="data-table">
          <thead>
            <tr><th>Student</th><th>Roll No</th><th>Class</th><th>Attendance %</th><th>Status</th></tr>
          </thead>
          <tbody>
            {loading ? (
              [1,2,3].map(i => (
                <tr key={i}>{[1,2,3,4,5].map(j => (
                  <td key={j}><div className="skeleton" style={{ height: 13, borderRadius: 6 }} /></td>
                ))}</tr>
              ))
            ) : atRisk.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                All students are eligible 🎉
              </td></tr>
            ) : atRisk.map(s => (
              <tr key={s.student_id}>
                <td style={{ fontWeight: 600 }}>{s.name}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)' }}>{s.roll_no}</td>
                <td><span className="badge badge-violet">{s.class_name}</span></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="progress-track" style={{ width: 70 }}>
                      <div className="progress-fill" style={{
                        width: `${s.attendance_pct}%`,
                        background: s.status === 'at_risk' ? 'var(--amber)' : 'var(--red)',
                      }} />
                    </div>
                    <span style={{ fontWeight: 600 }}>{s.attendance_pct}%</span>
                  </div>
                </td>
                <td><StatusBadge status={s.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
