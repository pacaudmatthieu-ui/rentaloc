import type { CalculatedSimulation } from './detectBestScenario'
import type { ComparisonSimulation } from '../../../shared/types/comparison'
import type { SimulationFormValues } from '../../rental-investment/model/types'
import type { TaxRegime } from '../../../shared/types'
import { computeYearlyTableData } from '../../rental-investment/lib/calculations'
import type { MarchandDeBiensValues } from '../../property-flip/model/types'
import { computeFlipResults } from '../../property-flip/lib/computeFlipResults'

export interface YearlyTaxData {
  year: number
  annualTax: number
  resaleTax?: number
  totalTax: number
  cashflowAfterTax: number
}

export interface TaxRegimeComparisonResult {
  hasDifferentRegimes: boolean
  regimes: Array<{
    simulationId: string
    simulationName: string
    taxRegime: TaxRegime
    taxRegimeLabel: string
    annualTax: number
    annualCashflowAfterTax: number
    netYield: number
    annualCashflow: number
    yearlyTaxData: YearlyTaxData[]
    totalTaxOverPeriod: number
    resaleTax?: number
  }>
  bestRegime?: {
    simulationId: string
    taxRegime: TaxRegime
    taxRegimeLabel: string
    annualTax: number
    annualCashflowAfterTax: number
    savings: number
    totalTaxOverPeriod: number
  }
  taxSavings?: {
    lowestTax: number
    highestTax: number
    savings: number
    savingsPercent: number
    cumulativeSavings: number
  }
  hasResaleSimulations: boolean
  hasPropertyFlippingSimulations: boolean
}

/**
 * Get tax regime label from regime code
 */
export function getTaxRegimeLabel(regime: TaxRegime, strings: Record<string, string>): string {
  const labels: Record<TaxRegime, string> = {
    none: strings.taxNone || 'No tax estimation',
    micro_foncier: strings.taxMicroFoncier || 'Micro-foncier',
    reel_foncier: strings.taxReelFoncier || 'Réel foncier',
    lmnp_micro_bic: strings.taxLmnpMicro || 'LMNP micro-BIC',
    lmnp_reel: strings.taxLmnpReel || 'LMNP réel',
    sci_ir: strings.taxReelFoncier || 'SCI IR',
    sci_is: strings.taxSciIs || 'SCI IS',
    bailleur_prive: strings.taxBailleurPrive || 'Bailleur Privé',
  }
  return labels[regime] || regime
}

/**
 * Impôts d'une opération marchand de biens (TVA nette + IS + flat tax sur
 * les dividendes) — via le moteur de calcul unique du panneau MDB.
 */
function calculatePropertyFlippingTaxes(
  flipData: MarchandDeBiensValues,
): { totalTax: number; vatTax: number; corporateTax: number; flatTax: number } {
  const flip = computeFlipResults(flipData)
  const vatTax = flip.tvaNette
  const corporateTax = flip.impotsSocietes
  const flatTax = flip.flatTax
  return { totalTax: vatTax + corporateTax + flatTax, vatTax, corporateTax, flatTax }
}

/**
 * Compare tax regimes across simulations with temporal data and resale taxes
 */
