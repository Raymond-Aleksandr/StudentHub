import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { usePlanner } from '../data/usePlanner'
import { EventCard } from '../components/EventCard'
import { CALENDAR_WEEKDAYS, buildCalendarDays, formatMonthLabel, formatSelectedDate, getLocalDateId, parseDateId } from '../domain/calendar'
import { sortEventsByDate } from '../domain/deadlines'

export default function CalendarPage() {
  const { events, toggleComplete, removeEvent, updateEvent } = usePlanner()
  const navigate = useNavigate()
  const todayId = getLocalDateId(new Date())
  const [selectedDate, setSelectedDate] = useState(todayId)
  const [calendarMonth, setCalendarMonth] = useState(() => new Date())

  const calendarDays = useMemo(() => buildCalendarDays(calendarMonth, selectedDate, events), [calendarMonth, selectedDate, events])
  const selectedDateEvents = useMemo(() => sortEventsByDate(events.filter((e) => e.date === selectedDate)), [events, selectedDate])

  const moveMonth = (offset: number) => {
    setCalendarMonth((cur) => new Date(cur.getFullYear(), cur.getMonth() + offset, 1))
  }

  const jumpToToday = () => {
    const today = new Date()
    setSelectedDate(getLocalDateId(today))
    setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1))
  }

  return (
    <section className="planner-section planner-task-board">
      <section className="planner-calendar" aria-label="Calendar">
        <div className="planner-calendar-head">
          <div>
            <span><CalendarDays size={14} /> Calendar</span>
            <h2>{formatMonthLabel(calendarMonth)}</h2>
          </div>
          <div className="planner-calendar-actions">
            <button className="planner-icon-button" onClick={() => moveMonth(-1)} aria-label="Previous month"><ChevronLeft size={18} /></button>
            <button className="planner-calendar-today" onClick={jumpToToday}>Today</button>
            <button className="planner-icon-button" onClick={() => moveMonth(1)} aria-label="Next month"><ChevronRight size={18} /></button>
          </div>
        </div>
        <div className="planner-calendar-weekdays" aria-hidden="true">
          {CALENDAR_WEEKDAYS.map((d) => <span key={d}>{d}</span>)}
        </div>
        <div className="planner-calendar-grid">
          {calendarDays.map((day) => (
            <button
              key={day.date}
              className={['planner-calendar-day', day.isCurrentMonth ? '' : 'muted', day.isToday ? 'today' : '', day.isSelected ? 'selected' : '', day.hasOpen ? 'has-open' : ''].filter(Boolean).join(' ')}
              onClick={() => {
                setSelectedDate(day.date)
                if (!day.isCurrentMonth) {
                  const next = parseDateId(day.date)
                  setCalendarMonth(new Date(next.getFullYear(), next.getMonth(), 1))
                }
              }}
              type="button"
              aria-label={`${day.date}${day.eventCount ? `, ${day.eventCount} event${day.eventCount === 1 ? '' : 's'}` : ''}`}
            >
              <span>{day.dayNumber}</span>
              {day.eventCount > 0 && <strong className={day.hasExam ? 'exam' : ''}>{day.eventCount}</strong>}
            </button>
          ))}
        </div>
      </section>

      <div className="planner-list-head">
        <div><span>Selected day</span><h2>{formatSelectedDate(selectedDate)}</h2></div>
        <p>{selectedDateEvents.length ? `${selectedDateEvents.length} item${selectedDateEvents.length === 1 ? '' : 's'}` : 'No items'}</p>
      </div>
      {selectedDateEvents.length ? selectedDateEvents.map((e) => (
        <EventCard key={`${e.title}-${e.date}-${e.time}-${e.sourceUploadId}`} event={e} onToggle={toggleComplete} onRemove={removeEvent} onUpdate={updateEvent} />
      )) : (
        <div className="planner-empty">
          <strong>No items on this day</strong>
          <span>Select another date or add a deadline from Tasks.</span>
        </div>
      )}
      <button className="planner-secondary" onClick={() => navigate('/tasks')}>Back to tasks</button>
    </section>
  )
}
