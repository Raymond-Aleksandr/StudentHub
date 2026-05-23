import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { Check, Pencil, Trash2, X } from 'lucide-react'
import type { CalendarEvent, DraftEvent } from '../domain/types'
import { formatCountdown, formatDeadlineType, getEventDeadlineType } from '../domain/deadlines'

interface EventCardProps {
  event: CalendarEvent
  onToggle: (event: CalendarEvent) => void
  onRemove: (event: CalendarEvent) => void
  onUpdate: (event: CalendarEvent, draft: DraftEvent) => void
}

interface EventEditModalProps {
  event?: CalendarEvent
  initialDraft?: DraftEvent
  title?: string
  onClose: () => void
  onSave: (draft: DraftEvent) => void
  onDelete?: () => void
}

const courseTags = [
  'var(--tag-ochre)',
  'var(--tag-plum)',
  'var(--tag-slate)',
  'var(--tag-sage)',
  'var(--tag-teal)',
]

function getCourseTag(courseCode: string) {
  const normalized = courseCode.replace(/\s+/g, '').toUpperCase()
  let hash = 0
  for (const char of normalized) hash += char.charCodeAt(0)
  return courseTags[hash % courseTags.length]
}

export function EventCard({ event, onToggle, onRemove, onUpdate }: EventCardProps) {
  const [editing, setEditing] = useState(false)
  const deadlineType = getEventDeadlineType(event)
  const isDone = Boolean(event.completed)
  const isHeavy = event.priority === 'high'
  const hasTime = Boolean(event.time)

  return (
    <>
      <article className={`task-row ${isDone ? 'done' : ''}`} style={{ '--tag': getCourseTag(event.courseCode) } as CSSProperties}>
        <button className="task-check" onClick={() => onToggle(event)} aria-label={isDone ? 'Mark incomplete' : 'Mark complete'} />
        <button className="task-body task-body-button" onClick={() => setEditing(true)} aria-label={`Edit ${event.title}`}>
          <div className="task-meta-row">
            <span className={`tag ${isHeavy ? 'heavy' : ''}`} style={{ '--tag': getCourseTag(event.courseCode) } as CSSProperties}>{event.courseCode || 'Unassigned'}</span>
            <span className="sep">·</span>
            <span className="type">{formatDeadlineType(deadlineType)}</span>
          </div>
          <div className="name">{event.title}</div>
        </button>
        <div className={`task-when ${formatCountdown(event.date) === 'Today!' ? 'urgent' : ''}`}>
          <span className="when-day">{formatCountdown(event.date)}</span>
          {hasTime && <span className="when-time">{event.time}</span>}
        </div>
        <div className="task-actions">
          <button onClick={() => setEditing(true)} aria-label="Edit"><Pencil size={14} /></button>
          <button className="del" onClick={() => onRemove(event)} aria-label="Delete"><Trash2 size={14} /></button>
        </div>
      </article>

      {editing && (
        <EventEditModal
          event={event}
          title="Edit item"
          onClose={() => setEditing(false)}
          onSave={(draft) => { onUpdate(event, draft); setEditing(false) }}
          onDelete={() => { onRemove(event); setEditing(false) }}
        />
      )}
    </>
  )
}

export function EventEditModal({ event, initialDraft, title = 'Edit item', onClose, onSave, onDelete }: EventEditModalProps) {
  const [draft, setDraft] = useState<DraftEvent>(() => initialDraft ?? {
    title: event?.title ?? '',
    courseCode: event?.courseCode ?? '',
    date: event?.date ?? new Date().toISOString().slice(0, 10),
    time: event?.time ?? '23:59',
    deadlineType: event ? getEventDeadlineType(event) : 'assignment',
  })

  useEffect(() => {
    const onKey = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const saveEdit = () => {
    if (!draft.title.trim() || !draft.date) return
    onSave(draft)
  }

  return (
    <div className="modal-backdrop" onClick={(clickEvent) => { if (clickEvent.target === clickEvent.currentTarget) onClose() }}>
      <div className="modal event-modal" role="dialog" aria-label={title}>
        <div className="modal-head">
          <div>
            <span className="eyebrow" style={{ color: getCourseTag(draft.courseCode) }}>{draft.courseCode || 'Unassigned'} · {formatDeadlineType(draft.deadlineType)}</span>
          </div>
          <button className="tp-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="modal-body">
          <input className="modal-title-input" value={draft.title} onChange={(inputEvent) => setDraft({ ...draft, title: inputEvent.target.value })} placeholder="What needs doing?" autoFocus />
          <section className="modal-section">
            <label className="modal-section-label">When</label>
            <div className="modal-row">
              <div className="modal-input-wrap">
                <span className="modal-input-tag mono">Date</span>
                <input className="modal-input center" type="date" value={draft.date} onChange={(inputEvent) => setDraft({ ...draft, date: inputEvent.target.value })} />
              </div>
              <div className="modal-input-wrap">
                <span className="modal-input-tag mono">Time</span>
                <input className="modal-input center" type="time" value={draft.time} onChange={(inputEvent) => setDraft({ ...draft, time: inputEvent.target.value })} />
              </div>
            </div>
          </section>
          <section className="modal-section">
            <label className="modal-section-label">Details</label>
            <div className="modal-input-wrap">
              <span className="modal-input-tag mono">Course</span>
              <input className="modal-input" value={draft.courseCode} onChange={(inputEvent) => setDraft({ ...draft, courseCode: inputEvent.target.value.toUpperCase() })} placeholder="Course code" />
            </div>
            <div className="modal-input-wrap">
              <span className="modal-input-tag mono">Type</span>
              <select className="modal-input" value={draft.deadlineType} onChange={(inputEvent) => setDraft({ ...draft, deadlineType: inputEvent.target.value as DraftEvent['deadlineType'] })}>
                {['assignment', 'quiz', 'test', 'exam', 'presentation', 'project', 'lab-report', 'other'].map((type) => <option key={type} value={type}>{formatDeadlineType(type as DraftEvent['deadlineType'])}</option>)}
              </select>
            </div>
          </section>
        </div>
        <div className={onDelete ? 'modal-foot three' : 'modal-foot'}>
          {onDelete && <button className="modal-btn-delete" onClick={onDelete} aria-label="Delete"><Trash2 size={16} /></button>}
          <button className="modal-btn modal-btn-cancel" onClick={onClose}><X size={16} />Cancel</button>
          <button className="modal-btn modal-btn-save" onClick={saveEdit} disabled={!draft.title.trim()}><Check size={16} />Save</button>
        </div>
      </div>
    </div>
  )
}
