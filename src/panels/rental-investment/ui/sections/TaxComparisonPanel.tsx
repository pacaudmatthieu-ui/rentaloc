import { useMemo } from 'react'
import type { SimulationFormValues } from '../../model/types'
import { calculateResults } from '../../lib/calculations'
import type { SimulationResults } from '../../model/types'

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

const MICRO_FONCIER_LIMIT = 15000
const MICRO_BIC_LIMIT = 77700

export function TaxComparisonPanel({
  values,
  currencyFormatter,
  strings,
}: TaxComparisonPanelProps) {
  const annualRent = useMemo(() => {
    const monthlyRent = Number(values.monthlyRent) || 0
    const monthlyCharges = Number(values.monthlyRecoverableCharges) || 0
    const vacancy = (Number(values.vacancyRate) || 0) / 100
    return (monthlyRent + monthlyCharges) * (1 - vacancy) * 12
  }, [values.monthlyRent, values.monthlyRecoverableCharges, values.vacancyRate])

  const regimes = useMemo((): RegimeInfo[] => {
    const list: RegimeInfo[] = [
      {
        key: 'micro_foncier',
        label: strings.taxMicroFoncier,
        eligible: annualRent <= MICRO_FONCIER_LIMIT,
        reason: annualRent > MICRO_FONCIER_LIMIT
          ? `> ${currencyFormatter.format(MICRO_FONCIER_LIMIT)}/an`
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
        eligible: annualRent <= MICRO_BIC_LIMIT,
        reason: annualRent > MICRO_BIC_LIMIT
          ? `> ${currencyFormatter.format(MICRO_BIC_LIMIT)}/an`
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
    return list
  }, [annualRent, currencyFormatter, strings])

  const results = useMemo(() => {
    const map: Record<string, SimulationResults | null> = {}
    for (const r of regimes) {
      if (!r.eligible) {
        map[r.key] = null
        continue
      }
      try {
        map[r.key] = calculateResults({
          ...values,
          taxRegime: r.key as SimulationFormValues['taxRegime'],
        })
      } catch {
        map[r.key] = null
      }
    }
    return map
  }, [values, regimes])

  // Find the best regime (highest cashflow after tax)
  const bestRegime = useMemo(() => {
    let best: string | null = null
    let bestCashflow = -Infinity
    for (const r of regimes) {
      if (!r.eligible || !results[r.key]) continue
      const cf = results[r.key]!.annualCashflowAfterTax
      if (cf > bestCashflow) {
        bestCashflow = cf
        best = r.key
      }
    }
    return best
  }, [regimes, results])

  const eligibleRegimes = regimes.filter((r) => r.eligible)

  if (annualRent <= 0) return null

  return (
    <div className="tax-comparison-panel">
      <table className="tax-comparison-table">
        <thead>
          <tr>
            <th>{strings.taxRegimeLabel}</th>
            <th>{strings.estimatedAnnualTax}</th>
            <th>{strings.annualCashflowAfterTax}</th>
            <th>{strings.monthlyCashflowAfterTax}</th>
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
                  {currencyFormatter.format(res.annualTax)}
                </td>
                <td className={`tax-comparison-value ${res.annualCashflowAfterTax >= 0 ? 'tax-comparison-positive' : 'tax-comparison-negative'}`}>
                  {currencyFormatter.format(res.annualCashflowAfterTax)}
                </td>
                <td className={`tax-comparison-value ${res.monthlyCashflowAfterTax >= 0 ? 'tax-comparison-positive' : 'tax-comparison-negative'}`}>
                  {currencyFormatter.format(res.monthlyCashflowAfterTax)}
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
