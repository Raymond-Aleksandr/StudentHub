import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { usePlanner } from '../data/usePlanner'
import { CALENDAR_WEEKDAYS, buildCalendarDays, formatMonthLabel, formatSelectedDate, getLocalDateId, parseDateId } from '../domain/calendar'
import { deadlineTypeToEventType, getEventDeadlineType } from '../domain/deadlines'
import { sortEventsByDate } from '../domain/deadlines'
import { EventEditModal } from '../components/EventCard'
import type { CalendarEvent } from '../domain/types'

const tagVars = ['var(--tag-ochre)', 'var(--tag-plum)', 'var(--tag-slate)', 'var(--tag-sage)', 'var(--tag-teal)']

function tagFor(courseCode: string) {
  let hash = 0
  for (const char of courseCode.replace(/\s+/g, '')) hash += char.charCodeAt(0)
  return tagVars[hash % tagVars.length]
}

export default function CalendarPage() {
  const { events, updateEvent, removeEvent } = usePlanner()
  const todayId = getLocalDateId(new Date())
  const [selectedDate, setSelectedDate] = useState(todayId)
  const [calendarMonth, setCalendarMonth] = useState(() => new Date())
  const [editing, setEditing] = useState<CalendarEvent | null>(null)
  const calendarDays = useMemo(() => buildCalendarDays(calendarMonth, selectedDate, events), [calendarMonth, selectedDate, events])
  const selectedDateEvents = useMemo(() => sortEventsByDate(events.filter((event) => event.date === selectedDate)), [events, selectedDate])

  const moveMonth = (offset: number) => {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  const jumpToToday = () => {
    const today = new Date()
    setSelectedDate(getLocalDateId(today))
    setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1))
  }

  return (
    <>
      <div className="cal-head">
        <h2 className="serif">{formatMonthLabel(calendarMonth)}</h2>
        <div className="cal-legend mono">
          <span><span className="ld task" />Task</span>
          <span><span className="ld exam" />Exam</span>
          <span><span className="ld today" />Today</span>
        </div>
      </div>

      <div className="cal-wrap">
        <section className="cal-grid">
          <div className="cal-dow">
            {CALENDAR_WEEKDAYS.map((day) => <span key={day} className="mono">{day.toUpperCase()}</span>)}
          </div>
          <div className="cal-cells">
            {calendarDays.map((day, index) => {
              const dayEvents = events.filter((event) => event.date === day.date)
              return (
                <button
                  key={`${day.date}-${index}`}
                  className={`cal-cell ${day.isCurrentMonth ? '' : 'out'} ${day.isToday ? 'today' : ''} ${day.isSelected ? 'sel' : ''}`}
                  onClick={() => {
                    setSelectedDate(day.date)
                    if (!day.isCurrentMonth) {
                      const next = parseDateId(day.date)
                      setCalendarMonth(new Date(next.getFullYear(), next.getMonth(), 1))
                    }
                  }}
                >
                  <span className="cal-num serif">{day.isCurrentMonth ? day.dayNumber : ''}</span>
                  <div className="cal-pips">
                    {dayEvents.slice(0, 3).map((event, pipIndex) => {
                      const isExam = deadlineTypeToEventType(getEventDeadlineType(event)) === 'exam'
                      return <span key={`${event.title}-${pipIndex}`} className={`pip ${isExam ? 'exam' : 'task'}`} style={{ background: isExam ? 'var(--accent)' : tagFor(event.courseCode) }} />
                    })}
                    {dayEvents.length > 3 && <span className="pip-more mono">+{dayEvents.length - 3}</span>}
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        <aside className="cal-detail">
          <div className="cd-head">
            <span className="eyebrow">{selectedDate === todayId ? 'Today' : 'Selected day'}</span>
            <h3 className="serif">{formatSelectedDate(selectedDate)}</h3>
            <span className="mono cd-count">{selectedDateEvents.length} item{selectedDateEvents.length === 1 ? '' : 's'}</span>
          </div>
          <div className="cd-list">
            {selectedDateEvents.length ? selectedDateEvents.map((event) => {
              const isExam = deadlineTypeToEventType(getEventDeadlineType(event)) === 'exam'
              return (
                <button key={`${event.title}-${event.date}-${event.time}-${event.sourceUploadId}`} className="cd-item" onClick={() => setEditing(event)}>
                  <span className="cd-pill" style={{ '--tag': isExam ? 'var(--accent)' : tagFor(event.courseCode) } as CSSProperties}>{isExam ? 'EXAM' : event.courseCode || 'TASK'}</span>
                  <div className="cd-body">
                    <div className="cd-title">{event.title}</div>
                    <div className="cd-meta mono">{event.time || '23:59'} · {event.courseCode || 'Unassigned'} {getEventDeadlineType(event)}</div>
                  </div>
                </button>
              )
            }) : (
              <div className="empty" style={{ padding: '24px 16px' }}>
                <p style={{ fontSize: 13 }}>No tasks or exams.</p>
              </div>
            )}
          </div>
        </aside>
      </div>

      <div className="cal-nav" style={{ marginTop: 16 }}>
        <button onClick={() => moveMonth(-1)} aria-label="Previous month"><ChevronLeft size={16} /></button>
        <button onClick={jumpToToday}>Today</button>
        <button onClick={() => moveMonth(1)} aria-label="Next month"><ChevronRight size={16} /></button>
      </div>

      {editing && (
        <EventEditModal
          event={editing}
          title="Edit calendar item"
          onClose={() => setEditing(null)}
          onSave={(draft) => { void updateEvent(editing, draft); setEditing(null) }}
          onDelete={() => { void removeEvent(editing); setEditing(null) }}
        />
      )}
    </>
  )
}
