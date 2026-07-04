import type { ReactNode } from 'react'
import { HelpTip } from './HelpTip'

export type VerdictKpi = {
  label: string
  value: string
  tone?: 'positive' | 'negative' | 'neutral'
  help?: string
}

interface VerdictBarProps {
  /** Le chiffre héros, déjà formaté (ex. « −87 € ») */
  figure: string
  /** Unité du chiffre héros (ex. « / mois après impôts ») */
  figureUnit: string
  tone: 'positive' | 'negative' | 'neutral'
  /** Phrase verdict en langage courant */
  phrase: ReactNode
  kpis: VerdictKpi[]
}

/**
 * Bandeau de synthèse sticky : LE chiffre que l'utilisateur cherche,
 * une phrase verdict en français courant, et 2-3 indicateurs clés.
 * Reste visible pendant la saisie pour un feedback immédiat.
 */
export function VerdictBar({ figure, figureUnit, tone, phrase, kpis }: VerdictBarProps) {
  return (
    <div className="verdict-bar">
      <div className="verdict-left">
        <div className="verdict-main">
          <span className={`verdict-figure verdict-${tone}`}>{figure}</span>
          <span className="verdict-unit">{figureUnit}</span>
        </div>
        <div className="verdict-phrase">{phrase}</div>
      </div>
      <div className="verdict-kpis">
        {kpis.map((kpi) => (
          <div className="verdict-kpi" key={kpi.label}>
            <div className={`verdict-kpi-value verdict-${kpi.tone ?? 'neutral'}`}>{kpi.value}</div>
            <div className="verdict-kpi-label">
              {kpi.label}
              {kpi.help && <HelpTip text={kpi.help} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
