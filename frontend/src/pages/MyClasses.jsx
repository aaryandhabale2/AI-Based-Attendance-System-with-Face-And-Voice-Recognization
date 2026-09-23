// src/pages/MyClasses.jsx — Class list with student count and avg attendance
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, ChevronRight } from 'lucide-react'
import { getClassSummary } from '../api/dashboard'

const CLASS_COLORS = { 'CS-A': '#6D4AE8', 'CS-B': '#3B82F6', 'IT-A': '#22C55E' }

export default function MyClasses() {
  const navigate = useNavigate()
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getClassSummary().then(r => setClasses(r.data)).catch(() => setClasses([])).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>My Classes</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 2 }}>All enrolled classes overview</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {loading ? [1,2,3].map(i => (
          <div key={i} className="card card-p">
            <div className="skeleton" style={{ height: 60, borderRadius: 10, marginBottom: 16 }} />
            <div className="skeleton" style={{ height: 14, marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 14, width: '60%' }} />
          </div>
        )) : classes.map(cls => {
          const color = CLASS_COLORS[cls.class_name] || '#6D4AE8'
          const pct = cls.attendance_pct
          const barColor = pct >= 60 ? 'var(--green)' : pct >= 55 ? 'var(--amber)' : 'var(--red)'
          return (
            <div key={cls.class_name} className="card card-p" style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/students?class_name=${cls.class_name}`)}>
              <div style={{
                height: 56, borderRadius: 12, marginBottom: 16,
                background: `linear-gradient(135deg, ${color}22, ${color}44)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${color}33`,
              }}>
                <span style={{ fontWeight: 800, fontSize: 24, color }}>{cls.class_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Users size={14} color="var(--text-muted)" />
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{cls.student_count} students</span>
                </div>
                <span style={{ fontWeight: 700, fontSize: 15, color }}>{pct}%</span>
              </div>
              <div className="progress-track" style={{ marginBottom: 12 }}>
                <div className="progress-fill" style={{ width: `${pct}%`, background: barColor }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <span className="badge badge-green" style={{ fontSize: 10 }}>✓ {cls.eligible_count} Eligible</span>
                {cls.at_risk_count > 0 && <span className="badge badge-amber" style={{ fontSize: 10 }}>⚠ {cls.at_risk_count} At Risk</span>}
                {cls.not_eligible_count > 0 && <span className="badge badge-red" style={{ fontSize: 10 }}>✗ {cls.not_eligible_count} Not Eligible</span>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                <span style={{ fontSize: 12, color, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  View Students <ChevronRight size={14} />
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
