import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, CalendarDays, Search } from 'lucide-react'
import { usePlanner } from '../data/usePlanner'
import { EventCard } from '../components/EventCard'
import { formatDeadlineType, getDaysUntil } from '../domain/deadlines'
import { courseMatchesEvent, tagForCourse, tagForEventCourse } from '../domain/courseMeta'
import { getCourseGrade } from '../domain/grades'
import { getLocalDateId } from '../domain/calendar'
import type { CalendarEvent } from '../domain/types'

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
  const match = time.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i)
  if (!match) return fallback
  let h = Number(match[1])
  const m = match[2] ? Number(match[2]) : 0
  const suffix = match[3]?.toUpperCase()
  if (!Number.isFinite(h) || !Number.isFinite(m)) return fallback
  if (suffix === 'PM' && h < 12) h += 12
  if (suffix === 'AM' && h === 12) h = 0
  if (h >= 0 && h <= 24 && m >= 0 && m < 60) return h + (m / 60)
  return fallback
}

function fmtHour(value: number) {
  const h = Math.floor(value)
  const m = Math.round((value % 1) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function durationLabel(minutes: number | null) {
  if (!minutes) return ''
  if (minutes % 60 === 0) return `${minutes / 60}h`
  if (minutes > 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
  return `${minutes}m`
}

function examScheduleWindow(event: CalendarEvent) {
  const start = timeToDecimal(event.time, Number.NaN)
  if (!Number.isFinite(start)) return null
  const duration = event.durationMinutes ?? 120
  const end = Math.min(24, start + (duration / 60))
  return { start, end: Math.max(start + 0.65, end) }
}

export default function TodayPage() {
  const navigate = useNavigate()
  const { stats, classes, upcomingEvents, reminders, todayClasses, taskEvents, examEvents, toggleComplete, removeEvent, updateEvent } = usePlanner()
  const now = new Date()
  const actualHour = now.getHours() + now.getMinutes() / 60
  const hour = actualHour
  const todayId = getLocalDateId(now)

  const openTasks = taskEvents.filter((event) => !event.completed)
  const upcomingTasks = openTasks.filter((event) => getDaysUntil(event.date) >= 0)
  const todayTasks = openTasks.filter((event) => getDaysUntil(event.date) === 0)
  const tomorrowTasks = openTasks.filter((event) => getDaysUntil(event.date) === 1)
  const nextExam = examEvents.find((event) => !event.completed)

  const scheduleBlocks = useMemo(() => {
    const classBlocks = todayClasses.map((course, index) => {
      const start = timeToDecimal(course.startTime, 13)
      const fallbackEnd = start + 1
      const end = Math.max(start + 0.25, timeToDecimal(course.endTime, fallbackEnd))
      return {
        id: String(course.id),
        title: `${course.code || course.title} · ${course.title || 'Lecture'}`,
        start,
        end,
        timeLabel: `${fmtHour(start)}-${fmtHour(end)}`,
        location: course.location,
        tag: tagForCourse(course, index),
        personal: false,
      }
    })

    const timedEvents = examEvents
      .filter((event) => !event.completed && event.date === todayId && event.time)
      .map((event, index) => {
        const window = examScheduleWindow(event)
        if (!window) return null
        const kind = formatDeadlineType(event.deadlineType)
        return {
          id: `event-${event.sourceUploadId}-${event.courseCode}-${event.title}-${event.date}-${event.time}-${index}`,
          title: `${event.courseCode ? `${event.courseCode} · ` : ''}${event.title}`,
          start: window.start,
          end: window.end,
          timeLabel: event.time,
          location: [kind, durationLabel(event.durationMinutes), event.weight ? `${event.weight}%` : ''].filter(Boolean).join(' · '),
          tag: tagForEventCourse(classes, event.courseCode, index),
          personal: true,
        }
      })
      .filter((block): block is NonNullable<typeof block> => Boolean(block))

    return [...classBlocks, ...timedEvents].sort((left, right) => left.start - right.start)
  }, [classes, examEvents, todayClasses, todayId])

  const dueMarkers = useMemo(() =>
    taskEvents
      .filter((event) => !event.completed && event.date === todayId && event.time)
      .map((event, index) => {
        const due = timeToDecimal(event.time, Number.NaN)
        if (!Number.isFinite(due)) return null
        return {
          id: `due-${event.sourceUploadId}-${event.courseCode}-${event.title}-${event.date}-${event.time}-${index}`,
          due,
          timeLabel: event.time,
          title: event.title,
          courseCode: event.courseCode,
          meta: event.weight ? `${formatDeadlineType(event.deadlineType)} · ${event.weight}% due` : `${formatDeadlineType(event.deadlineType)} due`,
          tag: tagForEventCourse(classes, event.courseCode, index),
        }
      })
      .filter((marker): marker is NonNullable<typeof marker> => Boolean(marker))
      .sort((left, right) => left.due - right.due),
  [classes, taskEvents, todayId])

  const timelineBounds = scheduleBlocks.reduce(
    (bounds, block) => ({
      min: Math.min(bounds.min, block.start),
      max: Math.max(bounds.max, block.end),
    }),
    { min: 8, max: 21 },
  )
  const dueBounds = dueMarkers.reduce(
    (bounds, marker) => ({
      min: Math.min(bounds.min, marker.due),
      max: Math.max(bounds.max, marker.due),
    }),
    timelineBounds,
  )
  const startH = Math.max(0, Math.min(8, Math.floor(dueBounds.min)))
  const endH = Math.min(24, Math.max(21, Math.ceil(dueBounds.max)))

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
                    <span className="tl-time">{block.timeLabel}</span>
                    {block.location && <><span className="tl-sep">·</span><span className="tl-loc">{block.location}</span></>}
                  </div>
                </div>
              </div>
            )
          })}
          {dueMarkers.map((marker) => (
            <div
              key={marker.id}
              className="tl-due"
              style={{ top: (marker.due - startH) * 56, '--tag': marker.tag } as CSSProperties}
            >
              <span className="tl-due-dot" />
              <span className="tl-due-line" />
              <div className="tl-due-card">
                <span className="tl-due-time mono">{marker.timeLabel}</span>
                <span className="tl-due-title">{marker.courseCode ? `${marker.courseCode} · ` : ''}{marker.title}</span>
                <span className="tl-due-meta mono">{marker.meta}</span>
              </div>
            </div>
          ))}
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
