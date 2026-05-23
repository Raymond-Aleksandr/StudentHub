import { Capacitor } from '@capacitor/core'

export function isNativeRuntime() {
  return Capacitor.isNativePlatform()
}

export function getNativePlatform() {
  return Capacitor.getPlatform()
}
