import type { CalendarEvent, ClassInfo } from './types'
import { deadlineTypeToEventType, isSameCalendarEvent, sortEventsByDate } from './deadlines'

// Course helpers.

export function nextCourseId(classes: ClassInfo[]): number {
  return classes.reduce((max, course) => Math.max(max, course.id), -1) + 1
}

export function hasCourseContent(course: Partial<ClassInfo>): boolean {
  return Boolean(course.title || course.code || course.day || course.startTime || course.location || course.profName)
}

// Merge functions.

export function mergeCourse(classes: ClassInfo[], incoming: ClassInfo | null): ClassInfo[] {
  if (!incoming) return classes
  const incomingCode = incoming.code.trim().toUpperCase()
  const matchIndex = classes.findIndex((course) => {
    if (course.sourceUploadId === incoming.sourceUploadId) return true
    return incomingCode && course.code.trim().toUpperCase() === incomingCode
  })

  if (matchIndex < 0) return [...classes, incoming]
  return classes.map((course, index) => index === matchIndex ? { ...course, ...incoming, id: course.id } : course)
}

export function mergeEvents(current: CalendarEvent[], incoming: CalendarEvent[]): CalendarEvent[] {
  const next = [...current]
  for (const event of incoming) {
    if (!next.some((candidate) => isSameCalendarEvent(candidate, event))) next.push(event)
  }
  return sortEventsByDate(next)
}

// Normalize functions.

export function normalizeCourse(
  parsedCourse: Partial<ClassInfo>,
  uploadId: string,
  classes: ClassInfo[],
): ClassInfo | null {
  if (!hasCourseContent(parsedCourse)) return null
  const startTime = parsedCourse.startTime ?? ''
  const endTime = parsedCourse.endTime ?? ''

  return {
    id: nextCourseId(classes),
    title: parsedCourse.title ?? parsedCourse.code ?? 'Untitled course',
    code: parsedCourse.code ?? '',
    day: parsedCourse.day ?? '',
    startTime,
    endTime,
    time: [startTime, endTime].filter(Boolean).join(' - '),
    location: parsedCourse.location ?? '',
    profName: parsedCourse.profName ?? '',
    profEmail: parsedCourse.profEmail ?? '',
    taName: parsedCourse.taName ?? '',
    taEmail: parsedCourse.taEmail ?? '',
    sourceUploadId: uploadId,
  }
}

export function normalizeEvents(events: Partial<CalendarEvent>[], uploadId: string): CalendarEvent[] {
  return events
    .filter((event) => event.title && event.date)
    .map((event) => {
      const deadlineType = event.deadlineType ?? 'assignment'
      const type = deadlineTypeToEventType(deadlineType)
      return {
        title: event.title ?? '',
        courseCode: event.courseCode ?? '',
        date: event.date ?? '',
        time: event.time ?? '',
        priority: event.priority ?? (type === 'exam' ? 'high' : 'low'),
        type,
        deadlineType,
        sourceUploadId: uploadId,
        completed: false,
        reminderDaysBefore: event.reminderDaysBefore ?? (type === 'exam' ? 7 : 2),
      }
    })
}

// Event identity for edit tracking.

export function getEventIdentity(event: CalendarEvent): string {
  return [
    event.title,
    event.courseCode,
    event.date,
    event.time,
    event.priority,
    event.type,
    event.deadlineType,
    event.sourceUploadId,
  ].join('::')
}
