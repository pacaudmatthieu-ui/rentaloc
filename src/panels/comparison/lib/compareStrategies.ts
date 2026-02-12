import type { CalculatedSimulation } from './detectBestScenario'
import type { ComparisonSimulation } from '../../../shared/types/comparison'
import type { MarchandDeBiensValues } from '../../property-flip/model/types'

export interface StrategyComparisonResult {
  hasMixedTypes: boolean
  rentalSimulations: CalculatedSimulation[]
  flipSimulations: CalculatedSimulation[]
  keyDifferences: {
    cashflowVsMargin: {
      rental: {
        annualCashflow: number
        netYield: number
      } | null
      flip: {
        margin: number
        totalProfit: number
        holdingPeriodMonths: number
        annualizedReturn?: number
      } | null
    }
    holdingPeriod: {
      rental: 'ongoing' | number
      flip: number | null
    }
    taxImplications: {
      rental: {
        annualTax: number
        annualCashflowAfterTax: number
      } | null
      flip: {
        // Tax calculations for flip are more complex, handled in tables
        note: string
      } | null
    }
  }
  profitabilityComparison?: {
    rentalAnnualizedReturn?: number
    flipAnnualizedReturn?: number
    moreProfitable?: 'rental' | 'flip' | 'equal'
    explanation: string
  }
}

/**
 * Calculate annualized return for property flipping based on holding period
 */
export function calculateFlipAnnualizedReturn(
  totalProfit: number,
  totalCost: number,
  holdingPeriodMonths: number,
): number {
  if (totalCost <= 0 || holdingPeriodMonths <= 0) return 0
  
  const holdingPeriodYears = holdingPeriodMonths / 12
  if (holdingPeriodYears <= 0) return 0
  
  // Annualized return = ((1 + totalReturn) ^ (1/years)) - 1
  const totalReturn = totalProfit / totalCost
  const annualizedReturn = Math.pow(1 + totalReturn, 1 / holdingPeriodYears) - 1
  
  return annualizedReturn
}

/**
 * Compare rental investment vs property flipping strategies
 */
export function compareStrategies(
  calculatedSimulations: CalculatedSimulation[],
  originalSimulations: ComparisonSimulation[],
): StrategyComparisonResult {
  const rentalSimulations = calculatedSimulations.filter((sim) => sim.type === 'rental')
  const flipSimulations = calculatedSimulations.filter((sim) => sim.type === 'property-flipping')
  const hasMixedTypes = rentalSimulations.length > 0 && flipSimulations.length > 0

  // Get first rental and flip for comparison
  const firstRental = rentalSimulations[0]?.calculated
  const firstFlip = flipSimulations[0]?.calculated

  // Extract holding period from flip simulation data
  const firstFlipOriginal = originalSimulations.find((sim) => sim.type === 'property-flipping')
  const flipHoldingPeriodMonths = firstFlipOriginal
    ? extractHoldingPeriod(firstFlipOriginal)
    : null

  // Get annualized return from calculated results if available, otherwise calculate it
  const flipAnnualizedReturnFromCalc = firstFlip && 'annualizedReturn' in firstFlip
    ? (firstFlip.annualizedReturn || 0) / 100 // Convert from percentage to ratio
    : undefined

  const flipAnnualizedReturn =
    flipAnnualizedReturnFromCalc !== undefined
      ? flipAnnualizedReturnFromCalc
      : firstFlip && flipHoldingPeriodMonths && 'totalProfit' in firstFlip && 'totalCost' in firstFlip
      ? calculateFlipAnnualizedReturn(
          firstFlip.totalProfit || 0,
          firstFlip.totalCost || 0,
          flipHoldingPeriodMonths,
        )
      : undefined

  // Calculate profitability comparison
  let profitabilityComparison: StrategyComparisonResult['profitabilityComparison'] | undefined

  if (hasMixedTypes && firstRental && firstFlip) {
    const rentalNetYield = firstRental.netYield || 0
    const flipAnnualized = flipAnnualizedReturn || 0

    let moreProfitable: 'rental' | 'flip' | 'equal' = 'equal'
    let explanation = ''

    if (flipAnnualized > 0 && rentalNetYield > 0) {
      if (flipAnnualized > rentalNetYield) {
        moreProfitable = 'flip'
        explanation = `Property flipping has higher annualized return (${(flipAnnualized * 100).toFixed(1)}%) compared to rental net yield (${(rentalNetYield * 100).toFixed(1)}%)`
      } else if (rentalNetYield > flipAnnualized) {
        moreProfitable = 'rental'
        explanation = `Rental investment has higher net yield (${(rentalNetYield * 100).toFixed(1)}%) compared to flip annualized return (${(flipAnnualized * 100).toFixed(1)}%)`
      } else {
        explanation = 'Both strategies have similar profitability'
      }
    } else if (flipAnnualized > 0) {
      moreProfitable = 'flip'
      explanation = 'Property flipping shows positive annualized return'
    } else if (rentalNetYield > 0) {
      moreProfitable = 'rental'
      explanation = 'Rental investment shows positive net yield'
    }

    profitabilityComparison = {
      rentalAnnualizedReturn: rentalNetYield,
      flipAnnualizedReturn: flipAnnualized,
      moreProfitable,
      explanation,
    }
  }

  return {
    hasMixedTypes,
    rentalSimulations,
    flipSimulations,
    keyDifferences: {
      cashflowVsMargin: {
        rental: firstRental && 'annualCashflow' in firstRental
          ? {
              annualCashflow: firstRental.annualCashflow || 0,
              netYield: firstRental.netYield || 0,
            }
          : null,
        flip: firstFlip && 'margin' in firstFlip
          ? {
              margin: firstFlip.margin || 0,
              totalProfit: firstFlip.totalProfit || 0,
              holdingPeriodMonths: flipHoldingPeriodMonths || 0,
              annualizedReturn: flipAnnualizedReturn,
            }
          : null,
      },
      holdingPeriod: {
        rental: 'ongoing',
        flip: flipHoldingPeriodMonths,
      },
      taxImplications: {
        rental: firstRental && 'annualTax' in firstRental
          ? {
              annualTax: firstRental.annualTax || 0,
              annualCashflowAfterTax: firstRental.annualCashflowAfterTax || 0,
            }
          : null,
        flip: {
          note: 'Tax calculations for property flipping depend on VAT regime and are shown in detailed tables',
        },
      },
    },
    profitabilityComparison,
  }
}

/**
 * Extract holding period from flip simulation data
 */
function extractHoldingPeriod(sim: ComparisonSimulation): number | null {
  if (sim.type !== 'property-flipping') return null
  
  const flipData = sim.data as MarchandDeBiensValues
  const durationMonths = parseFloat(flipData.durationMonths) || 0
  return durationMonths > 0 ? durationMonths : null
}
