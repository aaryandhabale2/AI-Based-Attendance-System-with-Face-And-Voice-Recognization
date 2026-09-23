// src/pages/Notifications.jsx — Alerts log + Flagged Events table with reason filter
import { useEffect, useState } from 'react'
import { Bell, AlertTriangle, Filter } from 'lucide-react'
import { getAlertHistory, getFlaggedEvents } from '../api/alerts'

const FLAG_REASONS = [
  { value: '',                          label: 'All Reasons' },
  { value: 'unknown_face',              label: 'Unknown Face' },
  { value: 'face_matches_voice_fails',  label: 'Face ✓ / Voice ✗' },
  { value: 'voice_matches_face_fails',  label: 'Voice ✓ / Face ✗' },
  { value: 'combined_score_low',        label: 'Combined Score Low' },
  { value: 'wrong_or_expired_challenge', label: 'Anti-Replay Failed' },
  { value: 'duplicate_attempt',         label: 'Duplicate Attempt' },
]

export default function Notifications() {
  const [alerts, setAlerts]       = useState([])
  const [flagged, setFlagged]     = useState([])
  const [loadingA, setLoadingA]   = useState(true)
  const [loadingF, setLoadingF]   = useState(true)
  const [reasonFilter, setReason] = useState('')
  const [tab, setTab]             = useState('flagged') // 'alerts' | 'flagged'

  useEffect(() => {
    setLoadingA(true)
    getAlertHistory(30).then(r => setAlerts(r.data)).catch(() => setAlerts([])).finally(() => setLoadingA(false))
  }, [])

  useEffect(() => {
    setLoadingF(true)
    getFlaggedEvents(reasonFilter || undefined)
      .then(r => setFlagged(r.data))
      .catch(() => setFlagged([]))
      .finally(() => setLoadingF(false))
  }, [reasonFilter])

  const TabBtn = ({ id, label, count }) => (
    <button
      onClick={() => setTab(id)}
      style={{
        padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
        fontFamily: 'inherit', fontWeight: 600, fontSize: 13,
        background: tab === id ? 'var(--primary)' : 'transparent',
        color: tab === id ? '#fff' : 'var(--text-secondary)',
        transition: 'all 0.15s',
      }}
    >
      {label} {count != null && <span style={{ opacity: 0.8 }}>({count})</span>}
    </button>
  )

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Notifications</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 2 }}>
          SMS alerts log &amp; security event audit trail
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 20,
        background: 'var(--bg-input)', borderRadius: 10, padding: 4, width: 'fit-content',
      }}>
        <TabBtn id="flagged" label="🚨 Flagged Events" count={flagged.length} />
        <TabBtn id="alerts"  label="📱 SMS Alerts"     count={alerts.length} />
      </div>

      {/* Flagged Events */}
      {tab === 'flagged' && (
        <div>
          <div style={{ marginBottom: 14 }}>
            <select className="dropdown-select" style={{ padding: '9px 28px 9px 12px' }}
              value={reasonFilter} onChange={e => setReason(e.target.value)}>
              {FLAG_REASONS.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div className="card" style={{ overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th><th>Roll No</th><th>Class</th>
                  <th>Session</th><th>Reason</th>
                  <th>Face</th><th>Voice</th><th>Date &amp; Time</th>
                </tr>
              </thead>
              <tbody>
                {loadingF ? (
                  [1,2,3].map(i => (
                    <tr key={i}>{[1,2,3,4,5,6,7,8].map(j => (
                      <td key={j}><div className="skeleton" style={{ height: 13, borderRadius: 6 }} /></td>
                    ))}</tr>
                  ))
                ) : flagged.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    No flagged events{reasonFilter ? ` for "${reasonFilter}"` : ''} 🎉
                  </td></tr>
                ) : flagged.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.student_name || 'Unknown Face'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)' }}>{r.roll_no || '—'}</td>
                    <td>{r.class_name ? <span className="badge badge-violet">{r.class_name}</span> : '—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-secondary)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.session_label || r.session_id}</td>
                    <td>
                      <span className="badge badge-red" style={{ whiteSpace: 'nowrap' }}>
                        {(r.flag_reason || '').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {r.face_score != null ? (r.face_score * 100).toFixed(0) + '%' : '—'}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {r.voice_score != null ? (r.voice_score * 100).toFixed(0) + '%' : '—'}
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(r.marked_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SMS Alerts Log */}
      {tab === 'alerts' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr><th>Student</th><th>Phone</th><th>Type</th><th>Provider</th><th>Status</th><th>Sent At</th></tr>
            </thead>
            <tbody>
              {loadingA ? (
                [1,2,3].map(i => (
                  <tr key={i}>{[1,2,3,4,5,6].map(j => (
                    <td key={j}><div className="skeleton" style={{ height: 13, borderRadius: 6 }} /></td>
                  ))}</tr>
                ))
              ) : alerts.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  No SMS alerts sent yet
                </td></tr>
              ) : alerts.map(a => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 600 }}>{a.student_name}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{a.phone_number}</td>
                  <td><span className={`badge ${a.alert_type === 'not_eligible' ? 'badge-red' : 'badge-amber'}`}>{a.alert_type?.replace('_', ' ')}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{a.provider}</td>
                  <td><span className={`badge ${a.status === 'sent' ? 'badge-green' : 'badge-gray'}`}>{a.status}</span></td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {new Date(a.sent_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
