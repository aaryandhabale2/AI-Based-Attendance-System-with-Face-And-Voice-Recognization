// src/pages/Profile.jsx — Faculty Profile & Account Management
import { useState, useEffect, useRef } from 'react'
import {
  User, Mail, Building2, KeyRound, Eye, EyeOff,
  Save, CheckCircle2, XCircle, Plus, Trash2,
  ShieldCheck, UserCog, ChevronDown, Loader2, Lock,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  updateMe, changePassword, registerFaculty,
  listFaculty, deactivateFaculty,
} from '../api/auth'

// ── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'FA'
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function passwordStrength(pwd) {
  if (!pwd) return { level: 0, label: '', color: '' }
  let score = 0
  if (pwd.length >= 8) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^a-zA-Z0-9]/.test(pwd)) score++
  if (score <= 1) return { level: 1, label: 'Weak', color: 'var(--red)' }
  if (score === 2) return { level: 2, label: 'Fair', color: 'var(--orange)' }
  return { level: 3, label: 'Strong', color: 'var(--green)' }
}

// ── Small reusable components ─────────────────────────────────────────────────

function Toast({ msg, type }) {
  if (!msg) return null
  const isOk = type === 'success'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 14px',
      background: isOk ? 'var(--green-bg)' : 'var(--red-bg)',
      border: `1px solid ${isOk ? 'var(--green-border)' : 'var(--red-border)'}`,
      borderRadius: 10, fontSize: 13,
      color: isOk ? '#166534' : '#991b1b',
      marginBottom: 12,
      animation: 'fadeInUp 0.2s ease',
    }}>
      {isOk ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
      {msg}
    </div>
  )
}

function FormField({ label, id, type = 'text', value, onChange, readOnly, placeholder, hint, rightSlot }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label htmlFor={id} style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          placeholder={placeholder}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: rightSlot ? '10px 42px 10px 14px' : '10px 14px',
            background: readOnly ? 'var(--bg-app)' : 'var(--bg-input)',
            border: `1.5px solid ${readOnly ? 'var(--border)' : 'var(--border-strong)'}`,
            borderRadius: 'var(--radius-input)',
            fontSize: 14, color: readOnly ? 'var(--text-muted)' : 'var(--text-primary)',
            fontFamily: 'inherit',
            transition: 'border-color var(--transition)',
            outline: 'none',
          }}
          onFocus={e => { if (!readOnly) e.target.style.borderColor = 'var(--primary)' }}
          onBlur={e => { e.target.style.borderColor = readOnly ? 'var(--border)' : 'var(--border-strong)' }}
        />
        {rightSlot && (
          <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
            {rightSlot}
          </div>
        )}
      </div>
      {hint && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="section-title__icon"><Icon size={15} /></div>
        <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>{title}</span>
      </div>
      {subtitle && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, marginLeft: 32 }}>{subtitle}</p>}
    </div>
  )
}

// ── Profile Avatar ─────────────────────────────────────────────────────────────

function ProfileAvatar({ name, isSuper }) {
  const initials = getInitials(name)
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div style={{
        width: 88, height: 88,
        background: 'linear-gradient(135deg, var(--primary-dark), var(--primary))',
        borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 28, fontWeight: 800, color: '#fff',
        letterSpacing: '-0.5px',
        boxShadow: '0 4px 20px rgba(109,74,232,0.35)',
        border: '4px solid #fff',
      }}>
        {initials}
      </div>
      {isSuper && (
        <div style={{
          position: 'absolute', bottom: 2, right: 2,
          width: 24, height: 24,
          background: 'var(--primary)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid #fff',
        }}>
          <ShieldCheck size={13} color="#fff" />
        </div>
      )}
    </div>
  )
}

// ── Section 1: Profile Overview Card ─────────────────────────────────────────

