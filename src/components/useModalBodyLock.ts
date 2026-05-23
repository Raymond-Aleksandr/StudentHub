import { useEffect } from 'react'

let activeLocks = 0
let pendingUnlock: number | null = null

function lockBodyScroll() {
  if (pendingUnlock !== null) {
    window.clearTimeout(pendingUnlock)
    pendingUnlock = null
  }

  if (activeLocks === 0) {
    document.body.style.overflow = 'hidden'
  }
  activeLocks += 1

  return () => {
    activeLocks = Math.max(0, activeLocks - 1)
    if (activeLocks !== 0) return

    pendingUnlock = window.setTimeout(() => {
      if (activeLocks === 0) {
        document.body.style.overflow = ''
      }
      pendingUnlock = null
    }, 0)
  }
}

export function useModalBodyLock() {
  useEffect(() => lockBodyScroll(), [])
}
