import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Bell, BellOff, Check, Pencil, Trash2, X } from 'lucide-react'
import type { CalendarEvent, DraftEvent } from '../domain/types'
import { formatCountdown, formatDeadlineType, getEventDeadlineType } from '../domain/deadlines'
import { normalizeDurationMinutes, normalizeWeight, tagForEventCourse } from '../domain/courseMeta'
import { defaultReminderDaysBefore } from '../domain/notifications'
import { usePlanner } from '../data/usePlanner'
import { useModalBodyLock } from './useModalBodyLock'
import { isNativeRuntime } from '../native/runtime'

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

export function EventCard({ event, onToggle, onRemove, onUpdate }: EventCardProps) {
  const { classes } = usePlanner()
  const [editing, setEditing] = useState(false)
  const deadlineType = getEventDeadlineType(event)
  const isDone = Boolean(event.completed)
  const isHeavy = event.priority === 'high' || (event.weight ?? 0) >= 8
  const hasTime = Boolean(event.time)
  const tag = tagForEventCourse(classes, event.courseCode)

  return (
    <>
      <article className={`task-row ${isDone ? 'done' : ''}`} style={{ '--tag': tag } as CSSProperties}>
        <button className="task-check" onClick={() => onToggle(event)} aria-label={isDone ? 'Mark incomplete' : 'Mark complete'} />
        <button className="task-body task-body-button" onClick={() => setEditing(true)} aria-label={`Edit ${event.title}`}>
          <div className="task-meta-row">
            <span className={`tag ${isHeavy ? 'heavy' : ''}`} style={{ '--tag': tag } as CSSProperties}>{event.courseCode || 'Unassigned'}</span>
            <span className="sep">·</span>
            <span className="type">{formatDeadlineType(deadlineType)}</span>
            {event.weight !== null && event.weight !== undefined && <span className="task-weight-pill mono">{event.weight}% term</span>}
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
  const { classes } = usePlanner()
  const nativeRuntime = isNativeRuntime()
  const [draft, setDraft] = useState<DraftEvent>(() => initialDraft ?? {
    title: event?.title ?? '',
    courseCode: event?.courseCode ?? '',
    date: event?.date ?? new Date().toISOString().slice(0, 10),
    time: event?.time ?? '23:59',
    durationMinutes: event?.durationMinutes ?? (event?.type === 'exam' ? 120 : null),
    weight: event?.weight ?? (event?.type === 'exam' ? 10 : 3),
    score: event?.score ?? null,
    location: event?.location ?? '',
    format: event?.format ?? '',
    deadlineType: event ? getEventDeadlineType(event) : 'assignment',
    reminderEnabled: event?.reminderEnabled ?? true,
    reminderDaysBefore: event?.reminderDaysBefore ?? defaultReminderDaysBefore(event?.type ?? 'assignment'),
  })
  const isExam = draft.deadlineType === 'exam' || draft.deadlineType === 'test' || draft.deadlineType === 'quiz'
  useModalBodyLock()

  const setDeadlineType = (deadlineType: DraftEvent['deadlineType']) => {
    const nextIsExam = deadlineType === 'exam' || deadlineType === 'test' || deadlineType === 'quiz'
    const previousDefault = defaultReminderDaysBefore(isExam ? 'exam' : 'assignment')
    setDraft({
      ...draft,
      deadlineType,
      reminderDaysBefore: draft.reminderDaysBefore === previousDefault
        ? defaultReminderDaysBefore(nextIsExam ? 'exam' : 'assignment')
        : draft.reminderDaysBefore,
    })
  }

  useEffect(() => {
    const onKey = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const saveEdit = () => {
    if (!draft.title.trim()) return
    onSave(draft)
  }

  const modal = (
    <div className="modal-backdrop" onClick={(clickEvent) => { if (clickEvent.target === clickEvent.currentTarget) onClose() }}>
      <div className="modal event-modal" role="dialog" aria-label={title}>
        <div className="modal-head">
          <div>
            <span className="eyebrow" style={{ color: tagForEventCourse(classes, draft.courseCode) }}>{draft.courseCode || 'Unassigned'} · {formatDeadlineType(draft.deadlineType)}</span>
          </div>
          <button className="tp-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="modal-body">
          <input className="modal-title-input" value={draft.title} onChange={(inputEvent) => setDraft({ ...draft, title: inputEvent.target.value })} placeholder="What needs doing?" />
          <section className="modal-section">
            <label className="modal-section-label">When</label>
            <div className={`modal-row ${isExam ? 'three' : ''}`}>
              <div className="modal-input-wrap">
                <span className="modal-input-tag mono">Date</span>
                <StableDateTimeInput
                  className="modal-input center native-safe-input"
                  kind="date"
                  nativeRuntime={nativeRuntime}
                  value={draft.date}
                  onChange={(value) => setDraft({ ...draft, date: value })}
                />
              </div>
              <div className="modal-input-wrap">
                <span className="modal-input-tag mono">{isExam ? 'Start' : 'Due'}</span>
                <StableDateTimeInput
                  className="modal-input center native-safe-input"
                  kind="time"
                  nativeRuntime={nativeRuntime}
                  value={draft.time}
                  onChange={(value) => setDraft({ ...draft, time: value })}
                />
              </div>
              {isExam && (
                <div className="modal-input-wrap">
                  <span className="modal-input-tag mono">Duration</span>
                  <input
                    className="modal-input center"
                    type="number"
                    min="15"
                    max="360"
                    step="15"
                    value={draft.durationMinutes ?? 120}
                    onChange={(inputEvent) => setDraft({ ...draft, durationMinutes: normalizeDurationMinutes(inputEvent.target.value) ?? 120 })}
                    placeholder="120"
                  />
                </div>
              )}
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
              <select className="modal-input" value={draft.deadlineType} onChange={(inputEvent) => setDeadlineType(inputEvent.target.value as DraftEvent['deadlineType'])}>
                {['assignment', 'quiz', 'test', 'exam', 'presentation', 'project', 'lab-report', 'other'].map((type) => <option key={type} value={type}>{formatDeadlineType(type as DraftEvent['deadlineType'])}</option>)}
              </select>
            </div>
            {isExam && (
              <>
                <div className="modal-input-wrap">
                  <span className="modal-input-tag mono">Format</span>
                  <input className="modal-input" value={draft.format} onChange={(inputEvent) => setDraft({ ...draft, format: inputEvent.target.value })} placeholder="e.g. Closed-book, 90 min" />
                </div>
                <div className="modal-input-wrap">
                  <span className="modal-input-tag mono">Where</span>
                  <input className="modal-input" value={draft.location} onChange={(inputEvent) => setDraft({ ...draft, location: inputEvent.target.value })} placeholder="Room or location" />
                </div>
              </>
            )}
          </section>
          <section className="modal-section">
            <label className="modal-section-label">Reminder</label>
            <button
              className={`reminder-toggle ${draft.reminderEnabled ? 'on' : ''}`}
              type="button"
              onClick={() => setDraft({ ...draft, reminderEnabled: !draft.reminderEnabled })}
              aria-pressed={draft.reminderEnabled}
            >
              <span className="reminder-toggle-icon">{draft.reminderEnabled ? <Bell size={16} /> : <BellOff size={16} />}</span>
              <span>
                <b>{draft.reminderEnabled ? 'Notification on' : 'Notification off'}</b>
                <small>{draft.reminderEnabled ? 'Local reminder will be scheduled if permission is granted.' : 'This item will not trigger a local notification.'}</small>
              </span>
            </button>
            {draft.reminderEnabled && (
              <div className="modal-input-wrap">
                <span className="modal-input-tag mono">Days before</span>
                <input
                  className="modal-input center"
                  type="number"
                  min="0"
                  max="30"
                  step="1"
                  value={draft.reminderDaysBefore}
                  onChange={(inputEvent) => setDraft({ ...draft, reminderDaysBefore: Math.max(0, Math.min(30, Number(inputEvent.target.value) || 0)) })}
                />
              </div>
            )}
          </section>
          <section className="modal-section">
            <label className="modal-section-label">Grading</label>
            <div className="modal-slider-row">
              <span className="modal-slider-label">Weight</span>
              <input
                className="modal-slider"
                type="range"
                min={0}
                max={isExam ? 60 : 30}
                step={isExam ? 1 : 0.5}
                value={draft.weight ?? 0}
                onChange={(inputEvent) => setDraft({ ...draft, weight: normalizeWeight(inputEvent.target.value) })}
              />
              <span className="modal-slider-val">{draft.weight ?? 0}{isExam ? '%' : '%'}</span>
            </div>
            <div className="modal-input-wrap">
              <span className="modal-input-tag mono">Score</span>
              <input
                className="modal-input"
                type="number"
                min="0"
                max="100"
                value={draft.score ?? ''}
                onChange={(inputEvent) => setDraft({ ...draft, score: inputEvent.target.value === '' ? null : Number(inputEvent.target.value) })}
                placeholder="Earned score (%)"
              />
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

  return createPortal(modal, document.body)
}

function StableDateTimeInput({
  className,
  kind,
  nativeRuntime,
  value,
  onChange,
}: {
  className: string
  kind: 'date' | 'time'
  nativeRuntime: boolean
  value: string
  onChange: (value: string) => void
}) {
  if (!nativeRuntime) {
    return (
      <input
        className={className}
        type={kind}
        value={value}
        onChange={(inputEvent) => onChange(inputEvent.target.value)}
      />
    )
  }

  return (
    <div className={`${className} native-picker-shell`}>
      <span className="native-picker-value">{value || (kind === 'date' ? 'YYYY-MM-DD' : 'HH:MM')}</span>
      <input
        className="native-picker-control"
        type={kind}
        value={value}
        onChange={(inputEvent) => onChange(inputEvent.target.value)}
        aria-label={kind === 'date' ? 'Date' : 'Time'}
      />
    </div>
  )
}
