// src/pages/Students.jsx — Searchable student table with eligibility badges
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Download, Users, Filter } from 'lucide-react'
import { getStudentTable } from '../api/dashboard'
import api from '../api/client'

function StatusBadge({ status }) {
  if (status === 'eligible')     return <span className="badge badge-green">Eligible</span>
  if (status === 'at_risk')      return <span className="badge badge-amber">At Risk</span>
  if (status === 'not_eligible') return <span className="badge badge-red">Not Eligible</span>
  return <span className="badge badge-gray">{status}</span>
}

export default function Students() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const initStatus = params.get('status') === 'needs_attention' ? '' : (params.get('status') || '')

  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState(initStatus)
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await getStudentTable({
        search: search || undefined,
        class_name: classFilter || undefined,
        status: statusFilter || undefined,
      })
      setStudents(res.data)
    } catch { setStudents([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [search, classFilter, statusFilter]) // eslint-disable-line

  const exportCSV = () => {
    const params = new URLSearchParams()
    if (classFilter) params.set('class_name', classFilter)
    window.open(`/api/attendance/export?${params}`, '_blank')
  }

  const classes = [...new Set(students.map(s => s.class_name))].sort()

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Students</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 2 }}>
            {students.length} enrolled students
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/enroll')}>
            <Users size={15} /> Enroll New
          </button>
          <button className="btn btn-primary btn-sm" onClick={exportCSV}>
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card card-p" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="input-field" style={{ paddingLeft: 36 }}
              placeholder="Search by name or roll no…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="dropdown-select" style={{ padding: '10px 28px 10px 12px' }}
            value={classFilter} onChange={e => setClassFilter(e.target.value)}>
            <option value="">All Classes</option>
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="dropdown-select" style={{ padding: '10px 28px 10px 12px' }}
            value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="eligible">Eligible</option>
            <option value="at_risk">At Risk</option>
            <option value="not_eligible">Not Eligible</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Roll No</th>
              <th>Class</th>
              <th>Present</th>
              <th>Total</th>
              <th>Attendance %</th>
              <th>MSE Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1,2,3,4,5].map(i => (
                <tr key={i}>
                  {[1,2,3,4,5,6,7].map(j => (
                    <td key={j}><div className="skeleton" style={{ height: 14, borderRadius: 6 }} /></td>
                  ))}
                </tr>
              ))
            ) : students.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                No students found
              </td></tr>
            ) : students.map(s => (
              <tr key={s.student_id}>
                <td style={{ fontWeight: 600 }}>{s.name}</td>
                <td style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 12 }}>{s.roll_no}</td>
                <td><span className="badge badge-violet">{s.class_name}</span></td>
                <td>{s.present_count}</td>
                <td>{s.total_sessions}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="progress-track" style={{ width: 60 }}>
                      <div className="progress-fill" style={{
                        width: `${s.attendance_pct}%`,
                        background: s.attendance_pct >= 60 ? 'var(--green)' : s.attendance_pct >= 55 ? 'var(--amber)' : 'var(--red)',
                      }} />
                    </div>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{s.attendance_pct}%</span>
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
