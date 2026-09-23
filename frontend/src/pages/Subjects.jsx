// src/pages/Subjects.jsx — Subject list + create form
import { useEffect, useState } from 'react'
import { Plus, Layers, Trash2 } from 'lucide-react'
import api from '../api/client'

const COLORS = ['#6D4AE8', '#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']
const CLASSES = ['CS-A', 'CS-B', 'IT-A']

export default function Subjects() {
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]        = useState({ code: '', name: '', class_name: 'CS-A', credits: 4, color: COLORS[0] })
  const [saving, setSaving]    = useState(false)

  const load = () => {
    setLoading(true)
    api.get('/home/subjects').then(r => setSubjects(r.data)).catch(() => setSubjects([])).finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleSubmit = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/home/subjects/create', form)
      setShowForm(false)
      setForm({ code: '', name: '', class_name: 'CS-A', credits: 4, color: COLORS[0] })
      load()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create subject')
    } finally { setSaving(false) }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Subjects</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 2 }}>Manage your course subjects</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(f => !f)}>
          <Plus size={15} /> {showForm ? 'Cancel' : 'Add Subject'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card card-p fade-in-up" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, color: 'var(--text-primary)' }}>New Subject</div>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Code *</label>
                <input className="input-field" placeholder="e.g. DS" required
                  value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Subject Name *</label>
                <input className="input-field" placeholder="e.g. Data Structures" required
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Class *</label>
                <select className="input-field" value={form.class_name} onChange={e => setForm(f => ({ ...f, class_name: e.target.value }))}>
                  {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Credits</label>
                <input className="input-field" type="number" min={1} max={6}
                  value={form.credits} onChange={e => setForm(f => ({ ...f, credits: +e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Color:</span>
              {COLORS.map(c => (
                <div key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                  style={{ width: 22, height: 22, borderRadius: '50%', background: c, cursor: 'pointer',
                    border: form.color === c ? '3px solid var(--text-primary)' : '2px solid transparent', transition: 'border 0.15s' }} />
              ))}
            </div>
            <button className="btn btn-primary btn-sm" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Create Subject'}
            </button>
          </form>
        </div>
      )}

      {/* Subject cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
        {loading ? [1,2,3,4,5].map(i => (
          <div key={i} className="card card-p">
            <div className="skeleton" style={{ height: 14, marginBottom: 10 }} />
            <div className="skeleton" style={{ height: 12, width: '60%' }} />
          </div>
        )) : subjects.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
            No subjects yet. <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)} style={{ marginLeft: 10 }}>Add Subject</button>
          </div>
        ) : subjects.map(s => (
          <div key={s.subject_id} className="card card-p">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${s.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Layers size={18} color={s.color} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{s.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.code} · {s.class_name}</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="progress-track" style={{ width: 70 }}>
                  <div className="progress-fill" style={{ width: `${s.attendance_pct}%`, background: s.color }} />
                </div>
                <span style={{ fontWeight: 700, fontSize: 14, color: s.color }}>{s.attendance_pct}%</span>
              </div>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.data_source === 'class_average_fallback' ? 'class avg' : 'real data'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