function ProfileOverviewCard({ faculty }) {
  const role = faculty?.is_superadmin ? 'Head Faculty / Superadmin' : 'Teacher'
  return (
    <div className="card card-p" style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <ProfileAvatar name={faculty?.full_name} isSuper={faculty?.is_superadmin} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>
            {faculty?.full_name || 'Faculty'}
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <span style={{
              background: faculty?.is_superadmin ? 'var(--primary-light)' : 'var(--bg-tag)',
              color: 'var(--primary)', fontSize: 11, fontWeight: 700,
              padding: '3px 10px', borderRadius: 20,
              border: '1px solid var(--primary-light)',
            }}>{role}</span>
            {faculty?.department && (
              <span style={{
                background: 'var(--blue-bg)', color: 'var(--blue)',
                fontSize: 11, fontWeight: 600,
                padding: '3px 10px', borderRadius: 20,
                border: '1px solid var(--blue-border)',
              }}>
                {faculty.department}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 20, marginTop: 10, flexWrap: 'wrap' }}>
            {faculty?.email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-secondary)' }}>
                <Mail size={12} /> {faculty.email}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)' }}>
              <User size={12} /> @{faculty?.username}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Member since {formatDate(faculty?.created_at)}
            </div>
          </div>
        </div>
        {/* Online indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--green)' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 0 3px var(--green-bg)' }} />
          Active session
        </div>
      </div>
    </div>
  )
}

// ── Section 2: Edit Profile Card ──────────────────────────────────────────────

function EditProfileCard({ faculty, onUpdate }) {
  const [form, setForm] = useState({
    full_name: faculty?.full_name || '',
    email: faculty?.email || '',
    department: faculty?.department || '',
  })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      setToast({ msg: 'Full name cannot be empty', type: 'error' }); return
    }
    setSaving(true); setToast(null)
    try {
      const res = await updateMe(form)
      onUpdate(res.data)
      setToast({ msg: 'Profile updated successfully!', type: 'success' })
    } catch (err) {
      setToast({ msg: err?.response?.data?.detail || 'Failed to update profile', type: 'error' })
    } finally {
      setSaving(false)
      setTimeout(() => setToast(null), 4000)
    }
  }

  return (
    <div className="card card-p" style={{ marginBottom: 20 }}>
      <SectionHeader icon={User} title="Edit Profile" subtitle="Update your display name, email, and department" />
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <FormField id="edit-username" label="Username" value={faculty?.username || ''} readOnly hint="Username cannot be changed" />
      <FormField id="edit-fullname" label="Full Name" value={form.full_name} onChange={set('full_name')} placeholder="e.g. Dr. Priya Sharma" />
      <FormField id="edit-email" label="Email Address" type="email" value={form.email} onChange={set('email')} placeholder="e.g. priya@jdcoem.ac.in" />
      <FormField id="edit-dept" label="Department" value={form.department} onChange={set('department')} placeholder="e.g. Computer Science" />

      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary"
        id="profile-save-btn"
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px', fontSize: 14 }}
      >
        {saving ? <Loader2 size={15} className="spin" /> : <Save size={15} />}
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  )
}

// ── Section 3: Change Password Card ───────────────────────────────────────────

function ChangePasswordCard() {
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm: '' })
  const [show, setShow] = useState({ current: false, new: false, confirm: false })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))
  const toggleShow = (key) => setShow(s => ({ ...s, [key]: !s[key] }))

  const strength = passwordStrength(form.new_password)

  const handleChange = async () => {
    if (!form.current_password) { setToast({ msg: 'Enter your current password', type: 'error' }); return }
    if (form.new_password.length < 6) { setToast({ msg: 'New password must be at least 6 characters', type: 'error' }); return }
    if (form.new_password !== form.confirm) { setToast({ msg: 'New passwords do not match', type: 'error' }); return }
    setSaving(true); setToast(null)
    try {
      await changePassword({ current_password: form.current_password, new_password: form.new_password })
      setToast({ msg: 'Password changed successfully!', type: 'success' })
      setForm({ current_password: '', new_password: '', confirm: '' })
    } catch (err) {
      setToast({ msg: err?.response?.data?.detail || 'Failed to change password', type: 'error' })
    } finally {
      setSaving(false)
      setTimeout(() => setToast(null), 5000)
    }
  }

  const EyeBtn = ({ field }) => (
    <button type="button" onClick={() => toggleShow(field)}
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)', display: 'flex' }}>
      {show[field] ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  )

  return (
    <div className="card card-p" style={{ marginBottom: 20 }}>
      <SectionHeader icon={KeyRound} title="Change Password" subtitle="Use a strong password with letters, numbers and symbols" />
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <FormField id="cur-pwd" label="Current Password" type={show.current ? 'text' : 'password'}
        value={form.current_password} onChange={set('current_password')} placeholder="Enter current password"
        rightSlot={<EyeBtn field="current" />} />

      <FormField id="new-pwd" label="New Password" type={show.new ? 'text' : 'password'}
        value={form.new_password} onChange={set('new_password')} placeholder="At least 6 characters"
        rightSlot={<EyeBtn field="new" />} />

      {/* Password strength meter */}
      {form.new_password && (
        <div style={{ marginBottom: 16, marginTop: -8 }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                flex: 1, height: 4, borderRadius: 4,
                background: i <= strength.level ? strength.color : 'var(--border)',
                transition: 'background 0.3s',
              }} />
            ))}
          </div>
          <div style={{ fontSize: 11, color: strength.color, fontWeight: 600 }}>
            {strength.label} password
          </div>
        </div>
      )}

      <FormField id="conf-pwd" label="Confirm New Password" type={show.confirm ? 'text' : 'password'}
        value={form.confirm} onChange={set('confirm')} placeholder="Re-enter new password"
        rightSlot={<EyeBtn field="confirm" />} />

      <button
        onClick={handleChange}
        disabled={saving}
        className="btn-primary"
        id="profile-change-pwd-btn"
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px', fontSize: 14 }}
      >
        {saving ? <Loader2 size={15} className="spin" /> : <Lock size={15} />}
        {saving ? 'Changing…' : 'Change Password'}
      </button>
    </div>
  )
}

