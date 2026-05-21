import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Pencil,
  FileUp,
  LogOut,
  Plus,
  Save,
  Trash2,
  UploadCloud,
  X,
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
  type DeadlineType,
} from '../deadlines'
import './PlannerApp.css'

type PlannerView = 'today' | 'import' | 'tasks' | 'calendar' | 'exams' | 'courses'
type ImportState = { tone: 'idle' | 'busy' | 'done' | 'error'; message: string }
type DraftEvent = {
  title: string
  courseCode: string
  date: string
  time: string
  deadlineType: DeadlineType
}
type CalendarDay = {
  date: string
  dayNumber: number
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
  eventCount: number
  hasExam: boolean
  hasOpen: boolean
}

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const calendarWeekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const viewCopy: Record<PlannerView, { title: string; eyebrow: string }> = {
  today: { title: 'Today', eyebrow: 'Planner' },
  import: { title: 'Import', eyebrow: 'Syllabus' },
  tasks: { title: 'Tasks', eyebrow: 'Deadlines' },
  calendar: { title: 'Calendar', eyebrow: 'Month' },
  exams: { title: 'Exams', eyebrow: 'Assessment' },
  courses: { title: 'Courses', eyebrow: 'Term' },
}

function getCurrentView(pathname: string): PlannerView {
  if (pathname.includes('syllabus')) return 'import'
  if (pathname.includes('exams')) return 'exams'
  if (pathname.includes('course-info')) return 'courses'
  if (pathname.includes('calendar')) return 'calendar'
  if (pathname.includes('tasks') || pathname.includes('assignments')) return 'tasks'
  return 'today'
}

function nextCourseId(classes: StoredClassInfo[]) {
  return classes.reduce((max, course) => Math.max(max, course.id), -1) + 1
}

function hasCourseContent(course: Partial<StoredClassInfo>) {
  return Boolean(course.title || course.code || course.day || course.startTime || course.location || course.profName)
}

function normalizeCourse(
  parsedCourse: Partial<StoredClassInfo>,
  uploadId: string,
  classes: StoredClassInfo[],
): StoredClassInfo | null {
  if (!hasCourseContent(parsedCourse)) return null
  const startTime = parsedCourse.startTime ?? ''
  const endTime = parsedCourse.endTime ?? ''

  return {
    id: nextCourseId(classes),
    title: parsedCourse.title ?? parsedCourse.code ?? 'Untitled course',
    code: parsedCourse.code ?? '',
    day: parsedCourse.day ?? '',
    startTime,
    endTime,
    time: [startTime, endTime].filter(Boolean).join(' - '),
    location: parsedCourse.location ?? '',
    profName: parsedCourse.profName ?? '',
    profEmail: parsedCourse.profEmail ?? '',
    taName: parsedCourse.taName ?? '',
    taEmail: parsedCourse.taEmail ?? '',
    sourceUploadId: uploadId,
  }
}

function mergeCourse(classes: StoredClassInfo[], incoming: StoredClassInfo | null) {
  if (!incoming) return classes
  const incomingCode = incoming.code.trim().toUpperCase()
  const matchIndex = classes.findIndex((course) => {
    if (course.sourceUploadId === incoming.sourceUploadId) return true
    return incomingCode && course.code.trim().toUpperCase() === incomingCode
  })

  if (matchIndex < 0) return [...classes, incoming]
  return classes.map((course, index) => index === matchIndex ? { ...course, ...incoming, id: course.id } : course)
}

function normalizeEvents(events: StoredCalendarEvent[], uploadId: string) {
  return events
    .filter((event) => event.title && event.date)
    .map((event) => {
      const deadlineType = getStoredEventDeadlineType(event)
      const type = deadlineTypeToEventType(deadlineType)
      return {
        ...event,
        courseCode: event.courseCode ?? '',
        time: event.time ?? '',
        priority: event.priority ?? (type === 'exam' ? 'high' : 'low'),
        type,
        deadlineType,
        sourceUploadId: uploadId,
        completed: false,
        reminderDaysBefore: event.reminderDaysBefore ?? (type === 'exam' ? 7 : 2),
      }
    })
}

function mergeEvents(current: StoredCalendarEvent[], incoming: StoredCalendarEvent[]) {
  const next = [...current]
  for (const event of incoming) {
    if (!next.some((candidate) => isSameCalendarEvent(candidate, event))) next.push(event)
  }
  return sortEventsByDate(next)
}

