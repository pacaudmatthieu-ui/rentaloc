import type { ApartmentItem } from '../../model/types'
import {
  computeTvaSurMarge,
  computeTvaDeductible,
  computeAResterPayer,
  computeTvaSurTotal,
  computeResteTvaTotal,
  VAT_RATE_TRAVAUX,
  VAT_RATE_AGENCE,
} from '../../../../entities/finance/vat'

interface MargeVatTableProps {
  apartments: ApartmentItem[]
  totalCostForMarge: number
  renovationBudget: number
  agencyFees: number
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
  renovationBudget,
  agencyFees,
  currencyFormatter,
  strings,
}: MargeVatTableProps) {
  const totalPessimistic = apartments.reduce(
    (s, a) => s + (Number(a.resalePessimistic) || 0),
    0,
  )
  const totalLogic = apartments.reduce(
    (s, a) => s + (Number(a.resaleLogic) || 0),
    0,
  )
  const totalOptimistic = apartments.reduce(
    (s, a) => s + (Number(a.resaleOptimistic) || 0),
    0,
  )

  const tvaDeductible = computeTvaDeductible(renovationBudget, agencyFees)

  const tvaSurMargePessimistic = computeTvaSurMarge(
    totalPessimistic,
    totalCostForMarge,
  )
  const tvaSurMargeLogic = computeTvaSurMarge(
    totalLogic,
    totalCostForMarge,
  )
  const tvaSurMargeOptimistic = computeTvaSurMarge(
    totalOptimistic,
    totalCostForMarge,
  )

  const aRestoPayerPessimistic = computeAResterPayer(
    tvaSurMargePessimistic,
    tvaDeductible,
  )
  const aRestoPayerLogic = computeAResterPayer(
    tvaSurMargeLogic,
    tvaDeductible,
  )
  const aRestoPayerOptimistic = computeAResterPayer(
    tvaSurMargeOptimistic,
    tvaDeductible,
  )

  const tvaSurTotalPessimistic = computeTvaSurTotal(totalPessimistic)
  const tvaSurTotalLogic = computeTvaSurTotal(totalLogic)
  const tvaSurTotalOptimistic = computeTvaSurTotal(totalOptimistic)

  const tvaDeductibleTotal = renovationBudget * (VAT_RATE_TRAVAUX / (1 + VAT_RATE_TRAVAUX))

  const restePessimistic = computeResteTvaTotal(
    tvaSurTotalPessimistic,
    tvaDeductibleTotal,
  )
  const resteLogic = computeResteTvaTotal(
    tvaSurTotalLogic,
    tvaDeductibleTotal,
  )
  const resteOptimistic = computeResteTvaTotal(
    tvaSurTotalOptimistic,
    tvaDeductibleTotal,
  )

  const formatResto = (v: number) =>
    v < 0
      ? {
          text: `${strings.mbCreditTva} ${currencyFormatter.format(-v)}`,
          isCredit: true,
        }
      : { text: currencyFormatter.format(v), isCredit: false }

  const tvaTravaux = renovationBudget * (VAT_RATE_TRAVAUX / (1 + VAT_RATE_TRAVAUX))
  const tvaAgence = agencyFees * (VAT_RATE_AGENCE / (1 + VAT_RATE_AGENCE))

  return (
    <div className="mb-taxation-table">
      <table className="mb-vat-table">
        <thead>
          <tr>
            <th></th>
            <th>{strings.mbReventePessimistic}</th>
            <th>{strings.mbReventeLogic}</th>
            <th>{strings.mbReventeOptimistic}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="mb-vat-regime-label">
              {strings.mbVatMarge}
              <span className="mb-vat-hint"> ({strings.mbVatMargeHint})</span>
            </td>
            <td className="mb-vat-cell">
              <VatTooltip
                lines={[
                  `${strings.vatTooltipMarge} = ${strings.vatTooltipRevente} − ${strings.vatTooltipCout} = ${currencyFormatter.format(totalPessimistic)} − ${currencyFormatter.format(totalCostForMarge)} = ${currencyFormatter.format(totalPessimistic - totalCostForMarge)}`,
                  `${strings.mbVatSurMarge} = ${strings.vatTooltipMarge} × 20% / 1.20 = ${currencyFormatter.format(totalPessimistic - totalCostForMarge)} × 0.1667 = ${currencyFormatter.format(tvaSurMargePessimistic)}`,
                  `${strings.vatTooltipDeductible} = ${strings.vatTooltipTravaux} (10%) + ${strings.vatTooltipAgence} (20%) = ${currencyFormatter.format(tvaTravaux)} + ${currencyFormatter.format(tvaAgence)} = ${currencyFormatter.format(tvaDeductible)}`,
                  `${strings.mbAResterPayer} = ${strings.mbVatSurMarge} − ${strings.vatTooltipDeductible} = ${currencyFormatter.format(tvaSurMargePessimistic)} − ${currencyFormatter.format(tvaDeductible)} = ${formatResto(aRestoPayerPessimistic).text}`,
                ]}
              >
                <div>
                  {strings.mbVatSurMarge}:{' '}
                  {currencyFormatter.format(tvaSurMargePessimistic)}
                </div>
                <div
                  className={`mb-vat-resto ${formatResto(aRestoPayerPessimistic).isCredit ? 'mb-vat-credit' : ''}`}
                >
                  {strings.mbAResterPayer}:{' '}
                  {formatResto(aRestoPayerPessimistic).text}
                </div>
              </VatTooltip>
            </td>
            <td className="mb-vat-cell">
              <VatTooltip
                lines={[
                  `${strings.vatTooltipMarge} = ${strings.vatTooltipRevente} − ${strings.vatTooltipCout} = ${currencyFormatter.format(totalLogic)} − ${currencyFormatter.format(totalCostForMarge)} = ${currencyFormatter.format(totalLogic - totalCostForMarge)}`,
                  `${strings.mbVatSurMarge} = ${strings.vatTooltipMarge} × 20% / 1.20 = ${currencyFormatter.format(totalLogic - totalCostForMarge)} × 0.1667 = ${currencyFormatter.format(tvaSurMargeLogic)}`,
                  `${strings.vatTooltipDeductible} = ${strings.vatTooltipTravaux} (10%) + ${strings.vatTooltipAgence} (20%) = ${currencyFormatter.format(tvaTravaux)} + ${currencyFormatter.format(tvaAgence)} = ${currencyFormatter.format(tvaDeductible)}`,
                  `${strings.mbAResterPayer} = ${strings.mbVatSurMarge} − ${strings.vatTooltipDeductible} = ${currencyFormatter.format(tvaSurMargeLogic)} − ${currencyFormatter.format(tvaDeductible)} = ${formatResto(aRestoPayerLogic).text}`,
                ]}
              >
                <div>
                  {strings.mbVatSurMarge}:{' '}
                  {currencyFormatter.format(tvaSurMargeLogic)}
                </div>
                <div
                  className={`mb-vat-resto ${formatResto(aRestoPayerLogic).isCredit ? 'mb-vat-credit' : ''}`}
                >
                  {strings.mbAResterPayer}: {formatResto(aRestoPayerLogic).text}
                </div>
              </VatTooltip>
            </td>
            <td className="mb-vat-cell">
              <VatTooltip
                lines={[
                  `${strings.vatTooltipMarge} = ${strings.vatTooltipRevente} − ${strings.vatTooltipCout} = ${currencyFormatter.format(totalOptimistic)} − ${currencyFormatter.format(totalCostForMarge)} = ${currencyFormatter.format(totalOptimistic - totalCostForMarge)}`,
                  `${strings.mbVatSurMarge} = ${strings.vatTooltipMarge} × 20% / 1.20 = ${currencyFormatter.format(totalOptimistic - totalCostForMarge)} × 0.1667 = ${currencyFormatter.format(tvaSurMargeOptimistic)}`,
                  `${strings.vatTooltipDeductible} = ${strings.vatTooltipTravaux} (10%) + ${strings.vatTooltipAgence} (20%) = ${currencyFormatter.format(tvaTravaux)} + ${currencyFormatter.format(tvaAgence)} = ${currencyFormatter.format(tvaDeductible)}`,
                  `${strings.mbAResterPayer} = ${strings.mbVatSurMarge} − ${strings.vatTooltipDeductible} = ${currencyFormatter.format(tvaSurMargeOptimistic)} − ${currencyFormatter.format(tvaDeductible)} = ${formatResto(aRestoPayerOptimistic).text}`,
                ]}
              >
                <div>
                  {strings.mbVatSurMarge}:{' '}
                  {currencyFormatter.format(tvaSurMargeOptimistic)}
                </div>
                <div
                  className={`mb-vat-resto ${formatResto(aRestoPayerOptimistic).isCredit ? 'mb-vat-credit' : ''}`}
                >
                  {strings.mbAResterPayer}:{' '}
                  {formatResto(aRestoPayerOptimistic).text}
                </div>
              </VatTooltip>
            </td>
          </tr>
          <tr>
            <td className="mb-vat-regime-label">
              {strings.mbVatCharge}
              <span className="mb-vat-hint"> ({strings.mbVatChargeHint})</span>
            </td>
            <td colSpan={3} className="mb-vat-cell mb-vat-cell-same">
              <VatTooltip
                lines={[
                  `TVA ${strings.vatTooltipTravaux} = ${currencyFormatter.format(renovationBudget)} × 10% / 1.10 = ${currencyFormatter.format(tvaTravaux)}`,
                  `TVA ${strings.vatTooltipAgence} = ${currencyFormatter.format(agencyFees)} × 20% / 1.20 = ${currencyFormatter.format(tvaAgence)}`,
                  `${strings.vatTooltipDeductible} = ${currencyFormatter.format(tvaTravaux)} + ${currencyFormatter.format(tvaAgence)} = ${currencyFormatter.format(tvaDeductible)}`,
                ]}
              >
                {currencyFormatter.format(tvaDeductible)}
              </VatTooltip>
            </td>
          </tr>
          <tr>
            <td className="mb-vat-regime-label">
              {strings.mbVatTotal}
              <span className="mb-vat-hint"> ({strings.mbVatTotalHint})</span>
            </td>
            <td className="mb-vat-cell">
              <VatTooltip
                lines={[
                  `${strings.mbVatSurTotal} = ${strings.vatTooltipRevente} × 20% / 1.20 = ${currencyFormatter.format(totalPessimistic)} × 0.1667 = ${currencyFormatter.format(tvaSurTotalPessimistic)}`,
                  `${strings.vatTooltipDeductible} = ${strings.vatTooltipTravaux} × 10% / 1.10 = ${currencyFormatter.format(renovationBudget)} × 0.0909 = ${currencyFormatter.format(tvaDeductibleTotal)}`,
                  `${strings.mbReste} = ${strings.mbVatSurTotal} − ${strings.vatTooltipDeductible} = ${currencyFormatter.format(tvaSurTotalPessimistic)} − ${currencyFormatter.format(tvaDeductibleTotal)} = ${currencyFormatter.format(restePessimistic)}`,
                ]}
              >
                {currencyFormatter.format(tvaSurTotalPessimistic)} →{' '}
                {strings.mbReste} {currencyFormatter.format(restePessimistic)}
              </VatTooltip>
            </td>
            <td className="mb-vat-cell">
              <VatTooltip
                lines={[
                  `${strings.mbVatSurTotal} = ${strings.vatTooltipRevente} × 20% / 1.20 = ${currencyFormatter.format(totalLogic)} × 0.1667 = ${currencyFormatter.format(tvaSurTotalLogic)}`,
                  `${strings.vatTooltipDeductible} = ${strings.vatTooltipTravaux} × 10% / 1.10 = ${currencyFormatter.format(renovationBudget)} × 0.0909 = ${currencyFormatter.format(tvaDeductibleTotal)}`,
                  `${strings.mbReste} = ${strings.mbVatSurTotal} − ${strings.vatTooltipDeductible} = ${currencyFormatter.format(tvaSurTotalLogic)} − ${currencyFormatter.format(tvaDeductibleTotal)} = ${currencyFormatter.format(resteLogic)}`,
                ]}
              >
                {currencyFormatter.format(tvaSurTotalLogic)} → {strings.mbReste}{' '}
                {currencyFormatter.format(resteLogic)}
              </VatTooltip>
            </td>
            <td className="mb-vat-cell">
              <VatTooltip
                lines={[
                  `${strings.mbVatSurTotal} = ${strings.vatTooltipRevente} × 20% / 1.20 = ${currencyFormatter.format(totalOptimistic)} × 0.1667 = ${currencyFormatter.format(tvaSurTotalOptimistic)}`,
                  `${strings.vatTooltipDeductible} = ${strings.vatTooltipTravaux} × 10% / 1.10 = ${currencyFormatter.format(renovationBudget)} × 0.0909 = ${currencyFormatter.format(tvaDeductibleTotal)}`,
                  `${strings.mbReste} = ${strings.mbVatSurTotal} − ${strings.vatTooltipDeductible} = ${currencyFormatter.format(tvaSurTotalOptimistic)} − ${currencyFormatter.format(tvaDeductibleTotal)} = ${currencyFormatter.format(resteOptimistic)}`,
                ]}
              >
                {currencyFormatter.format(tvaSurTotalOptimistic)} →{' '}
                {strings.mbReste} {currencyFormatter.format(resteOptimistic)}
              </VatTooltip>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
