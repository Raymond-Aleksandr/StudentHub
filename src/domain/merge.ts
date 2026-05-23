import type { CalendarEvent, ClassInfo } from './types'
import { deadlineTypeToEventType, isSameCalendarEvent, sortEventsByDate } from './deadlines'
import { inferDurationMinutes, normalizeCourseColor, normalizeDurationMinutes, normalizePercent, normalizeWeight } from './courseMeta'

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
  const next = dedupeCalendarEvents(current)
  for (const event of incoming) {
    if (!next.some((candidate) => isSameImportedAssessment(candidate, event))) next.push(event)
  }
  return sortEventsByDate(next)
}

function cleanIdentityText(value = '') {
  return value.trim().replace(/\s+/g, ' ').toUpperCase()
}

function isSameImportedAssessment(left: CalendarEvent, right: CalendarEvent): boolean {
  if (isSameCalendarEvent(left, right)) return true
  const sameAssessment = cleanIdentityText(left.title) === cleanIdentityText(right.title) &&
    cleanIdentityText(left.courseCode) === cleanIdentityText(right.courseCode) &&
    left.type === right.type &&
    left.deadlineType === right.deadlineType
  const sameWeightedAssessment = sameAssessment &&
    left.weight !== null &&
    right.weight !== null &&
    left.weight === right.weight
  const sameExam = sameAssessment && left.type === 'exam'

  if (sameWeightedAssessment || sameExam) return true

  return (
    cleanIdentityText(left.title) === cleanIdentityText(right.title) &&
    cleanIdentityText(left.courseCode) === cleanIdentityText(right.courseCode) &&
    left.date === right.date &&
    left.time === right.time &&
    left.type === right.type &&
    left.deadlineType === right.deadlineType
  )
}

export function dedupeCalendarEvents(events: CalendarEvent[]): CalendarEvent[] {
  const next: CalendarEvent[] = []
  for (const event of events) {
    if (!next.some((candidate) => isSameImportedAssessment(candidate, event))) next.push(event)
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
    grade: normalizePercent(parsedCourse.grade),
    progress: normalizePercent(parsedCourse.progress),
    color: normalizeCourseColor(parsedCourse.color, classes.length),
    sourceUploadId: uploadId,
  }
}

export function normalizeEvents(events: Partial<CalendarEvent>[], uploadId: string): CalendarEvent[] {
  return events
    .filter((event) => event.title && (event.date || event.weight !== null && event.weight !== undefined))
    .map((event) => {
      const deadlineType = event.deadlineType ?? 'assignment'
      const type = deadlineTypeToEventType(deadlineType)
      return {
        title: event.title ?? '',
        courseCode: event.courseCode ?? '',
        date: event.date ?? '',
        time: event.time ?? '',
        durationMinutes: normalizeDurationMinutes(event.durationMinutes) ?? (type === 'exam' ? inferDurationMinutes(event.format ?? '') ?? 120 : null),
        weight: normalizeWeight(event.weight),
        score: normalizePercent(event.score),
        location: event.location ?? '',
        format: event.format ?? '',
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
