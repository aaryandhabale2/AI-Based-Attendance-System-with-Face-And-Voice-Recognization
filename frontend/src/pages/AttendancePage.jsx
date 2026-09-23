// src/pages/AttendancePage.jsx — Session records + Open Kiosk
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Monitor, Download, Calendar } from 'lucide-react'
import api from '../api/client'

export default function AttendancePage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const p = {}
        if (dateFilter) p.session_id = dateFilter
        const res = await api.get('/attendance/today', { params: p })
        setRecords(res.data)
      } catch { setRecords([]) }
      finally { setLoading(false) }
    }
    load()
  }, [dateFilter])

  const presetSession = params.get('session_id')
  const presetLabel   = params.get('session_label')

  const openKiosk = (sessionId, sessionLabel) => {
    const q = new URLSearchParams()
    if (sessionId)    q.set('session_id', sessionId)
    if (sessionLabel) q.set('session_label', sessionLabel)
    navigate(`/attendance?${q}`)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Attendance</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 2 }}>Today's session records</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary btn-sm"
            onClick={() => openKiosk(presetSession, presetLabel)}>
            <Monitor size={15} /> Open Kiosk
          </button>
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{records.length} records today</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Student</th><th>Roll No</th><th>Class</th>
              <th>Session</th><th>Face</th><th>Voice</th>
              <th>Status</th><th>Time</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1,2,3].map(i => (
                <tr key={i}>{[1,2,3,4,5,6,7,8].map(j => (
                  <td key={j}><div className="skeleton" style={{ height: 13, borderRadius: 6 }} /></td>
                ))}</tr>
              ))
            ) : records.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                No attendance records today. <button className="btn btn-primary btn-sm"
                  onClick={() => openKiosk()} style={{ marginLeft: 12 }}>Open Kiosk</button>
              </td></tr>
            ) : records.map(r => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600 }}>{r.student_name || 'Unknown'}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)' }}>{r.roll_no || '—'}</td>
                <td>{r.class_name ? <span className="badge badge-violet">{r.class_name}</span> : '—'}</td>
                <td style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{r.session_label || r.session_id}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                  {r.face_score != null ? (r.face_score * 100).toFixed(0) + '%' : '—'}
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                  {r.voice_score != null ? (r.voice_score * 100).toFixed(0) + '%' : '—'}
                </td>
                <td>
                  {r.is_flagged
                    ? <span className="badge badge-red">Flagged</span>
                    : r.is_present
                      ? <span className="badge badge-green">Present</span>
                      : <span className="badge badge-gray">Absent</span>}
                </td>
                <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {new Date(r.marked_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
