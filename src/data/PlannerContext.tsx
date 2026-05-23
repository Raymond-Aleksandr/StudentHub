import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { auth } from '../localAuth'
import {
  saveCalendarEvents,
  saveClasses,
  saveSyllabusUploads,
  subscribeToCalendarEvents,
  subscribeToClasses,
  subscribeToSyllabusUploads,
} from '../data/storage'
import type { CalendarEvent, ClassInfo, SyllabusUpload, DraftEvent, ImportState } from '../domain/types'
import { deadlineTypeToEventType, formatCountdown, getDaysUntil, getEventDeadlineType, isSameCalendarEvent, sortEventsByDate } from '../domain/deadlines'
import { mergeCourse, mergeEvents, normalizeCourse, normalizeEvents, nextCourseId } from '../domain/merge'
import { WEEKDAYS } from '../domain/calendar'
import { parseSyllabusPdf } from '../syllabusParser'

// Context shape.

interface PlannerState {
  classes: ClassInfo[]
  events: CalendarEvent[]
  uploads: SyllabusUpload[]
  importState: ImportState
}

interface PlannerActions {
  // Events
  toggleComplete: (target: CalendarEvent) => Promise<void>
  removeEvent: (target: CalendarEvent) => Promise<void>
  addDraftEvent: (draft: DraftEvent) => Promise<void>
  updateEvent: (target: CalendarEvent, draft: DraftEvent) => Promise<void>
  // Courses
  addCourse: (draft?: Partial<ClassInfo>) => Promise<number | undefined>
  updateCourse: (id: number, field: keyof ClassInfo, value: string) => Promise<void>
  removeCourse: (id: number) => Promise<void>
  // Uploads
  importFiles: (files: FileList) => Promise<void>
  removeUpload: (upload: SyllabusUpload) => Promise<void>
  updateUpload: (target: SyllabusUpload, draft: SyllabusUpload) => Promise<void>
}

interface PlannerDerived {
  upcomingEvents: CalendarEvent[]
  reminders: CalendarEvent[]
  todayClasses: ClassInfo[]
  taskEvents: CalendarEvent[]
  examEvents: CalendarEvent[]
  stats: { courses: number; tasks: number; exams: number; next: string }
}

type PlannerContextValue = PlannerState & PlannerActions & PlannerDerived

const PlannerContext = createContext<PlannerContextValue | null>(null)

export { PlannerContext }
export type { PlannerContextValue }

// Provider.

