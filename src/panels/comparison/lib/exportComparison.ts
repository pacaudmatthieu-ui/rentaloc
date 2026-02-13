import type { ComparisonSimulation } from '../../../shared/types/comparison'
import type { CalculatedSimulation } from './detectBestScenario'
import type { BestScenarioResult } from './detectBestScenario'

export interface ComparisonExportData {
  metadata: {
    exportDate: string
    simulationCount: number
    comparisonCriteria?: string
    bestScenario?: {
      simulationIds: string[]
      metric: string
      value: number
      reason: string
    }
  }
  simulations: Array<{
    id: string
    name: string
    type: 'rental' | 'property-flipping'
    createdAt: number
    data: unknown
    calculated: Record<string, number | undefined> | null
  }>
}

/**
 * Prepare comparison data for export
 */
export function prepareComparisonExport(
  simulations: ComparisonSimulation[],
  calculatedResults: CalculatedSimulation[],
  bestScenario: BestScenarioResult | null,
  comparisonCriteria?: string,
): ComparisonExportData {
  return {
    metadata: {
      exportDate: new Date().toISOString(),
      simulationCount: simulations.length,
      comparisonCriteria,
      bestScenario: bestScenario
        ? {
            simulationIds: bestScenario.bestSimulationIds,
            metric: bestScenario.metric,
            value: bestScenario.value,
            reason: bestScenario.reason,
          }
        : undefined,
    },
    simulations: simulations.map((sim) => {
      const calculated = calculatedResults.find((cr) => cr.id === sim.id)
      return {
        id: sim.id,
        name: sim.name,
        type: sim.type,
        createdAt: sim.createdAt,
        data: sim.data,
        calculated: calculated?.calculated
          ? {
              grossYield: calculated.calculated.grossYield,
              netYield: calculated.calculated.netYield,
              annualCashflow: calculated.calculated.annualCashflow,
              margin: calculated.calculated.margin,
              totalProfit: calculated.calculated.totalProfit,
              totalCost: calculated.calculated.totalCost,
              annualTax: calculated.calculated.annualTax,
              annualCashflowAfterTax: calculated.calculated.annualCashflowAfterTax,
              monthlyPayment: calculated.calculated.monthlyPayment,
              loanAmount: calculated.calculated.loanAmount,
            }
          : null,
      }
    }),
  }
}

/**
 * Export comparison to JSON file
 */
export function exportComparisonToJson(
  exportData: ComparisonExportData,
  filename = 'comparison_export.json',
): void {
  try {
    const jsonString = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error exporting comparison to JSON:', error)
    throw error
  }
}
