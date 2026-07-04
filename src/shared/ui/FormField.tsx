import React from 'react'
import { HelpTip } from './HelpTip'

/**
 * Une saisie est « invalide » si elle n'est pas vide et n'est pas un nombre
 * (espaces de milliers et virgule décimale acceptés). Avant, toute saisie
 * invalide devenait silencieusement 0 — désormais on la signale.
 */
export function isInvalidNumericInput(value: string): boolean {
  if (!value) return false
  const normalized = value.replace(/[\s  ]/g, '').replace(',', '.')
  if (normalized === '' || normalized === '-' || normalized === '.') return true
  return !/^-?\d*\.?\d*$/.test(normalized) || !Number.isFinite(Number(normalized))
}

interface FormFieldProps {
  label: string
  value: string
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  /** Unité affichée dans le champ : '€', '%', 'ans', '€ / mois'… */
  unit?: string
  /** Texte pédagogique affiché dans une bulle « ? » */
  help?: string
  /** Message affiché quand la saisie n'est pas un nombre valide */
  invalidMessage?: string
  /** Désactive la validation numérique (champ texte libre) */
  noValidation?: boolean
}

export function FormField({
  label,
  value,
  onChange,
  unit,
  help,
  invalidMessage,
  noValidation,
}: FormFieldProps) {
  const invalid = !noValidation && isInvalidNumericInput(value)

  return (
    <label className="form-field">
      <span className="field-label">
        {label}
        {help && <HelpTip text={help} />}
      </span>
      <span className={`input-group ${invalid ? 'input-group-invalid' : ''}`}>
        <input
          className="field-input"
          type="text"
          inputMode="decimal"
          value={value}
          onChange={onChange}
          aria-invalid={invalid || undefined}
        />
        {unit && <span className="input-unit">{unit}</span>}
      </span>
      {invalid && (
        <span className="field-error" role="alert">
          {invalidMessage || 'Nombre invalide'}
        </span>
      )}
    </label>
  )
}

interface FormFieldReadOnlyProps {
  label: string
  value: string
}

export function FormFieldReadOnly({ label, value }: FormFieldReadOnlyProps) {
  return (
    <div className="form-field">
      <span className="field-label">{label}</span>
      <span className="field-input field-input-readonly">{value}</span>
    </div>
  )
}
