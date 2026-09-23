// src/App.jsx — Root router with faculty + student routes
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { StudentProvider, useStudent } from './context/StudentContext'
import { lazy, Suspense } from 'react'
import Layout from './components/Layout'

// ── Auth pages (eager) ─────────────────────────────────────────
import Login from './pages/Login'
import TakeAttendance from './pages/TakeAttendance'

// ── Faculty pages (lazy) ───────────────────────────────────────
const Home           = lazy(() => import('./pages/Home'))
const Enroll         = lazy(() => import('./pages/Enroll'))
const MyClasses      = lazy(() => import('./pages/MyClasses'))
const Subjects       = lazy(() => import('./pages/Subjects'))
const Students       = lazy(() => import('./pages/Students'))
const AttendancePage = lazy(() => import('./pages/AttendancePage'))
const Reports        = lazy(() => import('./pages/Reports'))
const Notifications  = lazy(() => import('./pages/Notifications'))
const Settings       = lazy(() => import('./pages/Settings'))
const Profile        = lazy(() => import('./pages/Profile'))

// ── Student pages (lazy) ───────────────────────────────────────
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'))

// ── Loading fallback ───────────────────────────────────────────
function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12 }}>
      <div style={{
        width: 24, height: 24,
        border: '3px solid var(--primary-light)',
        borderTopColor: 'var(--primary)',
        borderRadius: '50%',
      }} className="spin" />
      <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading…</span>
    </div>
  )
}

function FacultyPrivateRoute({ children }) {
  const { isLoggedIn } = useAuth()
  return isLoggedIn ? children : <Navigate to="/login" replace />
}

function StudentPrivateRoute({ children }) {
  const { isLoggedIn } = useStudent()
  return isLoggedIn ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <StudentProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login"      element={<Login />} />
            <Route path="/kiosk"      element={<TakeAttendance />} />
            <Route path="/attendance" element={<TakeAttendance />} />

            {/* Student routes */}
            <Route
              path="/student/*"
              element={
                <StudentPrivateRoute>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path="dashboard" element={<StudentDashboard />} />
                      <Route path="*"         element={<Navigate to="/student/dashboard" replace />} />
                    </Routes>
                  </Suspense>
                </StudentPrivateRoute>
              }
            />

            {/* Faculty protected routes */}
            <Route
              path="/*"
              element={
                <FacultyPrivateRoute>
                  <Layout>
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                        <Route path="/"                   element={<Navigate to="/home" replace />} />
                        <Route path="/home"               element={<Home />} />
                        <Route path="/enroll"             element={<Enroll />} />
                        <Route path="/classes"            element={<MyClasses />} />
                        <Route path="/subjects"           element={<Subjects />} />
                        <Route path="/students"           element={<Students />} />
                        <Route path="/attendance-records" element={<AttendancePage />} />
                        <Route path="/reports"            element={<Reports />} />
                        <Route path="/notifications"      element={<Notifications />} />
                        <Route path="/settings"           element={<Settings />} />
                        <Route path="/profile"            element={<Profile />} />
                        <Route path="/dashboard"          element={<Navigate to="/home" replace />} />
                      </Routes>
                    </Suspense>
                  </Layout>
                </FacultyPrivateRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </StudentProvider>
    </AuthProvider>
  )
}
