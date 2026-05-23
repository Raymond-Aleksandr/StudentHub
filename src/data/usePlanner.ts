export { PlannerProvider } from './PlannerContext'

import { useContext } from 'react'
import { PlannerContext } from './PlannerContext'
import type { PlannerContextValue } from './PlannerContext'

export function usePlanner(): PlannerContextValue {
  const ctx = useContext(PlannerContext)
  if (!ctx) throw new Error('usePlanner must be used inside PlannerProvider')
  return ctx
}
