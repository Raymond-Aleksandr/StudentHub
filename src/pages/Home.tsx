import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  Check,
  Clock3,
  FileUp,
  GraduationCap,
  Home as HomeIcon,
  ListChecks,
  Menu,
  Rows3,
  ShieldCheck,
  X,
} from 'lucide-react'
import { auth, onAuthStateChanged } from '../localAuth'
import './Home.css'

const marqueeItems = [
  'Bio 210 · Lab Report',
  'Hist 330 · Research Outline',
  'Math 240 · Midterm',
  'Econ 101 · Quiz',
  'Phil 220 · Essay',
  'Psych 305 · Group Project',
  'Cs 251 · Pset 6',
]

const steps = [
  {
    title: 'Drop your syllabi',
    body: 'Drag in PDFs from email, Canvas, or your downloads folder. Multiple files at once. Re-uploads simply replace.',
  },
  {
    title: 'Parser extracts the structure',
    body: 'A Cloudflare Worker handles the parsing. API keys never ship in the frontend. Course code, meeting times, every dated row.',
  },
  {
    title: 'Review & confirm',
    body: 'Skim the extracted items. Edit anything that looks off. Confirm and the term lights up.',
  },
  {
    title: 'Plan from your phone',
    body: 'A bottom-tab planner built for quick checks between classes. Optionally sync across devices with your own Firebase.',
  },
]

const features = [
  {
    title: 'Today, on a timeline',
    body: 'Your classes, deadlines, and reminders on a single vertical strip. Now-line drifts as the hour passes.',
    visual: 'timeline',
  },
  {
    title: 'Quick capture',
    body: 'Type "math240 pset 6 fri" and get a structured task with course code, type, and due date.',
    visual: 'capture',
  },
  {
    title: 'Workload pressure',
    body: 'Each day a dot, sized by how much it is holding. Spot the crunch week before it crunches.',
    visual: 'pressure',
  },
  {
    title: 'Exam countdowns',
    body: 'A page just for tests. Dates, weight, and the days remaining, sorted by what bites first.',
    visual: 'countdown',
  },
  {
    title: 'Course pages',
    body: 'Open a course to see its full arc: meetings, syllabus, assignments, and your running grade.',
    visual: 'courses',
  },
  {
    title: 'Private by default',
    body: 'Local storage in this browser. Bring your own Firebase if you want cross-device sync; never required.',
    visual: 'private',
  },
]