export function PlannerProvider({ children }: { children: ReactNode }) {
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [uploads, setUploads] = useState<SyllabusUpload[]>([])
  const [importState, setImportState] = useState<ImportState>({
    tone: 'idle',
    message: 'Upload PDF syllabi and let StudentHub build the term.',
  })

  // Subscribe to storage
  useEffect(() => {
    const uid = auth.currentUser?.uid
    if (!uid) return
    const unsubClasses = subscribeToClasses(uid, setClasses)
    const unsubEvents = subscribeToCalendarEvents(uid, setEvents)
    const unsubUploads = subscribeToSyllabusUploads(uid, setUploads)
    return () => { unsubClasses(); unsubEvents(); unsubUploads() }
  }, [])

  // Derived data.

  const upcomingEvents = useMemo(() =>
    sortEventsByDate(events.filter((e) => !e.completed && getDaysUntil(e.date) >= 0)),
    [events],
  )

  const reminders = useMemo(() =>
    upcomingEvents
      .filter((e) => getDaysUntil(e.date) <= (e.reminderDaysBefore ?? (e.type === 'exam' ? 7 : 2)))
      .slice(0, 4),
    [upcomingEvents],
  )

  const todayClasses = useMemo(() => {
    const today = WEEKDAYS[new Date().getDay()]
    return classes
      .filter((c) => c.day === today)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }, [classes])

  const taskEvents = useMemo(() =>
    sortEventsByDate(events.filter((e) => deadlineTypeToEventType(getEventDeadlineType(e)) !== 'exam')),
    [events],
  )

  const examEvents = useMemo(() =>
    sortEventsByDate(events.filter((e) => deadlineTypeToEventType(getEventDeadlineType(e)) === 'exam')),
    [events],
  )

  const stats = useMemo(() => ({
    courses: classes.length,
    tasks: taskEvents.filter((e) => !e.completed).length,
    exams: examEvents.filter((e) => !e.completed).length,
    next: upcomingEvents[0] ? formatCountdown(upcomingEvents[0].date) : 'Clear',
  }), [classes, taskEvents, examEvents, upcomingEvents])

  // Persistence helpers.

  const persistEvents = async (next: CalendarEvent[]) => {
    const uid = auth.currentUser?.uid
    if (!uid) return
    setEvents(next)
    await saveCalendarEvents(uid, next)
  }

  const persistClasses = async (next: ClassInfo[]) => {
    const uid = auth.currentUser?.uid
    if (!uid) return
    setClasses(next)
    await saveClasses(uid, next)
  }

  // Actions.

  const toggleComplete = async (target: CalendarEvent) => {
    await persistEvents(events.map((e) =>
      isSameCalendarEvent(e, target) ? { ...e, completed: !e.completed } : e,
    ))
  }

  const removeEvent = async (target: CalendarEvent) => {
    await persistEvents(events.filter((e) => !isSameCalendarEvent(e, target)))
  }

  const addDraftEvent = async (draft: DraftEvent) => {
    if (!draft.title || !draft.date) return
    const type = deadlineTypeToEventType(draft.deadlineType)
    const newEvent: CalendarEvent = {
      title: draft.title,
      courseCode: draft.courseCode,
      date: draft.date,
      time: draft.time,
      type,
      deadlineType: draft.deadlineType,
      priority: type === 'exam' ? 'high' : 'medium',
      completed: false,
      reminderDaysBefore: type === 'exam' ? 7 : 2,
      sourceUploadId: '',
    }
    await persistEvents(mergeEvents(events, [newEvent]))
  }

  const updateEvent = async (target: CalendarEvent, draft: DraftEvent) => {
    if (!draft.title || !draft.date) return
    const type = deadlineTypeToEventType(draft.deadlineType)
    const nextEvents = events.map((e) => {
      if (!isSameCalendarEvent(e, target)) return e
      return {
        ...e,
        title: draft.title,
        courseCode: draft.courseCode,
        date: draft.date,
        time: draft.time,
        type,
        deadlineType: draft.deadlineType,
        priority: type === 'exam' ? 'high' : e.priority,
        reminderDaysBefore: e.reminderDaysBefore ?? (type === 'exam' ? 7 : 2),
      }
    })
    await persistEvents(sortEventsByDate(nextEvents))
  }

  const addCourse = async (draft?: Partial<ClassInfo>) => {
    const id = nextCourseId(classes)
    await persistClasses([
      ...classes,
      {
        id,
        title: '', code: '', day: '', startTime: '', endTime: '',
        time: '', location: '', profName: '', profEmail: '',
        taName: '', taEmail: '', sourceUploadId: '',
        ...draft,
      },
    ])
    return id
  }

  const updateCourse = async (id: number, field: keyof ClassInfo, value: string) => {
    const nextClasses = classes.map((c) => {
      if (c.id !== id) return c
      const next = { ...c, [field]: value }
      if (field === 'startTime' || field === 'endTime') {
        next.time = [next.startTime, next.endTime].filter(Boolean).join(' - ')
      }
      return next
    })
    await persistClasses(nextClasses)
  }

  const removeCourse = async (id: number) => {
    await persistClasses(classes.filter((c) => c.id !== id))
  }

  const importFiles = async (files: FileList) => {
    const uid = auth.currentUser?.uid
    if (!uid || !files.length) return

    for (const file of Array.from(files)) {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setImportState({ tone: 'error', message: `${file.name} is not a PDF.` })
        continue
      }

      const uploadId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
      setImportState({ tone: 'busy', message: `Parsing ${file.name}...` })

      try {
        const parsed = await parseSyllabusPdf(file)
        const parsedCourse = normalizeCourse(parsed.course, uploadId, classes)
        const parsedEventList = normalizeEvents(parsed.events, uploadId)
        const parsedExamCount = parsedEventList.filter((e) => deadlineTypeToEventType(getEventDeadlineType(e)) === 'exam').length
        const parsedTaskCount = parsedEventList.length - parsedExamCount
        const parsedCourseLabel = parsedCourse ? parsedCourse.code || parsedCourse.title : ''
        const importSummary = [
          parsedCourseLabel ? `course ${parsedCourseLabel}` : '',
          parsedTaskCount ? `${parsedTaskCount} task${parsedTaskCount === 1 ? '' : 's'}` : '',
          parsedExamCount ? `${parsedExamCount} exam${parsedExamCount === 1 ? '' : 's'}` : '',
        ].filter(Boolean).join(', ')

        const nextClasses = mergeCourse(classes, parsedCourse)
        const nextEvents = mergeEvents(events, parsedEventList)
        const nextUpload: SyllabusUpload = {
          id: uploadId,
          name: file.name,
          url: '',
          storagePath: '',
          status: 'done',
          message: `Auto-filled ${importSummary || 'available text'}. Review and edit imported items.`,
          parsedCourse: parsedCourse ? {
            title: parsedCourse.title, code: parsedCourse.code, day: parsedCourse.day,
            startTime: parsedCourse.startTime, endTime: parsedCourse.endTime,
            location: parsedCourse.location, profName: parsedCourse.profName,
            profEmail: parsedCourse.profEmail, taName: parsedCourse.taName, taEmail: parsedCourse.taEmail,
          } : undefined,
          parsedEvents: parsedEventList,
        }
        const nextUploads = [nextUpload, ...uploads]

        setClasses(nextClasses)
        setEvents(nextEvents)
        setUploads(nextUploads)
        await saveClasses(uid, nextClasses)
        await saveCalendarEvents(uid, nextEvents)
        await saveSyllabusUploads(uid, nextUploads)
        setImportState({
          tone: 'done',
          message: `${file.name}: auto-filled ${importSummary || 'available text'} with the Cloudflare Worker parser.`,
        })
      } catch (error) {
        const detail = error instanceof Error ? ` ${error.message}` : ''
        setImportState({ tone: 'error', message: `Could not import ${file.name}. Worker parser is required; no browser fallback.${detail}` })
      }
    }
  }

  const removeUpload = async (upload: SyllabusUpload) => {
    const uid = auth.currentUser?.uid
    if (!uid) return
    const nextUploads = uploads.filter((u) => u.id !== upload.id)
    const nextClasses = classes.filter((c) => c.sourceUploadId !== upload.id)
    const nextEvents = events.filter((e) => e.sourceUploadId !== upload.id)
    setUploads(nextUploads)
    setClasses(nextClasses)
    setEvents(nextEvents)
    await saveSyllabusUploads(uid, nextUploads)
    await saveClasses(uid, nextClasses)
    await saveCalendarEvents(uid, nextEvents)
    setImportState({ tone: 'done', message: `${upload.name} and its imported items were removed.` })
  }

  const updateUpload = async (target: SyllabusUpload, draft: SyllabusUpload) => {
    const uid = auth.currentUser?.uid
    if (!uid) return
    const nextUploads = uploads.map((upload) => upload.id === target.id ? draft : upload)
    setUploads(nextUploads)
    await saveSyllabusUploads(uid, nextUploads)
    setImportState({ tone: 'done', message: `${draft.name} was updated.` })
  }

  const value: PlannerContextValue = {
    classes, events, uploads, importState,
    toggleComplete, removeEvent, addDraftEvent, updateEvent,
    addCourse, updateCourse, removeCourse,
    importFiles, removeUpload, updateUpload,
    upcomingEvents, reminders, todayClasses, taskEvents, examEvents, stats,
  }

  return (
    <PlannerContext.Provider value={value}>
      {children}
    </PlannerContext.Provider>
  )
}
