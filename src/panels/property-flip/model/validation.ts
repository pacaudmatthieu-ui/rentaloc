import type { MarchandDeBiensValues } from './types'
import { LOT_TYPES } from './types'

const VALID_TVA_REGIMES = ['exonere', 'marge', 'total']

/** Champs numériques saisis sous forme de chaîne : type vérifié s'ils sont présents
 *  (un objet ou un nombre à la place ferait planter les calculs en aval). */
const REQUIRED_STRING_FIELDS: (keyof MarchandDeBiensValues)[] = [
  'purchasePrice', 'agencyFees', 'apportPercent', 'ratePerYear', 'durationMonths',
]

const OPTIONAL_STRING_FIELDS: (keyof MarchandDeBiensValues)[] = [
  'notaryFeesOverride', 'terrainProportion', 'huissierFees', 'geometreFees',
  'architecteFees', 'fraisDivers', 'travauxHT', 'travaux55', 'travaux10', 'travaux20',
]

export function validateMarchandData(data: unknown): data is MarchandDeBiensValues {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>

  for (const k of REQUIRED_STRING_FIELDS) {
    if (typeof d[k] !== 'string') return false
  }
  for (const k of OPTIONAL_STRING_FIELDS) {
    if (d[k] !== undefined && typeof d[k] !== 'string') return false
  }

  if (!Array.isArray(d.apartments)) return false
  for (const apt of d.apartments as unknown[]) {
    if (!apt || typeof apt !== 'object') return false
    const a = apt as Record<string, unknown>
    if (!(LOT_TYPES as readonly string[]).includes(String(a.type))) return false
    if (typeof a.superficie !== 'string') return false
    if (typeof a.resalePrice !== 'string') return false
    // tvaRegime is optional for backward compatibility, defaults to 'marge'
    if (a.tvaRegime !== undefined && !VALID_TVA_REGIMES.includes(String(a.tvaRegime))) return false
  }

  if (d.extraCharges !== undefined) {
    if (!Array.isArray(d.extraCharges)) return false
    for (const c of d.extraCharges as unknown[]) {
      if (!c || typeof c !== 'object') return false
      const ec = c as Record<string, unknown>
      if (typeof ec.label !== 'string' || typeof ec.amount !== 'string') return false
    }
  }

  return true
}
