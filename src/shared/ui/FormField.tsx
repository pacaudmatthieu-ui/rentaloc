import React from 'react'

interface FormFieldProps {
  label: string
  value: string
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
}

export function FormField({ label, value, onChange }: FormFieldProps) {
  return (
    <label className="form-field">
      <span className="field-label">{label}</span>
      <input
        className="field-input"
        type="text"
        inputMode="decimal"
        value={value}
        onChange={onChange}
      />
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
