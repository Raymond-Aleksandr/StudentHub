import { useEffect, useState, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, CalendarDays, FileUp, GraduationCap, Home as HomeIcon, ListChecks, LogOut, Palette, X } from 'lucide-react'
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
  import: { eyebrow: 'Syllabus', title: 'Import' },
  syllabus: { eyebrow: 'Syllabus', title: 'Import' },
  tasks: { eyebrow: 'Deadlines', title: 'Tasks' },
  calendar: { eyebrow: 'Month', title: 'Calendar' },
  exams: { eyebrow: 'Assessment', title: 'Exams' },
  'course-info': { eyebrow: 'Term', title: 'Courses' },
} as const

const navItems = [
  { label: 'Today', path: '/dashboard', icon: HomeIcon },
  { label: 'Import', path: '/import', icon: FileUp },
  { label: 'Tasks', path: '/tasks', icon: ListChecks },
  { label: 'Exams', path: '/exams', icon: GraduationCap },
  { label: 'Calendar', path: '/calendar', icon: CalendarDays },
  { label: 'Courses', path: '/course-info', icon: BookOpen },
]

const tweakStorageKey = 'studenthub.tweaks'

const tweakDefaults = {
  accentHue: 38,
  density: 'comfortable',
  dark: false,
}

const accentOptions = [
  { id: 'clay', label: 'Clay', hue: 38, l: 0.62, c: 0.17 },
  { id: 'plum', label: 'Plum', hue: 340, l: 0.55, c: 0.13 },
  { id: 'sage', label: 'Sage', hue: 150, l: 0.55, c: 0.1 },
  { id: 'slate', label: 'Slate', hue: 250, l: 0.55, c: 0.13 },
] as const

type ThemeTweaks = typeof tweakDefaults

function readStoredTweaks(): ThemeTweaks {
  try {
    const raw = localStorage.getItem(tweakStorageKey)
    if (!raw) return tweakDefaults
    const parsed = JSON.parse(raw) as Partial<ThemeTweaks>
    const accentHue = typeof parsed.accentHue === 'number' && accentOptions.some((option) => option.hue === parsed.accentHue)
      ? parsed.accentHue
      : tweakDefaults.accentHue
    return {
      accentHue,
      density: parsed.density === 'compact' ? 'compact' : 'comfortable',
      dark: Boolean(parsed.dark),
    }
  } catch {
    return tweakDefaults
  }
}

function applyTweaks(tweaks: ThemeTweaks) {
  const option = accentOptions.find((accent) => accent.hue === tweaks.accentHue) ?? accentOptions[0]
  document.documentElement.style.setProperty('--accent', `oklch(${option.l} ${option.c} ${option.hue})`)
  document.documentElement.style.setProperty('--accent-2', `oklch(${option.l - 0.07} ${option.c + 0.01} ${option.hue})`)
  document.documentElement.style.setProperty('--accent-soft', `oklch(0.93 ${option.c * 0.25} ${option.hue})`)
  document.documentElement.dataset.theme = tweaks.dark ? 'dark' : 'light'
  document.documentElement.dataset.density = tweaks.density
}

function getPlannerCopy(pathname: string) {
  const key = pathname.split('/').filter(Boolean)[0] as keyof typeof plannerViewCopy | undefined
  return plannerViewCopy[key ?? 'dashboard'] ?? plannerViewCopy.dashboard
}

function formatTodayAccent() {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date())
}

