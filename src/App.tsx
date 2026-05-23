import { useEffect, useState, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { Bell, BellOff, BookOpen, CalendarDays, FileUp, GraduationCap, Home as HomeIcon, ListChecks, LogOut, Palette, X } from 'lucide-react'
import Home from './pages/Home'
import Login from './pages/Login'
import BottomNav from './components/BottomNav'
import TodayPage from './pages/TodayPage'
import ImportPage from './pages/ImportPage'
import TasksPage from './pages/TasksPage'
import CalendarPage from './pages/CalendarPage'
import ExamsPage from './pages/ExamsPage'
import CoursesPage from './pages/CoursesPage'
import { PlannerProvider, usePlanner } from './data/usePlanner'
import { formatCountdown, formatDeadlineType, getDaysUntil, getEventDeadlineType, sortEventsByDate } from './domain/deadlines'
import { formatReminderDate, getReminderDaysBefore, shouldScheduleReminder } from './domain/notifications'
import { clearAppBadge } from './native/appBadge'
import { isNativeRuntime } from './native/runtime'
import { getNavResetAt, isActiveNavPath, scrollPlannerToTop } from './navReset'
import { auth, ensureNativeDeviceUser, onAuthStateChanged, signOut, type LocalUser } from './localAuth'
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
  const accentL = tweaks.dark ? Math.min(option.l + 0.03, 0.68) : option.l
  const accentC = tweaks.dark ? option.c * 0.68 : option.c
  document.documentElement.style.setProperty('--accent', `oklch(${accentL} ${accentC} ${option.hue})`)
  document.documentElement.style.setProperty('--accent-2', `oklch(${accentL - 0.07} ${accentC + (tweaks.dark ? 0.005 : 0.01)} ${option.hue})`)
  document.documentElement.style.setProperty('--accent-soft', tweaks.dark
    ? `oklch(0.28 ${accentC * 0.45} ${option.hue})`
    : `oklch(0.93 ${option.c * 0.25} ${option.hue})`)
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
  nativeRuntime,
}: {
  children: ReactNode
  tweaks: ThemeTweaks
  tweaksOpen: boolean
  onToggleTweaks: () => void
  onCloseTweaks: () => void
  onSetTweak: <K extends keyof ThemeTweaks>(key: K, value: ThemeTweaks[K]) => void
  nativeRuntime: boolean
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const copy = getPlannerCopy(location.pathname)
  const isDashboard = location.pathname === '/dashboard' || location.pathname === '/'

  const handleLogout = async () => {
    await signOut(auth)
  }

  const handleNavClick = (path: string, resetAt: number) => {
    navigate(path, {
      replace: isActiveNavPath(location.pathname, path),
      state: { navResetAt: resetAt },
    })
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
            <button key={path} className={`nav-btn ${location.pathname === path ? 'active' : ''}`} onClick={(event) => handleNavClick(path, event.timeStamp)} type="button">
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        {!nativeRuntime && (
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
        )}
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
      {tweaksOpen && <TweaksPanel tweaks={tweaks} setTweak={onSetTweak} onClose={onCloseTweaks} showNotifications showAccount={!nativeRuntime} />}
    </div>
  )
}

function TweaksPanel({
  tweaks,
  setTweak,
  onClose,
  showNotifications = false,
  showAccount = false,
}: {
  tweaks: ThemeTweaks
  setTweak: <K extends keyof ThemeTweaks>(key: K, value: ThemeTweaks[K]) => void
  onClose: () => void
  showNotifications?: boolean
  showAccount?: boolean
}) {
  const handleLogout = async () => {
    await signOut(auth)
  }

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
      {showAccount && (
        <div className="tp-section tp-account-section">
          <div className="tp-account">
            <span className="tp-account-avatar">SR</span>
            <span>
              <strong>Student</strong>
              <small>local profile</small>
            </span>
            <button type="button" onClick={handleLogout}>
              <LogOut size={15} />
              <span>Log out</span>
            </button>
          </div>
        </div>
      )}
      {showNotifications && <NotificationSettings />}
    </div>
  )
}

