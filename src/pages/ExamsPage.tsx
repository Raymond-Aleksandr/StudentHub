import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, Clock, FileUp, Pencil, Plus } from 'lucide-react'
import { usePlanner } from '../data/usePlanner'
import { formatDeadlineType, getDaysUntil } from '../domain/deadlines'
import { EventEditModal } from '../components/EventCard'
import type { CalendarEvent, DraftEvent } from '../domain/types'
import { tagForEventCourse } from '../domain/courseMeta'

function dateTime(date: string, time: string) {
  if (!date) return time ? `TBD · ${time}` : 'TBD'
  return `${new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}${time ? ` · ${time}` : ''}`
}

function durationLabel(minutes: number | null) {
  if (!minutes) return ''
  if (minutes % 60 === 0) return `${minutes / 60}h`
  if (minutes > 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
  return `${minutes}m`
}

function daysLabel(date: string) {
  if (!date) return 'TBD'
  const days = getDaysUntil(date)
  if (days < 0) return days === -1 ? 'Yesterday' : `${Math.abs(days)}d ago`
  return `${Math.max(days, 0)}d`
}

function examLabel(event: Pick<CalendarEvent, 'deadlineType'>) {
  return formatDeadlineType(event.deadlineType)
}

function examCardTitle(event: Pick<CalendarEvent, 'title' | 'deadlineType'>) {
  const label = examLabel(event)
  const title = event.title.trim()
  return title && title.toLowerCase() !== label.toLowerCase() ? title : label
}

export default function ExamsPage() {
  const navigate = useNavigate()
  const { classes, examEvents, addDraftEvent, updateEvent, removeEvent } = usePlanner()
  const [editing, setEditing] = useState<CalendarEvent | 'new' | null>(null)
  const sorted = [...examEvents].filter((event) => !event.completed).sort((a, b) => getDaysUntil(a.date) - getDaysUntil(b.date))
  const overdueExams = sorted.filter((event) => event.date && getDaysUntil(event.date) < 0)
  const upcomingExams = sorted.filter((event) => !event.date || getDaysUntil(event.date) >= 0)
  const timelineEvents = sorted.filter((event) => event.date && getDaysUntil(event.date) >= 0)
  const undatedExams = sorted.filter((event) => !event.date)
  const hasUndatedExams = undatedExams.length > 0
  const hasOverdueOnly = sorted.length > 0 && timelineEvents.length === 0 && overdueExams.length > 0 && !hasUndatedExams
  const next = upcomingExams[0]
  const daysOut = next ? getDaysUntil(next.date) : 0
  const hasDate = next ? Number.isFinite(daysOut) : false
  const nextTitle = next ? examCardTitle(next) : ''
  const buckets = {
    Overdue: overdueExams,
    'This week': sorted.filter((event) => event.date && getDaysUntil(event.date) >= 0 && getDaysUntil(event.date) <= 7),
    'In two weeks': sorted.filter((event) => event.date && getDaysUntil(event.date) > 7 && getDaysUntil(event.date) <= 14),
    Later: sorted.filter((event) => event.date && getDaysUntil(event.date) > 14),
    'Date needed': undatedExams,
  }

  return (
    <>
      {next ? (
        <section className="hero-exam card" style={{ '--tag': tagForEventCourse(classes, next.courseCode) } as CSSProperties}>
          <button className="hero-exam-edit" onClick={() => setEditing(next)} aria-label={`Edit ${nextTitle}`}>
            <Pencil size={16} />
          </button>
          <div className="hero-exam-left">
            <div className="hero-exam-kicker">
              <span className="exam-code">{next.courseCode || 'Unassigned'}</span>
            </div>
            <div className="hero-exam-title serif">{nextTitle}</div>
            <div className="hero-exam-meta">
              <span><Clock size={13} /> {dateTime(next.date, next.time)}</span>
              {next.durationMinutes && <span className="mono">{durationLabel(next.durationMinutes)}</span>}
              <span className="mono">{next.weight ? `${next.weight}% term` : hasDate && daysOut <= 7 ? 'This week' : hasDate ? 'Scheduled' : 'Date needed'}</span>
              {next.format && <span className="mono">{next.format}</span>}
            </div>
          </div>
          <div className="hero-exam-right">
            <span className="eyebrow">Time remaining</span>
            <div className="countdown serif">{hasDate ? Math.max(daysOut, 0) : 'TBD'}{hasDate && <small>{daysOut === 1 ? 'day' : 'days'}</small>}</div>
            <div className="countdown-bar"><div style={{ width: `${hasDate ? Math.max(8, 100 - Math.max(daysOut, 0) * 5) : 18}%` }} /></div>
          </div>
        </section>
      ) : (
        <section className="empty">
          <h3>{sorted.length ? 'No upcoming exams' : 'No exams yet'}</h3>
          <p>{sorted.length ? 'Overdue exams stay in the list below.' : 'Upload syllabi or add a quiz, test, or exam from Tasks.'}</p>
        </section>
      )}

      <div className="sec-head">
        <div>
          <span className="eyebrow">Term timeline</span>
          <h2>Tests at a glance</h2>
        </div>
        <button className="btn btn-accent" style={{ height: 38, padding: '0 14px', fontSize: 13 }} onClick={() => setEditing('new')}>
          <Plus size={14} /> New
        </button>
      </div>

      {timelineEvents.length ? (
        <section className="card card-tight">
          <div className="exam-timeline">
            <div className="et-track" />
            {timelineEvents.map((event, index) => {
              const days = Math.max(getDaysUntil(event.date), 0)
              const pos = Math.min(96, Math.max(4, (days / 42) * 100))
              const above = index % 2 === 0
              const far = index % 4 > 1
              return (
                <div key={`${event.title}-${event.date}`} className={`et-mark ${above ? 'et-above' : 'et-below'} ${far ? 'et-far' : ''}`} style={{ left: `${pos}%`, '--tag': tagForEventCourse(classes, event.courseCode) } as CSSProperties}>
                  <span className="et-stem" />
                  <span className="et-dot" />
                  <div className="et-label">
                    <span className="et-code mono">{(event.courseCode || 'EXAM').replace(/\s+/g, '')}</span>
                    <span className="et-days mono">{days}d</span>
                  </div>
                </div>
              )
            })}
            <div className="et-axis">
              <span className="mono" style={{ left: '0%' }}>Today</span>
              <span className="mono" style={{ left: '24%' }}>+10d</span>
              <span className="mono" style={{ left: '48%' }}>+20d</span>
              <span className="mono" style={{ left: '72%' }}>+30d</span>
              <span className="mono" style={{ left: 'calc(100% - 32px)' }}>+40d</span>
            </div>
          </div>
        </section>
      ) : (
        <section className="exam-empty-timeline card">
          <div className="exam-empty-art" aria-hidden="true">
            <div className="exam-empty-track">
              <span className="exam-empty-node active"><CalendarDays size={15} /></span>
              <span className="exam-empty-node" />
              <span className="exam-empty-node" />
            </div>
          </div>
          <div className="exam-empty-copy">
            <span className="eyebrow">{hasUndatedExams ? 'Date needed' : hasOverdueOnly ? 'No upcoming dates' : 'Timeline is empty'}</span>
            <h3>{hasUndatedExams ? 'Imported exams need official dates.' : hasOverdueOnly ? 'Overdue exams stay off the timeline.' : 'Exams will appear here as soon as you add one.'}</h3>
            <p>{hasUndatedExams ? 'Add the scheduled exam date to place it on the term timeline.' : hasOverdueOnly ? 'The timeline only shows today and future exam dates.' : 'Import a syllabus to extract assessment dates, or add a test manually.'}</p>
          </div>
          <div className="exam-empty-actions">
            {hasUndatedExams ? (
              <button className="btn btn-accent" onClick={() => setEditing(undatedExams[0])}><Pencil size={15} /> Add date</button>
            ) : hasOverdueOnly ? (
              <button className="btn btn-accent" onClick={() => setEditing(overdueExams[0])}><Pencil size={15} /> Review exam</button>
            ) : (
              <>
                <button className="btn btn-accent" onClick={() => setEditing('new')}><Plus size={15} /> Add exam</button>
                <button className="btn btn-ghost" onClick={() => navigate('/import')}><FileUp size={15} /> Import</button>
              </>
            )}
          </div>
        </section>
      )}

      {Object.entries(buckets).map(([title, items]) => items.length ? (
        <section key={title}>
          <div className="sec-head">
            <div>
              <span className="eyebrow">{title}</span>
              <h2>{items.length} {items.length === 1 ? 'exam' : 'exams'}</h2>
            </div>
          </div>
          <div className="exam-grid">
            {items.map((event) => {
              const days = getDaysUntil(event.date)
              const titleText = examCardTitle(event)
              return (
                <button key={`${event.title}-${event.date}`} className="exam-card card" style={{ '--tag': tagForEventCourse(classes, event.courseCode) } as CSSProperties} onClick={() => setEditing(event)}>
                  <div className="ec-top">
                    <span className="tag-pill" style={{ '--tag': tagForEventCourse(classes, event.courseCode) } as CSSProperties}>{event.courseCode || 'EXAM'}</span>
                    <span className={`mono ec-days ${days >= 0 && days <= 7 ? 'soon' : ''}`}>{daysLabel(event.date)}</span>
                  </div>
                  <h3 className="serif">{titleText}</h3>
                  <div className="ec-date mono">{dateTime(event.date, event.time)}</div>
                  {event.durationMinutes && <div className="ec-date mono">{durationLabel(event.durationMinutes)}</div>}
                  {event.weight !== null && event.weight !== undefined && <div className="ec-weight mono">{event.weight}% term</div>}
                </button>
              )
            })}
          </div>
        </section>
      ) : null)}
      {editing && (
        <EventEditModal
          event={editing === 'new' ? undefined : editing}
          title={editing === 'new' ? 'New exam' : 'Edit exam'}
          initialDraft={editing === 'new' ? newExamDraft() : undefined}
          onClose={() => setEditing(null)}
          onSave={(draft) => {
            if (editing === 'new') void addDraftEvent(draft)
            else void updateEvent(editing, draft)
            setEditing(null)
          }}
          onDelete={editing !== 'new' ? () => { void removeEvent(editing); setEditing(null) } : undefined}
        />
      )}
    </>
  )
}

function newExamDraft(): DraftEvent {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  return {
    title: '',
    courseCode: '',
    date: date.toISOString().slice(0, 10),
    time: '09:00',
    durationMinutes: 120,
    weight: 10,
    score: null,
    location: '',
    format: '',
    deadlineType: 'exam',
    reminderEnabled: true,
    reminderDaysBefore: 7,
  }
}
