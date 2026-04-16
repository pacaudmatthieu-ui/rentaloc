import type { LotItem } from '../../model/types'
import {
  VAT_RATE_TRAVAUX,
  VAT_RATE_MARGE,
} from '../../../../entities/finance/vat'

// IS : 15% jusqu'à 42 500 €, 25% au-delà
const IS_TRANCHE_1_LIMIT = 42500
const IS_TRANCHE_1_RATE = 0.15
const IS_TRANCHE_2_RATE = 0.25
// Flat tax (PFU) : 31,4% depuis le 1er janvier 2026 (12,8% IR + 18,6% prélèvements sociaux)
const MB_FLAT_TAX_RATE = 0.314

function computeIS(benefice: number): { total: number; tranche1: number; tranche2: number } {
  if (benefice <= 0) return { total: 0, tranche1: 0, tranche2: 0 }
  const base1 = Math.min(benefice, IS_TRANCHE_1_LIMIT)
  const base2 = Math.max(0, benefice - IS_TRANCHE_1_LIMIT)
  const tranche1 = base1 * IS_TRANCHE_1_RATE
  const tranche2 = base2 * IS_TRANCHE_2_RATE
  return { total: tranche1 + tranche2, tranche1, tranche2 }
}

interface Props {
  apartments: LotItem[]
  totalCostForMarge: number
  travauxHT: number
  autresChargesHT: number
  agencyFees: number
  terrainProportion: number
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

function useOperationResult(props: Props) {
  const { apartments, totalCostForMarge, travauxHT, autresChargesHT, agencyFees, terrainProportion } = props

  const totalMargeLots = apartments
    .filter((a) => a.tvaRegime === 'marge')
    .reduce((s, a) => s + (Number(a.resalePrice) || 0), 0)

  const totalTvaLots = apartments
    .filter((a) => a.tvaRegime === 'total')
    .reduce((s, a) => s + (Number(a.resalePrice) || 0), 0)

  const totalRevente = apartments.reduce(
    (s, a) => s + (Number(a.resalePrice) || 0),
    0,
  )

  const ratioMarge = terrainProportion / 100
  const ratioTotal = totalRevente > 0 ? totalTvaLots / totalRevente : 0
  const coutAlloueMarge = totalCostForMarge * ratioMarge

  const margeBrute = totalMargeLots - coutAlloueMarge
  const tvaSurMarge = margeBrute > 0
    ? margeBrute * (VAT_RATE_MARGE / (1 + VAT_RATE_MARGE))
    : 0
  const tvaTravaux = travauxHT * VAT_RATE_TRAVAUX
  const tvaAutresCharges = autresChargesHT * 0.20
  const tvaAgence = agencyFees * (0.20 / 1.20)
  const tvaDeductible = tvaTravaux + tvaAutresCharges + tvaAgence
  const aRestoPayerMarge = tvaSurMarge - tvaDeductible

  const tvaSurTotal = totalTvaLots * (VAT_RATE_MARGE / (1 + VAT_RATE_MARGE))
  const tvaDeductibleTotal = travauxHT * ratioTotal * VAT_RATE_TRAVAUX
  const resteTvaTotal = Math.max(0, tvaSurTotal - tvaDeductibleTotal)

  const totalTvaAPayer = Math.max(0, aRestoPayerMarge) + resteTvaTotal
  const margeNetteAvantIS = totalRevente - totalCostForMarge - totalTvaAPayer
  const beneficeImposable = Math.max(0, margeNetteAvantIS)

  return { totalRevente, totalCostForMarge, totalTvaAPayer, aRestoPayerMarge, resteTvaTotal, margeNetteAvantIS, beneficeImposable }
}

/** Bloc 1 : Résultat d'opération (avant impôt) */
export function MbOperationResultTable(props: Props) {
  const { currencyFormatter, strings } = props
  const r = useOperationResult(props)

  const margePercent = r.totalCostForMarge > 0
    ? ((r.margeNetteAvantIS / r.totalCostForMarge) * 100).toFixed(1)
    : '–'

  return (
    <div className="mb-taxation-table mb-operation-result-table">
      <table className="mb-vat-table">
        <thead>
          <tr>
            <th></th>
            <th>Montant</th>
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
            <td className="mb-vat-regime-label">TVA à payer</td>
            <td className="mb-vat-cell">
              <FiscalTooltip
                lines={[
                  `TVA marge : ${currencyFormatter.format(Math.max(0, r.aRestoPayerMarge))}`,
                  `TVA total : ${currencyFormatter.format(r.resteTvaTotal)}`,
                  `Total TVA : ${currencyFormatter.format(r.totalTvaAPayer)}`,
                ]}
              >
                {currencyFormatter.format(r.totalTvaAPayer)}
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
                  `= ${currencyFormatter.format(r.totalRevente)} − ${currencyFormatter.format(r.totalCostForMarge)} − ${currencyFormatter.format(r.totalTvaAPayer)}`,
                  `= ${currencyFormatter.format(r.margeNetteAvantIS)}`,
                  `Marge : ${margePercent}%`,
                ]}
              >
                <strong className={r.margeNetteAvantIS >= 0 ? 'mb-revente-positive' : 'mb-revente-negative'}>
                  {currencyFormatter.format(r.margeNetteAvantIS)}
                </strong>
                <span className="mb-vat-hint"> ({margePercent}%)</span>
              </FiscalTooltip>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

/** Bloc 2 : Résultat fiscal (IS + Dividendes) */
export function MbFiscalResultTable(props: Props) {
  const { currencyFormatter, strings } = props
  const r = useOperationResult(props)

  const is = computeIS(r.beneficeImposable)
  const impotsSocietes = is.total
  const beneficesNets = r.beneficeImposable - impotsSocietes
  const flatTaxe = beneficesNets * MB_FLAT_TAX_RATE
  const dividendesEnPoche = beneficesNets - flatTaxe

  return (
    <div className="mb-taxation-table mb-fiscal-result-table">
      <p className="mb-fiscal-disclaimer">{strings.mbFiscalDisclaimer}</p>
      <table className="mb-vat-table">
        <thead>
          <tr>
            <th></th>
            <th>Montant</th>
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
                  `Tranche 1 : ${currencyFormatter.format(Math.min(r.beneficeImposable, IS_TRANCHE_1_LIMIT))} × 15% = ${currencyFormatter.format(is.tranche1)}`,
                  ...(r.beneficeImposable > IS_TRANCHE_1_LIMIT ? [`Tranche 2 : ${currencyFormatter.format(r.beneficeImposable - IS_TRANCHE_1_LIMIT)} × 25% = ${currencyFormatter.format(is.tranche2)}`] : []),
                  `Total IS = ${currencyFormatter.format(impotsSocietes)}`,
                ]}
              >
                {currencyFormatter.format(impotsSocietes)}
              </FiscalTooltip>
            </td>
          </tr>
          <tr>
            <td className="mb-vat-regime-label">{strings.mbBeneficesNets}</td>
            <td className="mb-vat-cell">
              <FiscalTooltip
                lines={[
                  `${strings.mbBeneficesNets} = ${currencyFormatter.format(r.beneficeImposable)} − ${currencyFormatter.format(impotsSocietes)} = ${currencyFormatter.format(beneficesNets)}`,
                ]}
              >
                {currencyFormatter.format(beneficesNets)}
              </FiscalTooltip>
            </td>
          </tr>
          <tr>
            <td className="mb-vat-regime-label">{strings.mbFlatTaxe} (PFU 31,4%)</td>
            <td className="mb-vat-cell">
              <FiscalTooltip
                lines={[
                  `${strings.mbFlatTaxe} = ${strings.mbBeneficesNets} × 31,4%`,
                  `= ${currencyFormatter.format(beneficesNets)} × 0,314 = ${currencyFormatter.format(flatTaxe)}`,
                ]}
              >
                {currencyFormatter.format(flatTaxe)}
              </FiscalTooltip>
            </td>
          </tr>
          <tr className="mb-vat-total-row">
            <td className="mb-vat-regime-label"><strong>{strings.mbDividendesEnPoche}</strong></td>
            <td className="mb-vat-cell">
              <FiscalTooltip
                lines={[
                  `${strings.mbDividendesEnPoche} = ${strings.mbBeneficesNets} − ${strings.mbFlatTaxe}`,
                  `= ${currencyFormatter.format(beneficesNets)} − ${currencyFormatter.format(flatTaxe)}`,
                  `= ${currencyFormatter.format(dividendesEnPoche)}`,
                ]}
              >
                <strong>{currencyFormatter.format(dividendesEnPoche)}</strong>
              </FiscalTooltip>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
