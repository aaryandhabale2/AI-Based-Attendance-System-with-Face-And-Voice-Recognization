// src/pages/TakeAttendance.jsx — Live two-factor attendance marking
// This page is PUBLIC (no login required) — students use it.
import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Camera, Mic, CheckCircle, XCircle, AlertCircle,
  Loader, RefreshCw, GraduationCap, User, Volume2,
  ShieldCheck, ShieldX, Activity
} from 'lucide-react'
import { markAttendance, getTodayAttendance } from '../api/attendance'

/* ── Score bar ─────────────────────────────────────────────────────────── */
function ScoreBar({ score, label, matched }) {
  const pct = Math.round((score ?? 0) * 100)
  const color = matched ? 'var(--accent-green)' : pct > 30 ? 'var(--accent-amber)' : 'var(--accent-rose)'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
        <span style={{ fontWeight: 700, color }}>{pct}%</span>
      </div>
      <div className="score-bar-track">
        <div className="score-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div style={{ fontSize: 11, color, fontWeight: 600 }}>
        {matched ? '✓ MATCH' : score !== null ? '✗ NO MATCH' : '—'}
      </div>
    </div>
  )
}

/* ── Result card ───────────────────────────────────────────────────────── */
function ResultCard({ result }) {
  if (!result) return null
  const cls = result.is_present ? 'result-present' : result.is_flagged ? 'result-flagged' : 'result-absent'
  return (
    <div className={`glass-card fade-in-up ${cls}`} style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: result.is_present ? 'var(--gradient-green)' : result.is_flagged ? 'var(--gradient-amber)' : 'linear-gradient(135deg,#f43f5e,#dc2626)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {result.is_present ? <ShieldCheck size={24} color="white" /> :
           result.is_flagged ? <AlertCircle size={24} color="white" /> :
           <ShieldX size={24} color="white" />}
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>
            {result.is_present ? 'PRESENT' : result.is_flagged ? 'FLAGGED' : 'ABSENT'}
          </div>
          {result.student_name && (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              {result.student_name} · {result.roll_no}
            </div>
          )}
        </div>
        {result.is_duplicate && <span className="badge badge-blue" style={{ marginLeft: 'auto' }}>Duplicate</span>}
      </div>

      {/* Score bars */}
      {result.face_score !== null && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <ScoreBar score={result.face_score} label="Face Recognition" matched={result.face_matched} />
          {result.voice_score !== undefined && result.voice_score !== null && (
            <ScoreBar score={result.voice_score} label="Voice Verification" matched={result.voice_matched} />
          )}
        </div>
      )}

      <div style={{ marginTop: 16, fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
        {result.message}
      </div>
    </div>
  )
}

