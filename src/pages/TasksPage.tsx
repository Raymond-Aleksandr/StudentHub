import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { usePlanner } from '../data/usePlanner'
import { EventCard } from '../components/EventCard'
import type { DraftEvent } from '../domain/types'
import { formatDeadlineType, getDaysUntil, getEventDeadlineType } from '../domain/deadlines'

function toDateId(date: Date) {
  return date.toISOString().slice(0, 10)
}

function relDay(date: string) {
  const days = getDaysUntil(date)
  if (days < 0) return days === -1 ? 'Yesterday' : `${Math.abs(days)}d ago`
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days < 7) return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long' })
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function parseQuick(text: string): DraftEvent | null {
  if (!text.trim()) return null
  const lower = text.toLowerCase()
  const codeMatch = text.match(/\b[A-Za-z]{2,5}\s?\d{2,4}\b/)
  const courseCode = codeMatch?.[0].replace(/([A-Za-z]+)\s?(\d+)/, (_, a, b) => `${a.toUpperCase()} ${b}`) ?? ''
  const date = new Date()
  const dowMap: Record<string, number> = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0 }
  let foundDate = false
  for (const [key, dow] of Object.entries(dowMap)) {
    if (lower.includes(key)) {
      const add = (dow - date.getDay() + 7) % 7 || 7
      date.setDate(date.getDate() + add)
      foundDate = true
      break
    }
  }
  if (!foundDate && lower.includes('tomorrow')) {
    date.setDate(date.getDate() + 1)
    foundDate = true
  }
  if (!foundDate && lower.includes('today')) foundDate = true
  if (!foundDate) date.setDate(date.getDate() + 3)

  const deadlineType = /quiz/.test(lower) ? 'quiz'
    : /test|exam/.test(lower) ? 'test'
    : /lab/.test(lower) ? 'lab-report'
    : /project/.test(lower) ? 'project'
    : /presentation/.test(lower) ? 'presentation'
    : 'assignment'

  const title = text
    .replace(codeMatch?.[0] ?? '', '')
    .replace(/\b(mon|tue|wed|thu|fri|sat|sun|today|tomorrow)\b/ig, '')
    .trim() || 'Untitled task'

  return { title, courseCode, date: toDateId(date), time: '23:59', deadlineType }
}

export default function TasksPage() {
  const { taskEvents, toggleComplete, removeEvent, updateEvent, addDraftEvent } = usePlanner()
  const [quick, setQuick] = useState('')
  const [filter, setFilter] = useState<'open' | 'overdue' | 'done' | 'all'>('open')
  const [courseFilter, setCourseFilter] = useState('all')
  const parsed = parseQuick(quick)
  const courseOptions = useMemo(() => Array.from(new Set(taskEvents.map((event) => event.courseCode).filter(Boolean))).sort(), [taskEvents])

  const view = taskEvents
    .filter((event) => {
      if (filter === 'open') return !event.completed
      if (filter === 'done') return event.completed
      if (filter === 'overdue') return !event.completed && getDaysUntil(event.date) < 0
      return true
    })
    .filter((event) => courseFilter === 'all' || event.courseCode === courseFilter)

  const grouped = view.reduce<Record<string, typeof view>>((groups, event) => {
    const key = relDay(event.date)
    groups[key] = groups[key] ?? []
    groups[key].push(event)
    return groups
  }, {})

  const addQuick = async () => {
    if (!parsed) return
    await addDraftEvent(parsed)
    setQuick('')
  }

  return (
    <>
      <section className="quick-capture card">
        <div className="qc-head">
          <span className="eyebrow">Quick capture</span>
          <span className="mono">try &quot;math240 pset 7 fri&quot;</span>
        </div>
        <div className="field qc-field">
          <span className="mono" style={{ color: 'var(--accent)' }}>›</span>
          <input value={quick} onChange={(event) => setQuick(event.target.value)} placeholder="Type a task... we'll parse the course code and due date" onKeyDown={(event) => { if (event.key === 'Enter') void addQuick() }} />
          <button className="btn btn-accent" onClick={() => void addQuick()} disabled={!parsed}>
            <Plus size={14} /> Add
          </button>
        </div>
        {parsed && (
          <div className="qc-parsed">
            <span className="qc-chip"><span className="mono">course</span>{parsed.courseCode || 'Unassigned'}</span>
            <span className="qc-chip"><span className="mono">type</span>{formatDeadlineType(parsed.deadlineType)}</span>
            <span className="qc-chip"><span className="mono">due</span>{relDay(parsed.date)}</span>
            <span className="qc-chip"><span className="mono">title</span>{parsed.title}</span>
          </div>
        )}
      </section>

      <div className="filter-row">
        <div className="seg">
          {(['open', 'overdue', 'done', 'all'] as const).map((item) => (
            <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>
              {item[0].toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>
        <select className="select" value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)}>
          <option value="all">All courses</option>
          {courseOptions.map((course) => <option key={course} value={course}>{course}</option>)}
        </select>
      </div>

      <section style={{ marginTop: 20 }}>
        {Object.keys(grouped).length ? Object.entries(grouped).map(([group, items]) => (
          <div key={group}>
            <div className="group-head">
              <span className="eyebrow">{group}</span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--ink-4)', marginLeft: 8 }}>{items.length} task{items.length === 1 ? '' : 's'}</span>
            </div>
            {items.map((event) => (
              <EventCard key={`${event.title}-${event.date}-${event.time}-${event.sourceUploadId}-${getEventDeadlineType(event)}`} event={event} onToggle={toggleComplete} onRemove={removeEvent} onUpdate={updateEvent} />
            ))}
          </div>
        )) : (
          <div className="empty">
            <h3>Nothing here</h3>
            <p>{filter === 'open' ? 'Inbox zero. Enjoy it while it lasts.' : 'Try a different filter.'}</p>
          </div>
        )}
      </section>
    </>
  )
}
