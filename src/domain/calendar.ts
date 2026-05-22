import type { CalendarDay, CalendarEvent } from './types'
import { deadlineTypeToEventType, getEventDeadlineType } from './deadlines'

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const CALENDAR_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function getLocalDateId(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDateId(dateId: string): Date {
  const [year, month, day] = dateId.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function formatMonthLabel(date: Date): string {
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(date)
}

export function formatSelectedDate(dateId: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(parseDateId(dateId))
}

export function buildCalendarDays(monthDate: Date, selectedDate: string, events: CalendarEvent[]): CalendarDay[] {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const gridStart = new Date(firstOfMonth)
  gridStart.setDate(firstOfMonth.getDate() - firstOfMonth.getDay())
  const todayId = getLocalDateId(new Date())

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + index)
    const dateId = getLocalDateId(date)
    const dayEvents = events.filter((event) => event.date === dateId)
    return {
      date: dateId,
      dayNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === monthDate.getMonth(),
      isToday: dateId === todayId,
      isSelected: dateId === selectedDate,
      eventCount: dayEvents.length,
      hasExam: dayEvents.some((event) => deadlineTypeToEventType(getEventDeadlineType(event)) === 'exam'),
      hasOpen: dayEvents.some((event) => !event.completed),
    }
  })
}
