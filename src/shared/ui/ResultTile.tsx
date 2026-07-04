import { HelpTip } from './HelpTip'

interface ResultTileProps {
  label: string
  value: string
  variant?: 'default' | 'positive' | 'negative'
  /** Texte pédagogique affiché dans une bulle « ? » */
  help?: string
}

export function ResultTile({
  label,
  value,
  variant = 'default',
  help,
}: ResultTileProps) {
  return (
    <div className={`result-tile result-tile-${variant}`}>
      <span className="result-label">
        {label}
        {help && <HelpTip text={help} />}
      </span>
      <span className="result-value">{value}</span>
    </div>
  )
}
