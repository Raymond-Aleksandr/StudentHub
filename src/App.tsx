import { useEffect, useState, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Routes, Route, useLocation } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import Home from './pages/Home'
import Login from './pages/Login'
import BottomNav from './components/BottomNav'
import TodayPage from './pages/TodayPage'
import ImportPage from './pages/ImportPage'
import TasksPage from './pages/TasksPage'
import CalendarPage from './pages/CalendarPage'
import ExamsPage from './pages/ExamsPage'
import CoursesPage from './pages/CoursesPage'
import { PlannerProvider } from './data/usePlanner'
import { auth, onAuthStateChanged, signOut, type LocalUser } from './localAuth'
import './App.css'
import './planner.css'

const basename = import.meta.env.BASE_URL === '/'
  ? ''
  : import.meta.env.BASE_URL.replace(/\/$/, '')

const plannerViewCopy = {
  dashboard: { eyebrow: 'Planner', title: 'Today' },
  syllabus: { eyebrow: 'Syllabus', title: 'Import' },
  tasks: { eyebrow: 'Deadlines', title: 'Tasks' },
  calendar: { eyebrow: 'Month', title: 'Calendar' },
  exams: { eyebrow: 'Assessment', title: 'Exams' },
  'course-info': { eyebrow: 'Term', title: 'Courses' },
} as const

function getPlannerCopy(pathname: string) {
  const key = pathname.split('/').filter(Boolean)[0] as keyof typeof plannerViewCopy | undefined
  return plannerViewCopy[key ?? 'dashboard'] ?? plannerViewCopy.dashboard
}

function PlannerShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const copy = getPlannerCopy(location.pathname)

  const handleLogout = async () => {
    await signOut(auth)
  }

  return (
    <div className="planner-app">
      <header className="planner-topbar">
        <div>
          <span>{copy.eyebrow}</span>
          <h1>{copy.title}</h1>
        </div>
        <button className="planner-icon-button" onClick={handleLogout} aria-label="Log out">
          <LogOut size={20} />
        </button>
      </header>
      <main className="planner-main">
        {children}
      </main>
    </div>
  )
}

function ProtectedPlannerPage({ user, children }: { user: LocalUser | null; children: ReactNode }) {
  if (!user) return <Navigate to="/login" replace />

  return (
    <PlannerProvider>
      <PlannerShell>{children}</PlannerShell>
    </PlannerProvider>
  )
}

function AuthenticatedRoutes({ user }: { user: LocalUser | null }) {
  const location = useLocation()
  const showBottomNav = Boolean(user && !['/', '/login'].includes(location.pathname))

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/dashboard" element={<ProtectedPlannerPage user={user}><TodayPage /></ProtectedPlannerPage>} />
        <Route path="/syllabus" element={<ProtectedPlannerPage user={user}><ImportPage /></ProtectedPlannerPage>} />
        <Route path="/tasks" element={<ProtectedPlannerPage user={user}><TasksPage /></ProtectedPlannerPage>} />
        <Route path="/calendar" element={<ProtectedPlannerPage user={user}><CalendarPage /></ProtectedPlannerPage>} />
        <Route path="/exams" element={<ProtectedPlannerPage user={user}><ExamsPage /></ProtectedPlannerPage>} />
        <Route path="/course-info" element={<ProtectedPlannerPage user={user}><CoursesPage /></ProtectedPlannerPage>} />
        <Route path="/assignments" element={<Navigate to="/tasks" replace />} />
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

  if (!isAuthReady) return null

  return (
    <BrowserRouter basename={basename}>
      <AuthenticatedRoutes user={user} />
    </BrowserRouter>
  )
}

export default App
