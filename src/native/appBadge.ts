import { registerPlugin } from '@capacitor/core'
import { getNativePlatform, isNativeRuntime } from './runtime'

interface AppBadgePlugin {
  clear(): Promise<void>
  cancelReminders(): Promise<void>
  scheduleReminders(options: {
    reminders: Array<{
      id: string
      title: string
      body: string
      at: string
      extra: Record<string, string>
    }>
  }): Promise<{ scheduled: number }>
}

const AppBadge = registerPlugin<AppBadgePlugin>('AppBadge')

export async function clearAppBadge() {
  if (!isNativeRuntime() || getNativePlatform() !== 'ios') return
  try {
    await AppBadge.clear()
  } catch {
    // Badge permission can be disabled independently of alerts.
  }
}

export async function cancelBadgeReminders() {
  if (!isNativeRuntime() || getNativePlatform() !== 'ios') return true
  try {
    await AppBadge.cancelReminders()
    return true
  } catch {
    return false
  }
}

export async function scheduleBadgeReminders(reminders: Array<{
  id: string
  title: string
  body: string
  at: Date
  extra: Record<string, string>
}>) {
  if (!isNativeRuntime() || getNativePlatform() !== 'ios') return true
  try {
    await AppBadge.scheduleReminders({
      reminders: reminders.map((reminder) => ({
        ...reminder,
        at: reminder.at.toISOString(),
      })),
    })
    return true
  } catch {
    return false
  }
}
