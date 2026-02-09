interface BreakdownRowProps {
  label: string
  value: string
}

export function BreakdownRow({ label, value }: BreakdownRowProps) {
  return (
    <div className="breakdown-row">
      <span className="breakdown-label">{label}</span>
      <span className="breakdown-value">{value}</span>
    </div>
  )
}
