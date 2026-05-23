import type { CalendarEvent } from './types'

export function defaultReminderDaysBefore(type: CalendarEvent['type']) {
  return type === 'exam' ? 7 : 2
}

export function getReminderDaysBefore(event: Pick<CalendarEvent, 'type' | 'reminderDaysBefore'>) {
  return typeof event.reminderDaysBefore === 'number'
    ? event.reminderDaysBefore
    : defaultReminderDaysBefore(event.type)
}

function getEventDateTime(event: Pick<CalendarEvent, 'date' | 'time'>) {
  if (!event.date) return null
  const date = new Date(`${event.date}T${event.time || '09:00'}`)
  return Number.isNaN(date.getTime()) ? null : date
}

function getReminderDate(event: Pick<CalendarEvent, 'date' | 'time' | 'type' | 'reminderDaysBefore'>) {
  const date = getEventDateTime(event)
  if (!date) return null
  date.setDate(date.getDate() - getReminderDaysBefore(event))
  return Number.isNaN(date.getTime()) ? null : date
}

export function getSchedulableReminderDate(
  event: Pick<CalendarEvent, 'date' | 'time' | 'type' | 'reminderDaysBefore'>,
  now = new Date(),
) {
  const reminder = getReminderDate(event)
  if (!reminder) return null
  return reminder > now ? reminder : null
}

export function shouldScheduleReminder(event: CalendarEvent, now = new Date()) {
  if (event.reminderEnabled === false || event.completed) return false
  const reminder = getSchedulableReminderDate(event, now)
  return Boolean(reminder && reminder > now)
}

export function formatReminderDate(event: CalendarEvent) {
  const reminder = getReminderDate(event)
  if (!reminder) return 'Date needed'
  return reminder.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
