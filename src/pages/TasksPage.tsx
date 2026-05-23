import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { usePlanner } from '../data/usePlanner'
import { EventCard, EventEditModal } from '../components/EventCard'
import type { DraftEvent } from '../domain/types'
import { getDaysUntil, getEventDeadlineType } from '../domain/deadlines'

function toDateId(date: Date) {
  return date.toISOString().slice(0, 10)
}

function relDay(date: string) {
  if (!date) return 'Date needed'
  const days = getDaysUntil(date)
  if (days < 0) return days === -1 ? 'Yesterday' : `${Math.abs(days)}d ago`
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days < 7) return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long' })
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function TasksPage() {
  const { taskEvents, toggleComplete, removeEvent, updateEvent, addDraftEvent } = usePlanner()
  const [adding, setAdding] = useState(false)
  const [filter, setFilter] = useState<'open' | 'overdue' | 'done' | 'all'>('open')
  const [courseFilter, setCourseFilter] = useState('all')
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

  return (
    <>
      <div className="sec-head tasks-head">
        <div>
          <span className="eyebrow">Task queue</span>
          <h2>{taskEvents.filter((event) => !event.completed).length} open</h2>
        </div>
        <button className="btn btn-accent" onClick={() => setAdding(true)}>
          <Plus size={14} /> New task
        </button>
      </div>

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
      {adding && (
        <EventEditModal
          title="New task"
          initialDraft={newTaskDraft()}
          onClose={() => setAdding(false)}
          onSave={(draft) => {
            void addDraftEvent(draft)
            setAdding(false)
          }}
        />
      )}
    </>
  )
}

function newTaskDraft(): DraftEvent {
  const date = new Date()
  date.setDate(date.getDate() + 3)
  return {
    title: '',
    courseCode: '',
    date: toDateId(date),
    time: '23:59',
    durationMinutes: null,
    weight: 3,
    score: null,
    location: '',
    format: '',
    deadlineType: 'assignment',
  }
}
