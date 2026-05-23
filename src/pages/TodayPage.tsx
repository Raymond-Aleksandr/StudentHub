import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, CalendarDays, Search } from 'lucide-react'
import { usePlanner } from '../data/usePlanner'
import { EventCard } from '../components/EventCard'
import { formatDeadlineType, getDaysUntil } from '../domain/deadlines'
import { courseMatchesEvent, tagForCourse, tagForEventCourse } from '../domain/courseMeta'
import { getCourseGrade } from '../domain/grades'

function todayLabel() {
  return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date())
}

function dateTime(date: string, time: string) {
  if (!date) return time ? `TBD · ${time}` : 'TBD'
  return `${new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}${time ? ` · ${time}` : ''}`
}

function dayCount(date: string) {
  if (!date) return 'TBD'
  return Math.max(getDaysUntil(date), 0)
}

function timeToDecimal(time: string, fallback: number) {
  const [h, m] = time.split(':').map(Number)
  if (Number.isFinite(h)) return h + ((Number.isFinite(m) ? m : 0) / 60)
  return fallback
}

function fmtHour(value: number) {
  const h = Math.floor(value)
  const m = Math.round((value % 1) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export default function TodayPage() {
  const navigate = useNavigate()
  const { stats, classes, upcomingEvents, reminders, todayClasses, taskEvents, examEvents, toggleComplete, removeEvent, updateEvent } = usePlanner()
  const now = new Date()
  const actualHour = now.getHours() + now.getMinutes() / 60
  const hour = actualHour >= 8 && actualHour <= 21 ? actualHour : 11 + 25 / 60
  const startH = 8
  const endH = 21

  const openTasks = taskEvents.filter((event) => !event.completed)
  const upcomingTasks = openTasks.filter((event) => getDaysUntil(event.date) >= 0)
  const todayTasks = openTasks.filter((event) => getDaysUntil(event.date) === 0)
  const tomorrowTasks = openTasks.filter((event) => getDaysUntil(event.date) === 1)
  const nextExam = examEvents.find((event) => !event.completed)

  const scheduleBlocks = useMemo(() =>
    todayClasses.map((course, index) => ({
      id: String(course.id),
      title: `${course.code || course.title} · ${course.title || 'Lecture'}`,
      start: timeToDecimal(course.startTime, 13),
      end: timeToDecimal(course.endTime, timeToDecimal(course.startTime, 13) + 1),
      location: course.location,
      tag: tagForCourse(course, index),
      personal: false,
    })).sort((left, right) => left.start - right.start),
  [todayClasses])

  const current = scheduleBlocks.find((block) => hour >= block.start && hour < block.end)
  const nextBlock = scheduleBlocks.find((block) => block.start > hour)
  const focusEvent = upcomingEvents[0]
  const focusDays = focusEvent ? getDaysUntil(focusEvent.date) : 0
  const focusHasDate = focusEvent ? Number.isFinite(focusDays) : false
  const hasFocusContext = Boolean(focusEvent || current || nextBlock)

  const week = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date()
    date.setDate(date.getDate() + offset)
    const tasks = openTasks.filter((event) => getDaysUntil(event.date) === offset)
    const exams = examEvents.filter((event) => !event.completed && getDaysUntil(event.date) === offset)
    const load = [...tasks, ...exams].reduce((sum, event) => sum + (event.weight ?? (event.type === 'exam' ? 10 : 3)), 0)
    return { date, tasks, exams, load }
  })
  const maxLoad = Math.max(...week.map((day) => day.load), 1)
  const courseGrades = classes
    .map((course) => getCourseGrade(course, [...taskEvents, ...examEvents].filter((event) => courseMatchesEvent(course, event))))
    .filter((grade) => grade.value !== null)
  const averageGrade = courseGrades.length
    ? Math.round(courseGrades.reduce((sum, grade) => sum + (grade.value ?? 0), 0) / courseGrades.length)
    : null
  const hasComputedGrade = courseGrades.some((grade) => grade.source === 'computed')

  return (
    <>
      {hasFocusContext && (
        <div className="now-strip">
          <section className="now-card" style={{ '--tag': tagForEventCourse(classes, focusEvent?.courseCode ?? '') } as CSSProperties}>
            <div className="hero-exam-left">
              <div className="hero-exam-kicker">
                <span className="exam-code">{focusEvent?.courseCode || (current || nextBlock)?.title.split(' · ')[0] || 'Planner'}</span>
              </div>
              <div className="hero-exam-title serif">{focusEvent?.title || current?.title || nextBlock?.title}</div>
              <div className="hero-exam-meta">
                <span>{focusEvent ? dateTime(focusEvent.date, focusEvent.time) : current ? `${fmtHour(hour)} · ends ${fmtHour(current.end)}` : nextBlock ? `${fmtHour(nextBlock.start)} · ${nextBlock.location || todayLabel()}` : todayLabel()}</span>
                <span className="mono">{focusEvent ? `${formatDeadlineType(focusEvent.deadlineType)}${focusEvent.weight ? ` · ${focusEvent.weight}%` : ''}` : current?.location || nextBlock?.location || 'Today'}</span>
              </div>
            </div>
            <div className="hero-exam-right">
              <span className="eyebrow">{focusEvent ? 'Due in' : 'Planner'}</span>
              <div className="countdown serif">
                {focusEvent ? dayCount(focusEvent.date) : fmtHour(hour)}
                {focusEvent && focusHasDate && <small>{focusDays === 1 ? 'day' : 'days'}</small>}
              </div>
              <div className="countdown-bar"><div style={{ width: `${focusEvent ? focusHasDate ? Math.max(8, 100 - Math.max(focusDays, 0) * 5) : 18 : 28}%` }} /></div>
            </div>
          </section>
        </div>
      )}

      <section className="stats">
        <button className="stat" onClick={() => navigate('/tasks')}>
          <span className="eyebrow">Open tasks</span>
          <span className="stat-n serif">{openTasks.length}</span>
          <span className="stat-sub">{todayTasks.length} due today · {tomorrowTasks.length} tomorrow</span>
        </button>
        <button className="stat" onClick={() => navigate('/exams')}>
          <span className="eyebrow">Next exam</span>
          <span className="stat-n serif">{nextExam ? dayCount(nextExam.date) : '—'}{nextExam?.date && <small>days</small>}</span>
          <span className="stat-sub">{nextExam ? `${nextExam.courseCode} · ${nextExam.title}` : 'No exams scheduled'}</span>
        </button>
        <button className="stat" onClick={() => navigate('/course-info')}>
          <span className="eyebrow">Courses</span>
          <span className="stat-n serif">{averageGrade ?? stats.courses}{averageGrade !== null && <small>%</small>}</span>
          <span className="stat-sub">{averageGrade !== null ? `${stats.courses} courses · ${hasComputedGrade ? 'running avg' : 'estimate avg'}` : 'Imported and editable'}</span>
        </button>
      </section>

      <div className="sec-head">
        <div>
          <span className="eyebrow">Today&apos;s schedule</span>
          <h2>The day, hour by hour</h2>
        </div>
        <button className="more" onClick={() => navigate('/calendar')}>Open calendar →</button>
      </div>
      <section className="timeline card card-tight">
        <div className="tl-grid" style={{ height: (endH - startH) * 56 }}>
          {Array.from({ length: endH - startH + 1 }, (_, index) => {
            const h = startH + index
            return (
              <div key={h} className="tl-row" style={{ top: index * 56 }}>
                <span className="tl-hour mono">{String(h).padStart(2, '0')}</span>
                <div className="tl-line" />
              </div>
            )
          })}
          {scheduleBlocks.map((block) => {
            const height = (block.end - block.start) * 56
            const short = height < 56
            return (
              <div
                key={block.id}
                className={`tl-block ${short ? 'short' : ''}`}
                data-personal={block.personal ? 'true' : 'false'}
                style={{ top: (block.start - startH) * 56, height, '--tag': block.tag } as CSSProperties}
              >
                <div className="tl-block-body">
                  <div className="tl-block-title">{block.title}</div>
                  <div className="tl-block-meta mono">
                    <span className="tl-time">{fmtHour(block.start)}-{fmtHour(block.end)}</span>
                    {block.location && <><span className="tl-sep">·</span><span className="tl-loc">{block.location}</span></>}
                  </div>
                </div>
              </div>
            )
          })}
          {hour >= startH && hour <= endH && (
            <div className="tl-now" style={{ top: (hour - startH) * 56 }}>
              <span className="tl-now-dot" />
              <div className="tl-now-line" />
              <span className="tl-now-time mono">{fmtHour(hour)}</span>
            </div>
          )}
        </div>
      </section>

      <div className="sec-head">
        <div>
          <span className="eyebrow">Workload pressure</span>
          <h2>Next seven days</h2>
        </div>
        <span className="more mono">dot = load</span>
      </div>
      <section className="card pressure-card">
        <div className="pressure-row">
          {week.map((day, index) => {
            const size = 8 + (day.load / maxLoad) * 36
            return (
              <div key={day.date.toISOString()} className="pressure-day" data-today={index === 0}>
                <span className="pd-dow mono">{day.date.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2).toUpperCase()}</span>
                <span className="pd-date serif">{day.date.getDate()}</span>
                <div className="pd-dot-wrap">
                  <span className="pd-dot" style={{ width: size, height: size, background: day.load > maxLoad * 0.65 ? 'var(--accent)' : 'var(--ink-3)', opacity: day.load ? 1 : 0.25 }} />
                </div>
                <span className="pd-count mono">{day.tasks.length + day.exams.length || '·'}</span>
              </div>
            )
          })}
        </div>
      </section>

      <div className="sec-head">
        <div>
          <span className="eyebrow">Coming up</span>
          <h2>Next four tasks</h2>
        </div>
        <button className="more" onClick={() => navigate('/tasks')}>All tasks →</button>
      </div>
      {upcomingTasks.slice(0, 4).length ? upcomingTasks.slice(0, 4).map((event) => (
        <EventCard key={`${event.title}-${event.date}-${event.time}-${event.sourceUploadId}`} event={event} onToggle={toggleComplete} onRemove={removeEvent} onUpdate={updateEvent} />
      )) : <div className="empty"><BookOpen size={28} /><h3>No upcoming tasks</h3><p>Overdue items stay in Reminders and the Tasks view.</p></div>}

      <div className="sec-head">
        <div>
          <span className="eyebrow">Attention</span>
          <h2>Reminders</h2>
        </div>
        <Search size={18} />
      </div>
      {reminders.length ? reminders.map((event) => (
        <EventCard key={`reminder-${event.title}-${event.date}-${event.time}-${event.sourceUploadId}`} event={event} onToggle={toggleComplete} onRemove={removeEvent} onUpdate={updateEvent} />
      )) : <div className="empty"><CalendarDays size={28} /><h3>No urgent reminders</h3><p>Nothing needs immediate attention right now.</p></div>}
    </>
  )
}
