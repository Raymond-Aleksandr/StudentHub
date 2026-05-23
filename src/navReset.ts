type NavResetState = {
  navResetAt?: number
}

export function getNavResetAt(state: unknown) {
  if (!state || typeof state !== 'object') return 0
  const resetAt = (state as NavResetState).navResetAt
  return typeof resetAt === 'number' ? resetAt : 0
}

export function isActiveNavPath(currentPath: string, targetPath: string) {
  return currentPath === targetPath
}

export function scrollPlannerToTop() {
  window.requestAnimationFrame(() => {
    document.querySelector('.app-main')?.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  })
}
