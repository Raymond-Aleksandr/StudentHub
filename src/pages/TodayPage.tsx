import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, CalendarDays, Search } from 'lucide-react'
import { usePlanner } from '../data/usePlanner'
import { EventCard } from '../components/EventCard'
import { formatCountdown, getDaysUntil } from '../domain/deadlines'

function todayLabel() {
  return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date())
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
  const { stats, upcomingEvents, reminders, todayClasses, taskEvents, examEvents, toggleComplete, removeEvent, updateEvent } = usePlanner()
  const now = new Date()
  const actualHour = now.getHours() + now.getMinutes() / 60
  const hour = actualHour >= 8 && actualHour <= 21 ? actualHour : 11 + 25 / 60
  const startH = 8
  const endH = 21

  const openTasks = taskEvents.filter((event) => !event.completed)
  const todayTasks = openTasks.filter((event) => getDaysUntil(event.date) <= 0)
  const tomorrowTasks = openTasks.filter((event) => getDaysUntil(event.date) === 1)
  const nextExam = examEvents.find((event) => !event.completed)

  const scheduleBlocks = useMemo(() =>
    todayClasses.map((course, index) => ({
      id: String(course.id),
      title: `${course.code || course.title} · ${course.title || 'Lecture'}`,
      start: timeToDecimal(course.startTime, 13),
      end: timeToDecimal(course.endTime, timeToDecimal(course.startTime, 13) + 1),
      location: course.location,
      tag: ['var(--tag-slate)', 'var(--tag-teal)', 'var(--tag-ochre)', 'var(--tag-plum)', 'var(--tag-sage)'][index % 5],
      personal: false,
    })).sort((left, right) => left.start - right.start),
  [todayClasses])

  const current = scheduleBlocks.find((block) => hour >= block.start && hour < block.end)
  const nextBlock = scheduleBlocks.find((block) => block.start > hour)
  const hasNowContext = Boolean(current || nextBlock || upcomingEvents[0])

  const week = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date()
    date.setDate(date.getDate() + offset)
    const tasks = openTasks.filter((event) => getDaysUntil(event.date) === offset)
    const exams = examEvents.filter((event) => !event.completed && getDaysUntil(event.date) === offset)
    const load = tasks.length * 3 + exams.length * 8
    return { date, tasks, exams, load }
  })
  const maxLoad = Math.max(...week.map((day) => day.load), 1)

  return (
    <>
      {hasNowContext && (
        <div className="now-strip">
          {(current || nextBlock) && (
            <section className="now-card">
              <div className="now-top">
                <span className="now-pulse" />
                <span className="eyebrow">{current ? `Now · ${fmtHour(hour)}` : 'Next class'}</span>
              </div>
              <div className="now-title">{current ? current.title : nextBlock?.title}</div>
              <div className="now-meta">
                {current ? `${current.location || 'Campus'} · ends ${fmtHour(current.end)}` : nextBlock ? `${fmtHour(nextBlock.start)} · ${nextBlock.location || todayLabel()}` : todayLabel()}
              </div>
            </section>
          )}

          {upcomingEvents[0] && (
            <section className="next-card">
              <span className="eyebrow">Up next</span>
              <div className="next-title">{upcomingEvents[0].title}</div>
              <div className="next-time mono">{`${upcomingEvents[0].courseCode || 'Unassigned'} · ${formatCountdown(upcomingEvents[0].date)}`}</div>
            </section>
          )}
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
          <span className="stat-n serif">{nextExam ? getDaysUntil(nextExam.date) : '—'}<small>days</small></span>
          <span className="stat-sub">{nextExam ? `${nextExam.courseCode} · ${nextExam.title}` : 'No exams scheduled'}</span>
        </button>
        <button className="stat" onClick={() => navigate('/course-info')}>
          <span className="eyebrow">Courses</span>
          <span className="stat-n serif">{stats.courses}</span>
          <span className="stat-sub">Imported and editable</span>
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
      {openTasks.slice(0, 4).length ? openTasks.slice(0, 4).map((event) => (
        <EventCard key={`${event.title}-${event.date}-${event.time}-${event.sourceUploadId}`} event={event} onToggle={toggleComplete} onRemove={removeEvent} onUpdate={updateEvent} />
      )) : <div className="empty"><BookOpen size={28} /><h3>No open tasks</h3><p>Import a syllabus or add one from Tasks.</p></div>}

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
