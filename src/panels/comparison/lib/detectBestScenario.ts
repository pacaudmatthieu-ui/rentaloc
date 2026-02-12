import type { ComparisonSimulation } from '../../../shared/types/comparison'

export type ComparisonCriteria =
  | 'netYield'
  | 'grossYield'
  | 'annualCashflow'
  | 'margin'
  | 'totalProfit'
  | 'totalCost'
  | 'annualTax'
  | 'annualCashflowAfterTax'
  | 'monthlyPayment'
  | 'loanAmount'

export interface CalculatedSimulation {
  id: string
  type: 'rental' | 'property-flipping'
  calculated: {
    grossYield?: number
    netYield?: number
    annualCashflow?: number
    margin?: number
    totalProfit?: number
    totalCost?: number
    annualTax?: number
    annualCashflowAfterTax?: number
    monthlyPayment?: number
    loanAmount?: number
    financialCost?: number
    totalResale?: number
    monthlyCashflow?: number
    annualizedReturn?: number
  } | null
}

export interface BestScenarioResult {
  bestSimulationIds: string[]
  metric: ComparisonCriteria
  value: number
  reason: string
}

/**
 * Detect the best scenario based on comparison criteria
 */
export function detectBestScenario(
  simulations: CalculatedSimulation[],
  criteria: ComparisonCriteria,
): BestScenarioResult | null {
  if (simulations.length === 0) return null

  // Filter simulations with valid calculations
  const validSimulations = simulations.filter(
    (sim) => sim.calculated !== null,
  )

  if (validSimulations.length === 0) return null

  // Determine if higher or lower is better
  const higherIsBetter = [
    'netYield',
    'grossYield',
    'annualCashflow',
    'margin',
    'totalProfit',
    'annualCashflowAfterTax',
  ].includes(criteria)

  const lowerIsBetter = ['totalCost', 'annualTax', 'monthlyPayment'].includes(criteria)

  // Extract metric values
  const metricValues = validSimulations.map((sim) => {
    const value = getMetricValue(sim, criteria)
    return {
      id: sim.id,
      value,
      valid: value !== null && !isNaN(value),
    }
  })

  // Filter valid values
  const validValues = metricValues.filter((v) => v.valid)
  if (validValues.length === 0) return null

  // Find best value
  let bestValue: number
  if (higherIsBetter) {
    bestValue = Math.max(...validValues.map((v) => v.value!))
  } else if (lowerIsBetter) {
    bestValue = Math.min(...validValues.map((v) => v.value!))
  } else {
    return null
  }

  // Find all simulations with best value (handle ties)
  const bestSimulationIds = validValues
    .filter((v) => v.value === bestValue)
    .map((v) => v.id)

  // Generate reason
  const reason = generateReason(criteria, bestValue, higherIsBetter)

  return {
    bestSimulationIds,
    metric: criteria,
    value: bestValue,
    reason,
  }
}

/**
 * Get metric value from calculated simulation
 */
function getMetricValue(
  sim: CalculatedSimulation,
  criteria: ComparisonCriteria,
): number | null {
  if (!sim.calculated) return null

  switch (criteria) {
    case 'netYield':
      return sim.calculated.netYield ?? null
    case 'grossYield':
      return sim.calculated.grossYield ?? null
    case 'annualCashflow':
      return sim.calculated.annualCashflow ?? null
    case 'margin':
      return sim.calculated.margin ?? null
    case 'totalProfit':
      return sim.calculated.totalProfit ?? null
    case 'totalCost':
      return sim.calculated.totalCost ?? null
    case 'annualTax':
      return sim.calculated.annualTax ?? null
    case 'annualCashflowAfterTax':
      return sim.calculated.annualCashflowAfterTax ?? null
    case 'monthlyPayment':
      return sim.calculated.monthlyPayment ?? null
    case 'loanAmount':
      return sim.calculated.loanAmount ?? null
    default:
      return null
  }
}

/**
 * Generate human-readable reason for best scenario
 */
function generateReason(
  criteria: ComparisonCriteria,
  value: number,
  higherIsBetter: boolean,
): string {
  const criteriaLabels: Record<ComparisonCriteria, string> = {
    netYield: 'Net Yield',
    grossYield: 'Gross Yield',
    annualCashflow: 'Annual Cashflow',
    margin: 'Margin',
    totalProfit: 'Total Profit',
    totalCost: 'Total Cost',
    annualTax: 'Annual Tax',
    annualCashflowAfterTax: 'Annual Cashflow After Tax',
    monthlyPayment: 'Monthly Payment',
    loanAmount: 'Loan Amount',
  }

  const label = criteriaLabels[criteria] || criteria
  const direction = higherIsBetter ? 'highest' : 'lowest'

  return `${direction} ${label}`
}

/**
 * Get default criteria based on simulation type
 */
export function getDefaultCriteria(
  simulations: CalculatedSimulation[],
): ComparisonCriteria {
  // If all simulations are rental, use netYield
  const allRental = simulations.every((sim) => sim.type === 'rental')
  if (allRental) return 'netYield'

  // If all simulations are property flipping, use margin
  const allFlip = simulations.every((sim) => sim.type === 'property-flipping')
  if (allFlip) return 'margin'

  // Mixed types: use annualCashflow as it's comparable
  return 'annualCashflow'
}