function NotificationSettings() {
  const { events, updateEvent } = usePlanner()
  const upcoming = sortEventsByDate(events.filter((event) => !event.completed && event.date && getDaysUntil(event.date) >= 0)).slice(0, 8)

  const updateReminder = (event: typeof upcoming[number], enabled: boolean, days = getReminderDaysBefore(event)) => {
    void updateEvent(event, {
      title: event.title,
      courseCode: event.courseCode,
      date: event.date,
      time: event.time,
      durationMinutes: event.durationMinutes,
      weight: event.weight,
      score: event.score,
      location: event.location,
      format: event.format,
      deadlineType: getEventDeadlineType(event),
      reminderEnabled: enabled,
      reminderDaysBefore: days,
    })
  }

  return (
    <div className="tp-section tp-notifications">
      <div className="tp-notification-head">
        <label className="tp-label">Notifications</label>
      </div>
      {upcoming.length ? (
        <div className="tp-notification-list">
          {upcoming.map((event) => {
            const enabled = event.reminderEnabled !== false
            const days = getReminderDaysBefore(event)
            return (
              <article key={`${event.title}-${event.date}-${event.time}-${event.courseCode}`} className="tp-notification-item">
                <button
                  className={`tp-notification-toggle ${enabled ? 'on' : ''}`}
                  onClick={() => updateReminder(event, !enabled)}
                  aria-label={enabled ? `Disable reminder for ${event.title}` : `Enable reminder for ${event.title}`}
                  aria-pressed={enabled}
                >
                  {enabled ? <Bell size={14} /> : <BellOff size={14} />}
                </button>
                <div className="tp-notification-body">
                  <div className="tp-notification-title">{event.title}</div>
                  <div className="mono tp-notification-meta">
                    {[event.courseCode, formatDeadlineType(getEventDeadlineType(event)), formatCountdown(event.date)].filter(Boolean).join(' · ')}
                  </div>
                  <div className="mono tp-notification-meta">
                    {enabled ? `${shouldScheduleReminder(event) ? 'Scheduled' : 'Enabled'} · ${formatReminderDate(event)}` : 'Off'}
                  </div>
                </div>
                <input
                  className="tp-notification-days"
                  type="number"
                  min="0"
                  max="30"
                  value={days}
                  disabled={!enabled}
                  aria-label={`Reminder days before ${event.title}`}
                  onChange={(inputEvent) => updateReminder(event, enabled, Math.max(0, Math.min(30, Number(inputEvent.target.value) || 0)))}
                />
              </article>
            )
          })}
        </div>
      ) : (
        <p className="tp-note">Future tasks and exams will appear here. New items default to notifications on.</p>
      )}
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
  nativeRuntime,
}: {
  user: LocalUser | null
  children: ReactNode
  tweaks: ThemeTweaks
  tweaksOpen: boolean
  onToggleTweaks: () => void
  onCloseTweaks: () => void
  onSetTweak: <K extends keyof ThemeTweaks>(key: K, value: ThemeTweaks[K]) => void
  nativeRuntime: boolean
}) {
  if (!user) return <Navigate to={nativeRuntime ? '/dashboard' : '/login'} replace />

  return (
    <PlannerProvider>
      <PlannerShell
        tweaks={tweaks}
        tweaksOpen={tweaksOpen}
        onToggleTweaks={onToggleTweaks}
        onCloseTweaks={onCloseTweaks}
        onSetTweak={onSetTweak}
        nativeRuntime={nativeRuntime}
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
  nativeRuntime,
}: {
  user: LocalUser | null
  tweaks: ThemeTweaks
  tweaksOpen: boolean
  onToggleTweaks: () => void
  onCloseTweaks: () => void
  onSetTweak: <K extends keyof ThemeTweaks>(key: K, value: ThemeTweaks[K]) => void
  nativeRuntime: boolean
}) {
  const location = useLocation()
  const showBottomNav = Boolean(user && !['/', '/login'].includes(location.pathname))
  const showPublicTweaks = !nativeRuntime && (location.pathname === '/' || location.pathname === '/login')
  const protectedProps = { user, tweaks, tweaksOpen, onToggleTweaks, onCloseTweaks, onSetTweak, nativeRuntime }
  const navResetAt = getNavResetAt(location.state)

  useEffect(() => {
    if (!navResetAt) return
    scrollPlannerToTop()
  }, [navResetAt])

  return (
    <>
      <Routes>
        <Route path="/" element={nativeRuntime ? <Navigate to="/dashboard" replace /> : <Home />} />
        <Route path="/login" element={nativeRuntime ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/dashboard" element={<ProtectedPlannerPage {...protectedProps}><TodayPage key={`dashboard-${navResetAt}`} /></ProtectedPlannerPage>} />
        <Route path="/import" element={<ProtectedPlannerPage {...protectedProps}><ImportPage key={`import-${navResetAt}`} /></ProtectedPlannerPage>} />
        <Route path="/syllabus" element={<Navigate to="/import" replace />} />
        <Route path="/tasks" element={<ProtectedPlannerPage {...protectedProps}><TasksPage key={`tasks-${navResetAt}`} /></ProtectedPlannerPage>} />
        <Route path="/calendar" element={<ProtectedPlannerPage {...protectedProps}><CalendarPage key={`calendar-${navResetAt}`} /></ProtectedPlannerPage>} />
        <Route path="/exams" element={<ProtectedPlannerPage {...protectedProps}><ExamsPage key={`exams-${navResetAt}`} /></ProtectedPlannerPage>} />
        <Route path="/course-info" element={<ProtectedPlannerPage {...protectedProps}><CoursesPage key={`course-info-${navResetAt}`} /></ProtectedPlannerPage>} />
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
  const nativeRuntime = isNativeRuntime()

  useEffect(() => {
    void clearAppBadge()
  }, [])

  useEffect(() => {
    if (nativeRuntime) {
      void ensureNativeDeviceUser(auth)
    }
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setIsAuthReady(true)
    })
    return unsubscribe
  }, [nativeRuntime])

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
        nativeRuntime={nativeRuntime}
      />
    </BrowserRouter>
  )
}

export default App
