export const DEADLINE_TYPES = [
  'assignment',
  'quiz',
  'test',
  'exam',
  'presentation',
  'project',
  'lab-report',
  'other',
] as const

export type DeadlineType = typeof DEADLINE_TYPES[number]

export const DEADLINE_TYPE_LABELS: Record<DeadlineType, string> = {
  assignment: 'Assignment',
  quiz: 'Quiz',
  test: 'Test',
  exam: 'Exam',
  presentation: 'Presentation',
  project: 'Project',
  'lab-report': 'Lab Report',
  other: 'Other',
}

export const DEADLINE_TYPE_COLORS: Record<DeadlineType, string> = {
  assignment: '#60A5FA',
  quiz: '#A78BFA',
  test: '#38BDF8',
  exam: '#F472B6',
  presentation: '#2DD4BF',
  project: '#818CF8',
  'lab-report': '#E879F9',
  other: '#94A3B8',
}

const EXAM_LIKE_TYPES = new Set<DeadlineType>(['quiz', 'test', 'exam'])

export function normalizeDeadlineType(value?: string, fallbackType?: 'assignment' | 'exam'): DeadlineType {
  if (value && DEADLINE_TYPES.includes(value as DeadlineType)) {
    return value as DeadlineType
  }
  return fallbackType === 'exam' ? 'exam' : 'assignment'
}

export function getEventDeadlineType(event: { type: 'assignment' | 'exam'; deadlineType?: DeadlineType }): DeadlineType {
  return normalizeDeadlineType(event.deadlineType, event.type)
}

export function isExamLikeDeadlineType(type: DeadlineType): boolean {
  return EXAM_LIKE_TYPES.has(type)
}

export function deadlineTypeToEventType(type: DeadlineType): 'assignment' | 'exam' {
  return isExamLikeDeadlineType(type) ? 'exam' : 'assignment'
}

export function formatDeadlineType(type: DeadlineType): string {
  return DEADLINE_TYPE_LABELS[type]
}

export function getDaysUntil(dateStr: string): number {
  if (!dateStr) return Number.POSITIVE_INFINITY
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(`${dateStr}T00:00:00`)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

export function formatCountdown(dateStr: string): string {
  if (!dateStr) return 'TBD'
  const days = getDaysUntil(dateStr)
  if (days < 0) return 'Overdue'
  if (days === 0) return 'Today!'
  if (days === 1) return '1 day'
  return `${days} days`
}

export function getUrgencyClass(dateStr: string): 'urgent' | 'warning' | 'calm' {
  if (!dateStr) return 'calm'
  const days = getDaysUntil(dateStr)
  if (days <= 2) return 'urgent'
  if (days <= 7) return 'warning'
  return 'calm'
}

export function isSameCalendarEvent<T extends { title: string; courseCode?: string; date: string; time: string; priority: string; type: string; deadlineType?: string; sourceUploadId?: string }>(left: T, right: T): boolean {
  return (
    left.title === right.title &&
    (left.courseCode ?? '') === (right.courseCode ?? '') &&
    left.date === right.date &&
    left.time === right.time &&
    left.priority === right.priority &&
    left.type === right.type &&
    (left.deadlineType ?? '') === (right.deadlineType ?? '') &&
    (left.sourceUploadId ?? '') === (right.sourceUploadId ?? '')
  )
}

export function getEventTimestamp(event: { date: string; time: string }): number {
  if (!event.date) return Number.MAX_SAFE_INTEGER
  return new Date(`${event.date}T${event.time || '23:59'}`).getTime()
}

export function sortEventsByDate<T extends { date: string; time: string }>(events: T[]): T[] {
  return [...events].sort((a, b) => getEventTimestamp(a) - getEventTimestamp(b))
}
