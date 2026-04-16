import type { LotItem } from '../../model/types'
import {
  computeTvaDeductible,
  VAT_RATE_TRAVAUX,
  VAT_RATE_AGENCE,
  VAT_RATE_MARGE,
} from '../../../../entities/finance/vat'

interface MargeVatTableProps {
  apartments: LotItem[]
  totalCostForMarge: number
  travauxHT: number
  autresChargesHT: number
  agencyFees: number
  terrainProportion: number
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

export function MargeVatTable({
  apartments,
  totalCostForMarge,
  travauxHT,
  autresChargesHT,
  agencyFees,
  terrainProportion,
  currencyFormatter,
  strings,
}: MargeVatTableProps) {
  const totalExonere = apartments
    .filter((a) => a.tvaRegime === 'exonere')
    .reduce((s, a) => s + (Number(a.resalePrice) || 0), 0)

  const totalMarge = apartments
    .filter((a) => a.tvaRegime === 'marge')
    .reduce((s, a) => s + (Number(a.resalePrice) || 0), 0)

  const totalTvaTotal = apartments
    .filter((a) => a.tvaRegime === 'total')
    .reduce((s, a) => s + (Number(a.resalePrice) || 0), 0)

  const totalRevente = totalExonere + totalMarge + totalTvaTotal

  // Proportion terrain (%) → ratio pour allouer le coût aux lots marge
  const ratioMarge = terrainProportion / 100
  const ratioTotal = totalRevente > 0 ? totalTvaTotal / totalRevente : 0

  const coutAlloueMarge = totalCostForMarge * ratioMarge
  const coutAlloueTotal = totalCostForMarge * ratioTotal
  const coutAlloueExonere = totalCostForMarge - coutAlloueMarge - coutAlloueTotal

  // TVA sur marge
  const margeBrute = totalMarge - coutAlloueMarge
  const tvaSurMarge = margeBrute > 0
    ? margeBrute * (VAT_RATE_MARGE / (1 + VAT_RATE_MARGE))
    : 0

  // TVA déductible (travaux 10%, autres charges + agence 20%)
  const tvaTravaux = travauxHT * VAT_RATE_TRAVAUX
  const tvaAutresCharges = autresChargesHT * VAT_RATE_AGENCE
  const tvaAgence = agencyFees * (VAT_RATE_AGENCE / (1 + VAT_RATE_AGENCE))
  const tvaDeductible = tvaTravaux + tvaAutresCharges + tvaAgence
  const aRestoPayerMarge = tvaSurMarge - tvaDeductible

  // TVA sur prix total
  const tvaSurTotal = totalTvaTotal * (VAT_RATE_MARGE / (1 + VAT_RATE_MARGE))
  const tvaDeductibleTotal = travauxHT * ratioTotal * VAT_RATE_TRAVAUX
  const resteTvaTotal = Math.max(0, tvaSurTotal - tvaDeductibleTotal)

  const totalTvaAPayer = Math.max(0, aRestoPayerMarge) + resteTvaTotal

  const formatResto = (v: number) =>
    v < 0
      ? { text: `${strings.mbCreditTva} ${currencyFormatter.format(-v)}`, isCredit: true }
      : { text: currencyFormatter.format(v), isCredit: false }

  const nbExonere = apartments.filter((a) => a.tvaRegime === 'exonere').length
  const nbMarge = apartments.filter((a) => a.tvaRegime === 'marge').length
  const nbTotal = apartments.filter((a) => a.tvaRegime === 'total').length

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
          {nbExonere > 0 && (
            <tr>
              <td className="mb-vat-regime-label">
                {strings.mbTvaExonere}
                <span className="mb-vat-hint"> ({nbExonere} lot{nbExonere > 1 ? 's' : ''})</span>
              </td>
              <td className="mb-vat-cell">{currencyFormatter.format(totalExonere)}</td>
              <td className="mb-vat-cell">{currencyFormatter.format(coutAlloueExonere)}</td>
              <td className="mb-vat-cell">–</td>
            </tr>
          )}

          {nbMarge > 0 && (
            <tr>
              <td className="mb-vat-regime-label">
                {strings.mbTvaMarge}
                <span className="mb-vat-hint"> ({nbMarge} lot{nbMarge > 1 ? 's' : ''})</span>
              </td>
              <td className="mb-vat-cell">{currencyFormatter.format(totalMarge)}</td>
              <td className="mb-vat-cell">
                <VatTooltip
                  lines={[
                    `Proportion terrain : ${terrainProportion.toFixed(1)}%`,
                    `${strings.vatTooltipCout} alloué = ${currencyFormatter.format(totalCostForMarge)} × ${terrainProportion.toFixed(1)}% = ${currencyFormatter.format(coutAlloueMarge)}`,
                  ]}
                >
                  {currencyFormatter.format(coutAlloueMarge)}
                </VatTooltip>
              </td>
              <td className="mb-vat-cell">
                <VatTooltip
                  lines={[
                    `${strings.vatTooltipMarge} = ${currencyFormatter.format(totalMarge)} − ${currencyFormatter.format(coutAlloueMarge)} = ${currencyFormatter.format(margeBrute)}`,
                    `${strings.mbVatSurMarge} = ${currencyFormatter.format(margeBrute)} × 20/120 = ${currencyFormatter.format(tvaSurMarge)}`,
                    `${strings.vatTooltipDeductible} = Travaux (${currencyFormatter.format(tvaTravaux)}) + Charges (${currencyFormatter.format(tvaAutresCharges)}) + Agence (${currencyFormatter.format(tvaAgence)}) = ${currencyFormatter.format(tvaDeductible)}`,
                    `${strings.mbAResterPayer} = ${currencyFormatter.format(tvaSurMarge)} − ${currencyFormatter.format(tvaDeductible)} = ${formatResto(aRestoPayerMarge).text}`,
                  ]}
                >
                  <div>{strings.mbVatSurMarge}: {currencyFormatter.format(tvaSurMarge)}</div>
                  <div className={`mb-vat-resto ${formatResto(aRestoPayerMarge).isCredit ? 'mb-vat-credit' : ''}`}>
                    {strings.mbAResterPayer}: {formatResto(aRestoPayerMarge).text}
                  </div>
                </VatTooltip>
              </td>
            </tr>
          )}

          {nbTotal > 0 && (
            <tr>
              <td className="mb-vat-regime-label">
                {strings.mbTvaTotal}
                <span className="mb-vat-hint"> ({nbTotal} lot{nbTotal > 1 ? 's' : ''})</span>
              </td>
              <td className="mb-vat-cell">{currencyFormatter.format(totalTvaTotal)}</td>
              <td className="mb-vat-cell">{currencyFormatter.format(coutAlloueTotal)}</td>
              <td className="mb-vat-cell">
                <VatTooltip
                  lines={[
                    `TVA collectée = ${currencyFormatter.format(totalTvaTotal)} × 20/120 = ${currencyFormatter.format(tvaSurTotal)}`,
                    `TVA déductible (travaux prorata) = ${currencyFormatter.format(tvaDeductibleTotal)}`,
                    `${strings.mbReste} = ${currencyFormatter.format(tvaSurTotal)} − ${currencyFormatter.format(tvaDeductibleTotal)} = ${currencyFormatter.format(resteTvaTotal)}`,
                  ]}
                >
                  <div>TVA: {currencyFormatter.format(tvaSurTotal)}</div>
                  <div>{strings.mbReste}: {currencyFormatter.format(resteTvaTotal)}</div>
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
                  `TVA ${strings.vatTooltipTravaux} (10%) = ${currencyFormatter.format(tvaTravaux)}`,
                  `TVA charges (20%) = ${currencyFormatter.format(tvaAutresCharges)}`,
                  `TVA ${strings.vatTooltipAgence} (20%) = ${currencyFormatter.format(tvaAgence)}`,
                  `Total = ${currencyFormatter.format(tvaDeductible)}`,
                ]}
              >
                {currencyFormatter.format(tvaDeductible)}
              </VatTooltip>
            </td>
          </tr>

          <tr className="mb-vat-total-row">
            <td className="mb-vat-regime-label"><strong>{strings.mbTotal}</strong></td>
            <td className="mb-vat-cell"><strong>{currencyFormatter.format(totalRevente)}</strong></td>
            <td className="mb-vat-cell"><strong>{currencyFormatter.format(totalCostForMarge)}</strong></td>
            <td className="mb-vat-cell"><strong>{currencyFormatter.format(totalTvaAPayer)}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
