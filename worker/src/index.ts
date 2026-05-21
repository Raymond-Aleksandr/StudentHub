type Priority = 'high' | 'medium' | 'low'
type EventType = 'assignment' | 'exam'
type DeadlineType = 'assignment' | 'quiz' | 'test' | 'exam' | 'presentation' | 'project' | 'lab-report' | 'other'

type ParsedCourse = {
    title: string
    code: string
    day: string
    startTime: string
    endTime: string
    time?: string
    location: string
    profName: string
    profEmail: string
    taName: string
    taEmail: string
}

type ParsedEvent = {
    title: string
    courseCode: string
    date: string
    time: string
    priority: Priority
    type: EventType
    deadlineType: DeadlineType
}

type ParsedSyllabusResponse = {
  course: ParsedCourse
  events: ParsedEvent[]
  rawText: string
  source: 'worker'
}

type Env = {
  ALLOWED_ORIGINS?: string
  MAX_FILE_BYTES?: string
  OPENROUTER_API_KEY?: string
  OPENROUTER_MODEL?: string
  OPENROUTER_PDF_ENGINE?: string
  OPENROUTER_SITE_URL?: string
  OPENROUTER_APP_NAME?: string
}

const DEFAULT_ALLOWED_ORIGINS = 'https://raymond-aleksandr.github.io'
const DEFAULT_MAX_FILE_BYTES = 8 * 1024 * 1024
const DEFAULT_MODEL = 'google/gemini-2.5-flash'
const DEFAULT_PDF_ENGINE = 'cloudflare-ai'

function json(data: unknown, init: ResponseInit = {}, origin = '') {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...(origin ? corsHeaders(origin) : {}),
      ...init.headers,
    },
  })
}

function corsHeaders(origin: string) {
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'Origin',
  }
}

