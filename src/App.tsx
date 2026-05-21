import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Routes, Route, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import BottomNav from './components/BottomNav'
import PlannerApp from './pages/PlannerApp'
import { auth, onAuthStateChanged, type LocalUser } from './localAuth'
import './App.css'

const basename = import.meta.env.BASE_URL === '/'
  ? ''
  : import.meta.env.BASE_URL.replace(/\/$/, '')

function AuthenticatedRoutes({ user }: { user: LocalUser | null }) {
  const location = useLocation()
  const showBottomNav = Boolean(user && !['/', '/login'].includes(location.pathname))

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/dashboard" element={user ? <PlannerApp /> : <Navigate to="/login" replace />} />
        <Route path="/syllabus" element={user ? <PlannerApp /> : <Navigate to="/login" replace />} />
        <Route path="/tasks" element={user ? <PlannerApp /> : <Navigate to="/login" replace />} />
        <Route path="/calendar" element={user ? <PlannerApp /> : <Navigate to="/login" replace />} />
        <Route path="/course-info" element={user ? <PlannerApp /> : <Navigate to="/login" replace />} />
        <Route path="/assignments" element={<Navigate to="/tasks" replace />} />
        <Route path="/exams" element={user ? <PlannerApp /> : <Navigate to="/login" replace />} />
      </Routes>
      {showBottomNav && <BottomNav />}
    </>
  )
}

function App() {
  const [user, setUser] = useState<LocalUser | null>(auth.currentUser)
  const [isAuthReady, setIsAuthReady] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setIsAuthReady(true)
    })

    return unsubscribe
  }, [])

  if (!isAuthReady) {
    return null
  }

  return (
    <BrowserRouter basename={basename}>
      <AuthenticatedRoutes user={user} />
    </BrowserRouter>
  )
}

export default App
