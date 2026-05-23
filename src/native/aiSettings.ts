import { Preferences } from '@capacitor/preferences'
import { isNativeRuntime } from './runtime'

const aiSettingsKey = 'studenthub.nativeAiSettings'

export type NativeAiProvider = 'openai' | 'google' | 'openrouter' | 'deepseek'

export interface NativeAiSettings {
  provider: NativeAiProvider
  apiKey: string
  model: string
}

type NativeAiProviderOption = {
  value: NativeAiProvider
  label: string
  keyLabel: string
  keyPlaceholder: string
  detail: string
}

type NativeAiModelOption = {
  value: string
  label: string
  detail: string
}

export const nativeAiProviderOptions: NativeAiProviderOption[] = [
  {
    value: 'openai',
    label: 'OpenAI',
    keyLabel: 'OpenAI API key',
    keyPlaceholder: 'sk-...',
    detail: 'Direct PDF parsing with an OpenAI multimodal model.',
  },
  {
    value: 'google',
    label: 'Google Gemini',
    keyLabel: 'Gemini API key',
    keyPlaceholder: 'AIza...',
    detail: 'Direct PDF parsing with Gemini document understanding.',
  },
  {
    value: 'openrouter',
    label: 'OpenRouter',
    keyLabel: 'OpenRouter API key',
    keyPlaceholder: 'sk-or-v1-...',
    detail: 'One key for many hosted models, with OpenRouter PDF parsing.',
  },
  {
    value: 'deepseek',
    label: 'DeepSeek',
    keyLabel: 'OpenRouter API key',
    keyPlaceholder: 'sk-or-v1-...',
    detail: 'Runs DeepSeek through OpenRouter so syllabus PDFs can be parsed.',
  },
]

const nativeAiModelOptionsByProvider: Record<NativeAiProvider, NativeAiModelOption[]> = {
  openai: [
    {
      value: 'gpt-4o-mini',
      label: 'GPT-4o mini',
      detail: 'Recommended OpenAI preset for accurate syllabus extraction.',
    },
    {
      value: 'gpt-4o',
      label: 'GPT-4o',
      detail: 'Stronger OpenAI preset for messy or long syllabi.',
    },
    {
      value: 'gpt-4.1',
      label: 'GPT-4.1',
      detail: 'Newer OpenAI preset for advanced document extraction.',
    },
  ],
  google: [
    {
      value: 'gemini-3.5-flash',
      label: 'Gemini 3.5 Flash',
      detail: 'Recommended Gemini preset for fast PDF extraction.',
    },
    {
      value: 'gemini-2.5-flash',
      label: 'Gemini 2.5 Flash',
      detail: 'Fallback Gemini preset when the newest model is unavailable.',
    },
    {
      value: 'gemini-2.5-pro',
      label: 'Gemini 2.5 Pro',
      detail: 'Stronger Gemini preset for complex syllabi.',
    },
  ],
  openrouter: [
    {
      value: 'google/gemini-3.5-flash',
      label: 'Gemini 3.5 Flash',
      detail: 'Recommended OpenRouter preset with built-in PDF parsing.',
    },
    {
      value: 'google/gemini-2.5-flash',
      label: 'Gemini 2.5 Flash',
      detail: 'Fallback OpenRouter preset when the newest model is unavailable.',
    },
    {
      value: 'google/gemini-2.5-pro',
      label: 'Gemini 2.5 Pro',
      detail: 'Stronger OpenRouter preset for messy PDFs.',
    },
    {
      value: 'openai/gpt-4.1-mini',
      label: 'OpenAI GPT-4.1 mini',
      detail: 'OpenAI model routed through OpenRouter.',
    },
  ],
  deepseek: [
    {
      value: 'deepseek/deepseek-v4-flash',
      label: 'DeepSeek V4 Flash',
      detail: 'DeepSeek through OpenRouter with PDF text extraction first.',
    },
    {
      value: 'deepseek/deepseek-v4-pro',
      label: 'DeepSeek V4 Pro',
      detail: 'Stronger DeepSeek preset through OpenRouter.',
    },
  ],
}

export const defaultNativeAiSettings: NativeAiSettings = {
  provider: 'openai',
  apiKey: '',
  model: 'gpt-4o-mini',
}

export function getNativeAiProviderOption(provider: NativeAiProvider) {
  return nativeAiProviderOptions.find((option) => option.value === provider) ?? nativeAiProviderOptions[0]
}

export function getNativeAiModelOptions(provider: NativeAiProvider) {
  return nativeAiModelOptionsByProvider[provider] ?? nativeAiModelOptionsByProvider[defaultNativeAiSettings.provider]
}

