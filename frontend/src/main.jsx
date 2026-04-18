import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import './index.css'

// Pages
import LandingPage    from './pages/LandingPage'
import LoginPage      from './pages/LoginPage'
import RegisterPage   from './pages/RegisterPage'
import WorkerDashboard from './pages/WorkerDashboard'
import ShiftsPage     from './pages/ShiftsPage'
import VerifierPage   from './pages/VerifierPage'
import AdvocatePage   from './pages/AdvocatePage'
import GrievancePage  from './pages/GrievancePage'
import ProfilePage    from './pages/ProfilePage'
import Layout         from './components/shared/Layout'

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return children
}

function RoleRedirect() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'verifier') return <Navigate to="/verify" replace />
  if (user.role === 'advocate') return <Navigate to="/advocate" replace />
  return <Navigate to="/dashboard" replace />
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"         element={<LandingPage />} />
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/home"     element={<RoleRedirect />} />

          <Route element={<Layout />}>
            <Route path="/dashboard" element={
              <ProtectedRoute roles={['worker']}>
                <WorkerDashboard />
              </ProtectedRoute>
            }/>
            <Route path="/shifts" element={
              <ProtectedRoute roles={['worker']}>
                <ShiftsPage />
              </ProtectedRoute>
            }/>
            <Route path="/grievances" element={
              <ProtectedRoute>
                <GrievancePage />
              </ProtectedRoute>
            }/>
            <Route path="/verify" element={
              <ProtectedRoute roles={['verifier', 'advocate']}>
                <VerifierPage />
              </ProtectedRoute>
            }/>
            <Route path="/advocate" element={
              <ProtectedRoute roles={['advocate']}>
                <AdvocatePage />
              </ProtectedRoute>
            }/>
            <Route path="/profile" element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }/>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
)