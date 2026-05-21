import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  LogOut,
  UploadCloud,
} from 'lucide-react'
import { auth, signOut } from '../localAuth'
import {
  saveCalendarEvents,
  saveClasses,
  saveSyllabusUploads,
  subscribeToCalendarEvents,
  subscribeToClasses,
  subscribeToSyllabusUploads,
  type StoredCalendarEvent,
  type StoredClassInfo,
  type StoredSyllabusUpload,
} from '../storage'
import { parseSyllabusPdf } from '../syllabusParser'
import {
  deadlineTypeToEventType,
  formatCountdown,
  formatDeadlineType,
  getDaysUntil,
  getStoredEventDeadlineType,
  isSameCalendarEvent,
  sortEventsByDate,
} from '../deadlines'
import './Dashboard.css'

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function hasCourseContent(course: Partial<StoredClassInfo>) {
  return Boolean(course.title || course.code || course.day || course.startTime || course.location || course.profName)
}

function nextCourseId(classes: StoredClassInfo[]) {
  return classes.reduce((max, course) => Math.max(max, course.id), -1) + 1
}

function normalizeCourseFromUpload(
  course: Partial<StoredClassInfo>,
  sourceUploadId: string,
  classes: StoredClassInfo[],
): StoredClassInfo | null {
  if (!hasCourseContent(course)) return null

  const id = nextCourseId(classes)
  const startTime = course.startTime ?? ''
  const endTime = course.endTime ?? ''

  return {
    id,
    title: course.title ?? course.code ?? 'Untitled course',
    code: course.code ?? '',
    day: course.day ?? '',
    startTime,
    endTime,
    time: [startTime, endTime].filter(Boolean).join(' - '),
    location: course.location ?? '',
    profName: course.profName ?? '',
    profEmail: course.profEmail ?? '',
    taName: course.taName ?? '',
    taEmail: course.taEmail ?? '',
    sourceUploadId,
  }
}

function mergeCourse(classes: StoredClassInfo[], incoming: StoredClassInfo | null) {
  if (!incoming) return classes

  const incomingCode = incoming.code.trim().toUpperCase()
  const matchIndex = classes.findIndex((course) => {
    if (course.sourceUploadId && course.sourceUploadId === incoming.sourceUploadId) return true
    return incomingCode && course.code.trim().toUpperCase() === incomingCode
  })

  if (matchIndex < 0) return [...classes, incoming]

  return classes.map((course, index) => index === matchIndex ? { ...course, ...incoming, id: course.id } : course)
}

function normalizeParsedEvents(events: StoredCalendarEvent[], sourceUploadId: string): StoredCalendarEvent[] {
  return events
    .filter((event) => event.title && event.date)
    .map((event) => {
      const deadlineType = getStoredEventDeadlineType(event)
      return {
        ...event,
        courseCode: event.courseCode ?? '',
        time: event.time ?? '',
        type: deadlineTypeToEventType(deadlineType),
        deadlineType,
        sourceUploadId,
        completed: false,
        reminderDaysBefore: event.reminderDaysBefore ?? (deadlineTypeToEventType(deadlineType) === 'exam' ? 7 : 2),
      }
    })
}

function mergeEvents(current: StoredCalendarEvent[], incoming: StoredCalendarEvent[]) {
  const next = [...current]

  for (const event of incoming) {
    const exists = next.some((candidate) => isSameCalendarEvent(candidate, event))
    if (!exists) next.push(event)
  }

  return sortEventsByDate(next)
}

function buildReminderCopy(event: StoredCalendarEvent) {
  const days = getDaysUntil(event.date)
  const label = formatDeadlineType(getStoredEventDeadlineType(event))
  if (days === 0) return `${label} due today`
  if (days === 1) return `${label} due tomorrow`
  return `${label} in ${days} days`
}

