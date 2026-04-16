import type { MarchandDeBiensValues } from './types'
import { LOT_TYPES } from './types'

const VALID_TVA_REGIMES = ['exonere', 'marge', 'total']

export function validateMarchandData(data: unknown): data is MarchandDeBiensValues {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  if (!Array.isArray(d.apartments)) return false
  const required: (keyof MarchandDeBiensValues)[] = [
    'purchasePrice', 'agencyFees', 'apartments',
    'apportPercent', 'ratePerYear', 'durationMonths',
  ]
  for (const k of required) {
    if (!(k in d)) return false
  }
  for (const apt of d.apartments as unknown[]) {
    if (!apt || typeof apt !== 'object') return false
    const a = apt as Record<string, unknown>
    if (!(LOT_TYPES as readonly string[]).includes(String(a.type))) return false
    if (typeof a.superficie !== 'string') return false
    if (typeof a.resalePrice !== 'string') return false
    // tvaRegime is optional for backward compatibility, defaults to 'marge'
    if (a.tvaRegime !== undefined && !VALID_TVA_REGIMES.includes(String(a.tvaRegime))) return false
  }
  return true
}
