import type { MarchandDeBiensValues } from './types'

export function validateMarchandData(data: unknown): data is MarchandDeBiensValues {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  if (!Array.isArray(d.apartments)) return false
  const required: (keyof MarchandDeBiensValues)[] = [
    'purchasePrice', 'agencyFees', 'renovationBudget', 'apartments',
    'apportPercent', 'ratePerYear', 'durationMonths',
  ]
  for (const k of required) {
    if (!(k in d)) return false
  }
  for (const apt of d.apartments as unknown[]) {
    if (!apt || typeof apt !== 'object') return false
    const a = apt as Record<string, unknown>
    if (!['T1','T2','T3','T4','T5'].includes(String(a.type))) return false
    if (typeof a.superficie !== 'string') return false
    if (typeof a.resalePessimistic !== 'string') return false
    if (typeof a.resaleLogic !== 'string') return false
    if (typeof a.resaleOptimistic !== 'string') return false
  }
  return true
}