// ── Section 4: Superadmin Faculty Management Panel ────────────────────────────

function FacultyRow({ f, onDeactivate }) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleDeactivate = async () => {
    setLoading(true)
    try { await onDeactivate(f.id) }
    finally { setLoading(false); setConfirming(false) }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 0', borderBottom: '1px solid var(--border)',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, var(--primary-dark), var(--primary))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700, color: '#fff',
      }}>
        {getInitials(f.full_name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
          {f.full_name}
          {f.is_superadmin && (
            <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-light)', padding: '1px 7px', borderRadius: 20 }}>
              ADMIN
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          @{f.username}{f.department ? ` · ${f.department}` : ''}
        </div>
      </div>
      <span style={{
        fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
        background: f.is_active ? 'var(--green-bg)' : 'var(--red-bg)',
        color: f.is_active ? 'var(--green)' : 'var(--red)',
        border: `1px solid ${f.is_active ? 'var(--green-border)' : 'var(--red-border)'}`,
      }}>
        {f.is_active ? 'Active' : 'Inactive'}
      </span>
      {f.is_active && !f.is_superadmin && (
        confirming ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={handleDeactivate} disabled={loading}
              style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, background: 'var(--red)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              {loading ? '…' : 'Confirm'}
            </button>
            <button onClick={() => setConfirming(false)}
              style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, background: 'var(--bg-input)', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)} title="Deactivate account"
            style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', borderRadius: 8, padding: '5px 8px', cursor: 'pointer', display: 'flex', color: 'var(--red)' }}>
            <Trash2 size={14} />
          </button>
        )
      )}
    </div>
  )
}

