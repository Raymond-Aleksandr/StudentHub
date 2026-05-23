import { LocalNotifications } from '@capacitor/local-notifications'
import type { CalendarEvent } from '../domain/types'
import { getSchedulableReminderDate, shouldScheduleReminder } from '../domain/notifications'
import { cancelBadgeReminders, scheduleBadgeReminders } from './appBadge'
import { getNativePlatform, isNativeRuntime } from './runtime'

const notificationIdBase = 710000

function eventNotificationId(event: CalendarEvent, index: number) {
  const source = `${event.courseCode}-${event.title}-${event.date}-${event.time}-${index}`
  let hash = 0
  for (const char of source) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0
  return notificationIdBase + Math.abs(hash % 200000)
}

async function requestNotificationPermission() {
  if (!isNativeRuntime()) return 'prompt'
  const current = await LocalNotifications.checkPermissions()
  if (current.display === 'granted') return current.display
  const requested = await LocalNotifications.requestPermissions()
  return requested.display
}

export async function rescheduleLocalNotifications(events: CalendarEvent[]) {
  if (!isNativeRuntime()) return
  const candidateEvents = events.filter((event) => shouldScheduleReminder(event))
  if (getNativePlatform() === 'ios') {
    await cancelBadgeReminders()
    if (!candidateEvents.length) return

    const permission = await requestNotificationPermission()
    if (permission !== 'granted') return

    await scheduleBadgeReminders(candidateEvents
      .map((event, index) => ({ event, at: getSchedulableReminderDate(event), id: eventNotificationId(event, index) }))
      .filter((item): item is { event: CalendarEvent; at: Date; id: number } => Boolean(item.at))
      .map(({ event, at, id }) => ({
        id: String(id),
        title: event.type === 'exam' ? `Upcoming exam: ${event.title}` : `Upcoming task: ${event.title}`,
        body: [event.courseCode, event.time || event.date].filter(Boolean).join(' · '),
        at,
        extra: {
          courseCode: event.courseCode,
          date: event.date,
          time: event.time,
        },
      })))
    return
  }

  const pending = await LocalNotifications.getPending()
  await LocalNotifications.cancel({ notifications: pending.notifications })
  if (!candidateEvents.length) return
  const permission = await requestNotificationPermission()
  if (permission !== 'granted') return

  const notifications = candidateEvents
    .map((event, index) => ({ event, at: getSchedulableReminderDate(event), id: eventNotificationId(event, index) }))
    .filter((item): item is { event: CalendarEvent; at: Date; id: number } => Boolean(item.at))
    .map(({ event, at, id }) => ({
      id,
      title: event.type === 'exam' ? `Upcoming exam: ${event.title}` : `Upcoming task: ${event.title}`,
      body: [event.courseCode, event.time || event.date].filter(Boolean).join(' · '),
      schedule: { at, allowWhileIdle: true },
      interruptionLevel: 'active' as const,
      extra: {
        courseCode: event.courseCode,
        date: event.date,
        time: event.time,
      },
    }))

  if (!notifications.length) return

  if (notifications.length) {
    await LocalNotifications.schedule({ notifications })
  }
}
