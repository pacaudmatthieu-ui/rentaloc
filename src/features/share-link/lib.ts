import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import type { SimulationFormValues } from '../../panels/rental-investment/model/types'
import type { MarchandDeBiensValues } from '../../panels/property-flip/model/types'
import { validateInvestissementData } from '../../panels/rental-investment/model/validation'
import { validateMarchandData } from '../../panels/property-flip/model/validation'

export type ShareType = 'rental' | 'flip'

export type ParsedShare =
  | { type: 'rental'; data: SimulationFormValues }
  | { type: 'flip'; data: MarchandDeBiensValues }

/**
 * Encode la simulation complète dans l'URL (compressée) : le lien recrée la
 * simulation à l'identique chez celui qui l'ouvre — rien ne transite par un
 * serveur.
 */
export function buildShareUrl(type: ShareType, data: unknown): string {
  const compressed = compressToEncodedURIComponent(JSON.stringify(data))
  const base = `${window.location.origin}${window.location.pathname}`
  return `${base}#s=${type}.${compressed}`
}

/** Lit et valide une simulation partagée depuis le hash de l'URL. */
export function parseShareHash(hash: string): ParsedShare | null {
  const match = /^#s=(rental|flip)\.(.+)$/.exec(hash)
  if (!match) return null
  try {
    const json = decompressFromEncodedURIComponent(match[2])
    if (!json) return null
    const data: unknown = JSON.parse(json)
    if (match[1] === 'rental' && validateInvestissementData(data)) {
      return { type: 'rental', data }
    }
    if (match[1] === 'flip' && validateMarchandData(data)) {
      return { type: 'flip', data }
    }
    return null
  } catch {
    return null
  }
}