const faqs = [
  {
    question: 'Where does my data live?',
    answer:
      "By default, in your browser's local storage. Nothing leaves the device unless you connect your own sync backend.",
  },
  {
    question: 'What does the Cloudflare Worker do?',
    answer:
      'The parser uses an LLM to read PDFs. Running it from a Worker keeps the API key off the client.',
  },
  {
    question: 'Does it work without an account?',
    answer:
      'Yes. Open it, drop a syllabus, plan your term. An optional account only matters if you want sync across devices.',
  },
  {
    question: 'Can I edit what the parser pulled?',
    answer:
      'Yes. Every imported task, exam, course label, and syllabus upload can be corrected from the planner.',
  },
  {
    question: 'Is it free?',
    answer:
      "The app is free. Syllabus parsing costs whatever your Worker's LLM costs, typically a fraction of a cent per PDF.",
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
    const target = document.querySelector<HTMLElement>(id)
    if (target) {
      const top = target.getBoundingClientRect().top + window.scrollY - 72
      window.scrollTo({ top, behavior: 'smooth' })
    }
    setMenuOpen(false)
  }

  return (
    <div className="landing" id="top">
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <button className="landing-brand" onClick={() => goToSection('#top')} aria-label="StudentHub home">
            <span className="landing-brand-mark">SH</span>
            StudentHub
          </button>

          <div className="landing-nav-links">
            <button onClick={() => goToSection('#how')}>How it works</button>
            <button onClick={() => goToSection('#features')}>Features</button>
            <button onClick={() => goToSection('#faq')}>FAQ</button>
          </div>

          <div className="landing-nav-cta">
            <button className="btn btn-ghost" onClick={() => navigate('/login')}>Sign in</button>
            <button className="btn btn-accent" onClick={launchApp}>
              Open planner <ArrowRight size={15} />
            </button>
            <button className="landing-menu" onClick={() => setMenuOpen((open) => !open)} aria-label="Toggle menu">
              {menuOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="landing-mobile-menu">
            <button onClick={() => goToSection('#how')}>How it works</button>
            <button onClick={() => goToSection('#features')}>Features</button>
            <button onClick={() => goToSection('#faq')}>FAQ</button>
            <button onClick={() => navigate('/login')}>Sign in</button>
          </div>
        )}
      </nav>

      <header className="landing-hero">
        <div className="landing-hero-grid">
          <div>
            <span className="landing-kicker"><span /> Private study planner · v2.4</span>
            <h1 className="landing-h1">
              Drop a&nbsp;PDF.
              <br />
              Get a&nbsp;<em>term plan.</em>
            </h1>
            <p className="landing-lede">
              StudentHub reads your syllabi and rebuilds them as a mobile-first planner: courses,
              deadlines, exams, and the day in front of you. No spreadsheets, no copy-pasting.
            </p>
            <div className="landing-hero-cta">
              <button className="btn btn-accent" onClick={launchApp}>
                Open the planner <ArrowRight size={16} />
              </button>
              <button className="btn btn-ghost" onClick={() => goToSection('#how')}>See it work</button>
              <span className="landing-micro">No account needed · <b>4 syllabi in &lt; 12s</b></span>
            </div>
          </div>

          <div className="landing-phone-wrap">
            <div className="landing-floaters" aria-hidden="true">
              <div className="landing-float-card landing-float-1">
                <div className="landing-ico"><Check size={15} /></div>
                <div><b>Syllabus parsed</b><span>Course code · items found</span></div>
              </div>
              <div className="landing-float-card landing-float-2">
                <div className="landing-ico landing-ico-green"><Clock3 size={15} /></div>
                <div><b>Midterm found</b><span>Course code · exam time</span></div>
              </div>
              <div className="landing-float-card landing-float-3">
                <div className="landing-ico landing-ico-gold"><Rows3 size={15} /></div>
                <div><b>5 tasks · this week</b><span>2 due tomorrow</span></div>
              </div>
            </div>

            <div className="landing-phone" role="img" aria-label="Phone showing StudentHub Today screen">
              <div className="landing-notch" />
              <div className="landing-phone-screen">
                <div className="landing-ps-head">
                  <div>
                    <div className="eyebrow">Today</div>
                    <h3>Tue, May 22</h3>
                  </div>
                  <span className="landing-pill">3 open</span>
                </div>
                <div className="landing-ps-body">
                  <div className="landing-ps-now">
                    <div className="landing-ps-top"><span>Now · 14:20</span><span>Next 09 min</span></div>
                    <div className="landing-ps-title">Course · Lecture</div>
                    <div className="landing-ps-meta">Campus room</div>
                  </div>
                  {[
                    ['COURSE', 'Assignment draft', 'Tomorrow', false],
                    ['COURSE', 'Reading notes', 'Fri', false],
                    ['COURSE', 'Problem set', 'Done', true],
                  ].map(([code, name, when, done]) => (
                    <div className={`landing-ps-task ${done ? 'is-done' : ''}`} key={String(name)}>
                      <div className="landing-check" />
                      <div className="landing-task-body">
                        <span>{code}</span>
                        <div>{name}</div>
                      </div>
                      <small>{when}</small>
                    </div>
                  ))}
                </div>
                <div className="landing-ps-tabs" aria-hidden="true">
                  <span className="is-active"><HomeIcon size={18} /></span>
                  <span><FileUp size={18} /></span>
                  <span><ListChecks size={18} /></span>
                  <span><GraduationCap size={18} /></span>
                  <span><BookOpen size={18} /></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="landing-strip" aria-hidden="true">
        <div className="landing-strip-track">
          {[...marqueeItems, ...marqueeItems].map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}
        </div>
      </div>

      <section className="landing-block" id="how">
        <div className="landing-section-head">
          <span className="eyebrow">Workflow</span>
          <h2>From PDF<br />to <em>a usable</em> term plan.</h2>
          <p>
            Upload each course's syllabus once. StudentHub extracts the schedule, deadlines, exam dates
            and weekly cadence, then keeps them current as you check things off.
          </p>
        </div>

        <div className="landing-how">
          <div className="landing-steps">
            {steps.map((step, index) => (
              <article className="landing-step" key={step.title}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h4>{step.title}</h4>
                  <p>{step.body}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="landing-how-vis" aria-hidden="true">
            <div className="landing-doc">
              <span>PDF</span>
              <i className="h" /><i className="l" /><i className="m" /><i className="l" /><i className="s" /><i className="m" /><i className="l" />
            </div>
            <div className="landing-arrow">↓</div>
            <div className="landing-parsed">
              {[
                ['COURSE', 'Parsed course title', 'CODE'],
                ['MEETS', 'Meeting days · room', 'Time'],
                ['TASK', 'Imported assignment', 'Date'],
                ['TASK', 'Imported reading', 'Date'],
                ['EXAM', 'Imported test', 'Date'],
                ['EXAM', 'Imported final', 'Date'],
              ].map(([kind, value, when]) => (
                <div className="landing-parsed-row" key={`${kind}-${value}`}>
                  <span>{kind}</span><b>{value}</b><small>{when}</small>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="landing-block landing-tight" id="features">
        <div className="landing-section-head">
          <span className="eyebrow">What's inside</span>
          <h2>Built for the <em>10&nbsp;minutes</em> between classes.</h2>
        </div>

        <div className="landing-features">
          {features.map((feature, index) => (
            <article className="landing-feat" key={feature.title}>
              <span className="landing-num">{String(index + 1).padStart(2, '0')}</span>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
              <FeatureVisual type={feature.visual} />
            </article>
          ))}
        </div>
      </section>

      <section className="landing-block landing-tight">
        <div className="landing-section-head">
          <span className="eyebrow">Why bother</span>
          <h2>The first week of term, <em>handled.</em></h2>
        </div>
        <div className="landing-compare">
          <article className="landing-cmp landing-old">
            <h4>Without StudentHub</h4>
            <ul>
              <li><span>↳</span> Eight PDFs sit in your downloads, unread.</li>
              <li><span>↳</span> You copy-paste deadlines into iCal at 1am.</li>
              <li><span>↳</span> Half the dates are in your head, the other half lost.</li>
              <li><span>↳</span> You forget midterm week is also lab-report week.</li>
            </ul>
          </article>
          <article className="landing-cmp landing-new">
            <h4>With StudentHub</h4>
            <ul>
              <li><span>→</span> Drop eight PDFs, get the term in under a minute.</li>
              <li><span>→</span> Every deadline lives next to its course code.</li>
              <li><span>→</span> Tap Today between classes and see what's actually next.</li>
              <li><span>→</span> Spot the crunch week before it hits.</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="landing-quote-block">
        <p>"It's the only app I open between classes - fast enough that I don't avoid it."</p>
        <div className="landing-quote-meta">
          <div>MA</div>
          <span><b>StudentHub user</b><small>Imported term planner</small></span>
        </div>
      </section>

      <section className="landing-block" id="faq">
        <div className="landing-section-head">
          <span className="eyebrow">Frequently asked</span>
          <h2>Small print, <em>plain words.</em></h2>
        </div>
        <div className="landing-faq">
          {faqs.map((faq, index) => (
            <details className="landing-faq-item" key={faq.question} open={index === 0}>
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="landing-cta">
        <h2>Plan the term in <em>under a minute.</em></h2>
        <p>Open the planner in your browser. No install, no required account. Drop a PDF when you're ready.</p>
        <div>
          <button className="btn btn-primary" onClick={launchApp}>Open the planner</button>
          <button className="btn btn-ghost" onClick={() => navigate('/login')}>Sign in</button>
        </div>
      </section>

      <footer className="landing-footer">
        <div>
          <button className="landing-brand" onClick={() => goToSection('#top')}>
            <span className="landing-brand-mark">SH</span>
            StudentHub
          </button>
          <small>© 2026 · Made for students, by students.</small>
        </div>
      </footer>
    </div>
  )
}

function FeatureVisual({ type }: { type: string }) {
  if (type === 'timeline') {
    return <div className="landing-vis landing-vis-timeline"><i /><span><b /><b /><b /></span></div>
  }
  if (type === 'capture') {
    return <div className="landing-vis landing-vis-capture"><code>›</code><code>math240</code><code>pset 6</code><code>fri</code></div>
  }
  if (type === 'pressure') {
    return <div className="landing-vis landing-vis-pressure"><i /><i /><i /><i /><i /><i /><i /></div>
  }
  if (type === 'countdown') {
    return <div className="landing-vis landing-vis-count"><strong>06</strong><span>days · MATH 240</span></div>
  }
  if (type === 'courses') {
    return <div className="landing-vis landing-vis-courses"><i /><i /><i /></div>
  }
  return <div className="landing-vis"><ShieldCheck size={22} /><span>Local-first · BYO Firebase optional</span></div>
}

export default Home