function AddFacultyModal({ onClose, onAdded }) {
  const [form, setForm] = useState({ username: '', full_name: '', email: '', department: '', password: '', is_superadmin: false })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const handleAdd = async () => {
    if (!form.username.trim() || !form.full_name.trim() || !form.password.trim()) {
      setError('Username, full name, and password are required.'); return
    }
    setSaving(true); setError('')
    try {
      const res = await registerFaculty(form)
      onAdded(res.data)
      onClose()
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to create faculty')
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, animation: 'fadeIn 0.15s ease',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-card)', borderRadius: 16, padding: 28,
        width: '100%', maxWidth: 480, boxShadow: 'var(--shadow-card-lg)',
        animation: 'fadeInUp 0.2s ease',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-primary)', marginBottom: 20 }}>
          Add Faculty Account
        </div>
        {error && <Toast msg={error} type="error" />}
        <FormField id="af-username" label="Username" value={form.username} onChange={set('username')} placeholder="e.g. dr_sharma" />
        <FormField id="af-fullname" label="Full Name" value={form.full_name} onChange={set('full_name')} placeholder="e.g. Dr. Priya Sharma" />
        <FormField id="af-email" label="Email (optional)" type="email" value={form.email} onChange={set('email')} placeholder="e.g. priya@jdcoem.ac.in" />
        <FormField id="af-dept" label="Department (optional)" value={form.department} onChange={set('department')} placeholder="e.g. Computer Science" />
        <FormField id="af-password" label="Password" type="password" value={form.password} onChange={set('password')} placeholder="Min 6 characters" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <input type="checkbox" id="af-superadmin" checked={form.is_superadmin}
            onChange={e => setForm(f => ({ ...f, is_superadmin: e.target.checked }))}
            style={{ accentColor: 'var(--primary)', width: 15, height: 15 }} />
          <label htmlFor="af-superadmin" style={{ fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' }}>
            Grant Superadmin privileges
          </label>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: 14, color: 'var(--text-secondary)', fontFamily: 'inherit' }}>
            Cancel
          </button>
          <button onClick={handleAdd} disabled={saving} className="btn-primary"
            id="modal-add-faculty-btn"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', fontSize: 14 }}>
            {saving ? <Loader2 size={15} className="spin" /> : <Plus size={15} />}
            {saving ? 'Creating…' : 'Create Account'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SuperadminPanel() {
  const [expanded, setExpanded] = useState(false)
  const [facultyList, setFacultyList] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState(null)
  const loaded = useRef(false)

  const loadFaculty = async () => {
    if (loaded.current) return
    setLoading(true)
    try {
      const res = await listFaculty()
      setFacultyList(res.data)
      loaded.current = true
    } catch { /* superadmin check already done */ }
    finally { setLoading(false) }
  }

  const handleExpand = () => {
    if (!expanded) loadFaculty()
    setExpanded(e => !e)
  }

  const handleDeactivate = async (id) => {
    try {
      await deactivateFaculty(id)
      setFacultyList(list => list.map(f => f.id === id ? { ...f, is_active: false } : f))
      setToast({ msg: 'Account deactivated', type: 'success' })
    } catch (err) {
      setToast({ msg: err?.response?.data?.detail || 'Failed to deactivate', type: 'error' })
    } finally {
      setTimeout(() => setToast(null), 4000)
    }
  }

  const handleAdded = (newFaculty) => {
    setFacultyList(l => [...l, newFaculty])
    setToast({ msg: `Faculty "${newFaculty.full_name}" created!`, type: 'success' })
    setTimeout(() => setToast(null), 4000)
  }

  return (
    <div className="card card-p" style={{ marginBottom: 20, border: '1.5px solid var(--primary-light)' }}>
      <button onClick={handleExpand} style={{
        width: '100%', background: 'none', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 12, padding: 0, fontFamily: 'inherit',
      }}>
        <div className="section-title__icon" style={{ background: 'var(--primary)', color: '#fff' }}>
          <UserCog size={15} />
        </div>
        <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', flex: 1, textAlign: 'left' }}>
          Manage Faculty Accounts
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 4 }}>Superadmin only</span>
        <ChevronDown size={16} color="var(--text-muted)"
          style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s' }} />
      </button>

      {expanded && (
        <div style={{ marginTop: 20, animation: 'fadeInUp 0.2s ease' }}>
          {toast && <Toast msg={toast.msg} type={toast.type} />}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button onClick={() => setShowModal(true)} className="btn-primary"
              id="add-faculty-btn"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13 }}>
              <Plus size={14} /> Add Faculty
            </button>
          </div>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10, color: 'var(--text-muted)' }}>
              <Loader2 size={18} className="spin" /> Loading…
            </div>
          ) : facultyList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>No faculty accounts found.</div>
          ) : (
            <div>
              {facultyList.map(f => (
                <FacultyRow key={f.id} f={f} onDeactivate={handleDeactivate} />
              ))}
            </div>
          )}
        </div>
      )}
      {showModal && <AddFacultyModal onClose={() => setShowModal(false)} onAdded={handleAdded} />}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Profile() {
  const { faculty, updateFaculty } = useAuth()

  const handleProfileUpdate = (updatedFaculty) => {
    updateFaculty(updatedFaculty)
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>My Profile</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 2 }}>
          Manage your account information, security settings, and preferences.
        </p>
      </div>

      <ProfileOverviewCard faculty={faculty} />
      <EditProfileCard faculty={faculty} onUpdate={handleProfileUpdate} />
      <ChangePasswordCard />
      {faculty?.is_superadmin && <SuperadminPanel />}
    </div>
  )
}