/* ── Mic recorder ──────────────────────────────────────────────────────── */
function useMicRecorder() {
  const recorderRef = useRef(null)
  const [recording, setRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const timerRef = useRef(null)
  const [secs, setSecs] = useState(0)

  const start = async () => {
    setAudioBlob(null)
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
    const chunks = []
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
    recorder.onstop = () => {
      setAudioBlob(new Blob(chunks, { type: 'audio/webm' }))
      stream.getTracks().forEach(t => t.stop())
      setRecording(false)
      clearInterval(timerRef.current)
      setSecs(0)
    }
    recorder.start()
    recorderRef.current = recorder
    setRecording(true)
    setSecs(0)
    timerRef.current = setInterval(() => setSecs(s => s + 1), 1000)
  }

  const stop = () => recorderRef.current?.stop()

  return { recording, audioBlob, secs, start, stop }
}

/* ── Main page ─────────────────────────────────────────────────────────── */
export default function TakeAttendance() {
  const videoRef  = useRef(null)
  const streamRef = useRef(null)
  const [camActive, setCamActive]   = useState(false)
  const [capturing, setCapturing]   = useState(false)
  const [result, setResult]         = useState(null)
  const [error, setError]           = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sessionId, setSessionId]   = useState('')
  const [sessionLabel, setSessionLabel] = useState('')
  const [todayList, setTodayList]   = useState([])
  const [loadingList, setLoadingList] = useState(false)

  const { recording, audioBlob, secs, start: startMic, stop: stopMic } = useMicRecorder()

  // Auto-generate session ID
  useEffect(() => {
    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]
    const hour = now.getHours()
    const slot = hour < 13 ? 'MORNING' : 'AFTERNOON'
    setSessionId(`${slot}_${dateStr}`)
    setSessionLabel(`${slot === 'MORNING' ? 'Morning' : 'Afternoon'} Session — ${dateStr}`)
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setCamActive(true)
      setResult(null)
      setError('')
    } catch { setError('Cannot access webcam. Allow camera permission.') }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    setCamActive(false)
  }

  useEffect(() => () => stopCamera(), [])

  const captureFrame = async () => {
    const video = videoRef.current
    if (!video) return null
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    canvas.getContext('2d').drawImage(video, 0, 0)
    return new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.95))
  }

  const loadTodayList = useCallback(async () => {
    if (!sessionId) return
    setLoadingList(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) { setLoadingList(false); return }
      const { data } = await getTodayAttendance(sessionId)
      setTodayList(data.filter(r => r.is_present))
    } catch {} finally { setLoadingList(false) }
  }, [sessionId])

  useEffect(() => { loadTodayList() }, [loadTodayList])

  const handleMark = async () => {
    if (!camActive) { setError('Please start the camera first.'); return }
    if (!audioBlob) { setError('Please record a voice sample first.'); return }
    setSubmitting(true); setResult(null); setError('')
    try {
      const frameBlob = await captureFrame()
      if (!frameBlob) throw new Error('Could not capture frame')
      const { data } = await markAttendance(sessionId, sessionLabel, frameBlob, audioBlob)
      setResult(data)
      if (data.is_present && !data.is_duplicate) loadTodayList()
    } catch (err) {
      setError(err.response?.data?.detail || 'Attendance marking failed. Please try again.')
    } finally { setSubmitting(false) }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: `radial-gradient(ellipse at 20% 30%, rgba(79,142,247,0.08) 0%, transparent 50%),
                   radial-gradient(ellipse at 80% 70%, rgba(139,92,246,0.08) 0%, transparent 50%),
                   var(--bg-primary)`,
      padding: 32,
    }}>
      {/* Header */}
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--gradient-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GraduationCap size={22} color="white" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Live Attendance</h1>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sessionLabel}</div>
          </div>
        </div>

        {/* Session config */}
        <div className="glass-card" style={{ padding: 20, marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>Session ID</label>
              <input className="input-field" value={sessionId} onChange={e => setSessionId(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>Session Label</label>
              <input className="input-field" value={sessionLabel} onChange={e => setSessionLabel(e.target.value)} />
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24 }}>
          {/* ── Left: camera + controls ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Webcam */}
            <div className={`webcam-box ${camActive ? 'scanning' : ''} ${result?.is_present ? 'success' : ''} ${result && !result.is_present ? 'error' : ''}`}
                 style={{ aspectRatio: '4/3', background: '#000' }}>
              <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: camActive ? 'block' : 'none' }} />
              {!camActive && (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--text-muted)' }}>
                  <Camera size={56} style={{ opacity: 0.2 }} />
                  <span>Camera not active</span>
                </div>
              )}
              {/* Scanning overlay */}
              {camActive && (
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                  <div style={{
                    position: 'absolute', top: '20%', left: '25%', right: '25%', bottom: '10%',
                    border: '2px solid rgba(79,142,247,0.6)',
                    borderRadius: 8,
                  }} />
                </div>
              )}
            </div>

            {/* Mic section */}
            <div className="glass-card" style={{ padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Voice Sample</div>
              {recording ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 36 }}>
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div key={i} className="mic-bar" style={{ animationDelay: `${i * 0.1}s`, height: '100%' }} />
                    ))}
                  </div>
                  <div style={{ color: 'var(--accent-blue)', fontSize: 13, fontWeight: 600 }}>Recording… {secs}s</div>
                  <button className="btn-danger" onClick={stopMic} style={{ width: '100%', justifyContent: 'center' }}>
                    <Volume2 size={15} /> Stop Recording
                  </button>
                </div>
              ) : audioBlob ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-green)', fontSize: 13, fontWeight: 600 }}>
                    <CheckCircle size={16} /> Voice sample ready
                  </div>
                  <button className="btn-secondary" onClick={startMic} style={{ fontSize: 12, padding: '8px 14px' }}>
                    <RefreshCw size={13} /> Re-record
                  </button>
                </div>
              ) : (
                <button className="btn-secondary" onClick={startMic} style={{ width: '100%', justifyContent: 'center' }}>
                  <Mic size={15} /> Record Voice Sample (3-5 sec)
                </button>
              )}
            </div>

            {/* Error */}
            {error && (
              <div style={{ display: 'flex', gap: 10, background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 10, padding: '12px 14px', color: '#f43f5e', fontSize: 13 }}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} /> {error}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              {!camActive
                ? <button className="btn-secondary" onClick={startCamera} style={{ flex: 1, justifyContent: 'center' }}><Camera size={16} /> Start Camera</button>
                : <button className="btn-secondary" onClick={stopCamera} style={{ flex: 1, justifyContent: 'center' }}>Stop Camera</button>
              }
              <button
                className="btn-primary"
                onClick={handleMark}
                disabled={submitting || !camActive || !audioBlob}
                style={{ flex: 1.5, justifyContent: 'center', padding: 14 }}
              >
                {submitting ? <><Loader size={16} className="spin" /> Recognizing…</> : <><Activity size={16} /> Mark Attendance</>}
              </button>
            </div>

            {/* Result */}
            <ResultCard result={result} />
          </div>

          {/* ── Right: today's list ── */}
          <div className="glass-card" style={{ overflow: 'hidden', alignSelf: 'start' }}>
            <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Present Today</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{todayList.length} students</div>
              </div>
              <button className="btn-secondary" onClick={loadTodayList} style={{ padding: '7px 12px', fontSize: 12 }}>
                <RefreshCw size={13} />
              </button>
            </div>
            <div style={{ maxHeight: 500, overflowY: 'auto' }}>
              {loadingList ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Loader size={24} className="spin" style={{ margin: '0 auto 8px' }} />
                </div>
              ) : todayList.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  No one present yet
                </div>
              ) : (
                todayList.map((r) => (
                  <div key={r.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 20px',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gradient-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <User size={16} color="white" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Student #{r.student_id}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        F: {(r.face_score * 100).toFixed(0)}% · V: {(r.voice_score * 100).toFixed(0)}%
                      </div>
                    </div>
                    <CheckCircle size={16} color="var(--accent-green)" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