export function compareTaxRegimes(
  calculatedSimulations: CalculatedSimulation[],
  originalSimulations: ComparisonSimulation[],
  strings: Record<string, string>,
): TaxRegimeComparisonResult {
  // Separate rental and property flipping simulations
  const rentalSimulations = calculatedSimulations.filter((sim) => sim.type === 'rental')
  const propertyFlippingSimulations = calculatedSimulations.filter((sim) => sim.type === 'property-flipping')
  
  const hasResaleSimulations = rentalSimulations.some((sim) => {
    const original = originalSimulations.find((s) => s.id === sim.id)
    if (!original || original.type !== 'rental') return false
    const rentalData = original.data as SimulationFormValues
    const resalePrice = parseFloat(rentalData.resalePrice || '0')
    const resaleHoldingMonths = parseFloat(rentalData.resaleHoldingMonths || '0')
    return resalePrice > 0 && resaleHoldingMonths > 0
  })

  // Extract tax regime information with yearly data
  const regimes = rentalSimulations
    .map((sim) => {
      const original = originalSimulations.find((s) => s.id === sim.id)
      if (!original || original.type !== 'rental') return null

      const rentalData = original.data as SimulationFormValues
      const calculated = sim.calculated
      
      if (!calculated || !('annualTax' in calculated)) return null

      // Calculate yearly tax data
      // Note: sciIsWithdrawFlatTax is now handled directly in computeYearlyTableData
      // based on the value stored in rentalData.sciIsWithdrawFlatTax
      const yearlyTableData = computeYearlyTableData(rentalData)
      
      const yearlyTaxData: YearlyTaxData[] = yearlyTableData.map((row) => ({
        year: row.year,
        annualTax: row.tax,
        resaleTax: row.saleTax > 0 ? row.saleTax : undefined,
        totalTax: row.tax + row.saleTax,
        cashflowAfterTax: row.cashDispo,
      }))

      const totalTaxOverPeriod = yearlyTaxData.reduce((sum, y) => sum + y.totalTax, 0)
      const resaleTax = yearlyTaxData.find((y) => y.resaleTax !== undefined)?.resaleTax

      return {
        simulationId: sim.id,
        simulationName: original.name,
        taxRegime: rentalData.taxRegime,
        taxRegimeLabel: getTaxRegimeLabel(rentalData.taxRegime, strings),
        annualTax: calculated.annualTax || 0,
        annualCashflowAfterTax: calculated.annualCashflowAfterTax || 0,
        netYield: calculated.netYield || 0,
        annualCashflow: calculated.annualCashflow || 0,
        yearlyTaxData,
        totalTaxOverPeriod,
        resaleTax,
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)

  // Add property flipping simulations as special tax entries
  const flipRegimes = propertyFlippingSimulations
    .map((sim) => {
      const original = originalSimulations.find((s) => s.id === sim.id)
      if (!original || original.type !== 'property-flipping') return null

      const flipData = original.data as MarchandDeBiensValues
      const taxes = calculatePropertyFlippingTaxes(flipData)

      return {
        simulationId: sim.id,
        simulationName: original.name,
        taxRegime: 'none' as TaxRegime, // Property flipping doesn't use rental tax regimes
        taxRegimeLabel: strings.taxRegimeComparisonPropertyFlipping || strings.sectionMarchandDeBiens || 'Marchand de biens',
        annualTax: 0, // Not applicable for property flipping
        annualCashflowAfterTax: 0, // Not applicable
        netYield: 0,
        annualCashflow: 0,
        yearlyTaxData: [
          {
            year: 1,
            annualTax: 0,
            resaleTax: taxes.totalTax,
            totalTax: taxes.totalTax,
            cashflowAfterTax: 0,
          },
        ] as YearlyTaxData[],
        totalTaxOverPeriod: taxes.totalTax,
        resaleTax: taxes.totalTax,
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)

  // Combine rental and property flipping regimes
  const allRegimes = [...regimes, ...flipRegimes]

  if (allRegimes.length < 2) {
    return {
      hasDifferentRegimes: false,
      regimes: allRegimes,
      hasResaleSimulations,
      hasPropertyFlippingSimulations: propertyFlippingSimulations.length > 0,
    }
  }

  // Check if there are different regimes (only for rental simulations)
  const rentalRegimesOnly = regimes.map((r) => r.taxRegime)
  const uniqueRegimes = new Set(rentalRegimesOnly)
  const hasDifferentRegimes = uniqueRegimes.size > 1 || propertyFlippingSimulations.length > 0

  // Find best regime (lowest total tax over period)
  // Always calculate even if regimes are the same
  let bestRegime: TaxRegimeComparisonResult['bestRegime'] | undefined
  let taxSavings: TaxRegimeComparisonResult['taxSavings'] | undefined

  if (allRegimes.length > 0) {
    // Find regime with lowest total tax over period
    const lowestTaxRegime = allRegimes.reduce((best, current) =>
      current.totalTaxOverPeriod < best.totalTaxOverPeriod ? current : best,
    )

    // Find regime with highest total tax over period
    const highestTaxRegime = allRegimes.reduce((worst, current) =>
      current.totalTaxOverPeriod > worst.totalTaxOverPeriod ? current : worst,
    )

    const savings = highestTaxRegime.totalTaxOverPeriod - lowestTaxRegime.totalTaxOverPeriod
    const savingsPercent =
      highestTaxRegime.totalTaxOverPeriod > 0
        ? (savings / highestTaxRegime.totalTaxOverPeriod) * 100
        : 0

    // Écart cumulé année par année — on ne compare que les simulations qui ont
    // réellement des données pour l'année (une durée plus courte ne vaut pas 0 € d'impôt)
    const maxYears = Math.max(...allRegimes.map((r) => r.yearlyTaxData.length))
    let cumulativeSavings = 0
    for (let year = 1; year <= maxYears; year++) {
      const yearTaxes = allRegimes
        .map((r) => r.yearlyTaxData.find((y) => y.year === year)?.totalTax)
        .filter((t): t is number => t !== undefined)
      if (yearTaxes.length >= 2) {
        const minYearTax = Math.min(...yearTaxes)
        const maxYearTax = Math.max(...yearTaxes)
        cumulativeSavings += maxYearTax - minYearTax
      }
    }

    bestRegime = {
      simulationId: lowestTaxRegime.simulationId,
      taxRegime: lowestTaxRegime.taxRegime,
      taxRegimeLabel: lowestTaxRegime.taxRegimeLabel,
      annualTax: lowestTaxRegime.annualTax,
      annualCashflowAfterTax: lowestTaxRegime.annualCashflowAfterTax,
      savings,
      totalTaxOverPeriod: lowestTaxRegime.totalTaxOverPeriod,
    }

    taxSavings = {
      lowestTax: lowestTaxRegime.totalTaxOverPeriod,
      highestTax: highestTaxRegime.totalTaxOverPeriod,
      savings,
      savingsPercent,
      cumulativeSavings,
    }
  }

  return {
    hasDifferentRegimes,
    regimes: allRegimes,
    bestRegime,
    taxSavings,
    hasResaleSimulations,
    hasPropertyFlippingSimulations: propertyFlippingSimulations.length > 0,
  }
}