function getDefaultDraftEvent(): DraftEvent {
  return {
    title: '',
    courseCode: '',
    date: '',
    time: '',
    deadlineType: 'assignment',
  }
}

function getEventIdentity(event: StoredCalendarEvent) {
  return [
    event.title,
    event.courseCode ?? '',
    event.date,
    event.time,
    event.priority,
    event.type,
    event.deadlineType ?? '',
    event.sourceUploadId ?? '',
  ].join('::')
}

function getLocalDateId(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDateId(dateId: string) {
  const [year, month, day] = dateId.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(date)
}

function formatSelectedDate(dateId: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(parseDateId(dateId))
}

function buildCalendarDays(monthDate: Date, selectedDate: string, events: StoredCalendarEvent[]): CalendarDay[] {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const gridStart = new Date(firstOfMonth)
  gridStart.setDate(firstOfMonth.getDate() - firstOfMonth.getDay())
  const todayId = getLocalDateId(new Date())

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + index)
    const dateId = getLocalDateId(date)
    const dayEvents = events.filter((event) => event.date === dateId)
    return {
      date: dateId,
      dayNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === monthDate.getMonth(),
      isToday: dateId === todayId,
      isSelected: dateId === selectedDate,
      eventCount: dayEvents.length,
      hasExam: dayEvents.some((event) => deadlineTypeToEventType(getStoredEventDeadlineType(event)) === 'exam'),
      hasOpen: dayEvents.some((event) => !event.completed),
    }
  })
}

