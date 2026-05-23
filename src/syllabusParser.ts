import type { CalendarEvent, ClassInfo } from './domain/types'

const DEFAULT_SYLLABUS_PARSER_URL = 'https://studenthub-syllabus-parser.h-5c7.workers.dev/parse'
const LOCAL_SYLLABUS_PARSER_URL = 'http://127.0.0.1:8787/parse'

export interface ParsedSyllabusData {
  course: Partial<ClassInfo>
  events: CalendarEvent[]
  rawText: string
  source: 'worker'
}

function normalizeWorkerResponse(data: Partial<ParsedSyllabusData>): ParsedSyllabusData | null {
  if (!data || typeof data !== 'object') return null
  if (!data.course || !Array.isArray(data.events)) return null

  return {
    course: data.course,
    events: data.events,
    rawText: typeof data.rawText === 'string' ? data.rawText : '',
    source: 'worker',
  }
}

function isPrivateNetworkHostname(hostname: string) {
  if (hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '::1') return true
  if (hostname.endsWith('.local')) return true

  const parts = hostname.split('.').map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false
  const [first, second] = parts

  return first === 10 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 169 && second === 254)
}

export function getSyllabusParserEndpoint(): string {
  const configuredEndpoint = import.meta.env.VITE_SYLLABUS_PARSER_URL?.trim()
  if (configuredEndpoint) return configuredEndpoint

  const hostname = window.location.hostname
  if (hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '::1') {
    return LOCAL_SYLLABUS_PARSER_URL
  }
  if (isPrivateNetworkHostname(hostname)) {
    return `http://${hostname}:8787/parse`
  }

  // Production: use default Worker URL unless overridden
  return DEFAULT_SYLLABUS_PARSER_URL
}

export async function parseSyllabusPdf(file: File): Promise<ParsedSyllabusData> {
  const endpoint = getSyllabusParserEndpoint()

  const formData = new FormData()
  formData.append('file', file)

  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), 45000)

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      throw new Error(`Syllabus parser Worker failed with ${response.status}${errorText ? `: ${errorText}` : ''}`)
    }

    const parsed = normalizeWorkerResponse(await response.json())
    if (!parsed) {
      throw new Error('Syllabus parser Worker returned an invalid response.')
    }

    return parsed
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Syllabus parser Worker timed out. Check that the Worker is deployed and reachable.')
    }
    if (error instanceof TypeError) {
      const isLocalEndpoint = endpoint.startsWith('http://127.0.0.1') || endpoint.startsWith('http://localhost') || endpoint.includes(':8787/parse')
      throw new Error(isLocalEndpoint
        ? `Local syllabus parser Worker is not reachable at ${endpoint}. Start it with npm run worker:dev and configure worker/.dev.vars.`
        : 'Syllabus parser Worker is unreachable. Check the Worker URL, deployment status, and allowed origin configuration.')
    }
    if (error instanceof Error) throw error
    throw new Error('Syllabus parser Worker is unavailable.')
  } finally {
    window.clearTimeout(timeoutId)
  }
}
