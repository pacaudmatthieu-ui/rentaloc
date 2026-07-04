import type { FlipResults } from '../../lib/computeFlipResults'

interface MargeVatTableProps {
  results: FlipResults
  currencyFormatter: Intl.NumberFormat
  strings: Record<string, string>
}

function VatTooltip({
  children,
  lines,
  className,
}: {
  children: React.ReactNode
  lines: string[]
  className?: string
}) {
  return (
    <div className={`mb-vat-cell-tooltip ${className ?? ''}`}>
      {children}
      <div className="mb-vat-tooltip-content">
        {lines.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    </div>
  )
}

export function MargeVatTable({ results: r, currencyFormatter, strings }: MargeVatTableProps) {
  const formatResto = (v: number) =>
    v < 0
      ? { text: `${strings.mbCreditTva} ${currencyFormatter.format(-v)}`, isCredit: true }
      : { text: currencyFormatter.format(v), isCredit: false }

  const netResto = formatResto(r.tvaNette)
  const deductiblePercent = (r.deductibleShare * 100).toFixed(0)

  return (
    <div className="mb-taxation-table">
      <table className="mb-vat-table">
        <thead>
          <tr>
            <th>{strings.mbLotTvaRegime}</th>
            <th>{strings.mbResalePrice}</th>
            <th>{strings.vatTooltipCout}</th>
            <th>TVA</th>
          </tr>
        </thead>
        <tbody>
          {r.nbExonere > 0 && (
            <tr>
              <td className="mb-vat-regime-label">
                {strings.mbTvaExonere}
                <span className="mb-vat-hint"> ({r.nbExonere} lot{r.nbExonere > 1 ? 's' : ''})</span>
              </td>
              <td className="mb-vat-cell">{currencyFormatter.format(r.totalExonere)}</td>
              <td className="mb-vat-cell">{currencyFormatter.format(r.coutAlloueExonere)}</td>
              <td className="mb-vat-cell">–</td>
            </tr>
          )}

          {r.nbMarge > 0 && (
            <tr>
              <td className="mb-vat-regime-label">
                {strings.mbTvaMarge}
                <span className="mb-vat-hint"> ({r.nbMarge} lot{r.nbMarge > 1 ? 's' : ''})</span>
              </td>
              <td className="mb-vat-cell">{currencyFormatter.format(r.totalMarge)}</td>
              <td className="mb-vat-cell">
                <VatTooltip
                  lines={[
                    `Proportion lots marge : ${r.effectiveTerrainProportion.toFixed(1)}%`,
                    `Coût complet alloué = ${currencyFormatter.format(r.totalCostForMarge)} × ${(r.ratioMarge * 100).toFixed(1)}% = ${currencyFormatter.format(r.coutAlloueMarge)}`,
                  ]}
                >
                  {currencyFormatter.format(r.coutAlloueMarge)}
                </VatTooltip>
              </td>
              <td className="mb-vat-cell">
                <VatTooltip
                  lines={[
                    `Assiette légale (art. 268 CGI) : prix de vente − quote-part du prix d'acquisition (achat + notaire). Travaux et frais n'entrent pas dans la marge : leur TVA se déduit à part.`,
                    `Prix d'acquisition alloué = ${currencyFormatter.format(r.acquisitionBase)} × ${(r.ratioMarge * 100).toFixed(1)}% = ${currencyFormatter.format(r.acquisitionAlloueMarge)}`,
                    `${strings.vatTooltipMarge} = ${currencyFormatter.format(r.totalMarge)} − ${currencyFormatter.format(r.acquisitionAlloueMarge)} = ${currencyFormatter.format(r.margeTaxable)}`,
                    `${strings.mbVatSurMarge} = ${currencyFormatter.format(Math.max(0, r.margeTaxable))} × 20/120 = ${currencyFormatter.format(r.tvaSurMarge)}`,
                  ]}
                >
                  <div>{strings.mbVatSurMarge}: {currencyFormatter.format(r.tvaSurMarge)}</div>
                </VatTooltip>
              </td>
            </tr>
          )}

          {r.nbTotal > 0 && (
            <tr>
              <td className="mb-vat-regime-label">
                {strings.mbTvaTotal}
                <span className="mb-vat-hint"> ({r.nbTotal} lot{r.nbTotal > 1 ? 's' : ''})</span>
              </td>
              <td className="mb-vat-cell">{currencyFormatter.format(r.totalTvaTotal)}</td>
              <td className="mb-vat-cell">{currencyFormatter.format(r.coutAlloueTotal)}</td>
              <td className="mb-vat-cell">
                <VatTooltip
                  lines={[
                    `TVA collectée = ${currencyFormatter.format(r.totalTvaTotal)} × 20/120 = ${currencyFormatter.format(r.tvaCollecteeTotal)}`,
                  ]}
                >
                  <div>TVA: {currencyFormatter.format(r.tvaCollecteeTotal)}</div>
                </VatTooltip>
              </td>
            </tr>
          )}

          <tr>
            <td className="mb-vat-regime-label">{strings.mbVatCharge}</td>
            <td className="mb-vat-cell" colSpan={2}>–</td>
            <td className="mb-vat-cell">
              <VatTooltip
                lines={[
                  `TVA ${strings.vatTooltipTravaux} = ${currencyFormatter.format(r.tvaTravaux)}`,
                  `TVA charges (20%) = ${currencyFormatter.format(r.autresChargesHT * 0.2)}`,
                  `TVA ${strings.vatTooltipAgence} (20%) = ${currencyFormatter.format(r.agencyFees * (0.2 / 1.2))}`,
                  `Sous-total = ${currencyFormatter.format(r.tvaDeductibleBrute)}`,
                  `Part déductible (CA taxé ${deductiblePercent}%) = ${currencyFormatter.format(r.tvaDeductible)}`,
                ]}
              >
                {currencyFormatter.format(r.tvaDeductible)}
              </VatTooltip>
            </td>
          </tr>

          <tr className="mb-vat-total-row">
            <td className="mb-vat-regime-label"><strong>{strings.mbTotal}</strong></td>
            <td className="mb-vat-cell"><strong>{currencyFormatter.format(r.totalRevente)}</strong></td>
            <td className="mb-vat-cell"><strong>{currencyFormatter.format(r.totalCostForMarge)}</strong></td>
            <td className="mb-vat-cell">
              <VatTooltip
                lines={[
                  `${strings.mbAResterPayer} = TVA marge (${currencyFormatter.format(r.tvaSurMarge)}) + TVA collectée (${currencyFormatter.format(r.tvaCollecteeTotal)}) − TVA déductible (${currencyFormatter.format(r.tvaDeductible)})`,
                  `= ${netResto.text}`,
                ]}
              >
                <strong className={netResto.isCredit ? 'mb-vat-credit' : ''}>{netResto.text}</strong>
              </VatTooltip>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
