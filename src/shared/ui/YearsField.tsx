import { useEffect, useState } from 'react'
import { FormField } from './FormField'
import { toNumber } from '../lib/format'

interface YearsFieldProps {
  label: string
  /** Valeur stockée, en MOIS (le modèle de données reste en mois) */
  months: string
  onMonthsChange: (months: string) => void
  unit: string
  help?: string
  invalidMessage?: string
}

function monthsToYearsDisplay(months: string): string {
  const m = toNumber(months)
  if (m <= 0) return ''
  const years = m / 12
  return Number.isInteger(years) ? String(years) : String(Math.round(years * 100) / 100)
}

/**
 * Saisie d'une durée en ANNÉES (tout le monde pense « 20 ans », pas « 240 mois »)
 * avec conversion transparente vers le modèle stocké en mois.
 */
export function YearsField({ label, months, onMonthsChange, unit, help, invalidMessage }: YearsFieldProps) {
  const [text, setText] = useState(() => monthsToYearsDisplay(months))

  // Resynchronise l'affichage si la valeur change de l'extérieur (import, chargement…)
  useEffect(() => {
    const current = toNumber(text) * 12
    const incoming = toNumber(months)
    if (Math.round(current) !== Math.round(incoming)) {
      setText(monthsToYearsDisplay(months))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [months])

  return (
    <FormField
      label={label}
      value={text}
      unit={unit}
      help={help}
      invalidMessage={invalidMessage}
      onChange={(e) => {
        const v = e.target.value
        setText(v)
        const years = toNumber(v)
        onMonthsChange(years > 0 ? String(Math.round(years * 12)) : '')
      }}
    />
  )
}
