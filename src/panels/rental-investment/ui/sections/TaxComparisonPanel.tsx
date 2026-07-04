import { useMemo } from 'react'
import type { SimulationFormValues } from '../../model/types'
import { calculateResults, computeYearlyTableData } from '../../lib/calculations'
import type { SimulationResults } from '../../model/types'
import { MICRO_FONCIER_CAP, MICRO_BIC_CAP } from '../../../../entities/finance/fiscal'

interface TaxComparisonPanelProps {
  values: SimulationFormValues
  currencyFormatter: Intl.NumberFormat
  strings: Record<string, string>
}

type RegimeInfo = {
  key: string
  label: string
  eligible: boolean
  reason?: string
}

type RegimeComputed = {
  year1: SimulationResults
  /** Impôts cumulés sur toute la durée (détention si revente renseignée, sinon durée du prêt) */
  cumulativeTax: number
  /** Cash disponible cumulé après impôts sur toute la durée (revente incluse) */
  cumulativeCash: number
  years: number
}

export function TaxComparisonPanel({
  values,
  currencyFormatter,
  strings,
}: TaxComparisonPanelProps) {
  // Plafonds légaux appréciés sur les recettes brutes annuelles :
  // micro-foncier → loyers hors charges ; micro-BIC → loyers charges comprises
  const annualRentHC = (Number(values.monthlyRent) || 0) * 12
  const annualRecettesCC =
    ((Number(values.monthlyRent) || 0) + (Number(values.monthlyRecoverableCharges) || 0)) * 12

  const regimes = useMemo((): RegimeInfo[] => {
    return [
      {
        key: 'micro_foncier',
        label: strings.taxMicroFoncier,
        eligible: annualRentHC <= MICRO_FONCIER_CAP,
        reason:
          annualRentHC > MICRO_FONCIER_CAP
            ? `> ${currencyFormatter.format(MICRO_FONCIER_CAP)}/an`
            : undefined,
      },
      {
        key: 'reel_foncier',
        label: strings.taxReelFoncier,
        eligible: true,
      },
      {
        key: 'lmnp_micro_bic',
        label: strings.taxLmnpMicro,
        eligible: annualRecettesCC <= MICRO_BIC_CAP,
        reason:
          annualRecettesCC > MICRO_BIC_CAP
            ? `> ${currencyFormatter.format(MICRO_BIC_CAP)}/an`
            : undefined,
      },
      {
        key: 'lmnp_reel',
        label: strings.taxLmnpReel,
        eligible: true,
      },
      {
        key: 'sci_is',
        label: strings.taxSciIs,
        eligible: true,
      },
    ]
  }, [annualRentHC, annualRecettesCC, currencyFormatter, strings])

  // Comparaison sur TOUTE la durée (reports de déficit, réserve d'amortissement
  // et fiscalité de revente compris) — pas seulement sur l'année 1, qui peut être
  // trompeuse (gros travaux → le réel paraît magique un an, le cumul peut s'inverser).
  const results = useMemo(() => {
    const map: Record<string, RegimeComputed | null> = {}
    for (const r of regimes) {
      if (!r.eligible) {
        map[r.key] = null
        continue
      }
      try {
        const regimeValues = {
          ...values,
          taxRegime: r.key as SimulationFormValues['taxRegime'],
        }
        const year1 = calculateResults(regimeValues)
        const rows = computeYearlyTableData(regimeValues)
        const cumulativeTax = rows.reduce((s, row) => s + row.tax + row.saleTax, 0)
        const cumulativeCash = rows.reduce((s, row) => s + row.cashDispo, 0)
        map[r.key] = { year1, cumulativeTax, cumulativeCash, years: rows.length }
      } catch {
        map[r.key] = null
      }
    }
    return map
  }, [values, regimes])

  // Meilleur régime = cash disponible cumulé le plus élevé sur la durée
  const bestRegime = useMemo(() => {
    let best: string | null = null
    let bestCash = -Infinity
    for (const r of regimes) {
      const res = results[r.key]
      if (!r.eligible || !res) continue
      if (res.cumulativeCash > bestCash) {
        bestCash = res.cumulativeCash
        best = r.key
      }
    }
    return best
  }, [regimes, results])

  const eligibleRegimes = regimes.filter((r) => r.eligible)
  const horizonYears = results[eligibleRegimes[0]?.key]?.years ?? 0

  if (annualRecettesCC <= 0) return null

  return (
    <div className="tax-comparison-panel">
      <p className="tax-comparison-horizon">
        {strings.taxComparisonHorizon} {horizonYears} {strings.taxComparisonYears}
      </p>
      <table className="tax-comparison-table">
        <thead>
          <tr>
            <th>{strings.taxRegimeLabel}</th>
            <th>{strings.estimatedAnnualTax}</th>
            <th>{strings.monthlyCashflowAfterTax}</th>
            <th>{strings.taxCumulativeTax}</th>
            <th>{strings.taxCumulativeCash}</th>
          </tr>
        </thead>
        <tbody>
          {eligibleRegimes.map((r) => {
            const res = results[r.key]
            if (!res) return null
            const isBest = r.key === bestRegime
            return (
              <tr key={r.key} className={isBest ? 'tax-comparison-best' : ''}>
                <td className="tax-comparison-regime">
                  {r.label}
                  {isBest && <span className="tax-comparison-badge">{strings.bestScenario}</span>}
                </td>
                <td className="tax-comparison-value">
                  {currencyFormatter.format(res.year1.annualTax)}
                </td>
                <td className={`tax-comparison-value ${res.year1.monthlyCashflowAfterTax >= 0 ? 'tax-comparison-positive' : 'tax-comparison-negative'}`}>
                  {currencyFormatter.format(res.year1.monthlyCashflowAfterTax)}
                </td>
                <td className="tax-comparison-value">
                  {currencyFormatter.format(res.cumulativeTax)}
                </td>
                <td className={`tax-comparison-value ${res.cumulativeCash >= 0 ? 'tax-comparison-positive' : 'tax-comparison-negative'}`}>
                  {currencyFormatter.format(res.cumulativeCash)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {regimes.some((r) => !r.eligible) && (
        <div className="tax-comparison-excluded">
          {regimes.filter((r) => !r.eligible).map((r) => (
            <span key={r.key} className="tax-comparison-excluded-item">
              {r.label} — {r.reason}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
