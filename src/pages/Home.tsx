import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BellRing,
  CalendarDays,
  CheckCircle2,
  Cloud,
  FileUp,
  Menu,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react'
import { auth, onAuthStateChanged } from '../localAuth'
import './Home.css'

const previewTasks = [
  { course: 'BIO210', title: 'Lab report', date: 'Tomorrow' },
  { course: 'HIST330', title: 'Research outline', date: 'Friday' },
  { course: 'MATH240', title: 'Midterm review', date: '6 days' },
]

const points = [
  {
    icon: FileUp,
    title: 'Import syllabi',
    body: 'Drop PDF course outlines and turn them into courses, tasks, exams, and reminders.',
  },
  {
    icon: Smartphone,
    title: 'Plan on mobile',
    body: 'A bottom-tab planner designed for quick checks between classes.',
  },
  {
    icon: Cloud,
    title: 'Bring your own worker',
    body: 'Use the included Cloudflare Worker template for stronger parsing without shipping secrets.',
  },
  {
    icon: ShieldCheck,
    title: 'Publish safely',
    body: 'The static frontend works without committed Firebase keys or API tokens.',
  },
]

function Home() {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(auth.currentUser))

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(Boolean(user))
    })
  }, [])

  const launchApp = () => {
    navigate(isAuthenticated ? '/dashboard' : '/login')
  }

  const goToSection = (id: string) => {
    document.querySelector(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setMenuOpen(false)
  }

  return (
    <div className="home">
      <header className="home-nav">
        <button className="home-brand" onClick={() => goToSection('#top')} aria-label="StudentHub home">
          <span>SH</span>
          <strong>StudentHub</strong>
        </button>

        <nav className="home-links" aria-label="Landing">
          <button onClick={() => goToSection('#workflow')}>Workflow</button>
          <button onClick={() => goToSection('#privacy')}>Privacy</button>
          <button onClick={launchApp}>Open app</button>
        </nav>

        <button className="home-menu-button" onClick={() => setMenuOpen((open) => !open)} aria-label="Toggle menu">
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {menuOpen && (
        <div className="home-mobile-menu">
          <button onClick={() => goToSection('#workflow')}>Workflow</button>
          <button onClick={() => goToSection('#privacy')}>Privacy</button>
          <button onClick={launchApp}>Open app</button>
        </div>
      )}

      <main id="top">
        <section className="home-hero">
          <div className="home-hero-scene" aria-hidden="true">
            <div className="home-phone">
              <div className="home-phone-top">
                <span>Today</span>
                <strong>3 open</strong>
              </div>
              <div className="home-upload-strip">
                <FileUp size={18} />
                <span>Syllabus imported</span>
              </div>
              <div className="home-task-stack">
                {previewTasks.map((task) => (
                  <div className="home-task" key={task.title}>
                    <span>{task.course}</span>
                    <strong>{task.title}</strong>
                    <small>{task.date}</small>
                  </div>
                ))}
              </div>
              <div className="home-tabs">
                <CalendarDays size={17} />
                <FileUp size={17} />
                <BellRing size={17} />
              </div>
            </div>
          </div>

          <div className="home-hero-copy">
            <span className="home-eyebrow">Private study planner</span>
            <h1>StudentHub</h1>
            <p>
              Upload course syllabi, then keep tasks, exams, courses, and reminders in one mobile-first planner.
            </p>
            <div className="home-actions">
              <button className="home-primary" onClick={launchApp}>
                {isAuthenticated ? 'Open planner' : 'Start planning'}
                <ArrowRight size={18} />
              </button>
              <button className="home-secondary" onClick={() => goToSection('#workflow')}>
                See workflow
              </button>
            </div>
          </div>
        </section>

        <section className="home-section" id="workflow">
          <div className="home-section-head">
            <span className="home-eyebrow">Workflow</span>
            <h2>From PDF to a usable term plan.</h2>
          </div>
          <div className="home-point-grid">
            {points.map((point) => {
              const Icon = point.icon
              return (
                <article className="home-point" key={point.title}>
                  <Icon size={22} />
                  <h3>{point.title}</h3>
                  <p>{point.body}</p>
                </article>
              )
            })}
          </div>
        </section>

        <section className="home-privacy" id="privacy">
          <div>
            <span className="home-eyebrow">Deployment model</span>
            <h2>No secrets in the public frontend.</h2>
            <p>
              StudentHub runs as a static Pages app with local browser storage by default. The Worker template is recommended for syllabus parsing, and Firebase can be added later for real accounts and cross-device sync.
            </p>
          </div>
          <ul>
            <li><CheckCircle2 size={18} /> Static frontend can be published safely.</li>
            <li><CheckCircle2 size={18} /> API keys stay in provider-side secrets.</li>
            <li><CheckCircle2 size={18} /> Fork users can deploy their own Worker.</li>
          </ul>
        </section>
      </main>
    </div>
  )
}

export default Home
