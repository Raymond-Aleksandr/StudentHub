import type { DeadlineType } from './deadlines'

// Entity types.

export interface CalendarEvent {
  title: string
  courseCode: string
  date: string
  time: string
  durationMinutes: number | null
  weight: number | null
  score: number | null
  location: string
  format: string
  priority: 'high' | 'medium' | 'low'
  type: 'assignment' | 'exam'
  deadlineType: DeadlineType
  sourceUploadId: string
  completed: boolean
  reminderDaysBefore: number
}

export interface ClassInfo {
  id: number
  title: string
  code: string
  day: string
  startTime: string
  endTime: string
  time: string
  location: string
  profName: string
  profEmail: string
  taName: string
  taEmail: string
  grade: number | null
  progress: number | null
  color: string
  sourceUploadId: string
}

export interface SyllabusUpload {
  id: string
  name: string
  url: string
  storagePath: string
  status: 'processing' | 'review' | 'done' | 'error'
  message: string
  parsedCourse?: {
    title: string
    code: string
    day: string
    startTime: string
    endTime: string
    location: string
    profName: string
    profEmail: string
    taName: string
    taEmail: string
    grade: number | null
    progress: number | null
    color: string
  }
  parsedEvents?: Array<{
    title: string
    courseCode: string
    date: string
    time: string
    durationMinutes?: number | null
    weight: number | null
    score: number | null
    location: string
    format: string
    type: 'assignment' | 'exam'
    deadlineType: DeadlineType
    priority: 'high' | 'medium' | 'low'
  }>
}

// Draft types for form state.

export interface DraftEvent {
  title: string
  courseCode: string
  date: string
  time: string
  durationMinutes: number | null
  weight: number | null
  score: number | null
  location: string
  format: string
  deadlineType: DeadlineType
}

// Calendar view types.

export interface CalendarDay {
  date: string
  dayNumber: number
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
  eventCount: number
  hasExam: boolean
  hasOpen: boolean
}

// Import state.

export type ImportTone = 'idle' | 'busy' | 'done' | 'error'

export interface ImportState {
  tone: ImportTone
  message: string
}
