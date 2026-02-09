interface ResultTileProps {
  label: string
  value: string
  variant?: 'default' | 'positive' | 'negative'
}

export function ResultTile({
  label,
  value,
  variant = 'default',
}: ResultTileProps) {
  return (
    <div className={`result-tile result-tile-${variant}`}>
      <span className="result-label">{label}</span>
      <span className="result-value">{value}</span>
    </div>
  )
}
