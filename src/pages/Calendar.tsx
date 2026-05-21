import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Plus, X } from 'lucide-react'
import { auth } from '../localAuth'
import { saveCalendarEvents, subscribeToCalendarEvents, subscribeToClasses, type StoredCalendarEvent, type StoredClassInfo } from '../storage'
import {
  DEADLINE_TYPES,
  DEADLINE_TYPE_COLORS,
  deadlineTypeToEventType,
  formatCountdown,
  formatDeadlineType,
  getDaysUntil,
  getStoredEventDeadlineType,
  getUrgencyClass,
  isSameCalendarEvent,
  type DeadlineType,
} from '../deadlines'
import './Calendar.css'

const Calendar: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [date, setDate] = useState(new Date())
  const [currentView, setCurrentView] = useState('month')
  const [events, setEvents] = useState<StoredCalendarEvent[]>([])
  const [classes, setClasses] = useState<StoredClassInfo[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<StoredCalendarEvent | null>(null)
  const [formError, setFormError] = useState('')
  const [formTitle, setFormTitle] = useState('')
  const [formCourseCode, setFormCourseCode] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formTime, setFormTime] = useState('')
  const [formPriority, setFormPriority] = useState<'high' | 'medium' | 'low'>('high')
  const [formDeadlineType, setFormDeadlineType] = useState<DeadlineType>('assignment')

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  useEffect(() => {
    const uid = auth.currentUser?.uid
    if (!uid) return
    return subscribeToCalendarEvents(uid, setEvents)
  }, [])

  useEffect(() => {
    const uid = auth.currentUser?.uid
    if (!uid) return
    return subscribeToClasses(uid, setClasses)
  }, [])

  const resetForm = useCallback((selectedDate = '', deadlineType: DeadlineType = 'assignment') => {
    setEditingEvent(null)
    setFormTitle('')
    setFormCourseCode('')
    setFormDate(selectedDate)
    setFormTime('')
    setFormPriority('high')
    setFormDeadlineType(deadlineType)
    setFormError('')
  }, [])

  const openComposerForDate = useCallback((selectedDate = '', deadlineType: DeadlineType = 'assignment') => {
    resetForm(selectedDate, deadlineType)
    setIsModalOpen(true)
  }, [resetForm])

  const openModalForEdit = useCallback((event: StoredCalendarEvent) => {
    setEditingEvent(event)
    setFormTitle(event.title)
    setFormCourseCode(event.courseCode ?? '')
    setFormDate(event.date)
    setFormTime(event.time)
    setFormPriority(event.priority)
    setFormDeadlineType(getStoredEventDeadlineType(event))
    setFormError('')
    setIsModalOpen(true)
  }, [])

  useEffect(() => {
    const pendingState = location.state as { editEvent?: StoredCalendarEvent; newDeadlineType?: DeadlineType } | null
    if (pendingState?.editEvent) {
      queueMicrotask(() => {
        openModalForEdit(pendingState.editEvent!)
        navigate(location.pathname, { replace: true, state: null })
      })
      return
    }

    if (pendingState?.newDeadlineType) {
      queueMicrotask(() => {
        openComposerForDate('', pendingState.newDeadlineType)
        navigate(location.pathname, { replace: true, state: null })
      })
    }
  }, [location.pathname, location.state, navigate, openComposerForDate, openModalForEdit])

  const handleSaveEvent = async () => {
    const uid = auth.currentUser?.uid
    if (!uid) return
    if (!formTitle.trim()) {
      setFormError('Please enter a deadline name.')
      return
    }
    if (!formDate) {
      setFormError('Please pick a date.')
      return
    }

    const nextEvent: StoredCalendarEvent = {
      title: formTitle.trim(),
      courseCode: formCourseCode.trim(),
      date: formDate,
      time: formTime,
      priority: formPriority,
      type: deadlineTypeToEventType(formDeadlineType),
      deadlineType: formDeadlineType,
      sourceUploadId: editingEvent?.sourceUploadId ?? '',
    }

    const nextEvents = editingEvent
      ? events.map((event) => isSameCalendarEvent(event, editingEvent) ? nextEvent : event)
      : [...events, nextEvent]

    setEvents(nextEvents)
    await saveCalendarEvents(uid, nextEvents)
    setIsModalOpen(false)
    resetForm()
  }

  const handleRemoveEvent = async (targetEvent: StoredCalendarEvent) => {
    const uid = auth.currentUser?.uid
    if (!uid) return

    const nextEvents = events.filter((event) => !isSameCalendarEvent(event, targetEvent))
    setEvents(nextEvents)
    await saveCalendarEvents(uid, nextEvents)

    if (editingEvent && isSameCalendarEvent(editingEvent, targetEvent)) {
      setIsModalOpen(false)
      resetForm()
    }
  }

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => new Date(`${a.date}T${a.time || '23:59'}`).getTime() - new Date(`${b.date}T${b.time || '23:59'}`).getTime())
  }, [events])

  const upcomingDeadlines = useMemo(() => sortedEvents.filter((event) => getDaysUntil(event.date) >= 0), [sortedEvents])
  const overdueDeadlines = useMemo(() => sortedEvents.filter((event) => getDaysUntil(event.date) < 0), [sortedEvents])

  const changeDate = (direction: number) => {
    const nextDate = new Date(date)
    if (currentView === 'month') nextDate.setMonth(date.getMonth() + direction)
    else {
      const offset = currentView === 'week' ? 7 : currentView === '3day' ? 3 : 1
      nextDate.setDate(date.getDate() + (direction * offset))
    }
    setDate(nextDate)
  }

  const formatEventLabel = (event: StoredCalendarEvent) => {
    const deadlineType = getStoredEventDeadlineType(event)
    const label = formatDeadlineType(deadlineType)
    return event.courseCode ? `${event.courseCode} - ${event.title}` : `${label}: ${event.title}`
  }

  const renderFormPanel = (mode: 'add' | 'edit') => {
    const previewUrgency = formDate ? getUrgencyClass(formDate) : 'calm'
    const previewTypeColor = DEADLINE_TYPE_COLORS[formDeadlineType]
    const previewLabel = formTitle.trim() || 'New deadline'
    const previewCourse = formCourseCode.trim() || 'General'
    const isEdit = mode === 'edit'

    if (!isEdit) {
      return (
        <>
          <div className="dl-modal-header">
            <h3>Add Upcoming Deadline</h3>
            <button className="dl-close" onClick={() => { setIsModalOpen(false); resetForm() }}>
              <X size={18} />
            </button>
          </div>

          <div className="dl-form">
            <div className="dl-field">
              <label>Course Name</label>
              <input
                type="text"
                list="calendar-course-codes"
                placeholder="e.g. COMP 1406"
                value={formCourseCode}
                onChange={(event) => setFormCourseCode(event.target.value)}
              />
            </div>

            <div className="dl-field">
              <label>Deadline Name</label>
              <input
                type="text"
                placeholder="e.g. Midterm Review Assignment"
                value={formTitle}
                onChange={(event) => setFormTitle(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && void handleSaveEvent()}
              />
            </div>

            <div className="dl-field">
              <label>Type</label>
              <div className="dl-type-grid">
                {DEADLINE_TYPES.map((deadlineType) => (
                  <button
                    key={deadlineType}
                    className={`dl-type-btn ${formDeadlineType === deadlineType ? 'active' : ''}`}
                    style={formDeadlineType === deadlineType ? {
                      background: `${DEADLINE_TYPE_COLORS[deadlineType]}22`,
                      borderColor: DEADLINE_TYPE_COLORS[deadlineType],
                      color: DEADLINE_TYPE_COLORS[deadlineType],
                    } : {}}
                    onClick={() => setFormDeadlineType(deadlineType)}
                  >
                    {formatDeadlineType(deadlineType)}
                  </button>
                ))}
              </div>
            </div>

            <div className="dl-field-group">
              <div className="dl-field">
                <label>Due Date</label>
                <input type="date" value={formDate} onChange={(event) => setFormDate(event.target.value)} />
              </div>
              <div className="dl-field">
                <label>Time</label>
                <input type="time" value={formTime} onChange={(event) => setFormTime(event.target.value)} />
              </div>
            </div>

            <div className="dl-field">
              <label>Priority</label>
              <div className="dl-type-grid dl-priority-grid">
                {(['high', 'medium', 'low'] as const).map((priority) => (
                  <button
                    key={priority}
                    className={`dl-type-btn ${formPriority === priority ? 'active' : ''}`}
                    style={formPriority === priority ? {
                      background: priority === 'high' ? 'rgba(227,28,61,0.14)' : priority === 'medium' ? 'rgba(245,158,11,0.14)' : 'rgba(16,185,129,0.14)',
                      borderColor: priority === 'high' ? '#E31C3D' : priority === 'medium' ? '#F59E0B' : '#10B981',
                      color: priority === 'high' ? '#fda4af' : priority === 'medium' ? '#fcd34d' : '#6ee7b7',
                    } : {}}
                    onClick={() => setFormPriority(priority)}
                  >
                    {priority[0].toUpperCase() + priority.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {formError ? <p className="dl-error">{formError}</p> : null}

            {(formCourseCode || formDate) ? (
              <div className={`dl-preview ${previewUrgency}`}>
                <span className="dl-preview-badge" style={{ background: previewTypeColor }}>
                  {formatDeadlineType(formDeadlineType)}
                </span>
                <div className="dl-preview-text">
                  <span className="dl-preview-course">{previewCourse}</span>
                  <span className="dl-preview-name">{previewLabel}</span>
                </div>
                <span className="dl-preview-days">{formDate ? formatCountdown(formDate) : 'Pick a date'}</span>
              </div>
            ) : null}

            <div className="dl-modal-footer-row">
              <button className="dl-submit" onClick={() => void handleSaveEvent()}>
                <Plus size={16} /> Add Deadline
              </button>
            </div>
          </div>
        </>
      )
    }

    return (
      <>
        <div className="calendar-composer-header">
          <div>
            <h4>Edit Deadline</h4>
            <p>Update the selected calendar item.</p>
          </div>
          <button className="calendar-composer-close" onClick={() => { setIsModalOpen(false); resetForm() }}>
            Close
          </button>
        </div>

        <div className="calendar-composer-form">
          <label className="calendar-composer-field">
            <span>Course Code</span>
            <input
              type="text"
              list="calendar-course-codes"
              placeholder="e.g. IRM3001"
              value={formCourseCode}
              onChange={(event) => setFormCourseCode(event.target.value)}
            />
          </label>

          <label className="calendar-composer-field">
            <span>Deadline Name</span>
            <input
              type="text"
              placeholder="e.g. Midterm Review Assignment"
              value={formTitle}
              onChange={(event) => setFormTitle(event.target.value)}
            />
          </label>

          <div className="calendar-composer-grid">
            <label className="calendar-composer-field">
              <span>Date</span>
              <input type="date" value={formDate} onChange={(event) => setFormDate(event.target.value)} />
            </label>

            <label className="calendar-composer-field">
              <span>Time</span>
              <input type="time" value={formTime} onChange={(event) => setFormTime(event.target.value)} />
            </label>
          </div>

          <label className="calendar-composer-field">
            <span>Deadline Type</span>
            <select value={formDeadlineType} onChange={(event) => setFormDeadlineType(event.target.value as DeadlineType)}>
              {DEADLINE_TYPES.map((deadlineType) => (
                <option key={deadlineType} value={deadlineType}>{formatDeadlineType(deadlineType)}</option>
              ))}
            </select>
          </label>

          <label className="calendar-composer-field">
            <span>Priority</span>
            <select value={formPriority} onChange={(event) => setFormPriority(event.target.value as 'high' | 'medium' | 'low')}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>

          <div className={`calendar-composer-preview ${previewUrgency}`}>
            <span className="calendar-composer-preview-badge" style={{ backgroundColor: previewTypeColor }}>
              {formatDeadlineType(formDeadlineType)}
            </span>
            <div className="calendar-composer-preview-text">
              <span className="calendar-composer-preview-course">{previewCourse}</span>
              <span className="calendar-composer-preview-name">{previewLabel}</span>
            </div>
            <span className="calendar-composer-preview-days">
              {formDate ? formatCountdown(formDate) : 'Pick a date'}
            </span>
          </div>

          {formError ? <p className="calendar-composer-error">{formError}</p> : null}

          <div className="calendar-composer-actions">
            <button className="delete-btn" onClick={() => editingEvent && void handleRemoveEvent(editingEvent)}>
              Delete
            </button>
            <button className="calendar-composer-submit" onClick={() => void handleSaveEvent()}>
              Update
            </button>
          </div>
        </div>
      </>
    )
  }

  const renderDeadlineCard = (event: StoredCalendarEvent, key: string, overdue = false) => {
    const deadlineType = getStoredEventDeadlineType(event)
    const urgencyClass = getUrgencyClass(event.date)

    return (
      <div key={key} className={`task-card ${overdue ? 'overdue' : ''} p-${event.priority}`}>
        <div className="task-card-top">
          <div className="task-card-title-block">
            <span
              className="task-type-chip"
              style={{
                backgroundColor: `${DEADLINE_TYPE_COLORS[deadlineType]}22`,
                color: DEADLINE_TYPE_COLORS[deadlineType],
                borderColor: `${DEADLINE_TYPE_COLORS[deadlineType]}66`,
              }}
            >
              {formatDeadlineType(deadlineType)}
            </span>
            <strong>{formatEventLabel(event)}</strong>
          </div>
          <div className="task-card-actions">
            <button className="task-edit" onClick={() => openModalForEdit(event)}>Edit</button>
            <button className="task-remove" onClick={() => void handleRemoveEvent(event)}>Remove</button>
          </div>
        </div>
        <div className="task-card-meta">
          <span>{event.date}{event.time ? ` | ${event.time}` : ''}</span>
          <span className={`task-card-countdown ${urgencyClass}`}>{formatCountdown(event.date)}</span>
        </div>
      </div>
    )
  }

  const renderDays = () => {
    const days = []
    const month = date.getMonth()
    const year = date.getFullYear()

    if (currentView === 'month') {
      const firstDay = new Date(year, month, 1).getDay()
      const lastDay = new Date(year, month + 1, 0).getDate()
      for (let x = 0; x < firstDay; x++) days.push(<div key={`empty-${x}`} className="empty-day"></div>)
      for (let i = 1; i <= lastDay; i++) days.push(createDayElement(i, month, year))
    } else {
      const span = currentView === 'day' ? 1 : currentView === '3day' ? 3 : 7
      for (let i = 0; i < span; i++) {
        const currentDate = new Date(date)
        currentDate.setDate(date.getDate() + i)
        days.push(createDayElement(currentDate.getDate(), currentDate.getMonth(), currentDate.getFullYear()))
      }
    }

    return days
  }

  const createDayElement = (num: number, month: number, year: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(num).padStart(2, '0')}`
    const today = new Date()
    const isToday = num === today.getDate() && month === today.getMonth() && year === today.getFullYear()

    return (
      <div key={dateStr} className={`calendar-day ${isToday ? 'today' : ''}`} onClick={() => openComposerForDate(dateStr)}>
        <span className="day-num">{num}</span>
        {events.filter((event) => event.date === dateStr).map((event, index) => {
          const deadlineType = getStoredEventDeadlineType(event)
          return (
            <div
              key={`${event.title}-${event.time}-${index}`}
              className={`event-item priority-${event.priority}`}
              onClick={(clickEvent) => {
                clickEvent.stopPropagation()
                openModalForEdit(event)
              }}
            >
              <span
                className="event-item-type-dot"
                style={{ backgroundColor: DEADLINE_TYPE_COLORS[deadlineType] }}
                aria-hidden="true"
              />
              <span className="event-item-text">{formatEventLabel(event)}</span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div id="ismail-calendar-page">
      <div className="calendar-top-nav">
        <button className="btn-back" onClick={() => navigate('/dashboard')}>← Back to Dashboard</button>
      </div>

      <div className="calendar-main-container">
        <section className="calendar-section">
          <header className="calendar-header">
            <div className="month-nav">
              <button className="nav-arrow" onClick={() => changeDate(-1)}>&larr;</button>
              <h2>{monthNames[date.getMonth()]} {date.getFullYear()}</h2>
              <button className="nav-arrow" onClick={() => changeDate(1)}>&rarr;</button>
            </div>
            <div className="view-options">
              {['day', '3day', 'week', 'month'].map((view) => (
                <button key={view} className={`view-btn ${currentView === view ? 'active' : ''}`} onClick={() => setCurrentView(view)}>
                  {view.toUpperCase()}
                </button>
              ))}
            </div>
          </header>

          <div className="calendar-grid-wrapper">
            {currentView === 'month' && (
              <div className="weekdays-row">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div key={day}>{day}</div>)}
              </div>
            )}
            <div className={`days-grid view-${currentView}`}>{renderDays()}</div>
          </div>
        </section>

        <aside className="task-sidebar">
          <div className="task-sidebar-header">
            <div>
              <h3>Deadlines</h3>
              <p>Keep upcoming and overdue items in one compact view.</p>
            </div>
            <button className="task-sidebar-add" onClick={() => openComposerForDate()}>
              Add Deadline
            </button>
          </div>

          <div className="task-list-container">
            {events.length === 0 ? (
              <p className="empty-msg">No deadlines added yet.</p>
            ) : (
              <>
                {upcomingDeadlines.length > 0 ? (
                  <div className="task-group">
                    <div className="task-group-label">Upcoming</div>
                    {upcomingDeadlines.map((event, index) => renderDeadlineCard(event, `${event.title}-${event.date}-${event.time}-${index}`))}
                  </div>
                ) : null}

                {overdueDeadlines.length > 0 ? (
                  <div className="task-group">
                    <div className="task-group-label overdue">Overdue</div>
                    {overdueDeadlines.map((event, index) => renderDeadlineCard(event, `${event.title}-${event.date}-${event.time}-${index}-overdue`, true))}
                  </div>
                ) : null}

                {upcomingDeadlines.length === 0 && overdueDeadlines.length === 0 ? (
                  <p className="empty-msg">No deadlines added yet.</p>
                ) : null}
              </>
            )}
          </div>
        </aside>
      </div>

      <datalist id="calendar-course-codes">
        {classes
          .map((course) => course.code.trim())
          .filter((code, index, allCodes) => code && allCodes.indexOf(code) === index)
          .map((code) => <option key={code} value={code} />)}
      </datalist>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => { setIsModalOpen(false); resetForm() }}>
          <div className="modal-box calendar-edit-modal" onClick={(event) => event.stopPropagation()}>
            {renderFormPanel(editingEvent ? 'edit' : 'add')}
          </div>
        </div>
      )}
    </div>
  )
}

export default Calendar
