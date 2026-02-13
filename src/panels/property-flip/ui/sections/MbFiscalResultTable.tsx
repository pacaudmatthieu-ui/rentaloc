import { useState } from 'react'
import type { ApartmentItem } from '../../model/types'
import {
  computeTvaSurMarge,
  computeTvaDeductible,
  computeAResterPayer,
  computeTvaSurTotal,
  computeResteTvaTotal,
  VAT_RATE_TRAVAUX,
} from '../../../../entities/finance/vat'

const MB_IS_RATE = 0.25
// Flat tax (PFU) : 31,4% depuis le 1er janvier 2026 (12,8% IR + 18,6% prélèvements sociaux)
const MB_FLAT_TAX_RATE = 0.314

type VatRegimeForFiscal = 'marge' | 'total'

interface MbFiscalResultTableProps {
  apartments: ApartmentItem[]
  totalCostForMarge: number
  renovationBudget: number
  agencyFees: number
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

export function MbFiscalResultTable({
  apartments,
  totalCostForMarge,
  renovationBudget,
  agencyFees,
  currencyFormatter,
  strings,
}: MbFiscalResultTableProps) {
  const [vatRegime, setVatRegime] = useState<VatRegimeForFiscal>('marge')

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
  const tvaSurMargeP = computeTvaSurMarge(totalPessimistic, totalCostForMarge)
  const tvaSurMargeL = computeTvaSurMarge(totalLogic, totalCostForMarge)
  const tvaSurMargeO = computeTvaSurMarge(totalOptimistic, totalCostForMarge)
  const aRestoPayerP = computeAResterPayer(tvaSurMargeP, tvaDeductible)
  const aRestoPayerL = computeAResterPayer(tvaSurMargeL, tvaDeductible)
  const aRestoPayerO = computeAResterPayer(tvaSurMargeO, tvaDeductible)

  const tvaDeductibleTotal =
    renovationBudget * (VAT_RATE_TRAVAUX / (1 + VAT_RATE_TRAVAUX))
  const tvaSurTotalP = computeTvaSurTotal(totalPessimistic)
  const tvaSurTotalL = computeTvaSurTotal(totalLogic)
  const tvaSurTotalO = computeTvaSurTotal(totalOptimistic)
  const resteP = computeResteTvaTotal(tvaSurTotalP, tvaDeductibleTotal)
  const resteL = computeResteTvaTotal(tvaSurTotalL, tvaDeductibleTotal)
  const resteO = computeResteTvaTotal(tvaSurTotalO, tvaDeductibleTotal)

  const margeP = totalPessimistic - totalCostForMarge
  const margeL = totalLogic - totalCostForMarge
  const margeO = totalOptimistic - totalCostForMarge

  const beneficeImposableP =
    vatRegime === 'marge'
      ? Math.max(0, margeP - aRestoPayerP)
      : Math.max(0, totalPessimistic - totalCostForMarge - resteP)
  const beneficeImposableL =
    vatRegime === 'marge'
      ? Math.max(0, margeL - aRestoPayerL)
      : Math.max(0, totalLogic - totalCostForMarge - resteL)
  const beneficeImposableO =
    vatRegime === 'marge'
      ? Math.max(0, margeO - aRestoPayerO)
      : Math.max(0, totalOptimistic - totalCostForMarge - resteO)

  const impotsSocietesP = beneficeImposableP * MB_IS_RATE
  const impotsSocietesL = beneficeImposableL * MB_IS_RATE
  const impotsSocietesO = beneficeImposableO * MB_IS_RATE

  const beneficesNetsP = beneficeImposableP - impotsSocietesP
  const beneficesNetsL = beneficeImposableL - impotsSocietesL
  const beneficesNetsO = beneficeImposableO - impotsSocietesO

  const flatTaxeP = beneficeImposableP * MB_FLAT_TAX_RATE
  const flatTaxeL = beneficeImposableL * MB_FLAT_TAX_RATE
  const flatTaxeO = beneficeImposableO * MB_FLAT_TAX_RATE

  // Bénéfices en poche = Bénéfices nets - Flat taxe
  const beneficesEnPocheP = beneficesNetsP - flatTaxeP
  const beneficesEnPocheL = beneficesNetsL - flatTaxeL
  const beneficesEnPocheO = beneficesNetsO - flatTaxeO

  const linesBeneficeP =
    vatRegime === 'marge'
      ? [
          `${strings.vatTooltipMarge} = ${strings.vatTooltipRevente} − ${strings.vatTooltipCout} = ${currencyFormatter.format(totalPessimistic)} − ${currencyFormatter.format(totalCostForMarge)} = ${currencyFormatter.format(margeP)}`,
          `${strings.mbBeneficeImposable} = ${strings.vatTooltipMarge} − ${strings.mbAResterPayer} = ${currencyFormatter.format(margeP)} − ${currencyFormatter.format(aRestoPayerP)} = ${currencyFormatter.format(beneficeImposableP)}`,
        ]
      : [
          `${strings.mbVatSurTotal} = ${strings.vatTooltipRevente} × 20% / 1.20 = ${currencyFormatter.format(totalPessimistic)} × 0.1667 = ${currencyFormatter.format(tvaSurTotalP)}`,
          `${strings.vatTooltipDeductible} = ${strings.vatTooltipTravaux} × 10% / 1.10 = ${currencyFormatter.format(renovationBudget)} × 0.0909 = ${currencyFormatter.format(tvaDeductibleTotal)}`,
          `${strings.mbReste} = ${strings.mbVatSurTotal} − ${strings.vatTooltipDeductible} = ${currencyFormatter.format(tvaSurTotalP)} − ${currencyFormatter.format(tvaDeductibleTotal)} = ${currencyFormatter.format(resteP)}`,
          `${strings.mbBeneficeImposable} = ${strings.vatTooltipRevente} − ${strings.vatTooltipCout} − ${strings.mbReste} = ${currencyFormatter.format(totalPessimistic)} − ${currencyFormatter.format(totalCostForMarge)} − ${currencyFormatter.format(resteP)} = ${currencyFormatter.format(beneficeImposableP)}`,
        ]
  const linesBeneficeL =
    vatRegime === 'marge'
      ? [
          `${strings.vatTooltipMarge} = ${currencyFormatter.format(totalLogic)} − ${currencyFormatter.format(totalCostForMarge)} = ${currencyFormatter.format(margeL)}`,
          `${strings.mbBeneficeImposable} = ${currencyFormatter.format(margeL)} − ${currencyFormatter.format(aRestoPayerL)} = ${currencyFormatter.format(beneficeImposableL)}`,
        ]
      : [
          `${strings.mbVatSurTotal} = ${currencyFormatter.format(totalLogic)} × 0.1667 = ${currencyFormatter.format(tvaSurTotalL)}`,
          `${strings.mbReste} = ${currencyFormatter.format(tvaSurTotalL)} − ${currencyFormatter.format(tvaDeductibleTotal)} = ${currencyFormatter.format(resteL)}`,
          `${strings.mbBeneficeImposable} = ${currencyFormatter.format(totalLogic)} − ${currencyFormatter.format(totalCostForMarge)} − ${currencyFormatter.format(resteL)} = ${currencyFormatter.format(beneficeImposableL)}`,
        ]
  const linesBeneficeO =
    vatRegime === 'marge'
      ? [
          `${strings.vatTooltipMarge} = ${currencyFormatter.format(totalOptimistic)} − ${currencyFormatter.format(totalCostForMarge)} = ${currencyFormatter.format(margeO)}`,
          `${strings.mbBeneficeImposable} = ${currencyFormatter.format(margeO)} − ${currencyFormatter.format(aRestoPayerO)} = ${currencyFormatter.format(beneficeImposableO)}`,
        ]
      : [
          `${strings.mbVatSurTotal} = ${currencyFormatter.format(totalOptimistic)} × 0.1667 = ${currencyFormatter.format(tvaSurTotalO)}`,
          `${strings.mbReste} = ${currencyFormatter.format(tvaSurTotalO)} − ${currencyFormatter.format(tvaDeductibleTotal)} = ${currencyFormatter.format(resteO)}`,
          `${strings.mbBeneficeImposable} = ${currencyFormatter.format(totalOptimistic)} − ${currencyFormatter.format(totalCostForMarge)} − ${currencyFormatter.format(resteO)} = ${currencyFormatter.format(beneficeImposableO)}`,
        ]

  return (
    <div className="mb-taxation-table mb-fiscal-result-table">
      <div className="mb-fiscal-regime-selector">
        <label className="mb-fiscal-regime-label">{strings.mbTypeTva}</label>
        <div className="mb-fiscal-regime-options">
          <label className="mb-fiscal-regime-option">
            <input
              type="radio"
              name="vatRegime"
              checked={vatRegime === 'marge'}
              onChange={() => setVatRegime('marge')}
            />
            <span>{strings.mbVatRegimeMarge}</span>
          </label>
          <label className="mb-fiscal-regime-option">
            <input
              type="radio"
              name="vatRegime"
              checked={vatRegime === 'total'}
              onChange={() => setVatRegime('total')}
            />
            <span>{strings.mbVatRegimeTotal}</span>
          </label>
        </div>
      </div>
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
            <td className="mb-vat-regime-label">{strings.mbBeneficeImposable}</td>
            <td className="mb-vat-cell">
              <FiscalTooltip lines={linesBeneficeP}>
                {currencyFormatter.format(beneficeImposableP)}
              </FiscalTooltip>
            </td>
            <td className="mb-vat-cell">
              <FiscalTooltip lines={linesBeneficeL}>
                {currencyFormatter.format(beneficeImposableL)}
              </FiscalTooltip>
            </td>
            <td className="mb-vat-cell">
              <FiscalTooltip lines={linesBeneficeO}>
                {currencyFormatter.format(beneficeImposableO)}
              </FiscalTooltip>
            </td>
          </tr>
          <tr>
            <td className="mb-vat-regime-label">{strings.mbImpotsSocietes}</td>
            <td className="mb-vat-cell">
              <FiscalTooltip
                lines={[
                  `${strings.mbImpotsSocietes} = ${strings.mbBeneficeImposable} × 25% = ${currencyFormatter.format(beneficeImposableP)} × 0.25 = ${currencyFormatter.format(impotsSocietesP)}`,
                ]}
              >
                {currencyFormatter.format(impotsSocietesP)}
              </FiscalTooltip>
            </td>
            <td className="mb-vat-cell">
              <FiscalTooltip
                lines={[
                  `${strings.mbImpotsSocietes} = ${currencyFormatter.format(beneficeImposableL)} × 0.25 = ${currencyFormatter.format(impotsSocietesL)}`,
                ]}
              >
                {currencyFormatter.format(impotsSocietesL)}
              </FiscalTooltip>
            </td>
            <td className="mb-vat-cell">
              <FiscalTooltip
                lines={[
                  `${strings.mbImpotsSocietes} = ${currencyFormatter.format(beneficeImposableO)} × 0.25 = ${currencyFormatter.format(impotsSocietesO)}`,
                ]}
              >
                {currencyFormatter.format(impotsSocietesO)}
              </FiscalTooltip>
            </td>
          </tr>
          <tr>
            <td className="mb-vat-regime-label">{strings.mbBeneficesNets}</td>
            <td className="mb-vat-cell">
              <FiscalTooltip
                lines={[
                  `${strings.mbBeneficesNets} = ${strings.mbBeneficeImposable} − ${strings.mbImpotsSocietes} = ${currencyFormatter.format(beneficeImposableP)} − ${currencyFormatter.format(impotsSocietesP)} = ${currencyFormatter.format(beneficesNetsP)}`,
                ]}
              >
                {currencyFormatter.format(beneficesNetsP)}
              </FiscalTooltip>
            </td>
            <td className="mb-vat-cell">
              <FiscalTooltip
                lines={[
                  `${strings.mbBeneficesNets} = ${currencyFormatter.format(beneficeImposableL)} − ${currencyFormatter.format(impotsSocietesL)} = ${currencyFormatter.format(beneficesNetsL)}`,
                ]}
              >
                {currencyFormatter.format(beneficesNetsL)}
              </FiscalTooltip>
            </td>
            <td className="mb-vat-cell">
              <FiscalTooltip
                lines={[
                  `${strings.mbBeneficesNets} = ${currencyFormatter.format(beneficeImposableO)} − ${currencyFormatter.format(impotsSocietesO)} = ${currencyFormatter.format(beneficesNetsO)}`,
                ]}
              >
                {currencyFormatter.format(beneficesNetsO)}
              </FiscalTooltip>
            </td>
          </tr>
          <tr>
            <td className="mb-vat-regime-label">{strings.mbFlatTaxe}</td>
            <td className="mb-vat-cell">
              <FiscalTooltip
                lines={[
                  `${strings.mbFlatTaxe} = ${strings.mbBeneficeImposable} × 31,4% = ${currencyFormatter.format(beneficeImposableP)} × 0.314 = ${currencyFormatter.format(flatTaxeP)}`,
                ]}
              >
                {currencyFormatter.format(flatTaxeP)}
              </FiscalTooltip>
            </td>
            <td className="mb-vat-cell">
              <FiscalTooltip
                lines={[
                  `${strings.mbFlatTaxe} = ${strings.mbBeneficeImposable} × 31,4% = ${currencyFormatter.format(beneficeImposableL)} × 0.314 = ${currencyFormatter.format(flatTaxeL)}`,
                ]}
              >
                {currencyFormatter.format(flatTaxeL)}
              </FiscalTooltip>
            </td>
            <td className="mb-vat-cell">
              <FiscalTooltip
                lines={[
                  `${strings.mbFlatTaxe} = ${strings.mbBeneficeImposable} × 31,4% = ${currencyFormatter.format(beneficeImposableO)} × 0.314 = ${currencyFormatter.format(flatTaxeO)}`,
                ]}
              >
                {currencyFormatter.format(flatTaxeO)}
              </FiscalTooltip>
            </td>
          </tr>
          <tr>
            <td className="mb-vat-regime-label">{strings.mbBeneficesEnPoche}</td>
            <td className="mb-vat-cell">
              <FiscalTooltip
                lines={[
                  `${strings.mbFlatTaxe} = ${strings.mbBeneficeImposable} × 31,4% = ${currencyFormatter.format(beneficeImposableP)} × 0.314 = ${currencyFormatter.format(flatTaxeP)}`,
                  `${strings.mbBeneficesEnPoche} = ${strings.mbBeneficesNets} − ${strings.mbFlatTaxe} = ${currencyFormatter.format(beneficesNetsP)} − ${currencyFormatter.format(flatTaxeP)} = ${currencyFormatter.format(beneficesEnPocheP)}`,
                ]}
              >
                {currencyFormatter.format(beneficesEnPocheP)}
              </FiscalTooltip>
            </td>
            <td className="mb-vat-cell">
              <FiscalTooltip
                lines={[
                  `${strings.mbFlatTaxe} = ${strings.mbBeneficeImposable} × 31,4% = ${currencyFormatter.format(beneficeImposableL)} × 0.314 = ${currencyFormatter.format(flatTaxeL)}`,
                  `${strings.mbBeneficesEnPoche} = ${strings.mbBeneficesNets} − ${strings.mbFlatTaxe} = ${currencyFormatter.format(beneficesNetsL)} − ${currencyFormatter.format(flatTaxeL)} = ${currencyFormatter.format(beneficesEnPocheL)}`,
                ]}
              >
                {currencyFormatter.format(beneficesEnPocheL)}
              </FiscalTooltip>
            </td>
            <td className="mb-vat-cell">
              <FiscalTooltip
                lines={[
                  `${strings.mbFlatTaxe} = ${strings.mbBeneficeImposable} × 31,4% = ${currencyFormatter.format(beneficeImposableO)} × 0.314 = ${currencyFormatter.format(flatTaxeO)}`,
                  `${strings.mbBeneficesEnPoche} = ${strings.mbBeneficesNets} − ${strings.mbFlatTaxe} = ${currencyFormatter.format(beneficesNetsO)} − ${currencyFormatter.format(flatTaxeO)} = ${currencyFormatter.format(beneficesEnPocheO)}`,
                ]}
              >
                {currencyFormatter.format(beneficesEnPocheO)}
              </FiscalTooltip>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