export function getDefaultNativeAiModel(provider: NativeAiProvider) {
  return getNativeAiModelOptions(provider)[0]?.value ?? defaultNativeAiSettings.model
}

export function getNativeAiModelOption(provider: NativeAiProvider, model: string) {
  return getNativeAiModelOptions(provider).find((option) => option.value === model)
}

export function isNativeAiProvider(value: unknown): value is NativeAiProvider {
  return value === 'openai' || value === 'google' || value === 'openrouter' || value === 'deepseek'
}

export function normalizeNativeAiSettings(value: Partial<NativeAiSettings> | null | undefined): NativeAiSettings {
  const provider = isNativeAiProvider(value?.provider) ? value.provider : defaultNativeAiSettings.provider
  const model = getNativeAiModelOption(provider, value?.model ?? '')?.value ?? getDefaultNativeAiModel(provider)

  return {
    provider,
    model,
    apiKey: typeof value?.apiKey === 'string' ? value.apiKey : '',
  }
}

export async function readNativeAiSettings(): Promise<NativeAiSettings> {
  const value = isNativeRuntime()
    ? (await Preferences.get({ key: aiSettingsKey })).value
    : window.localStorage.getItem(aiSettingsKey)
  if (!value) return defaultNativeAiSettings

  try {
    return normalizeNativeAiSettings(JSON.parse(value) as Partial<NativeAiSettings>)
  } catch {
    return defaultNativeAiSettings
  }
}

export async function saveNativeAiSettings(settings: NativeAiSettings) {
  const value = JSON.stringify(normalizeNativeAiSettings(settings))
  if (isNativeRuntime()) {
    await Preferences.set({ key: aiSettingsKey, value })
    return
  }
  window.localStorage.setItem(aiSettingsKey, value)
}

export async function clearNativeAiSettings() {
  if (isNativeRuntime()) {
    await Preferences.remove({ key: aiSettingsKey })
    return
  }
  window.localStorage.removeItem(aiSettingsKey)
}

async function readVerificationError(response: Response) {
  const text = await response.text().catch(() => '')
  if (!text) return ''

  try {
    const body = JSON.parse(text) as { error?: { message?: unknown }, message?: unknown }
    const message = body.error?.message ?? body.message
    return typeof message === 'string' ? message : text
  } catch {
    return text
  }
}

async function requireOk(response: Response, providerLabel: string) {
  if (response.ok) return
  const detail = await readVerificationError(response)
  throw new Error(`${providerLabel} returned ${response.status}${detail ? `: ${detail.slice(0, 180)}` : ''}`)
}

async function verifyOpenRouterSettings(apiKey: string, model: string, signal: AbortSignal) {
  await requireOk(await fetch('https://openrouter.ai/api/v1/auth/key', {
    headers: { authorization: `Bearer ${apiKey}` },
    signal,
  }), 'OpenRouter')

  const response = await fetch('https://openrouter.ai/api/v1/models', {
    headers: { authorization: `Bearer ${apiKey}` },
    signal,
  })
  await requireOk(response, 'OpenRouter')

  const data = await response.json().catch(() => null) as { data?: Array<{ id?: unknown }> } | null
  const modelExists = data?.data?.some((item) => item.id === model)
  if (data?.data?.length && !modelExists) {
    throw new Error(`${model} is not listed by OpenRouter.`)
  }
}

export async function verifyNativeAiSettings(settings: NativeAiSettings) {
  const normalized = normalizeNativeAiSettings(settings)
  const apiKey = normalized.apiKey.trim()
  const providerOption = getNativeAiProviderOption(normalized.provider)

  if (!apiKey) {
    throw new Error(`Add your ${providerOption.keyLabel} first.`)
  }

  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), 15000)

  try {
    if (normalized.provider === 'google') {
      await requireOk(await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(normalized.model)}?key=${encodeURIComponent(apiKey)}`, {
        signal: controller.signal,
      }), 'Google Gemini')
      return
    }

    if (normalized.provider === 'openai') {
      await requireOk(await fetch(`https://api.openai.com/v1/models/${encodeURIComponent(normalized.model)}`, {
        headers: { authorization: `Bearer ${apiKey}` },
        signal: controller.signal,
      }), 'OpenAI')
      return
    }

    await verifyOpenRouterSettings(apiKey, normalized.model, controller.signal)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`${providerOption.label} check timed out.`)
    }
    if (error instanceof Error) throw error
    throw new Error(`${providerOption.label} check failed.`)
  } finally {
    window.clearTimeout(timeoutId)
  }
}
