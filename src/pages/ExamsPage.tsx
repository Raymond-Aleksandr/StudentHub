import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, Clock, FileUp, MapPin, Pencil, Plus } from 'lucide-react'
import { usePlanner } from '../data/usePlanner'
import { getDaysUntil } from '../domain/deadlines'
import { EventEditModal } from '../components/EventCard'
import type { CalendarEvent, DraftEvent } from '../domain/types'

const tagVars = ['var(--tag-ochre)', 'var(--tag-plum)', 'var(--tag-slate)', 'var(--tag-sage)', 'var(--tag-teal)']

function getTag(courseCode: string) {
  let hash = 0
  for (const char of courseCode.replace(/\s+/g, '')) hash += char.charCodeAt(0)
  return tagVars[hash % tagVars.length]
}

function dateTime(date: string, time: string) {
  return `${new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}${time ? ` · ${time}` : ''}`
}

export default function ExamsPage() {
  const navigate = useNavigate()
  const { examEvents, addDraftEvent, updateEvent, removeEvent } = usePlanner()
  const [editing, setEditing] = useState<CalendarEvent | 'new' | null>(null)
  const sorted = [...examEvents].filter((event) => !event.completed).sort((a, b) => getDaysUntil(a.date) - getDaysUntil(b.date))
  const next = sorted[0]
  const daysOut = next ? getDaysUntil(next.date) : 0
  const buckets = {
    'This week': sorted.filter((event) => getDaysUntil(event.date) <= 7),
    'In two weeks': sorted.filter((event) => getDaysUntil(event.date) > 7 && getDaysUntil(event.date) <= 14),
    Later: sorted.filter((event) => getDaysUntil(event.date) > 14),
  }

  return (
    <>
      {next ? (
        <section className="hero-exam card" style={{ '--tag': getTag(next.courseCode) } as CSSProperties}>
          <button className="hero-exam-edit" onClick={() => setEditing(next)} aria-label={`Edit ${next.title}`}>
            <Pencil size={16} />
          </button>
          <div className="hero-exam-left">
            <span className="tag-pill" style={{ '--tag': getTag(next.courseCode) } as CSSProperties}>{next.courseCode || 'EXAM'}</span>
            <div className="hero-exam-title serif">{next.title}</div>
            <div className="hero-exam-meta">
              <span><MapPin size={13} /> Location not set</span>
              <span><Clock size={13} /> {dateTime(next.date, next.time)}</span>
              <span className="mono">High weight</span>
            </div>
            <div className="hero-exam-format">{next.deadlineType === 'quiz' ? 'Short assessment' : 'Focused review recommended'}</div>
          </div>
          <div className="hero-exam-right">
            <span className="eyebrow">Time remaining</span>
            <div className="countdown serif">{Math.max(daysOut, 0)}<small>{daysOut === 1 ? 'day' : 'days'}</small></div>
            <div className="countdown-bar"><div style={{ width: `${Math.max(8, 100 - Math.max(daysOut, 0) * 5)}%` }} /></div>
          </div>
        </section>
      ) : (
        <section className="empty">
          <h3>No exams yet</h3>
          <p>Upload syllabi or add a quiz, test, or exam from Tasks.</p>
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

      {sorted.length ? (
        <section className="card card-tight">
          <div className="exam-timeline">
            <div className="et-track" />
            {sorted.map((event, index) => {
              const days = Math.max(getDaysUntil(event.date), 0)
              const pos = Math.min(96, Math.max(4, (days / 42) * 100))
              const above = index % 2 === 0
              const far = index % 4 > 1
              return (
                <div key={`${event.title}-${event.date}`} className={`et-mark ${above ? 'et-above' : 'et-below'} ${far ? 'et-far' : ''}`} style={{ left: `${pos}%`, '--tag': getTag(event.courseCode) } as CSSProperties}>
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
            <span className="eyebrow">Timeline is empty</span>
            <h3>Exams will appear here as soon as you add one.</h3>
            <p>Import a syllabus to extract assessment dates, or add a test manually.</p>
          </div>
          <div className="exam-empty-actions">
            <button className="btn btn-accent" onClick={() => setEditing('new')}><Plus size={15} /> Add exam</button>
            <button className="btn btn-ghost" onClick={() => navigate('/import')}><FileUp size={15} /> Import</button>
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
              return (
                <article key={`${event.title}-${event.date}`} className="exam-card card" style={{ '--tag': getTag(event.courseCode) } as CSSProperties}>
                  <div className="ec-top">
                    <span className="tag-pill" style={{ '--tag': getTag(event.courseCode) } as CSSProperties}>{event.courseCode || 'EXAM'}</span>
                    <button className="exam-edit-btn" onClick={() => setEditing(event)} aria-label={`Edit ${event.title}`}>
                      <Pencil size={14} />
                    </button>
                    <span className={`mono ec-days ${days <= 7 ? 'soon' : ''}`}>{days}d</span>
                  </div>
                  <button className="exam-card-title" onClick={() => setEditing(event)}>
                    <h3 className="serif">{event.title}</h3>
                  </button>
                  <div className="ec-date mono">{dateTime(event.date, event.time)}</div>
                  <div className="ec-foot">
                    <span><MapPin size={12} /> Location not set</span>
                    <span className="mono">{event.deadlineType}</span>
                  </div>
                </article>
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
    deadlineType: 'exam',
  }
}
