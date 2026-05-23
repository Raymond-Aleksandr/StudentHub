import { normalizeDeadlineType } from '../domain/deadlines'
import { normalizeCourseColor, normalizePercent, normalizeWeight } from '../domain/courseMeta'
import type { CalendarEvent, ClassInfo, SyllabusUpload } from '../domain/types'

export type Unsubscribe = () => void

const subscribers = new Map<string, Set<() => void>>()

function getStorageKey(uid: string, collection: 'calendar' | 'classes' | 'syllabi') {
  return `studenthub.${uid}.${collection}`
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
  subscribers.get(key)?.forEach((listener) => listener())
}

function subscribeToKey(key: string, listener: () => void): Unsubscribe {
  const keySubscribers = subscribers.get(key) ?? new Set<() => void>()
  keySubscribers.add(listener)
  subscribers.set(key, keySubscribers)

  const storageListener = (event: StorageEvent) => {
    if (event.key === key) listener()
  }
  window.addEventListener('storage', storageListener)
  queueMicrotask(listener)

  return () => {
    keySubscribers.delete(listener)
    window.removeEventListener('storage', storageListener)
  }
}

// Normalization.

function normalizeCalendarEvent(event: Partial<CalendarEvent>): CalendarEvent {
  return {
    title: event.title ?? '',
    courseCode: event.courseCode ?? '',
    date: event.date ?? '',
    time: event.time ?? '',
    weight: normalizeWeight(event.weight),
    score: normalizePercent(event.score),
    location: event.location ?? '',
    format: event.format ?? '',
    priority: event.priority === 'medium' || event.priority === 'low' ? event.priority : 'high',
    type: event.type === 'exam' ? 'exam' : 'assignment',
    deadlineType: normalizeDeadlineType(event.deadlineType, event.type === 'exam' ? 'exam' : 'assignment'),
    sourceUploadId: event.sourceUploadId ?? '',
    completed: Boolean(event.completed),
    reminderDaysBefore: typeof event.reminderDaysBefore === 'number'
      ? event.reminderDaysBefore
      : event.type === 'exam' ? 7 : 2,
  }
}

function normalizeClass(course: Partial<ClassInfo>, index: number): ClassInfo {
  return {
    id: course.id ?? index,
    title: course.title ?? '',
    code: course.code ?? '',
    day: course.day ?? '',
    startTime: course.startTime ?? '',
    endTime: course.endTime ?? '',
    time: course.time ?? '',
    location: course.location ?? '',
    profName: course.profName ?? '',
    profEmail: course.profEmail ?? '',
    taName: course.taName ?? '',
    taEmail: course.taEmail ?? '',
    grade: normalizePercent(course.grade),
    progress: normalizePercent(course.progress),
    color: normalizeCourseColor(course.color, index),
    sourceUploadId: course.sourceUploadId ?? '',
  }
}

function normalizeUpload(upload: Partial<SyllabusUpload>): SyllabusUpload {
  return {
    id: upload.id ?? '',
    name: upload.name ?? 'Untitled syllabus',
    url: upload.url ?? '',
    storagePath: upload.storagePath ?? '',
    status: upload.status === 'processing' || upload.status === 'review' || upload.status === 'error' ? upload.status : 'done',
    message: upload.message ?? '',
    parsedCourse: upload.parsedCourse
      ? {
          title: upload.parsedCourse.title ?? '',
          code: upload.parsedCourse.code ?? '',
          day: upload.parsedCourse.day ?? '',
          startTime: upload.parsedCourse.startTime ?? '',
          endTime: upload.parsedCourse.endTime ?? '',
          location: upload.parsedCourse.location ?? '',
          profName: upload.parsedCourse.profName ?? '',
          profEmail: upload.parsedCourse.profEmail ?? '',
          taName: upload.parsedCourse.taName ?? '',
          taEmail: upload.parsedCourse.taEmail ?? '',
          grade: normalizePercent(upload.parsedCourse.grade),
          progress: normalizePercent(upload.parsedCourse.progress),
          color: normalizeCourseColor(upload.parsedCourse.color),
        }
      : undefined,
    parsedEvents: Array.isArray(upload.parsedEvents)
      ? upload.parsedEvents.map((event) => ({
          title: event.title ?? '',
          courseCode: event.courseCode ?? '',
          date: event.date ?? '',
          time: event.time ?? '',
          weight: normalizeWeight(event.weight),
          score: normalizePercent(event.score),
          location: event.location ?? '',
          format: event.format ?? '',
          type: event.type === 'exam' ? 'exam' : 'assignment',
          deadlineType: normalizeDeadlineType(event.deadlineType, event.type === 'exam' ? 'exam' : 'assignment'),
          priority: event.priority === 'medium' || event.priority === 'low' ? event.priority : 'high',
        }))
      : [],
  }
}

// Public API.

export function subscribeToCalendarEvents(
  uid: string,
  onChange: (events: CalendarEvent[]) => void,
): Unsubscribe {
  const key = getStorageKey(uid, 'calendar')
  return subscribeToKey(key, () => {
    const data = readJson<{ events?: Partial<CalendarEvent>[] }>(key, {})
    const events = Array.isArray(data.events)
      ? data.events.map((event: Partial<CalendarEvent>) => normalizeCalendarEvent(event))
      : []
    onChange(events)
  })
}

export async function saveCalendarEvents(uid: string, events: CalendarEvent[]) {
  writeJson(getStorageKey(uid, 'calendar'), { events: events.map(normalizeCalendarEvent) })
}

export function subscribeToClasses(
  uid: string,
  onChange: (classes: ClassInfo[]) => void,
): Unsubscribe {
  const key = getStorageKey(uid, 'classes')
  return subscribeToKey(key, () => {
    const data = readJson<{ classes?: Partial<ClassInfo>[] }>(key, {})
    const classes = Array.isArray(data.classes)
      ? data.classes.map((course: Partial<ClassInfo>, index: number) => normalizeClass(course, index))
      : []
    onChange(classes)
  })
}

export async function saveClasses(uid: string, classes: ClassInfo[]) {
  writeJson(getStorageKey(uid, 'classes'), { classes: classes.map((course, index) => normalizeClass(course, index)) })
}

export function subscribeToSyllabusUploads(
  uid: string,
  onChange: (uploads: SyllabusUpload[]) => void,
): Unsubscribe {
  const key = getStorageKey(uid, 'syllabi')
  return subscribeToKey(key, () => {
    const data = readJson<{ uploads?: Partial<SyllabusUpload>[] }>(key, {})
    const uploads = Array.isArray(data.uploads)
      ? data.uploads.map((upload: Partial<SyllabusUpload>) => normalizeUpload(upload))
      : []
    onChange(uploads)
  })
}

export async function saveSyllabusUploads(uid: string, uploads: SyllabusUpload[]) {
  writeJson(getStorageKey(uid, 'syllabi'), { uploads: uploads.map(normalizeUpload) })
}

// Legacy type aliases for backward compatibility.
export type StoredCalendarEvent = CalendarEvent
export type StoredClassInfo = ClassInfo
export type StoredSyllabusUpload = SyllabusUpload