function getAllowedOrigins(env: Env) {
  return (env.ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

function getAllowedOrigin(request: Request, env: Env) {
  const origin = request.headers.get('origin') || ''
  if (!origin) return ''
  return getAllowedOrigins(env).includes(origin) ? origin : ''
}

function rejectForbidden() {
  return json({ error: 'This parser only accepts requests from the configured Pages origin.' }, { status: 403 })
}

function parseMaxBytes(env: Env) {
  const parsed = Number(env.MAX_FILE_BYTES)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_FILE_BYTES
}

async function fileToBase64(file: File) {
  const buffer = await file.arrayBuffer()
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }

  return btoa(binary)
}

function schemaPrompt() {
  return [
    'Extract a syllabus into strict JSON for a student planner.',
    'Return only JSON. No markdown. No commentary.',
    'Dates must be ISO yyyy-mm-dd. Times must be 24-hour HH:mm or empty string.',
    'Use empty strings when unknown.',
    'Event type must be "assignment" or "exam".',
    'deadlineType must be one of: assignment, quiz, test, exam, presentation, project, lab-report, other.',
    'priority must be high, medium, or low.',
    'Shape:',
    '{"course":{"title":"","code":"","day":"","startTime":"","endTime":"","time":"","location":"","profName":"","profEmail":"","taName":"","taEmail":""},"events":[{"title":"","courseCode":"","date":"","time":"","priority":"low","type":"assignment","deadlineType":"assignment"}],"rawText":""}',
  ].join('\n')
}

function stripJsonFence(value: string) {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

function isPriority(value: unknown): value is Priority {
  return value === 'high' || value === 'medium' || value === 'low'
}

function isDeadlineType(value: unknown): value is DeadlineType {
  return value === 'assignment' ||
    value === 'quiz' ||
    value === 'test' ||
    value === 'exam' ||
    value === 'presentation' ||
    value === 'project' ||
    value === 'lab-report' ||
    value === 'other'
}

function normalizeParsedPayload(payload: Partial<ParsedSyllabusResponse>): ParsedSyllabusResponse {
  const course: Partial<ParsedCourse> = payload.course || {}
  const events: Array<Partial<ParsedEvent>> = Array.isArray(payload.events) ? payload.events : []

  return {
    course: {
      title: course.title || '',
      code: course.code || '',
      day: course.day || '',
      startTime: course.startTime || '',
      endTime: course.endTime || '',
      time: course.time || [course.startTime, course.endTime].filter(Boolean).join(' - '),
      location: course.location || '',
      profName: course.profName || '',
      profEmail: course.profEmail || '',
      taName: course.taName || '',
      taEmail: course.taEmail || '',
    },
    events: events.map((event): ParsedEvent => {
      const deadlineType = isDeadlineType(event.deadlineType)
        ? event.deadlineType
        : event.type === 'exam' ? 'exam' : 'assignment'
      const type: EventType = deadlineType === 'exam' || deadlineType === 'quiz' || deadlineType === 'test'
        ? 'exam'
        : 'assignment'

      return {
        title: event.title || '',
        courseCode: event.courseCode || course.code || '',
        date: event.date || '',
        time: event.time || '',
        priority: isPriority(event.priority) ? event.priority : event.type === 'exam' ? 'high' : 'low',
        type,
        deadlineType,
      }
    }).filter((event) => event.title && event.date),
    rawText: typeof payload.rawText === 'string' ? payload.rawText : '',
    source: 'worker',
  }
}

function getOpenRouterMessageText(content: unknown) {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''

  return content
    .map((part) => {
      if (typeof part === 'object' && part !== null && 'text' in part) {
        return String((part as { text?: unknown }).text ?? '')
      }
      return ''
    })
    .join('\n')
    .trim()
}

async function parseWithOpenRouter(file: File, env: Env): Promise<ParsedSyllabusResponse> {
  if (!env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not configured.')
  }

  const model = env.OPENROUTER_MODEL || DEFAULT_MODEL
  const pdfEngine = env.OPENROUTER_PDF_ENGINE || DEFAULT_PDF_ENGINE
  const fileBase64 = await fileToBase64(file)
  const fileName = file.name.replace(/[^\w.\- ()]/g, '').slice(0, 120) || 'syllabus.pdf'

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      'content-type': 'application/json',
      'http-referer': env.OPENROUTER_SITE_URL || DEFAULT_ALLOWED_ORIGINS,
      'x-title': env.OPENROUTER_APP_NAME || 'StudentHub',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: schemaPrompt() },
            {
              type: 'file',
              file: {
                filename: fileName,
                file_data: `data:application/pdf;base64,${fileBase64}`,
              },
            },
          ],
        },
      ],
      plugins: [
        {
          id: 'file-parser',
          pdf: { engine: pdfEngine },
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      stream: false,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenRouter returned ${response.status}`)
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: unknown } }>
  }
  const text = getOpenRouterMessageText(data.choices?.[0]?.message?.content)
  if (!text) throw new Error('OpenRouter returned no parse text.')

  return normalizeParsedPayload(JSON.parse(stripJsonFence(text)) as Partial<ParsedSyllabusResponse>)
}

async function handleParse(request: Request, env: Env, origin: string) {
  if (!env.OPENROUTER_API_KEY) {
    return json(
      { error: 'Parser Worker is deployed, but OPENROUTER_API_KEY is not configured.' },
      { status: 501 },
      origin,
    )
  }

  const contentType = request.headers.get('content-type') || ''
  if (!contentType.includes('multipart/form-data')) {
    return json({ error: 'Upload a PDF as multipart/form-data field "file".' }, { status: 415 }, origin)
  }

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return json({ error: 'Missing PDF file field.' }, { status: 400 }, origin)
  }

  if (file.size > parseMaxBytes(env)) {
    return json({ error: 'PDF is larger than this Worker allows.' }, { status: 413 }, origin)
  }

  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    return json({ error: 'Only PDF syllabus uploads are accepted.' }, { status: 415 }, origin)
  }

  const parsed = await parseWithOpenRouter(file, env)
  return json(parsed, { status: 200 }, origin)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const origin = getAllowedOrigin(request, env)

    if (request.method === 'OPTIONS') {
      return origin
        ? new Response(null, { status: 204, headers: corsHeaders(origin) })
        : rejectForbidden()
    }

    if (url.pathname === '/health') {
      return json({ ok: true, parser: 'studenthub-syllabus-parser' })
    }

    if (url.pathname !== '/parse') {
      return json({ error: 'Not found.' }, { status: 404 })
    }

    if (!origin) return rejectForbidden()
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed.' }, { status: 405 }, origin)
    }

    try {
      return await handleParse(request, env, origin)
    } catch (error) {
      console.error(JSON.stringify({
        event: 'parse_failed',
        message: error instanceof Error ? error.message : 'unknown error',
      }))
      return json({ error: 'Could not parse this syllabus.' }, { status: 502 }, origin)
    }
  },
}
