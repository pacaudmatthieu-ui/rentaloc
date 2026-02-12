import type { SimulationFormValues } from '../../panels/rental-investment/model/types'
import type { MarchandDeBiensValues } from '../../panels/property-flip/model/types'

export type SimulationType = 'rental' | 'property-flipping'

export type ComparisonSimulationData = SimulationFormValues | MarchandDeBiensValues

export type ComparisonSimulation = {
  id: string
  name: string
  type: SimulationType
  createdAt: number
  data: ComparisonSimulationData
  previewMetrics?: {
    grossYield?: number
    netYield?: number
    annualCashflow?: number
    margin?: number
    totalProfit?: number
  }
}

export const MAX_COMPARISON_SIMULATIONS = 6

/**
 * Generate a unique ID for comparison entries
 */
export function generateComparisonId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Generate a default name for a comparison simulation
 */
export function generateComparisonName(type: SimulationType, index: number): string {
  const typeLabel = type === 'rental' ? 'Investissement locatif' : 'Marchand de biens'
  return `${typeLabel} ${index + 1}`
}
