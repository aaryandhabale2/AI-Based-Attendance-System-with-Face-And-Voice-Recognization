// src/pages/Settings.jsx — Current system thresholds (read-only display)
import { useEffect, useState } from 'react'
import { Settings2, Shield, Bell } from 'lucide-react'
import { getDashboardStats } from '../api/dashboard'

function ThresholdRow({ label, value, unit = '%', desc }) {
  return (
    <div style={{ padding: '14px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>}
      </div>
      <div style={{
        background: 'var(--primary-light)', color: 'var(--primary)',
        borderRadius: 8, padding: '4px 12px', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap',
      }}>
        {value}{unit}
      </div>
    </div>
  )
}

export default function Settings() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    getDashboardStats().then(r => setStats(r.data)).catch(() => {})
  }, [])

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Settings</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 2 }}>
          System configuration &amp; thresholds (edit in <code style={{ background: 'var(--bg-input)', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>.env</code> file)
        </p>
      </div>

      <div className="card card-p" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div className="section-title__icon"><Shield size={15} /></div>
          <span style={{ fontWeight: 700, fontSize: 15 }}>MSE Eligibility Thresholds</span>
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4, paddingLeft: 2 }}>
          Three-tier policy: Eligible ≥ {stats ? stats.eligible_threshold : '?'}% &nbsp;|&nbsp;
          At Risk {stats ? stats.attendance_cutoff : '?'}–{stats ? stats.eligible_threshold - 0.1 : '?'}% &nbsp;|&nbsp;
          Not Eligible &lt; {stats ? stats.attendance_cutoff : '?'}%
        </div>
        <ThresholdRow label="Attendance Cutoff (Not Eligible below)" value={stats?.attendance_cutoff ?? '…'} desc="Students below this % are Not Eligible for MSE exam" />
        <ThresholdRow label="At-Risk Margin (buffer above cutoff)" value={stats?.at_risk_margin ?? '…'} desc="Students between cutoff and cutoff+margin are At Risk" />
        <ThresholdRow label="Eligible Threshold" value={stats?.eligible_threshold ?? '…'} desc="Students at or above this % are Eligible for MSE" />
      </div>

      <div className="card card-p" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div className="section-title__icon"><Settings2 size={15} /></div>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Biometric Verification Thresholds</span>
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>
          Face score, voice score, and combined score minimums for marking attendance
        </div>
        <ThresholdRow label="Face Similarity Threshold" value="45" desc="ArcFace cosine similarity minimum (0–100%)" />
        <ThresholdRow label="Voice Similarity Threshold" value="75" desc="ECAPA-TDNN cosine similarity minimum (0–100%)" />
        <ThresholdRow label="Combined Score Threshold" value="60" desc="Weighted face+voice fusion minimum" />
        <ThresholdRow label="Face Weight" value="60" desc="Weight of face score in fusion (voice weight = 40%)" />
      </div>

      <div className="card card-p">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div className="section-title__icon"><Bell size={15} /></div>
          <span style={{ fontWeight: 700, fontSize: 15 }}>SMS &amp; Notifications</span>
        </div>
        <ThresholdRow label="Defaulter Threshold" value="75" desc="Students below this % trigger parent SMS alerts" />
        <ThresholdRow label="Late After (minutes)" value="10" unit=" min" desc="Minutes after session start before marking 'Late'" />
        <div style={{ marginTop: 16, padding: 14, background: 'var(--blue-bg)', borderRadius: 10, fontSize: 12, color: '#1e40af' }}>
          <strong>SMS Provider:</strong> Mock (offline). Set <code>SMS_PROVIDER=fast2sms</code> or <code>twilio</code> in your <code>.env</code> to enable real notifications.
        </div>
      </div>
    </div>
  )
}
