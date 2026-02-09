export const EXPORT_VERSION = 1

export type ExportSection = 'investissement_locatif' | 'marchand_de_biens'

export interface ExportPayload<T> {
  version: number
  section: ExportSection
  exportedAt: string
  data: T
}

export function exportToJson<T>(
  section: ExportSection,
  data: T,
): void {
  const payload: ExportPayload<T> = {
    version: EXPORT_VERSION,
    section,
    exportedAt: new Date().toISOString(),
    data,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `simu_renta_${section}_${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function validateImportPayload(
  parsed: unknown,
  section: ExportSection,
): { valid: true; data: unknown } | { valid: false; error: string } {
  if (parsed === null || typeof parsed !== 'object') {
    return { valid: false, error: 'invalid_json' }
  }
  const p = parsed as Record<string, unknown>
  if (p.version !== EXPORT_VERSION) {
    return { valid: false, error: 'invalid_format' }
  }
  if (p.section !== section) {
    return { valid: false, error: 'invalid_format' }
  }
  if (!p.data || typeof p.data !== 'object') {
    return { valid: false, error: 'invalid_format' }
  }
  return { valid: true, data: p.data }
}