function PlannerShell({
  children,
  tweaks,
  tweaksOpen,
  onToggleTweaks,
  onCloseTweaks,
  onSetTweak,
}: {
  children: ReactNode
  tweaks: ThemeTweaks
  tweaksOpen: boolean
  onToggleTweaks: () => void
  onCloseTweaks: () => void
  onSetTweak: <K extends keyof ThemeTweaks>(key: K, value: ThemeTweaks[K]) => void
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const copy = getPlannerCopy(location.pathname)
  const isDashboard = location.pathname === '/dashboard' || location.pathname === '/'

  const handleLogout = async () => {
    await signOut(auth)
  }

  return (
    <div className="app-root">
      <aside className="sidebar" aria-label="Primary">
        <div className="brand-row">
          <span className="brand-mark">SH</span>
          StudentHub
        </div>
        <nav className="nav-stack">
          {navItems.map(({ label, path, icon: Icon }) => (
            <button key={path} className={`nav-btn ${location.pathname === path ? 'active' : ''}`} onClick={() => navigate(path)} type="button">
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <span className="avatar">SR</span>
          <div>
            <strong>Student</strong>
            <span>local profile</span>
          </div>
          <button onClick={handleLogout} aria-label="Log out">
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      <main className="app-main">
        <header className="topbar">
          <div>
            <span className="eyebrow">{copy.eyebrow}</span>
            <h1>
              {copy.title}
              {isDashboard && <span className="topbar-title-accent">, {formatTodayAccent()}</span>}
            </h1>
          </div>
          <button className="topbar-tweaks" onClick={onToggleTweaks} aria-label="Open theme tweaks" aria-expanded={tweaksOpen}>
            <Palette size={18} />
          </button>
        </header>
        {children}
      </main>
      {tweaksOpen && <TweaksPanel tweaks={tweaks} setTweak={onSetTweak} onClose={onCloseTweaks} />}
    </div>
  )
}

function TweaksPanel({
  tweaks,
  setTweak,
  onClose,
}: {
  tweaks: ThemeTweaks
  setTweak: <K extends keyof ThemeTweaks>(key: K, value: ThemeTweaks[K]) => void
  onClose: () => void
}) {
  return (
    <div className="tweaks-panel" role="dialog" aria-label="Tweaks">
      <div className="tp-head">
        <span className="tp-title">Tweaks</span>
        <button className="tp-close" onClick={onClose} aria-label="Close tweaks">
          <X size={16} />
        </button>
      </div>
      <div className="tp-section">
        <label className="tp-label">Accent</label>
        <div className="tp-swatches">
          {accentOptions.map((option) => (
            <button
              key={option.id}
              className={`tp-swatch ${tweaks.accentHue === option.hue ? 'active' : ''}`}
              style={{ background: `oklch(${option.l} ${option.c} ${option.hue})` }}
              onClick={() => setTweak('accentHue', option.hue)}
              aria-label={option.label}
              title={option.label}
            />
          ))}
        </div>
      </div>
      <div className="tp-section">
        <label className="tp-label">Density</label>
        <div className="tp-seg">
          <button className={tweaks.density === 'comfortable' ? 'active' : ''} onClick={() => setTweak('density', 'comfortable')}>Comfortable</button>
          <button className={tweaks.density === 'compact' ? 'active' : ''} onClick={() => setTweak('density', 'compact')}>Compact</button>
        </div>
      </div>
      <div className="tp-section">
        <div className="tp-toggle">
          <label className="tp-label">Dark mode</label>
          <button
            className={`tp-switch ${tweaks.dark ? 'on' : ''}`}
            onClick={() => setTweak('dark', !tweaks.dark)}
            aria-pressed={tweaks.dark}
            aria-label="Toggle dark mode"
          />
        </div>
      </div>
    </div>
  )
}

function PublicTweaksControl({
  tweaks,
  tweaksOpen,
  onToggleTweaks,
  onCloseTweaks,
  onSetTweak,
}: {
  tweaks: ThemeTweaks
  tweaksOpen: boolean
  onToggleTweaks: () => void
  onCloseTweaks: () => void
  onSetTweak: <K extends keyof ThemeTweaks>(key: K, value: ThemeTweaks[K]) => void
}) {
  return (
    <div className="public-tweaks">
      <button className="public-tweaks-button" onClick={onToggleTweaks} aria-label="Open theme tweaks" aria-expanded={tweaksOpen}>
        <Palette size={18} />
      </button>
      {tweaksOpen && <TweaksPanel tweaks={tweaks} setTweak={onSetTweak} onClose={onCloseTweaks} />}
    </div>
  )
}

function ProtectedPlannerPage({
  user,
  children,
  tweaks,
  tweaksOpen,
  onToggleTweaks,
  onCloseTweaks,
  onSetTweak,
}: {
  user: LocalUser | null
  children: ReactNode
  tweaks: ThemeTweaks
  tweaksOpen: boolean
  onToggleTweaks: () => void
  onCloseTweaks: () => void
  onSetTweak: <K extends keyof ThemeTweaks>(key: K, value: ThemeTweaks[K]) => void
}) {
  if (!user) return <Navigate to="/login" replace />

  return (
    <PlannerProvider>
      <PlannerShell
        tweaks={tweaks}
        tweaksOpen={tweaksOpen}
        onToggleTweaks={onToggleTweaks}
        onCloseTweaks={onCloseTweaks}
        onSetTweak={onSetTweak}
      >
        {children}
      </PlannerShell>
    </PlannerProvider>
  )
}

function AuthenticatedRoutes({
  user,
  tweaks,
  tweaksOpen,
  onToggleTweaks,
  onCloseTweaks,
  onSetTweak,
}: {
  user: LocalUser | null
  tweaks: ThemeTweaks
  tweaksOpen: boolean
  onToggleTweaks: () => void
  onCloseTweaks: () => void
  onSetTweak: <K extends keyof ThemeTweaks>(key: K, value: ThemeTweaks[K]) => void
}) {
  const location = useLocation()
  const showBottomNav = Boolean(user && !['/', '/login'].includes(location.pathname))
  const showPublicTweaks = ['/', '/login'].includes(location.pathname)
  const protectedProps = { user, tweaks, tweaksOpen, onToggleTweaks, onCloseTweaks, onSetTweak }

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedPlannerPage {...protectedProps}><TodayPage /></ProtectedPlannerPage>} />
        <Route path="/import" element={<ProtectedPlannerPage {...protectedProps}><ImportPage /></ProtectedPlannerPage>} />
        <Route path="/syllabus" element={<Navigate to="/import" replace />} />
        <Route path="/tasks" element={<ProtectedPlannerPage {...protectedProps}><TasksPage /></ProtectedPlannerPage>} />
        <Route path="/calendar" element={<ProtectedPlannerPage {...protectedProps}><CalendarPage /></ProtectedPlannerPage>} />
        <Route path="/exams" element={<ProtectedPlannerPage {...protectedProps}><ExamsPage /></ProtectedPlannerPage>} />
        <Route path="/course-info" element={<ProtectedPlannerPage {...protectedProps}><CoursesPage /></ProtectedPlannerPage>} />
        <Route path="/assignments" element={<Navigate to="/tasks" replace />} />
      </Routes>
      {showPublicTweaks && (
        <PublicTweaksControl
          tweaks={tweaks}
          tweaksOpen={tweaksOpen}
          onToggleTweaks={onToggleTweaks}
          onCloseTweaks={onCloseTweaks}
          onSetTweak={onSetTweak}
        />
      )}
      {showBottomNav && <BottomNav />}
    </>
  )
}

function App() {
  const [user, setUser] = useState<LocalUser | null>(auth.currentUser)
  const [isAuthReady, setIsAuthReady] = useState(false)
  const [tweaks, setTweaks] = useState<ThemeTweaks>(() => readStoredTweaks())
  const [tweaksOpen, setTweaksOpen] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setIsAuthReady(true)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    applyTweaks(tweaks)
    localStorage.setItem(tweakStorageKey, JSON.stringify(tweaks))
  }, [tweaks])

  const handleSetTweak = <K extends keyof ThemeTweaks>(key: K, value: ThemeTweaks[K]) => {
    setTweaks((current) => ({ ...current, [key]: value }))
  }

  if (!isAuthReady) return null

  return (
    <BrowserRouter basename={basename}>
      <AuthenticatedRoutes
        user={user}
        tweaks={tweaks}
        tweaksOpen={tweaksOpen}
        onToggleTweaks={() => setTweaksOpen((open) => !open)}
        onCloseTweaks={() => setTweaksOpen(false)}
        onSetTweak={handleSetTweak}
      />
    </BrowserRouter>
  )
}

export default App