function Dashboard() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [calendarEvents, setCalendarEvents] = useState<StoredCalendarEvent[]>([])
  const [classes, setClasses] = useState<StoredClassInfo[]>([])
  const [uploads, setUploads] = useState<StoredSyllabusUpload[]>([])
  const [importState, setImportState] = useState<{ tone: 'idle' | 'busy' | 'done' | 'error'; message: string }>({
    tone: 'idle',
    message: 'Upload a syllabus to build your planner automatically.',
  })

  useEffect(() => {
    const uid = auth.currentUser?.uid
    if (!uid) return
    const unsubscribeCalendar = subscribeToCalendarEvents(uid, setCalendarEvents)
    const unsubscribeClasses = subscribeToClasses(uid, setClasses)
    const unsubscribeUploads = subscribeToSyllabusUploads(uid, setUploads)
    return () => {
      unsubscribeCalendar()
      unsubscribeClasses()
      unsubscribeUploads()
    }
  }, [])

  const upcomingEvents = useMemo(() => {
    return sortEventsByDate(calendarEvents.filter((event) => !event.completed && getDaysUntil(event.date) >= 0))
  }, [calendarEvents])

  const reminders = useMemo(() => {
    return upcomingEvents.filter((event) => {
      const days = getDaysUntil(event.date)
      return days <= (event.reminderDaysBefore ?? (event.type === 'exam' ? 7 : 2))
    }).slice(0, 5)
  }, [upcomingEvents])

  const todayClasses = useMemo(() => {
    const todayName = weekdays[new Date().getDay()]
    return classes
      .filter((course) => course.day === todayName)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }, [classes])

  const nextDeadlines = useMemo(() => upcomingEvents.slice(0, 6), [upcomingEvents])

  const stats = useMemo(() => {
    const exams = upcomingEvents.filter((event) => event.type === 'exam').length
    return {
      courses: classes.length,
      deadlines: upcomingEvents.length,
      reminders: reminders.length,
      exams,
    }
  }, [classes.length, reminders.length, upcomingEvents])

  const handleLogout = async () => {
    await signOut(auth)
    navigate('/', { replace: true })
  }

  const toggleComplete = async (target: StoredCalendarEvent) => {
    const uid = auth.currentUser?.uid
    if (!uid) return

    const nextEvents = calendarEvents.map((event) =>
      isSameCalendarEvent(event, target) ? { ...event, completed: !event.completed } : event,
    )
    setCalendarEvents(nextEvents)
    await saveCalendarEvents(uid, nextEvents)
  }

  const importSyllabus = async (file: File) => {
    const uid = auth.currentUser?.uid
    if (!uid) return
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setImportState({ tone: 'error', message: 'Please upload a PDF syllabus.' })
      return
    }

    const uploadId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
    setImportState({ tone: 'busy', message: `Reading ${file.name}...` })

    try {
      const parsed = await parseSyllabusPdf(file)
      const parsedCourse = normalizeCourseFromUpload(parsed.course, uploadId, classes)
      const parsedEvents = normalizeParsedEvents(parsed.events, uploadId)

      const nextClasses = mergeCourse(classes, parsedCourse)
      const nextEvents = mergeEvents(calendarEvents, parsedEvents)
      const nextUpload: StoredSyllabusUpload = {
        id: uploadId,
        name: file.name,
        url: '',
        storagePath: '',
        status: 'done',
        message: `Imported ${[
          parsedCourse ? 'course' : '',
          parsedEvents.length ? `${parsedEvents.length} dates` : '',
        ].filter(Boolean).join(' and ') || 'available text'}.`,
        parsedCourse: parsedCourse ? {
          title: parsedCourse.title,
          code: parsedCourse.code,
          day: parsedCourse.day,
          startTime: parsedCourse.startTime,
          endTime: parsedCourse.endTime,
          location: parsedCourse.location,
          profName: parsedCourse.profName,
          profEmail: parsedCourse.profEmail,
          taName: parsedCourse.taName,
          taEmail: parsedCourse.taEmail,
        } : undefined,
        parsedEvents,
      }

      setClasses(nextClasses)
      setCalendarEvents(nextEvents)
      setUploads([nextUpload, ...uploads])
      await saveClasses(uid, nextClasses)
      await saveCalendarEvents(uid, nextEvents)
      await saveSyllabusUploads(uid, [nextUpload, ...uploads])

      setImportState({
        tone: 'done',
        message: `Planner updated from ${file.name}. Parsed by your configured Worker.`,
      })
    } catch (error) {
      const detail = error instanceof Error ? ` ${error.message}` : ''
      setImportState({ tone: 'error', message: `Could not parse this syllabus. Worker parser is required; no browser fallback is available.${detail}` })
    }
  }

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    await importSyllabus(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="mobile-app">
      <header className="mobile-topbar">
        <div>
          <span className="mobile-kicker">StudentHub</span>
          <h1>Today</h1>
        </div>
        <button className="icon-button" onClick={handleLogout} aria-label="Log out">
          <LogOut size={20} />
        </button>
      </header>

      <main className="mobile-main">
        <section className="hero-planner">
          <div>
            <p className="hero-label">Syllabus to schedule</p>
            <h2>Drop in a syllabus. Get a planner.</h2>
            <p>Courses, class times, deadlines, exams, and reminders are created automatically.</p>
          </div>
          <button className="upload-primary" onClick={() => fileInputRef.current?.click()} disabled={importState.tone === 'busy'}>
            <UploadCloud size={18} />
            {importState.tone === 'busy' ? 'Parsing...' : 'Upload PDF'}
          </button>
          <input
            ref={fileInputRef}
            className="hidden-input"
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => void handleFiles(event.target.files)}
          />
          <div className={`import-status ${importState.tone}`}>{importState.message}</div>
        </section>

        <section className="stat-strip" aria-label="Planner summary">
          <div><strong>{stats.courses}</strong><span>Courses</span></div>
          <div><strong>{stats.deadlines}</strong><span>Deadlines</span></div>
          <div><strong>{stats.reminders}</strong><span>Reminders</span></div>
          <div><strong>{stats.exams}</strong><span>Exams</span></div>
        </section>

        <section className="mobile-section">
          <div className="section-title-row">
            <div>
              <span className="section-eyebrow">Alerts</span>
              <h2>Needs attention</h2>
            </div>
            <Bell size={18} />
          </div>
          {reminders.length === 0 ? (
            <div className="empty-panel">No urgent reminders right now.</div>
          ) : (
            <div className="stack-list">
              {reminders.map((event) => (
                <article key={`${event.date}-${event.time}-${event.title}-reminder`} className="planner-card alert-card">
                  <div>
                    <span className="card-kicker">{event.courseCode || 'General'}</span>
                    <h3>{event.title}</h3>
                    <p>{buildReminderCopy(event)} · {event.date}</p>
                  </div>
                  <button className="complete-button" onClick={() => void toggleComplete(event)} aria-label="Mark done">
                    <CheckCircle2 size={20} />
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mobile-section">
          <div className="section-title-row">
            <div>
              <span className="section-eyebrow">Schedule</span>
              <h2>Classes today</h2>
            </div>
            <CalendarDays size={18} />
          </div>
          {todayClasses.length === 0 ? (
            <div className="empty-panel">No classes scheduled for today.</div>
          ) : (
            <div className="timeline-list">
              {todayClasses.map((course) => (
                <article key={`${course.id}-${course.code}`} className="timeline-item">
                  <time>{course.startTime || '--:--'}</time>
                  <div>
                    <h3>{course.code || course.title}</h3>
                    <p>{[course.title, course.location].filter(Boolean).join(' · ')}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mobile-section">
          <div className="section-title-row">
            <div>
              <span className="section-eyebrow">Upcoming</span>
              <h2>Deadline queue</h2>
            </div>
            <button className="text-button" onClick={() => navigate('/calendar')}>Edit</button>
          </div>
          {nextDeadlines.length === 0 ? (
            <div className="empty-panel">Upload a syllabus or add a deadline to start the queue.</div>
          ) : (
            <div className="stack-list">
              {nextDeadlines.map((event) => (
                <article key={`${event.date}-${event.time}-${event.title}`} className={`planner-card ${event.type}`}>
                  <div>
                    <span className="card-kicker">{event.courseCode || formatDeadlineType(getStoredEventDeadlineType(event))}</span>
                    <h3>{event.title}</h3>
                    <p>{formatCountdown(event.date)} · {event.date}{event.time ? ` at ${event.time}` : ''}</p>
                  </div>
                  <button className="complete-button" onClick={() => void toggleComplete(event)} aria-label="Mark done">
                    <CheckCircle2 size={20} />
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mobile-section">
          <div className="section-title-row">
            <div>
              <span className="section-eyebrow">Courses</span>
              <h2>Your term</h2>
            </div>
            <button className="text-button" onClick={() => navigate('/course-info')}>Manage</button>
          </div>
          {classes.length === 0 ? (
            <div className="empty-panel">Courses from uploaded syllabi will appear here.</div>
          ) : (
            <div className="course-chip-grid">
              {classes.map((course) => (
                <button key={course.id} className="course-chip" onClick={() => navigate('/course-info')}>
                  <BookOpen size={16} />
                  <span>{course.code || course.title}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>

    </div>
  )
}

export default Dashboard
