import { getDaysUntil } from './deadlines'
import { courseMatchesEvent } from './courseMeta'
import type { CalendarEvent, ClassInfo } from './types'

function roundedGrade(value: number) {
  return Math.round(value * 10) / 10
}

export function getWeightStats(events: Array<Pick<CalendarEvent, 'weight' | 'completed' | 'date'>>) {
  const weighted = events.filter((event) => typeof event.weight === 'number' && event.weight > 0)
  const total = roundedGrade(weighted.reduce((sum, event) => sum + (event.weight ?? 0), 0))
  const assessed = roundedGrade(weighted
    .filter((event) => event.completed || getDaysUntil(event.date) <= 0)
    .reduce((sum, event) => sum + (event.weight ?? 0), 0))
  return {
    total,
    assessed,
    progress: total ? Math.round((assessed / total) * 100) : null,
  }
}

function getRunningGrade(events: Array<Pick<CalendarEvent, 'weight' | 'score'>>) {
  const graded = events.filter((event) => typeof event.weight === 'number' && event.weight > 0 && typeof event.score === 'number')
  const gradedWeight = roundedGrade(graded.reduce((sum, event) => sum + (event.weight ?? 0), 0))
  const weightedEarned = graded.reduce((sum, event) => sum + ((event.weight ?? 0) * ((event.score ?? 0) / 100)), 0)
  return {
    grade: gradedWeight ? roundedGrade((weightedEarned / gradedWeight) * 100) : null,
    gradedWeight,
  }
}

function getCourseEvents(course: Pick<ClassInfo, 'code'>, events: CalendarEvent[]) {
  return events.filter((event) => courseMatchesEvent(course, event))
}

export function getCourseGrade(course: Pick<ClassInfo, 'code' | 'grade'>, events: CalendarEvent[]) {
  const running = getRunningGrade(getCourseEvents(course, events))
  return {
    value: running.grade ?? course.grade,
    source: running.grade !== null ? 'computed' as const : 'manual' as const,
    gradedWeight: running.gradedWeight,
  }
}
