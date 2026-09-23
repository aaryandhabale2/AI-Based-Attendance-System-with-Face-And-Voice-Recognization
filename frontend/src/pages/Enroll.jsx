// src/pages/Enroll.jsx — Student enrollment with webcam + mic
import { useState, useRef, useCallback } from 'react'
import {
  UserPlus, Camera, Mic, CheckCircle, AlertCircle,
  Loader, Trash2, ChevronRight, Volume2, User
} from 'lucide-react'
import {
  createStudent, enrollFace, enrollVoice, completeEnrollment, listStudents
} from '../api/enrollment'

/* ── Step indicator ──────────────────────────────────────────────────────── */
function StepBadge({ step, current, label }) {
  const done   = step < current
  const active = step === current
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: done ? 'var(--green)' : active ? 'var(--primary)' : 'var(--bg-input)',
        border: active ? 'none' : done ? 'none' : '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700,
        color: done || active ? 'white' : 'var(--text-muted)',
        flexShrink: 0,
      }}>
        {done ? <CheckCircle size={16} /> : step}
      </div>
      <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? 'var(--text-primary)' : 'var(--text-muted)' }}>
        {label}
      </span>
    </div>
  )
}

/* ── Webcam capture helper ───────────────────────────────────────────────── */
function captureFrame(videoEl) {
  const canvas = document.createElement('canvas')
  canvas.width  = videoEl.videoWidth  || 640
  canvas.height = videoEl.videoHeight || 480
  canvas.getContext('2d').drawImage(videoEl, 0, 0)
  return new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.9))
}

