import type { CalendarEvent, ClassInfo } from './domain/types'
import { parseSyllabusPdfWithLocalAi } from './native/localAiParser'

interface ParsedSyllabusData {
  course: Partial<ClassInfo>
  events: CalendarEvent[]
  rawText: string
  source: 'local-ai'
}

export async function parseSyllabusPdf(file: File): Promise<ParsedSyllabusData> {
  return parseSyllabusPdfWithLocalAi(file)
}
