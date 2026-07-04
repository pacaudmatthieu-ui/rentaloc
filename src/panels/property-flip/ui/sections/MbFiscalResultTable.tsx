import type { FlipResults } from '../../lib/computeFlipResults'
import { IS_REDUCED_THRESHOLD } from '../../../../entities/finance/fiscal'

interface Props {
  results: FlipResults
  currencyFormatter: Intl.NumberFormat
  strings: Record<string, string>
}

function FiscalTooltip({
  children,
  lines,
}: {
  children: React.ReactNode
  lines: string[]
}) {
  return (
    <div className="mb-vat-cell-tooltip">
      {children}
      <div className="mb-vat-tooltip-content">
        {lines.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    </div>
  )
}

/** Bloc 1 : Résultat d'opération (avant impôt) */
export function MbOperationResultTable({ results: r, currencyFormatter, strings }: Props) {
  const margePercentText = r.margePercent != null ? r.margePercent.toFixed(1) : '–'
  const tvaLabel = r.tvaNette < 0 ? `${strings.mbCreditTva} ${currencyFormatter.format(-r.tvaNette)}` : currencyFormatter.format(r.tvaNette)

  return (
    <div className="mb-taxation-table mb-operation-result-table">
      <table className="mb-vat-table">
        <thead>
          <tr>
            <th></th>
            <th>{strings.mbMontant}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="mb-vat-regime-label">{strings.vatTooltipRevente}</td>
            <td className="mb-vat-cell">{currencyFormatter.format(r.totalRevente)}</td>
          </tr>
          <tr>
            <td className="mb-vat-regime-label">{strings.vatTooltipCout}</td>
            <td className="mb-vat-cell">{currencyFormatter.format(r.totalCostForMarge)}</td>
          </tr>
          <tr>
            <td className="mb-vat-regime-label">{strings.mbTvaAPayer}</td>
            <td className="mb-vat-cell">
              <FiscalTooltip
                lines={[
                  `TVA marge : ${currencyFormatter.format(r.tvaSurMarge)}`,
                  `TVA collectée (prix total) : ${currencyFormatter.format(r.tvaCollecteeTotal)}`,
                  `TVA déductible : −${currencyFormatter.format(r.tvaDeductible)}`,
                  `TVA nette : ${tvaLabel}`,
                ]}
              >
                {tvaLabel}
              </FiscalTooltip>
            </td>
          </tr>
          <tr className="mb-vat-total-row">
            <td className="mb-vat-regime-label">
              <strong>{strings.mbMargeNetteAvantIS}</strong>
            </td>
            <td className="mb-vat-cell">
              <FiscalTooltip
                lines={[
                  `= ${strings.vatTooltipRevente} − ${strings.vatTooltipCout} − TVA`,
                  `= ${currencyFormatter.format(r.totalRevente)} − ${currencyFormatter.format(r.totalCostForMarge)} − ${currencyFormatter.format(r.tvaNette)}`,
                  `= ${currencyFormatter.format(r.margeNetteAvantIS)}`,
                  `${strings.mbMarge} : ${margePercentText}%`,
                ]}
              >
                <strong className={r.margeNetteAvantIS >= 0 ? 'mb-revente-positive' : 'mb-revente-negative'}>
                  {currencyFormatter.format(r.margeNetteAvantIS)}
                </strong>
                <span className="mb-vat-hint"> ({margePercentText}%)</span>
              </FiscalTooltip>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

/** Bloc 2 : Résultat fiscal (IS + Dividendes) */
export function MbFiscalResultTable({ results: r, currencyFormatter, strings }: Props) {
  const flatTaxPercentLabel = `${(r.flatTaxRate * 100).toLocaleString('fr-FR')}%`

  return (
    <div className="mb-taxation-table mb-fiscal-result-table">
      <p className="mb-fiscal-disclaimer">{strings.mbFiscalDisclaimer}</p>
      <table className="mb-vat-table">
        <thead>
          <tr>
            <th></th>
            <th>{strings.mbMontant}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="mb-vat-regime-label">{strings.mbBeneficeImposable}</td>
            <td className="mb-vat-cell">{currencyFormatter.format(r.beneficeImposable)}</td>
          </tr>
          <tr>
            <td className="mb-vat-regime-label">{strings.mbImpotsSocietes}</td>
            <td className="mb-vat-cell">
              <FiscalTooltip
                lines={[
                  `Tranche 1 : ${currencyFormatter.format(Math.min(Math.max(0, r.beneficeImposable), IS_REDUCED_THRESHOLD))} × 15% = ${currencyFormatter.format(r.isTranche1)}`,
                  ...(r.beneficeImposable > IS_REDUCED_THRESHOLD
                    ? [`Tranche 2 : ${currencyFormatter.format(r.beneficeImposable - IS_REDUCED_THRESHOLD)} × 25% = ${currencyFormatter.format(r.isTranche2)}`]
                    : []),
                  `Total IS = ${currencyFormatter.format(r.impotsSocietes)}`,
                ]}
              >
                {currencyFormatter.format(r.impotsSocietes)}
              </FiscalTooltip>
            </td>
          </tr>
          <tr>
            <td className="mb-vat-regime-label">{strings.mbBeneficesNets}</td>
            <td className="mb-vat-cell">
              <FiscalTooltip
                lines={[
                  `${strings.mbBeneficesNets} = ${currencyFormatter.format(r.beneficeImposable)} − ${currencyFormatter.format(r.impotsSocietes)} = ${currencyFormatter.format(r.beneficesNets)}`,
                ]}
              >
                {currencyFormatter.format(r.beneficesNets)}
              </FiscalTooltip>
            </td>
          </tr>
          <tr>
            <td className="mb-vat-regime-label">{strings.mbFlatTaxe} (PFU {flatTaxPercentLabel})</td>
            <td className="mb-vat-cell">
              <FiscalTooltip
                lines={[
                  `${strings.mbFlatTaxe} = ${strings.mbBeneficesNets} × ${flatTaxPercentLabel}`,
                  `= ${currencyFormatter.format(Math.max(0, r.beneficesNets))} × ${r.flatTaxRate.toLocaleString('fr-FR')} = ${currencyFormatter.format(r.flatTax)}`,
                ]}
              >
                {currencyFormatter.format(r.flatTax)}
              </FiscalTooltip>
            </td>
          </tr>
          <tr className="mb-vat-total-row">
            <td className="mb-vat-regime-label"><strong>{strings.mbDividendesEnPoche}</strong></td>
            <td className="mb-vat-cell">
              <FiscalTooltip
                lines={[
                  `${strings.mbDividendesEnPoche} = ${strings.mbBeneficesNets} − ${strings.mbFlatTaxe}`,
                  `= ${currencyFormatter.format(r.beneficesNets)} − ${currencyFormatter.format(r.flatTax)}`,
                  `= ${currencyFormatter.format(r.dividendesEnPoche)}`,
                ]}
              >
                <strong>{currencyFormatter.format(r.dividendesEnPoche)}</strong>
              </FiscalTooltip>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