function PlannerApp() {
  const navigate = useNavigate()
  const location = useLocation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const todayId = getLocalDateId(new Date())
  const [classes, setClasses] = useState<StoredClassInfo[]>([])
  const [events, setEvents] = useState<StoredCalendarEvent[]>([])
  const [uploads, setUploads] = useState<StoredSyllabusUpload[]>([])
  const [draftEvent, setDraftEvent] = useState<DraftEvent>(getDefaultDraftEvent)
  const [editingEventKey, setEditingEventKey] = useState('')
  const [editEventDraft, setEditEventDraft] = useState<DraftEvent>(getDefaultDraftEvent)
  const [selectedDate, setSelectedDate] = useState(todayId)
  const [calendarMonth, setCalendarMonth] = useState(() => new Date())
  const [importState, setImportState] = useState<ImportState>({
    tone: 'idle',
    message: 'Upload PDF syllabi and let StudentHub build the term.',
  })

  const view = getCurrentView(location.pathname)
  const copy = viewCopy[view]

  useEffect(() => {
    const uid = auth.currentUser?.uid
    if (!uid) return
    const unsubscribeClasses = subscribeToClasses(uid, setClasses)
    const unsubscribeEvents = subscribeToCalendarEvents(uid, setEvents)
    const unsubscribeUploads = subscribeToSyllabusUploads(uid, setUploads)
    return () => {
      unsubscribeClasses()
      unsubscribeEvents()
      unsubscribeUploads()
    }
  }, [])

  const upcomingEvents = useMemo(() => {
    return sortEventsByDate(events.filter((event) => !event.completed && getDaysUntil(event.date) >= 0))
  }, [events])

  const reminders = useMemo(() => {
    return upcomingEvents
      .filter((event) => getDaysUntil(event.date) <= (event.reminderDaysBefore ?? (event.type === 'exam' ? 7 : 2)))
      .slice(0, 4)
  }, [upcomingEvents])

  const todayClasses = useMemo(() => {
    const today = weekdays[new Date().getDay()]
    return classes
      .filter((course) => course.day === today)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }, [classes])

  const taskEvents = useMemo(() => {
    return sortEventsByDate(events.filter((event) => deadlineTypeToEventType(getStoredEventDeadlineType(event)) !== 'exam'))
  }, [events])

  const examEvents = useMemo(() => {
    return sortEventsByDate(events.filter((event) => deadlineTypeToEventType(getStoredEventDeadlineType(event)) === 'exam'))
  }, [events])

  const calendarDays = useMemo(() => {
    return buildCalendarDays(calendarMonth, selectedDate, events)
  }, [calendarMonth, selectedDate, events])

  const selectedDateEvents = useMemo(() => {
    return sortEventsByDate(events.filter((event) => event.date === selectedDate))
  }, [events, selectedDate])

  const stats = {
    courses: classes.length,
    tasks: taskEvents.filter((event) => !event.completed).length,
    exams: examEvents.filter((event) => !event.completed).length,
    next: upcomingEvents[0] ? formatCountdown(upcomingEvents[0].date) : 'Clear',
  }

  const saveEvents = async (nextEvents: StoredCalendarEvent[]) => {
    const uid = auth.currentUser?.uid
    if (!uid) return
    setEvents(nextEvents)
    await saveCalendarEvents(uid, nextEvents)
  }

  const saveCourses = async (nextClasses: StoredClassInfo[]) => {
    const uid = auth.currentUser?.uid
    if (!uid) return
    setClasses(nextClasses)
    await saveClasses(uid, nextClasses)
  }

  const handleLogout = async () => {
    await signOut(auth)
    navigate('/', { replace: true })
  }

  const toggleComplete = async (target: StoredCalendarEvent) => {
    const nextEvents = events.map((event) =>
      isSameCalendarEvent(event, target) ? { ...event, completed: !event.completed } : event,
    )
    await saveEvents(nextEvents)
  }

  const removeEvent = async (target: StoredCalendarEvent) => {
    await saveEvents(events.filter((event) => !isSameCalendarEvent(event, target)))
  }

  const startEditingEvent = (event: StoredCalendarEvent) => {
    setEditingEventKey(getEventIdentity(event))
    setEditEventDraft({
      title: event.title,
      courseCode: event.courseCode ?? '',
      date: event.date,
      time: event.time ?? '',
      deadlineType: getStoredEventDeadlineType(event),
    })
  }

  const cancelEditingEvent = () => {
    setEditingEventKey('')
    setEditEventDraft(getDefaultDraftEvent())
  }

  const saveEditingEvent = async (target: StoredCalendarEvent) => {
    if (!editEventDraft.title || !editEventDraft.date) return
    const deadlineType = editEventDraft.deadlineType
    const type = deadlineTypeToEventType(deadlineType)
    const nextEvents = events.map((event) => {
      if (!isSameCalendarEvent(event, target)) return event
      return {
        ...event,
        title: editEventDraft.title,
        courseCode: editEventDraft.courseCode,
        date: editEventDraft.date,
        time: editEventDraft.time,
        type,
        deadlineType,
        priority: type === 'exam' ? 'high' : event.priority,
        reminderDaysBefore: event.reminderDaysBefore ?? (type === 'exam' ? 7 : 2),
      }
    })
    await saveEvents(sortEventsByDate(nextEvents))
    cancelEditingEvent()
  }

  const removeUpload = async (upload: StoredSyllabusUpload) => {
    const uid = auth.currentUser?.uid
    if (!uid) return

    const nextUploads = uploads.filter((candidate) => candidate.id !== upload.id)
    const nextClasses = classes.filter((course) => course.sourceUploadId !== upload.id)
    const nextEvents = events.filter((event) => event.sourceUploadId !== upload.id)

    setUploads(nextUploads)
    setClasses(nextClasses)
    setEvents(nextEvents)
    await saveSyllabusUploads(uid, nextUploads)
    await saveClasses(uid, nextClasses)
    await saveCalendarEvents(uid, nextEvents)
    setImportState({
      tone: 'done',
      message: `${upload.name} and its imported course items were removed.`,
    })
  }

  const addDraftEvent = async () => {
    if (!draftEvent.title || !draftEvent.date) return
    const deadlineType = draftEvent.deadlineType
    const type = deadlineTypeToEventType(deadlineType)
    const nextEvent: StoredCalendarEvent = {
      title: draftEvent.title,
      courseCode: draftEvent.courseCode,
      date: draftEvent.date,
      time: draftEvent.time,
      type,
      deadlineType,
      priority: type === 'exam' ? 'high' : 'medium',
      completed: false,
      reminderDaysBefore: type === 'exam' ? 7 : 2,
    }
    await saveEvents(mergeEvents(events, [nextEvent]))
    setDraftEvent(getDefaultDraftEvent())
  }

  const importFiles = async (files: FileList | null) => {
    const uid = auth.currentUser?.uid
    if (!uid || !files?.length) return

    for (const file of Array.from(files)) {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setImportState({ tone: 'error', message: `${file.name} is not a PDF.` })
        continue
      }

      const uploadId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
      setImportState({ tone: 'busy', message: `Parsing ${file.name}...` })

      try {
        const parsed = await parseSyllabusPdf(file)
        const parsedCourse = normalizeCourse(parsed.course, uploadId, classes)
        const parsedEvents = normalizeEvents(parsed.events, uploadId)
        const parsedExamCount = parsedEvents.filter((event) => deadlineTypeToEventType(getStoredEventDeadlineType(event)) === 'exam').length
        const parsedTaskCount = parsedEvents.length - parsedExamCount
        const parsedCourseLabel = parsedCourse ? parsedCourse.code || parsedCourse.title : ''
        const importSummary = [
          parsedCourseLabel ? `course ${parsedCourseLabel}` : '',
          parsedTaskCount ? `${parsedTaskCount} task${parsedTaskCount === 1 ? '' : 's'}` : '',
          parsedExamCount ? `${parsedExamCount} exam${parsedExamCount === 1 ? '' : 's'}` : '',
        ].filter(Boolean).join(', ')
        const nextClasses = mergeCourse(classes, parsedCourse)
        const nextEvents = mergeEvents(events, parsedEvents)
        const nextUpload: StoredSyllabusUpload = {
          id: uploadId,
          name: file.name,
          url: '',
          storagePath: '',
          status: 'done',
          message: `Auto-filled ${importSummary || 'available text'}. Review and edit imported items in Tasks, Exams, and Courses.`,
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
        const nextUploads = [nextUpload, ...uploads]
        setClasses(nextClasses)
        setEvents(nextEvents)
        setUploads(nextUploads)
        await saveClasses(uid, nextClasses)
        await saveCalendarEvents(uid, nextEvents)
        await saveSyllabusUploads(uid, nextUploads)
        setImportState({
          tone: 'done',
          message: `${file.name}: auto-filled ${importSummary || 'available text'} with the Cloudflare Worker parser.`,
        })
      } catch (error) {
        const detail = error instanceof Error ? ` ${error.message}` : ''
        setImportState({ tone: 'error', message: `Could not import ${file.name}. Worker parser is required; no browser fallback is available.${detail}` })
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const addCourse = async () => {
    await saveCourses([
      ...classes,
      {
        id: nextCourseId(classes),
        title: '',
        code: '',
        day: '',
        startTime: '',
        endTime: '',
        time: '',
        location: '',
        profName: '',
        profEmail: '',
        taName: '',
        taEmail: '',
      },
    ])
  }

  const updateCourse = async (id: number, field: keyof StoredClassInfo, value: string) => {
    const nextClasses = classes.map((course) => {
      if (course.id !== id) return course
      const nextCourse = { ...course, [field]: value }
      if (field === 'startTime' || field === 'endTime') {
        nextCourse.time = [nextCourse.startTime, nextCourse.endTime].filter(Boolean).join(' - ')
      }
      return nextCourse
    })
    await saveCourses(nextClasses)
  }

  const removeCourse = async (id: number) => {
    await saveCourses(classes.filter((course) => course.id !== id))
  }

  const moveCalendarMonth = (offset: number) => {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  const jumpToToday = () => {
    const today = new Date()
    const nextDate = getLocalDateId(today)
    setSelectedDate(nextDate)
    setDraftEvent((draft) => ({ ...draft, date: nextDate }))
    setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1))
  }

  const renderEventCard = (event: StoredCalendarEvent) => {
    const deadlineType = getStoredEventDeadlineType(event)
    const isDone = Boolean(event.completed)
    const eventKey = getEventIdentity(event)
    const isEditing = editingEventKey === eventKey

    if (isEditing) {
      const editTypeOptions: DeadlineType[] = ['assignment', 'project', 'presentation', 'lab-report', 'quiz', 'test', 'exam', 'other']

      return (
        <article key={eventKey} className="planner-event-card planner-event-edit-card">
          <div className="planner-event-edit-form">
            <input value={editEventDraft.title} placeholder="Title" onChange={(inputEvent) => setEditEventDraft({ ...editEventDraft, title: inputEvent.target.value })} />
            <input value={editEventDraft.courseCode} placeholder="Course code" onChange={(inputEvent) => setEditEventDraft({ ...editEventDraft, courseCode: inputEvent.target.value })} />
            <div className="planner-field-grid">
              <input type="date" value={editEventDraft.date} onChange={(inputEvent) => setEditEventDraft({ ...editEventDraft, date: inputEvent.target.value })} />
              <input type="time" value={editEventDraft.time} onChange={(inputEvent) => setEditEventDraft({ ...editEventDraft, time: inputEvent.target.value })} />
              <select value={editEventDraft.deadlineType} onChange={(inputEvent) => setEditEventDraft({ ...editEventDraft, deadlineType: inputEvent.target.value as DeadlineType })}>
                {editTypeOptions.map((type) => <option key={type} value={type}>{formatDeadlineType(type)}</option>)}
              </select>
            </div>
          </div>
          <div className="planner-event-actions">
            <button className="planner-check" onClick={() => void saveEditingEvent(event)} aria-label="Save event changes">
              <Save size={18} />
            </button>
            <button className="planner-icon-danger" onClick={cancelEditingEvent} aria-label="Cancel editing">
              <X size={18} />
            </button>
          </div>
        </article>
      )
    }

    return (
      <article key={eventKey} className={`planner-event-card ${isDone ? 'done' : ''}`}>
        <div className="planner-event-main">
          <span className="planner-event-course">{event.courseCode || formatDeadlineType(deadlineType)}</span>
          <h3>{event.title}</h3>
          <p>{event.date}{event.time ? ` at ${event.time}` : ''} · {formatCountdown(event.date)}</p>
        </div>
        <div className="planner-event-actions">
          <button className="planner-check" onClick={() => void toggleComplete(event)} aria-label={isDone ? 'Mark incomplete' : 'Mark done'}>
            {isDone ? <CheckCircle2 size={22} /> : <Circle size={22} />}
          </button>
          <button className="planner-icon-button" onClick={() => startEditingEvent(event)} aria-label="Edit event">
            <Pencil size={16} />
          </button>
          <button className="planner-icon-danger" onClick={() => void removeEvent(event)} aria-label="Delete event">
            <Trash2 size={16} />
          </button>
        </div>
      </article>
    )
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
        {view === 'today' && (
          <>
            <section className="planner-hero">
              <div>
                <span className="planner-eyebrow">Syllabus to schedule</span>
                <h2>Your term, parsed into a plan.</h2>
                <p>Upload course outlines once. StudentHub extracts courses, deadlines, exams, reminders, and today’s schedule.</p>
              </div>
              <button className="planner-primary" onClick={() => fileInputRef.current?.click()} disabled={importState.tone === 'busy'}>
                <UploadCloud size={18} />
                {importState.tone === 'busy' ? 'Parsing...' : 'Upload PDF'}
              </button>
              <input ref={fileInputRef} className="planner-hidden-input" type="file" accept="application/pdf,.pdf" multiple onChange={(event) => void importFiles(event.target.files)} />
              <div className={`planner-status ${importState.tone}`}>{importState.message}</div>
            </section>

            <section className="planner-stats" aria-label="Planner summary">
              <div><strong>{stats.courses}</strong><span>Courses</span></div>
              <div><strong>{stats.tasks}</strong><span>Tasks</span></div>
              <div><strong>{stats.exams}</strong><span>Exams</span></div>
              <div><strong>{stats.next}</strong><span>Next</span></div>
            </section>

            <section className="planner-section">
              <div className="planner-section-title">
                <div><span>Attention</span><h2>Reminders</h2></div>
                <CalendarClock size={18} />
              </div>
              {reminders.length ? reminders.map(renderEventCard) : <div className="planner-empty">No urgent reminders right now.</div>}
            </section>

            <section className="planner-section">
              <div className="planner-section-title">
                <div><span>Schedule</span><h2>Classes today</h2></div>
                <BookOpen size={18} />
              </div>
              {todayClasses.length ? todayClasses.map((course) => (
                <article key={course.id} className="planner-course-row">
                  <time>{course.startTime || '--:--'}</time>
                  <div><h3>{course.code || course.title}</h3><p>{[course.title, course.location].filter(Boolean).join(' · ')}</p></div>
                </article>
              )) : <div className="planner-empty">No classes scheduled today.</div>}
            </section>
          </>
        )}

        {view === 'import' && (
          <section className="planner-import">
            <div className="planner-drop" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void importFiles(event.dataTransfer.files) }}>
              <FileUp size={34} />
              <h2>Drop syllabi here</h2>
              <p>PDF uploads are parsed by your Cloudflare Worker, then saved locally in this browser.</p>
              <button className="planner-primary" onClick={() => fileInputRef.current?.click()} disabled={importState.tone === 'busy'}>
                Choose PDFs
              </button>
              <input ref={fileInputRef} className="planner-hidden-input" type="file" accept="application/pdf,.pdf" multiple onChange={(event) => void importFiles(event.target.files)} />
            </div>
            <div className={`planner-status ${importState.tone}`}>{importState.message}</div>
            <div className="planner-upload-list">
              {uploads.length ? uploads.map((upload) => (
                <article key={upload.id} className="planner-upload-card">
                  <div>
                    <h3>{upload.name}</h3>
                    <p>{upload.message}</p>
                    <div className="planner-upload-actions">
                      <button onClick={() => navigate('/tasks')}>Review tasks</button>
                      <button onClick={() => navigate('/exams')}>Review exams</button>
                      <button onClick={() => navigate('/course-info')}>Review courses</button>
                    </div>
                  </div>
                  <button className="planner-icon-danger" onClick={() => void removeUpload(upload)} aria-label={`Delete ${upload.name} import`}>
                    <Trash2 size={17} />
                  </button>
                </article>
              )) : <div className="planner-empty">No syllabi imported yet.</div>}
            </div>
          </section>
        )}

        {view === 'tasks' && (
          <section className="planner-section planner-task-board">
            <EventComposer draft={draftEvent} setDraft={setDraftEvent} onAdd={() => void addDraftEvent()} mode="task" />
            <div className="planner-list-head">
              <div>
                <span>Queue</span>
                <h2>{taskEvents.filter((event) => !event.completed).length} open tasks</h2>
              </div>
              <button className="planner-inline-action" onClick={() => navigate('/calendar')}>
                <CalendarDays size={16} />
                Calendar
              </button>
            </div>
            {taskEvents.length ? taskEvents.map(renderEventCard) : (
              <div className="planner-empty">
                <strong>No deadlines yet</strong>
                <span>Import syllabi or add the first task below.</span>
              </div>
            )}

          </section>
        )}

        {view === 'calendar' && (
          <section className="planner-section planner-task-board">
            <section className="planner-calendar" aria-label="Calendar">
              <div className="planner-calendar-head">
                <div>
                  <span><CalendarDays size={14} /> Calendar</span>
                  <h2>{formatMonthLabel(calendarMonth)}</h2>
                </div>
                <div className="planner-calendar-actions">
                  <button className="planner-icon-button" onClick={() => moveCalendarMonth(-1)} aria-label="Previous month">
                    <ChevronLeft size={18} />
                  </button>
                  <button className="planner-calendar-today" onClick={jumpToToday}>Today</button>
                  <button className="planner-icon-button" onClick={() => moveCalendarMonth(1)} aria-label="Next month">
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
              <div className="planner-calendar-weekdays" aria-hidden="true">
                {calendarWeekdays.map((day) => <span key={day}>{day}</span>)}
              </div>
              <div className="planner-calendar-grid">
                {calendarDays.map((day) => (
                  <button
                    key={day.date}
                    className={[
                      'planner-calendar-day',
                      day.isCurrentMonth ? '' : 'muted',
                      day.isToday ? 'today' : '',
                      day.isSelected ? 'selected' : '',
                      day.hasOpen ? 'has-open' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => {
                      setSelectedDate(day.date)
                      setDraftEvent((draft) => ({ ...draft, date: day.date }))
                      if (!day.isCurrentMonth) {
                        const nextMonth = parseDateId(day.date)
                        setCalendarMonth(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1))
                      }
                    }}
                    type="button"
                    aria-label={`${day.date}${day.eventCount ? `, ${day.eventCount} event${day.eventCount === 1 ? '' : 's'}` : ''}`}
                  >
                    <span>{day.dayNumber}</span>
                    {day.eventCount > 0 && (
                      <strong className={day.hasExam ? 'exam' : ''}>{day.eventCount}</strong>
                    )}
                  </button>
                ))}
              </div>
            </section>

            <div className="planner-list-head">
              <div>
                <span>Selected day</span>
                <h2>{formatSelectedDate(selectedDate)}</h2>
              </div>
              <p>{selectedDateEvents.length ? `${selectedDateEvents.length} item${selectedDateEvents.length === 1 ? '' : 's'}` : 'No items'}</p>
            </div>
            {selectedDateEvents.length ? selectedDateEvents.map(renderEventCard) : (
              <div className="planner-empty">
                <strong>No items on this day</strong>
                <span>Select another date or add a deadline below.</span>
              </div>
            )}

            <button className="planner-secondary" onClick={() => navigate('/tasks')}>Back to tasks</button>
          </section>
        )}

        {view === 'exams' && (
          <section className="planner-section planner-task-board">
            <EventComposer draft={draftEvent} setDraft={setDraftEvent} onAdd={() => void addDraftEvent()} mode="exam" />
            <div className="planner-list-head">
              <div>
                <span>Timeline</span>
                <h2>{examEvents.filter((event) => !event.completed).length} upcoming exams</h2>
              </div>
              <p>{examEvents.length ? `${examEvents.length} total` : 'Parsed exam dates will appear here'}</p>
            </div>
            {examEvents.length ? examEvents.map(renderEventCard) : (
              <div className="planner-empty">
                <strong>No exams yet</strong>
                <span>Upload syllabi or add a test manually.</span>
              </div>
            )}
          </section>
        )}

        {view === 'courses' && (
          <section className="planner-section">
            <button className="planner-secondary" onClick={() => void addCourse()}><Plus size={16} /> Add course</button>
            <div className="planner-course-editor-list">
              {classes.length ? classes.map((course) => (
                <article key={course.id} className="planner-course-editor">
                  <div className="planner-course-editor-head">
                    <span>{course.code || `Course ${course.id + 1}`}</span>
                    <button className="planner-icon-danger" onClick={() => void removeCourse(course.id)} aria-label="Delete course"><Trash2 size={17} /></button>
                  </div>
                  <input value={course.title} placeholder="Course title" onChange={(event) => void updateCourse(course.id, 'title', event.target.value)} />
                  <input value={course.code} placeholder="Course code" onChange={(event) => void updateCourse(course.id, 'code', event.target.value)} />
                  <div className="planner-field-grid">
                    <select value={course.day} onChange={(event) => void updateCourse(course.id, 'day', event.target.value)}>
                      <option value="">Day</option>
                      {weekdays.map((day) => <option key={day} value={day}>{day}</option>)}
                    </select>
                    <input type="time" value={course.startTime} onChange={(event) => void updateCourse(course.id, 'startTime', event.target.value)} />
                    <input type="time" value={course.endTime} onChange={(event) => void updateCourse(course.id, 'endTime', event.target.value)} />
                  </div>
                  <input value={course.location} placeholder="Location" onChange={(event) => void updateCourse(course.id, 'location', event.target.value)} />
                  <input value={course.profName} placeholder="Instructor" onChange={(event) => void updateCourse(course.id, 'profName', event.target.value)} />
                </article>
              )) : <div className="planner-empty">Courses from uploaded syllabi will appear here.</div>}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

function EventComposer({
  draft,
  setDraft,
  onAdd,
  mode,
}: {
  draft: DraftEvent
  setDraft: (draft: DraftEvent) => void
  onAdd: () => void
  mode: 'task' | 'exam'
}) {
  const isExam = mode === 'exam'
  const typeOptions: DeadlineType[] = isExam ? ['exam', 'test', 'quiz'] : ['assignment', 'project', 'presentation', 'lab-report', 'other']

  return (
    <div className={`planner-composer planner-composer-${mode}`}>
      <div>
        <span>{isExam ? 'Create exam' : 'Create task'}</span>
        <h2>{isExam ? 'Add a quiz, test, or exam' : 'Add a deadline'}</h2>
      </div>
      <input value={draft.title} placeholder={isExam ? 'Exam title' : 'Task title'} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
      <input value={draft.courseCode} placeholder="Course code" onChange={(event) => setDraft({ ...draft, courseCode: event.target.value })} />
      <div className="planner-field-grid">
        <input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} />
        <input type="time" value={draft.time} onChange={(event) => setDraft({ ...draft, time: event.target.value })} />
        <select value={draft.deadlineType} onChange={(event) => setDraft({ ...draft, deadlineType: event.target.value as DeadlineType })}>
          {typeOptions.map((type) => <option key={type} value={type}>{formatDeadlineType(type)}</option>)}
        </select>
      </div>
      <button className="planner-primary" onClick={onAdd}><Plus size={16} /> Add</button>
    </div>
  )
}

export default PlannerApp
