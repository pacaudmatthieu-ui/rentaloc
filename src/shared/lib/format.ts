export function toNumber(value: string): number {
  if (!value) return 0
  const normalized = value.replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

export function createCurrencyFormatter(locale: 'en' | 'fr'): Intl.NumberFormat {
  return new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  })
}

export function createPercentFormatter(locale: 'en' | 'fr'): Intl.NumberFormat {
  return new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
    style: 'percent',
    maximumFractionDigits: 1,
  })
}
