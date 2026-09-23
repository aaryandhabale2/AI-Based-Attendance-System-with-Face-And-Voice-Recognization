// src/pages/TakeAttendance.jsx — Live two-factor attendance marking with Session Gate
import { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Camera, Mic, CheckCircle, XCircle, AlertCircle,
  Loader, RefreshCw, GraduationCap, User, Volume2,
  ShieldCheck, ShieldX, Activity, Clock, QrCode, ArrowLeft,
  KeyRound, BookOpen, School, Check, LogOut
} from 'lucide-react'
import { markAttendance, getTodayAttendance, getChallenge } from '../api/attendance'
import { getSession } from '../api/session'

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
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  // Session gate state
  const [sessionCodeInput, setSessionCodeInput] = useState('')
  const [validatingSession, setValidatingSession] = useState(false)
  const [sessionGateError, setSessionGateError] = useState('')
  const [activeSessionData, setActiveSessionData] = useState(null)
  const [remainingTime, setRemainingTime] = useState(null)
  const [manualMode, setManualMode] = useState(false)

  // Attendance flow state
  const videoRef  = useRef(null)
  const streamRef = useRef(null)
  const [camActive, setCamActive]   = useState(false)
  const [result, setResult]         = useState(null)
  const [error, setError]           = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sessionId, setSessionId]   = useState('')
  const [sessionLabel, setSessionLabel] = useState('')
  const [todayList, setTodayList]   = useState([])
  const [loadingList, setLoadingList] = useState(false)
  const [challenge, setChallenge]   = useState(null)

  const { recording, audioBlob, secs, start: startMic, stop: stopMic } = useMicRecorder()

  // Anti-replay challenge
  const fetchChallenge = useCallback(async () => {
    try {
      const { data } = await getChallenge(60)
      setChallenge(data)
    } catch (e) {
      console.error('Failed to load anti-replay challenge:', e)
    }
  }, [])

  useEffect(() => {
    fetchChallenge()
  }, [fetchChallenge])

  // Validate session code
  const validateSessionCode = useCallback(async (codeToValidate) => {
    if (!codeToValidate || !codeToValidate.trim()) {
      setSessionGateError('Please enter a session code.')
      return
    }
    const clean = codeToValidate.trim().toUpperCase()
    setValidatingSession(true)
    setSessionGateError('')
    try {
      const { data } = await getSession(clean)
      setActiveSessionData(data)
      setSessionId(data.session_id)
      setSessionLabel(
        data.subject_name
          ? `${data.subject_name} (${data.class_name}${data.section ? ' - ' + data.section : ''})`
          : `${data.class_name} Session`
      )
      setSessionGateError('')
    } catch (err) {
      setActiveSessionData(null)
      setSessionGateError(
        err.response?.data?.detail || 'Session code is invalid or has expired. Please check with your teacher.'
      )
    } finally {
      setValidatingSession(false)
    }
  }, [])

  // Auto-check URL query on initial load (?code=... or ?session_id=...)
  useEffect(() => {
    const codeParam = searchParams.get('code') || searchParams.get('session_id')
    const manualParam = searchParams.get('manual') === 'true'
    if (manualParam) {
      setManualMode(true)
      const now = new Date()
      const dateStr = now.toISOString().split('T')[0]
      const hour = now.getHours()
      const slot = hour < 13 ? 'MORNING' : 'AFTERNOON'
      setSessionId(codeParam || `${slot}_${dateStr}`)
      setSessionLabel(searchParams.get('session_label') || `${slot === 'MORNING' ? 'Morning' : 'Afternoon'} Session — ${dateStr}`)
      return
    }
    if (codeParam) {
      setSessionCodeInput(codeParam.toUpperCase())
      validateSessionCode(codeParam)
    }
  }, [searchParams, validateSessionCode])

  // Live countdown timer for active session
  useEffect(() => {
    if (!activeSessionData?.expires_at) return
    const updateCountdown = () => {
      const exp = new Date(activeSessionData.expires_at).getTime()
      const diff = Math.floor((exp - Date.now()) / 1000)
      if (diff <= 0) {
        setRemainingTime('Expired')
        setError('This session has expired. New attendance cannot be marked.')
      } else {
        const mins = Math.floor(diff / 60)
        const s = diff % 60
        setRemainingTime(`${mins}:${s < 10 ? '0' : ''}${s}`)
      }
    }
    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
    return () => clearInterval(timer)
  }, [activeSessionData])

  // Camera handling
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setCamActive(true)
      setResult(null)
      setError('')
    } catch {
      setError('Cannot access webcam. Please allow camera permissions.')
    }
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
      const { data } = await getTodayAttendance(sessionId)
      setTodayList(data.filter(r => r.is_present))
    } catch {} finally { setLoadingList(false) }
  }, [sessionId])

  useEffect(() => {
    if (sessionId) loadTodayList()
  }, [sessionId, loadTodayList])

  const handleMark = async () => {
    if (!camActive) { setError('Please start the camera first.'); return }
    if (!audioBlob) { setError('Please record a voice sample first.'); return }
    setSubmitting(true); setResult(null); setError('')
    try {
      const frameBlob = await captureFrame()
      if (!frameBlob) throw new Error('Could not capture frame')
      const { data } = await markAttendance(
        sessionId,
        sessionLabel,
        frameBlob,
        audioBlob,
        challenge?.challenge_id,
        challenge?.phrase,
      )
      setResult(data)
      if (data.is_present && !data.is_duplicate) loadTodayList()
      fetchChallenge()
    } catch (err) {
      setError(err.response?.data?.detail || 'Attendance marking failed. Please try again.')
      fetchChallenge()
    } finally { setSubmitting(false) }
  }

  const handleExitSession = () => {
    stopCamera()
    setActiveSessionData(null)
    setSessionId('')
    setSessionLabel('')
    setSessionCodeInput('')
    setSearchParams({})
  }

  /* ─────────────────────────────────────────────────────────────────────────────
     RENDER: Session Code Entry Screen (when no active validated session)
  ───────────────────────────────────────────────────────────────────────────── */
  if (!activeSessionData && !manualMode) {
    return (
      <div style={{
        minHeight: '100vh',
        background: `radial-gradient(ellipse at 20% 30%, rgba(79,142,247,0.12) 0%, transparent 50%),
                     radial-gradient(ellipse at 80% 70%, rgba(139,92,246,0.12) 0%, transparent 50%),
                     var(--bg-primary, #0c101d)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}>
        <div className="glass-card fade-in-up" style={{
          maxWidth: 480,
          width: '100%',
          padding: '36px 32px',
          borderRadius: 20,
          boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(18, 24, 40, 0.85)',
          backdropFilter: 'blur(20px)',
        }}>
          {/* Header icon */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{
              width: 60, height: 60, borderRadius: 16,
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 10px 25px rgba(124, 58, 237, 0.4)',
              marginBottom: 16,
            }}>
              <GraduationCap size={32} color="#ffffff" />
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-blue, #60a5fa)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              JD College of Engineering
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: '6px 0 8px', color: '#f8fafc' }}>
              Student Attendance Kiosk
            </h1>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
              Enter the 6-character session code shown on your classroom screen or scan the teacher's QR code.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={(e) => { e.preventDefault(); validateSessionCode(sessionCodeInput) }}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Class Session Code
              </label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={20} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="text"
                  maxLength={10}
                  placeholder="e.g. 7X9K2P"
                  value={sessionCodeInput}
                  onChange={(e) => setSessionCodeInput(e.target.value.toUpperCase())}
                  style={{
                    width: '100%',
                    padding: '14px 16px 14px 48px',
                    fontSize: 20,
                    fontWeight: 800,
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    textAlign: 'center',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1.5px solid rgba(148, 163, 184, 0.25)',
                    borderRadius: 12,
                    color: '#ffffff',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  autoFocus
                />
              </div>
            </div>

            {sessionGateError && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 10,
                padding: '12px 14px',
                marginBottom: 20,
                color: '#f87171',
                fontSize: 13,
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{sessionGateError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={validatingSession || !sessionCodeInput.trim()}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: 15,
                fontWeight: 700,
                justifyContent: 'center',
                borderRadius: 12,
                cursor: validatingSession || !sessionCodeInput.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {validatingSession ? (
                <>
                  <Loader size={18} className="spin" />
                  Validating Session…
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  Join Attendance Session
                </>
              )}
            </button>
          </form>

          {/* Quick info & toggle */}
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#64748b' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <QrCode size={14} /> Scan teacher's QR code
            </span>
            <button
              type="button"
              onClick={() => {
                setManualMode(true)
                const now = new Date()
                const dateStr = now.toISOString().split('T')[0]
                const hour = now.getHours()
                const slot = hour < 13 ? 'MORNING' : 'AFTERNOON'
                setSessionId(`${slot}_${dateStr}`)
                setSessionLabel(`${slot === 'MORNING' ? 'Morning' : 'Afternoon'} Session — ${dateStr}`)
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-blue, #60a5fa)',
                cursor: 'pointer',
                fontSize: 12,
                padding: 0,
                textDecoration: 'underline',
              }}
            >
              Manual session mode
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ─────────────────────────────────────────────────────────────────────────────
     RENDER: Active Attendance Session (Camera + Anti-Replay + Verification)
  ───────────────────────────────────────────────────────────────────────────── */
  return (
    <div style={{
      minHeight: '100vh',
      background: `radial-gradient(ellipse at 20% 30%, rgba(79,142,247,0.08) 0%, transparent 50%),
                   radial-gradient(ellipse at 80% 70%, rgba(139,92,246,0.08) 0%, transparent 50%),
                   var(--bg-primary)`,
      padding: '24px 32px',
    }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        {/* Top bar with Session pill & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(124, 58, 237, 0.3)',
            }}>
              <GraduationCap size={22} color="white" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>
                  {activeSessionData?.subject_name || sessionLabel || 'Live Attendance'}
                </h1>
                {sessionId && (
                  <span style={{
                    background: 'rgba(96, 165, 250, 0.15)',
                    color: '#60a5fa',
                    border: '1px solid rgba(96, 165, 250, 0.3)',
                    padding: '2px 8px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                  }}>
                    CODE: {sessionId}
                  </span>
                )}
                {activeSessionData?.class_name && (
                  <span style={{
                    background: 'rgba(168, 85, 247, 0.15)',
                    color: '#c084fc',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    padding: '2px 8px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                  }}>
                    {activeSessionData.class_name} · Sec {activeSessionData.section || 'A'}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                {activeSessionData?.teacher_name ? `Instructor: ${activeSessionData.teacher_name}` : sessionLabel}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {remainingTime && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 14px',
                borderRadius: 10,
                background: remainingTime === 'Expired' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.12)',
                border: remainingTime === 'Expired' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                color: remainingTime === 'Expired' ? '#f87171' : '#34d399',
                fontSize: 13,
                fontWeight: 700,
              }}>
                <Clock size={15} />
                <span>{remainingTime === 'Expired' ? 'Session Expired' : `Time Remaining: ${remainingTime}`}</span>
              </div>
            )}

            <button
              onClick={handleExitSession}
              className="btn-secondary"
              style={{ padding: '8px 14px', fontSize: 13, gap: 6 }}
              title="Leave this attendance session"
            >
              <LogOut size={14} /> Exit Session
            </button>
          </div>
        </div>

        {/* Manual Config if in manual mode */}
        {manualMode && (
          <div className="glass-card" style={{ padding: 18, marginBottom: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 14, alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>Session ID</label>
                <input className="input-field" value={sessionId} onChange={e => setSessionId(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>Session Label</label>
                <input className="input-field" value={sessionLabel} onChange={e => setSessionLabel(e.target.value)} />
              </div>
              <button className="btn-secondary" onClick={() => setManualMode(false)} style={{ fontSize: 12, padding: '10px 14px' }}>
                Use Code Gate
              </button>
            </div>
          </div>
        )}

        {/* Attendance Marking Interface */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24 }}>
          {/* ── Left: Camera & Verification ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Webcam View */}
            <div
              className={`webcam-box ${camActive ? 'scanning' : ''} ${result?.is_present ? 'success' : ''} ${result && !result.is_present ? 'error' : ''}`}
              style={{ aspectRatio: '4/3', background: '#000', borderRadius: 16, overflow: 'hidden', position: 'relative' }}
            >
              <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: camActive ? 'block' : 'none' }} />
              {!camActive && (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--text-muted)' }}>
                  <Camera size={56} style={{ opacity: 0.25 }} />
                  <span style={{ fontSize: 14, fontWeight: 500 }}>Camera inactive — click "Start Camera" to begin</span>
                </div>
              )}
              {/* Face Guide Box */}
              {camActive && (
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                  <div style={{
                    position: 'absolute', top: '15%', left: '22%', right: '22%', bottom: '15%',
                    border: '2px dashed rgba(96, 165, 250, 0.8)',
                    borderRadius: 16,
                    boxShadow: '0 0 20px rgba(96, 165, 250, 0.2)',
                  }} />
                  <div style={{
                    position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
                    color: '#ffffff', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  }}>
                    Align face inside guide
                  </div>
                </div>
              )}
            </div>

            {/* Anti-Replay Challenge Banner */}
            {challenge && (
              <div style={{
                background: 'rgba(79, 142, 247, 0.08)',
                border: '1px solid rgba(79, 142, 247, 0.3)',
                borderRadius: 14,
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700 }}>
                    🛡️ Live Anti-Replay Challenge
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-blue)', letterSpacing: 1.2, marginTop: 4 }}>
                    "{challenge.phrase}"
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
                    Please speak this exact phrase clearly while recording your voice
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={fetchChallenge}
                  style={{ padding: '8px 12px', fontSize: 11 }}
                  title="Generate new phrase"
                >
                  <RefreshCw size={13} />
                </button>
              </div>
            )}

            {/* Mic section */}
            <div className="glass-card" style={{ padding: 20, borderRadius: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>Voice Sample Verification</div>
              {recording ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 36 }}>
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div key={i} className="mic-bar" style={{ animationDelay: `${i * 0.1}s`, height: '100%' }} />
                    ))}
                  </div>
                  <div style={{ color: 'var(--accent-blue)', fontSize: 13, fontWeight: 600 }}>Recording… {secs}s</div>
                  <button className="btn-danger" onClick={stopMic} style={{ width: '100%', justifyContent: 'center', padding: 12 }}>
                    <Volume2 size={16} /> Stop Recording
                  </button>
                </div>
              ) : audioBlob ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-green)', fontSize: 13, fontWeight: 600 }}>
                    <CheckCircle size={18} /> Voice sample ready ({secs || 3}s)
                  </div>
                  <button className="btn-secondary" onClick={startMic} style={{ fontSize: 12, padding: '8px 14px' }}>
                    <RefreshCw size={13} /> Re-record
                  </button>
                </div>
              ) : (
                <button className="btn-secondary" onClick={startMic} style={{ width: '100%', justifyContent: 'center', padding: 12 }}>
                  <Mic size={16} /> Record Voice Sample (Speak Challenge Phrase)
                </button>
              )}
            </div>

            {/* Error banner */}
            {error && (
              <div style={{ display: 'flex', gap: 10, background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 10, padding: '12px 14px', color: '#f43f5e', fontSize: 13 }}>
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 12 }}>
              {!camActive
                ? <button className="btn-secondary" onClick={startCamera} style={{ flex: 1, justifyContent: 'center', padding: 14 }}><Camera size={18} /> Start Camera</button>
                : <button className="btn-secondary" onClick={stopCamera} style={{ flex: 1, justifyContent: 'center', padding: 14 }}>Stop Camera</button>
              }
              <button
                className="btn-primary"
                onClick={handleMark}
                disabled={submitting || !camActive || !audioBlob || remainingTime === 'Expired'}
                style={{ flex: 1.5, justifyContent: 'center', padding: 14, fontSize: 15 }}
              >
                {submitting ? <><Loader size={18} className="spin" /> Verifying Face & Voice…</> : <><Activity size={18} /> Verify & Mark Attendance</>}
              </button>
            </div>

            {/* Result */}
            <ResultCard result={result} />
          </div>

          {/* ── Right: Attendance records for this session ── */}
          <div className="glass-card" style={{ overflow: 'hidden', alignSelf: 'start', borderRadius: 16 }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Verified in this Session</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{todayList.length} students recorded</div>
              </div>
              <button className="btn-secondary" onClick={loadTodayList} style={{ padding: '7px 12px', fontSize: 12 }} title="Refresh list">
                <RefreshCw size={13} />
              </button>
            </div>
            <div style={{ maxHeight: 520, overflowY: 'auto' }}>
              {loadingList ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Loader size={24} className="spin" style={{ margin: '0 auto 8px' }} />
                  <div style={{ fontSize: 12 }}>Updating attendance list…</div>
                </div>
              ) : todayList.length === 0 ? (
                <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  <GraduationCap size={32} style={{ opacity: 0.2, margin: '0 auto 8px' }} />
                  <div>No students marked yet</div>
                  <div style={{ fontSize: 11, marginTop: 4 }}>Attendance marks will appear here live</div>
                </div>
              ) : (
                todayList.map((r) => (
                  <div key={r.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 20px',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--gradient-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <User size={16} color="white" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.student_name || `Student #${r.student_id}`}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {r.roll_no ? `${r.roll_no} · ` : ''}F: {(r.face_score * 100).toFixed(0)}% · V: {(r.voice_score * 100).toFixed(0)}%
                      </div>
                    </div>
                    <CheckCircle size={18} color="var(--accent-green)" />
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
