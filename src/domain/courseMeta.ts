import type { CalendarEvent, ClassInfo } from './types'

const courseTagVars = [
  'var(--tag-ochre)',
  'var(--tag-plum)',
  'var(--tag-slate)',
  'var(--tag-sage)',
  'var(--tag-teal)',
]

export const courseColorOptions = [
  { id: 'ochre', label: 'Ochre', value: 'var(--tag-ochre)' },
  { id: 'plum', label: 'Plum', value: 'var(--tag-plum)' },
  { id: 'slate', label: 'Slate', value: 'var(--tag-slate)' },
  { id: 'sage', label: 'Sage', value: 'var(--tag-sage)' },
  { id: 'teal', label: 'Teal', value: 'var(--tag-teal)' },
]

export function normalizeCourseColor(value: unknown, fallbackIndex = 0) {
  const raw = typeof value === 'string' ? value.trim() : ''
  const byId = courseColorOptions.find((option) => option.id === raw)
  if (byId) return byId.id
  const byValue = courseColorOptions.find((option) => option.value === raw)
  if (byValue) return byValue.id
  return courseColorOptions[fallbackIndex % courseColorOptions.length].id
}

export function tagVarForColor(color: string | undefined, fallbackIndex = 0) {
  const normalized = normalizeCourseColor(color, fallbackIndex)
  return courseColorOptions.find((option) => option.id === normalized)?.value ?? courseTagVars[fallbackIndex % courseTagVars.length]
}

export function splitCourseCodes(code: string) {
  return code.split(/\s*(?:\/|,|;|\+|&|\band\b)\s*/i).map((part) => part.trim()).filter(Boolean)
}

function tagForCourseCode(courseCode: string, fallbackIndex = 0) {
  const normalized = courseCode.replace(/\s+/g, '').toUpperCase()
  if (!normalized) return courseTagVars[fallbackIndex % courseTagVars.length]
  let hash = 0
  for (const char of normalized) hash += char.charCodeAt(0)
  return courseTagVars[hash % courseTagVars.length]
}

export function tagForCourse(course: Pick<ClassInfo, 'code' | 'id' | 'color'>, index = 0) {
  return course.color ? tagVarForColor(course.color, index) : tagForCourseCode(splitCourseCodes(course.code)[0] ?? course.code, course.id ?? index)
}

export function tagForEventCourse(classes: ClassInfo[], courseCode: string, fallbackIndex = 0) {
  const match = classes.find((course) => courseMatchesEvent(course, { courseCode }))
  return match ? tagForCourse(match, fallbackIndex) : tagForCourseCode(courseCode, fallbackIndex)
}

export function courseMatchesEvent(course: Pick<ClassInfo, 'code'>, event: Pick<CalendarEvent, 'courseCode'>) {
  const courseCodes = splitCourseCodes(course.code).map((code) => code.toUpperCase())
  const eventCodes = splitCourseCodes(event.courseCode).map((code) => code.toUpperCase())
  if (!courseCodes.length || !eventCodes.length) return course.code.trim().toUpperCase() === event.courseCode.trim().toUpperCase()
  return eventCodes.some((eventCode) => courseCodes.includes(eventCode)) || courseCodes.some((courseCode) => eventCodes.includes(courseCode))
}

export function normalizePercent(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(String(value).replace('%', '').trim())
  if (!Number.isFinite(parsed)) return null
  const percent = parsed > 0 && parsed <= 1 ? parsed * 100 : parsed
  return Math.max(0, Math.min(100, Math.round(percent)))
}

export function normalizeWeight(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(String(value).replace('%', '').replace('/10', '').trim())
  if (!Number.isFinite(parsed)) return null
  return Math.max(0, Math.min(100, Math.round(parsed * 10) / 10))
}

export function normalizeDurationMinutes(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(String(value).trim())
  if (!Number.isFinite(parsed)) return null
  return Math.max(15, Math.min(360, Math.round(parsed)))
}

export function inferDurationMinutes(value: string): number | null {
  const text = value.toLowerCase()
  const hourMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/)
  if (hourMatch) return normalizeDurationMinutes(Number(hourMatch[1]) * 60)
  const minuteMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:m|min|mins|minute|minutes)\b/)
  if (minuteMatch) return normalizeDurationMinutes(Number(minuteMatch[1]))
  return null
}