export default function Enroll() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ name: '', roll_no: '', class_name: '', parent_phone: '' })
  const [student, setStudent] = useState(null)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  // Webcam
  const videoRef   = useRef(null)
  const streamRef  = useRef(null)
  const [frames, setFrames]       = useState([])    // captured Blob[]
  const [camActive, setCamActive] = useState(false)

  // Voice
  const recorderRef = useRef(null)
  const [samples, setSamples]       = useState([])   // recorded Blob[]
  const [recording, setRecording]   = useState(false)
  const [recSeconds, setRecSeconds] = useState(0)
  const timerRef = useRef(null)

  const showError = (msg) => { setError(msg); setSuccess('') }
  const showSuccess = (msg) => { setSuccess(msg); setError('') }

  /* ── Step 1: Create student ── */
  const handleCreateStudent = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const { data } = await createStudent(form)
      setStudent(data)
      showSuccess(`Student "${data.name}" (${data.roll_no}) created!`)
      setStep(2)
    } catch (err) {
      showError(err.response?.data?.detail || 'Failed to create student')
    } finally { setLoading(false) }
  }

  /* ── Step 2: Face capture ── */
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setCamActive(true)
    } catch { showError('Cannot access webcam. Please allow camera permission.') }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    setCamActive(false)
  }

  const capturePhoto = async () => {
    if (!videoRef.current || !camActive) return
    const blob = await captureFrame(videoRef.current)
    setFrames(prev => [...prev, blob])
  }

  const handleFaceEnroll = async () => {
    if (frames.length < 3) { showError('Capture at least 3 face photos.'); return }
    setLoading(true)
    try {
      await enrollFace(student.id, frames)
      stopCamera()
      showSuccess(`Face enrolled from ${frames.length} photos!`)
      setStep(3)
    } catch (err) {
      showError(err.response?.data?.detail || 'Face enrollment failed')
    } finally { setLoading(false) }
  }

  /* ── Step 3: Voice samples ── */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      const chunks = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        setSamples(prev => [...prev, blob])
        stream.getTracks().forEach(t => t.stop())
        setRecording(false)
        clearInterval(timerRef.current)
        setRecSeconds(0)
      }
      recorder.start()
      recorderRef.current = recorder
      setRecording(true)
      setRecSeconds(0)
      timerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000)
    } catch { showError('Cannot access microphone.') }
  }

  const stopRecording = () => recorderRef.current?.stop()

  const handleVoiceEnroll = async () => {
    if (samples.length < 2) { showError('Record at least 2 voice samples.'); return }
    setLoading(true)
    try {
      await enrollVoice(student.id, samples)
      showSuccess(`Voice enrolled from ${samples.length} samples!`)
      setStep(4)
    } catch (err) {
      showError(err.response?.data?.detail || 'Voice enrollment failed')
    } finally { setLoading(false) }
  }

  /* ── Step 4: Complete ── */
  const handleComplete = async () => {
    setLoading(true)
    try {
      await completeEnrollment(student.id)
      showSuccess(`Enrollment complete for ${student.name}!`)
      setStep(5)
    } catch (err) {
      showError(err.response?.data?.detail || 'Could not complete enrollment')
    } finally { setLoading(false) }
  }

  /* ── Reset ── */
  const reset = () => {
    stopCamera(); stopRecording()
    setStep(1); setForm({ name: '', roll_no: '', class_name: '', parent_phone: '' })
    setStudent(null); setFrames([]); setSamples([])
    setError(''); setSuccess('')
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>Enroll Student</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>
          Register a new student with face and voice biometrics
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24 }}>
        {/* Step sidebar */}
        <div className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: 20, alignSelf: 'start' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px' }}>STEPS</div>
          <StepBadge step={1} current={step} label="Student Info" />
          <StepBadge step={2} current={step} label="Face Photos" />
          <StepBadge step={3} current={step} label="Voice Samples" />
          <StepBadge step={4} current={step} label="Complete" />
        </div>

        {/* Main panel */}
        <div className="card card-p">
          {error && (
            <div style={{ display: 'flex', gap: 10, background: 'var(--red-bg)', border: '1px solid var(--red-border)', borderRadius: 10, padding: '12px 14px', marginBottom: 20, color: 'var(--red)', fontSize: 13 }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} /> {error}
            </div>
          )}
          {success && (
            <div style={{ display: 'flex', gap: 10, background: 'var(--green-bg)', border: '1px solid var(--green-border)', borderRadius: 10, padding: '12px 14px', marginBottom: 20, color: 'var(--green)', fontSize: 13 }}>
              <CheckCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} /> {success}
            </div>
          )}

          {/* ── Step 1: Info ── */}
          {step === 1 && (
            <form onSubmit={handleCreateStudent} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700 }}>Student Information</h2>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>Fill in the student's basic details</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { key: 'name', label: 'Full Name', placeholder: 'Aarav Sharma' },
                  { key: 'roll_no', label: 'Roll Number', placeholder: 'CSA001' },
                  { key: 'class_name', label: 'Class', placeholder: 'CS-A' },
                  { key: 'parent_phone', label: 'Parent Phone', placeholder: '9876543210' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase' }}>{label}</label>
                    <input className="input-field" placeholder={placeholder} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} required />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" type="submit" disabled={loading}>
                  {loading ? <><Loader size={15} className="spin" /> Creating…</> : <>Next <ChevronRight size={15} /></>}
                </button>
              </div>
            </form>
          )}

          {/* ── Step 2: Face ── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700 }}>Face Enrollment</h2>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>Capture 5-10 photos from different angles. Raw photos are NOT stored.</p>
              </div>

              <div className={`webcam-box ${camActive ? 'scanning' : ''}`} style={{ aspectRatio: '4/3', background: '#000', maxHeight: 320 }}>
                <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: camActive ? 'block' : 'none' }} />
                {!camActive && (
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--text-muted)' }}>
                    <Camera size={48} style={{ opacity: 0.3 }} />
                    <span style={{ fontSize: 14 }}>Camera not active</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {frames.map((_, i) => (
                  <div key={i} style={{ width: 48, height: 48, background: 'var(--accent-green)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white' }}>
                    #{i + 1}
                  </div>
                ))}
                {frames.length > 0 && <span style={{ fontSize: 13, color: 'var(--text-muted)', alignSelf: 'center' }}>{frames.length} captured</span>}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                {!camActive
                  ? <button className="btn btn-secondary" onClick={startCamera}><Camera size={15} /> Start Camera</button>
                  : <>
                      <button className="btn btn-primary" onClick={capturePhoto}><Camera size={15} /> Capture Photo</button>
                      <button className="btn btn-secondary" onClick={stopCamera}>Stop Camera</button>
                    </>
                }
                {frames.length >= 3 && (
                  <button className="btn btn-primary" onClick={handleFaceEnroll} disabled={loading} style={{ marginLeft: 'auto' }}>
                    {loading ? <><Loader size={15} className="spin" /> Enrolling…</> : <>Enroll Face <ChevronRight size={15} /></>}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Step 3: Voice ── */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700 }}>Voice Enrollment</h2>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>Record 3-5 voice samples (3-5 seconds each). Say your name or count aloud. Raw audio is NOT stored.</p>
              </div>

              <div style={{
                border: '2px dashed var(--border)',
                borderRadius: 16, padding: 40,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
                borderColor: recording ? 'var(--accent-blue)' : 'var(--border)',
                transition: 'border-color 0.3s',
              }}>
                {recording ? (
                  <>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 40 }}>
                      {Array.from({ length: 7 }).map((_, i) => (
                        <div key={i} className="mic-bar" style={{ animationDelay: `${i * 0.12}s`, height: 20 + Math.random() * 20 }} />
                      ))}
                    </div>
                    <div style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>Recording… {recSeconds}s</div>
                    <button className="btn-danger" onClick={stopRecording}><Volume2 size={15} /> Stop Recording</button>
                  </>
                ) : (
                  <>
                    <Mic size={40} style={{ opacity: 0.3 }} />
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
                      Click to start recording. Hold for 3-5 seconds, then stop.
                    </p>
                    <button className="btn-primary" onClick={startRecording}><Mic size={15} /> Record Sample #{samples.length + 1}</button>
                  </>
                )}
              </div>

              {samples.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {samples.map((_, i) => (
                    <span key={i} className="badge badge-green"><CheckCircle size={10} /> Sample {i + 1}</span>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                {samples.length >= 2 && (
                  <button className="btn-primary" onClick={handleVoiceEnroll} disabled={loading}>
                    {loading ? <><Loader size={15} className="spin" /> Enrolling…</> : <>Enroll Voice <ChevronRight size={15} /></>}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Step 4: Complete ── */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700 }}>Complete Enrollment</h2>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>Both face and voice have been enrolled. Click below to finalise.</p>
              </div>
              <div className="card card-p" style={{ background: 'var(--green-bg)', borderColor: 'var(--green-border)' }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--gradient-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={24} color="white" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{student?.name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{student?.roll_no} · {student?.class_name}</div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={handleComplete} disabled={loading}>
                  {loading ? <><Loader size={15} className="spin" /> Saving…</> : <><CheckCircle size={15} /> Complete Enrollment</>}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 5: Done ── */}
          {step === 5 && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--gradient-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <CheckCircle size={36} color="white" />
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 8px' }}>Enrollment Complete!</h2>
              <p style={{ color: 'var(--text-muted)', margin: '0 0 32px' }}>
                {student?.name} is now ready for two-factor attendance.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button className="btn btn-primary" onClick={reset}><UserPlus size={15} /> Enroll Another</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
