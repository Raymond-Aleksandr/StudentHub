import { useState } from 'react'
import { CheckCircle2, Circle, Pencil, Save, Trash2, X } from 'lucide-react'
import type { CalendarEvent, DraftEvent } from '../domain/types'
import { formatCountdown, formatDeadlineType, getEventDeadlineType, type DeadlineType } from '../domain/deadlines'
import { getEventIdentity } from '../domain/merge'

interface EventCardProps {
  event: CalendarEvent
  onToggle: (event: CalendarEvent) => void
  onRemove: (event: CalendarEvent) => void
  onUpdate: (event: CalendarEvent, draft: DraftEvent) => void
}

export function EventCard({ event, onToggle, onRemove, onUpdate }: EventCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState<DraftEvent>({
    title: event.title,
    courseCode: event.courseCode,
    date: event.date,
    time: event.time,
    deadlineType: getEventDeadlineType(event),
  })

  const isDone = Boolean(event.completed)
  const eventKey = getEventIdentity(event)

  const startEdit = () => {
    setDraft({
      title: event.title,
      courseCode: event.courseCode,
      date: event.date,
      time: event.time,
      deadlineType: getEventDeadlineType(event),
    })
    setIsEditing(true)
  }

  const saveEdit = () => {
    if (!draft.title || !draft.date) return
    onUpdate(event, draft)
    setIsEditing(false)
  }

  const cancelEdit = () => setIsEditing(false)

  if (isEditing) {
    const editTypeOptions: DeadlineType[] = ['assignment', 'project', 'presentation', 'lab-report', 'quiz', 'test', 'exam', 'other']
    return (
      <article key={eventKey} className="planner-event-card planner-event-edit-card">
        <div className="planner-event-edit-form">
          <input value={draft.title} placeholder="Title" onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <input value={draft.courseCode} placeholder="Course code" onChange={(e) => setDraft({ ...draft, courseCode: e.target.value })} />
          <div className="planner-field-grid">
            <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
            <input type="time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} />
            <select value={draft.deadlineType} onChange={(e) => setDraft({ ...draft, deadlineType: e.target.value as DeadlineType })}>
              {editTypeOptions.map((t) => <option key={t} value={t}>{formatDeadlineType(t)}</option>)}
            </select>
          </div>
        </div>
        <div className="planner-event-actions">
          <button className="planner-check" onClick={saveEdit} aria-label="Save"><Save size={18} /></button>
          <button className="planner-icon-danger" onClick={cancelEdit} aria-label="Cancel"><X size={18} /></button>
        </div>
      </article>
    )
  }

  const deadlineType = getEventDeadlineType(event)
  return (
    <article key={eventKey} className={`planner-event-card ${isDone ? 'done' : ''}`}>
      <div className="planner-event-main">
        <div className="planner-event-meta">
          <span className="planner-event-course">{event.courseCode || 'Unassigned'}</span>
          <span>{formatDeadlineType(deadlineType)}</span>
        </div>
        <h3>{event.title}</h3>
        <p>{event.date}{event.time ? ` at ${event.time}` : ''} &middot; {formatCountdown(event.date)}</p>
      </div>
      <div className="planner-event-actions">
        <button className="planner-check" onClick={() => onToggle(event)} aria-label={isDone ? 'Mark incomplete' : 'Mark done'}>
          {isDone ? <CheckCircle2 size={22} /> : <Circle size={22} />}
        </button>
        <button className="planner-icon-button" onClick={startEdit} aria-label="Edit"><Pencil size={16} /></button>
        <button className="planner-icon-danger" onClick={() => onRemove(event)} aria-label="Delete"><Trash2 size={16} /></button>
      </div>
    </article>
  )
}
