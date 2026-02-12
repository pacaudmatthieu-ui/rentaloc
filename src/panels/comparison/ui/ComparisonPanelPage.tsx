import { useEffect, useMemo, useRef, useState } from 'react'
import type { Locale } from '../../../shared/types'
import { ResultTile } from '../../../shared/ui'
import { useComparisonStore } from '../../../shared/stores/useComparisonStore'
import { calculateResults } from '../../rental-investment/lib/calculations'
import type { SimulationFormValues } from '../../rental-investment/model/types'
import type { MarchandDeBiensValues } from '../../property-flip/model/types'
import {
  detectBestScenario,
  getDefaultCriteria,
  type ComparisonCriteria,
  type CalculatedSimulation,
} from '../lib/detectBestScenario'
import {
  prepareComparisonExport,
  exportComparisonToJson,
} from '../lib/exportComparison'
import { compareStrategies } from '../lib/compareStrategies'
import { compareTaxRegimes, getTaxRegimeLabel } from '../lib/compareTaxRegimes'

interface ComparisonPanelPageProps {
  locale: Locale
  strings: Record<string, string>
}

export function ComparisonPanelPage({ locale, strings }: ComparisonPanelPageProps) {
  const comparisonStore = useComparisonStore()
  const scrollRefs = useRef<(HTMLDivElement | null)[]>([])

  // Initialize store on mount
  useEffect(() => {
    comparisonStore.initialize()
  }, [comparisonStore])

  const simulations = comparisonStore.simulations

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }),
    [locale],
  )

  const percentFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
        style: 'percent',
        maximumFractionDigits: 1,
      }),
    [locale],
  )

  // Synchronized scrolling
  useEffect(() => {
    const handlers: Array<() => void> = []
    
    scrollRefs.current.forEach((ref, index) => {
      if (ref) {
        const handleScroll = () => {
          const scrollPosition = ref.scrollTop
          if (scrollPosition === undefined) return

          scrollRefs.current.forEach((otherRef, i) => {
            if (i !== index && otherRef) {
              otherRef.scrollTop = scrollPosition
            }
          })
        }
        
        ref.addEventListener('scroll', handleScroll)
        handlers.push(() => {
          ref.removeEventListener('scroll', handleScroll)
        })
      }
    })

    return () => {
      handlers.forEach(cleanup => cleanup())
    }
  }, [simulations.length])

  // Calculate results for each simulation
  const calculatedResults = useMemo<CalculatedSimulation[]>(() => {
    return simulations.map((sim) => {
      if (sim.type === 'rental') {
        try {
          const results = calculateResults(sim.data as SimulationFormValues)
          return {
            ...sim,
            calculated: results,
          }
        } catch {
          return { ...sim, calculated: null }
        }
      } else {
        // Property flipping - calculate margin and financial costs
        // Use same calculation logic as FlipPanelPage and ReventeTable
        const flipData = sim.data as MarchandDeBiensValues
        try {
          const totalResale = flipData.apartments.reduce((sum, apt) => {
            const resale = parseFloat(apt.resaleLogic) || 0
            return sum + resale
          }, 0)
          const purchasePrice = parseFloat(flipData.purchasePrice) || 0
          const notaryFees = purchasePrice * 0.03
          const agencyFees = parseFloat(flipData.agencyFees) || 0
          const renovationBudget = parseFloat(flipData.renovationBudget) || 0
          const amountOfOperation = purchasePrice + notaryFees + agencyFees + renovationBudget
          const apportPercent = parseFloat(flipData.apportPercent) || 0
          const apportAmount = amountOfOperation * (apportPercent / 100)
          const financementAmount = amountOfOperation - apportAmount
          const ratePerYear = (parseFloat(flipData.ratePerYear) || 0) / 100
          const months = Math.max(parseFloat(flipData.durationMonths) || 1, 1)
          const annualInterest = financementAmount * ratePerYear
          const monthlyPayment = annualInterest / 12
          const totalPayments = monthlyPayment * months
          const financialCost = totalPayments
          // totalCostForMarge is used for margin calculation (same as ReventeTable)
          const totalCostForMarge = amountOfOperation + financialCost
          // Calculate margin as ratio (same formula as ReventeTable line 45-48)
          const marginRatio = totalCostForMarge > 0 
            ? (totalResale - totalCostForMarge) / totalCostForMarge 
            : 0
          // Convert to percentage for display
          const margin = marginRatio * 100
          const totalProfit = totalResale - totalCostForMarge
          // Calculate annualized return based on holding period
          const holdingPeriodMonths = months
          const annualizedReturn = holdingPeriodMonths > 0
            ? (Math.pow(1 + marginRatio, 12 / holdingPeriodMonths) - 1) * 100
            : 0
          return {
            ...sim,
            calculated: {
              margin,
              totalProfit,
              totalCost: totalCostForMarge,
              totalResale,
              financialCost,
              loanAmount: financementAmount,
              monthlyPayment,
              annualizedReturn,
            },
          }
        } catch {
          return { ...sim, calculated: null }
        }
      }
    })
  }, [simulations])

  // Comparison criteria state
  const [comparisonCriteria, setComparisonCriteria] = useState<ComparisonCriteria>(() => {
    return getDefaultCriteria(calculatedResults)
  })

  // Update criteria when simulations change
  useEffect(() => {
    setComparisonCriteria(getDefaultCriteria(calculatedResults))
  }, [calculatedResults.length])

  // Detect best scenario
  const bestScenario = useMemo(() => {
    return detectBestScenario(calculatedResults, comparisonCriteria)
  }, [calculatedResults, comparisonCriteria])

  // Compare strategies (rental vs flip)
  const strategyComparison = useMemo(() => {
    return compareStrategies(calculatedResults, simulations)
  }, [calculatedResults, simulations])

  // Compare tax regimes
  const taxRegimeComparison = useMemo(() => {
    return compareTaxRegimes(calculatedResults, simulations, strings)
  }, [calculatedResults, simulations, strings])

  // Criteria options based on simulation types
  const criteriaOptions = useMemo(() => {
    const hasRental = calculatedResults.some((sim) => sim.type === 'rental')
    const hasFlip = calculatedResults.some((sim) => sim.type === 'property-flipping')

    const options: Array<{ value: ComparisonCriteria; label: string }> = []

    if (hasRental) {
      options.push(
        { value: 'netYield', label: strings.comparisonCriteriaNetYield },
        { value: 'grossYield', label: strings.comparisonCriteriaGrossYield },
        { value: 'annualCashflow', label: strings.comparisonCriteriaAnnualCashflow },
        { value: 'annualCashflowAfterTax', label: strings.comparisonCriteriaAnnualCashflowAfterTax },
        { value: 'annualTax', label: strings.comparisonCriteriaAnnualTax },
        { value: 'monthlyPayment', label: strings.comparisonCriteriaMonthlyPayment },
        { value: 'loanAmount', label: strings.comparisonCriteriaLoanAmount },
      )
    }

    if (hasFlip) {
      options.push(
        { value: 'margin', label: strings.comparisonCriteriaMargin },
        { value: 'totalProfit', label: strings.comparisonCriteriaTotalProfit },
        { value: 'monthlyPayment', label: strings.comparisonCriteriaMonthlyPayment },
        { value: 'loanAmount', label: strings.comparisonCriteriaLoanAmount },
      )
    }

    // Common options
    options.push({ value: 'totalCost', label: strings.comparisonCriteriaTotalCost })

    // Remove duplicates
    return options.filter(
      (option, index, self) =>
        index === self.findIndex((o) => o.value === option.value),
    )
  }, [calculatedResults, strings])

  if (simulations.length === 0) {
    return (
      <main className="app-main comparison-panel">
        <div className="comparison-empty">
          <h2>{strings.comparisonEmpty}</h2>
          <p>{strings.comparisonEmptyMessage}</p>
        </div>
      </main>
    )
  }

  if (simulations.length < 2) {
    return (
      <main className="app-main comparison-panel">
        <div className="comparison-empty">
          <h2>{strings.comparisonEmpty}</h2>
          <p>{strings.comparisonEmptyMessage}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="app-main comparison-panel">
      <div className="comparison-header">
        <div>
          <h2>{strings.comparisonSimulations}</h2>
          {strategyComparison.hasMixedTypes && (
            <p className="comparison-strategy-indicator">
              {strings.strategyComparisonRentalVsFlip}
            </p>
          )}
          {bestScenario && (
            <p className="comparison-best-reason">
              {strings.bestScenarioReason}: {criteriaOptions.find((o) => o.value === bestScenario.metric)?.label || bestScenario.metric}
            </p>
          )}
        </div>
        <div className="comparison-header-actions">
          <div className="comparison-criteria-selector">
            <label htmlFor="comparison-criteria" className="field-label">
              {strings.comparisonCriteria}:
            </label>
            <select
              id="comparison-criteria"
              className="language-select"
              value={comparisonCriteria}
              onChange={(e) => setComparisonCriteria(e.target.value as ComparisonCriteria)}
            >
              {criteriaOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="export-import-btn"
            onClick={() => {
              const exportData = prepareComparisonExport(
                simulations,
                calculatedResults,
                bestScenario || null,
                comparisonCriteria,
              )
              const dateStr = new Date().toISOString().split('T')[0]
              exportComparisonToJson(exportData, `comparison_${dateStr}.json`)
            }}
            title={strings.exportData}
          >
            {strings.exportData}
          </button>
          <button
            type="button"
            className="export-import-btn"
            onClick={() => comparisonStore.clearComparison()}
          >
            {strings.clearComparison}
          </button>
        </div>
      </div>
      
      {/* Strategy Comparison Section - Show when comparing rental vs flip */}
      {strategyComparison.hasMixedTypes && strategyComparison.profitabilityComparison && (
        <div className="comparison-strategy-section">
          <h3 className="comparison-strategy-title">{strings.strategyComparisonKeyDifferences}</h3>
          
          <div className="comparison-strategy-grid">
            <div className="comparison-strategy-card">
              <h4>{strings.strategyComparisonCashflowVsMargin}</h4>
              {strategyComparison.keyDifferences.cashflowVsMargin.rental && (
                <div className="comparison-strategy-metric">
                  <span className="comparison-strategy-label">{strings.strategyComparisonRentalCashflow}:</span>
                  <span className="comparison-strategy-value">
                    {currencyFormatter.format(strategyComparison.keyDifferences.cashflowVsMargin.rental.annualCashflow)}
                  </span>
                  <span className="comparison-strategy-note">
                    ({percentFormatter.format(strategyComparison.keyDifferences.cashflowVsMargin.rental.netYield)} {strings.netYield})
                  </span>
                </div>
              )}
              {strategyComparison.keyDifferences.cashflowVsMargin.flip && (
                <div className="comparison-strategy-metric">
                  <span className="comparison-strategy-label">{strings.strategyComparisonFlipMargin}:</span>
                  <span className="comparison-strategy-value">
                    {percentFormatter.format(strategyComparison.keyDifferences.cashflowVsMargin.flip.margin / 100)}
                  </span>
                  <span className="comparison-strategy-note">
                    ({currencyFormatter.format(strategyComparison.keyDifferences.cashflowVsMargin.flip.totalProfit)} {strings.mbBeneficesNets || 'profit'})
                  </span>
                </div>
              )}
            </div>

            <div className="comparison-strategy-card">
              <h4>{strings.strategyComparisonHoldingPeriod}</h4>
              <div className="comparison-strategy-metric">
                <span className="comparison-strategy-label">{strings.strategyComparisonRentalOngoing}</span>
              </div>
              {strategyComparison.keyDifferences.holdingPeriod.flip && (
                <div className="comparison-strategy-metric">
                  <span className="comparison-strategy-label">
                    {strings.strategyComparisonFlipMonths.replace('{months}', String(strategyComparison.keyDifferences.holdingPeriod.flip))}
                  </span>
                </div>
              )}
            </div>

            <div className="comparison-strategy-card">
              <h4>{strings.strategyComparisonProfitability}</h4>
              {strategyComparison.profitabilityComparison.rentalAnnualizedReturn !== undefined && (
                <div className="comparison-strategy-metric">
                  <span className="comparison-strategy-label">{strings.strategyComparisonRentalCashflow}:</span>
                  <span className="comparison-strategy-value">
                    {percentFormatter.format(strategyComparison.profitabilityComparison.rentalAnnualizedReturn)}
                  </span>
                </div>
              )}
              {strategyComparison.profitabilityComparison.flipAnnualizedReturn !== undefined && (
                <div className="comparison-strategy-metric">
                  <span className="comparison-strategy-label">{strings.strategyComparisonAnnualizedReturn} (Flip):</span>
                  <span className="comparison-strategy-value">
                    {percentFormatter.format(strategyComparison.profitabilityComparison.flipAnnualizedReturn)}
                  </span>
                </div>
              )}
              {strategyComparison.profitabilityComparison.moreProfitable && (
                <div className="comparison-strategy-metric comparison-strategy-highlight">
                  <span className="comparison-strategy-label">{strings.strategyComparisonMoreProfitable}:</span>
                  <span className="comparison-strategy-value">
                    {strategyComparison.profitabilityComparison.moreProfitable === 'rental' 
                      ? strings.sectionInvestissementLocatif 
                      : strings.sectionMarchandDeBiens}
                  </span>
                </div>
              )}
              {strategyComparison.profitabilityComparison.explanation && (
                <div className="comparison-strategy-explanation">
                  {strategyComparison.profitabilityComparison.explanation}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tax Regime Comparison Section - Show when comparing different tax regimes */}
      {taxRegimeComparison.hasDifferentRegimes && taxRegimeComparison.regimes.length > 0 && (() => {
        // Find max number of years across all regimes
        const maxYears = Math.max(...taxRegimeComparison.regimes.map((r) => r.yearlyTaxData.length))
        const years = Array.from({ length: maxYears }, (_, i) => i + 1)
        
        return (
          <div className="comparison-strategy-section">
            <h3 className="comparison-strategy-title">{strings.taxRegimeComparisonTitle}</h3>
            
            {taxRegimeComparison.bestRegime && taxRegimeComparison.taxSavings && (
              <div className="comparison-tax-highlight">
                <div className="comparison-tax-best">
                  <span className="comparison-tax-label">{strings.taxRegimeComparisonBestRegime}:</span>
                  <span className="comparison-tax-value">{taxRegimeComparison.bestRegime.taxRegimeLabel}</span>
                </div>
                {taxRegimeComparison.taxSavings.savings > 0 && (
                  <div className="comparison-tax-savings">
                    <span className="comparison-tax-savings-amount">
                      {strings.taxRegimeComparisonSavingsAmount.replace(
                        '{amount}',
                        currencyFormatter.format(taxRegimeComparison.taxSavings.savings),
                      )}
                    </span>
                    <span className="comparison-tax-savings-percent">
                      {strings.taxRegimeComparisonSavingsPercent.replace(
                        '{percent}',
                        taxRegimeComparison.taxSavings.savingsPercent.toFixed(1),
                      )}
                    </span>
                  </div>
                )}
              </div>
            )}


            {/* Yearly Tax Comparison Table */}
            <div className="comparison-tax-yearly-section">
              <h4 className="comparison-tax-yearly-title">{strings.taxRegimeComparisonYearlyTaxes}</h4>
            
            <div className="comparison-tax-yearly-table-wrapper">
              <table className="comparison-tax-yearly-table">
                <thead>
                  <tr>
                    <th className="comparison-tax-regime-header">{strings.taxRegimeComparisonRegime}</th>
                    {years.map((year) => (
                      <th key={year} className="comparison-tax-year-header">
                        {strings.taxRegimeComparisonYear} {year}
                      </th>
                    ))}
                    <th className="comparison-tax-total-header">{strings.taxRegimeComparisonTotalTaxOverPeriod}</th>
                  </tr>
                </thead>
                <tbody>
                  {taxRegimeComparison.regimes.map((regime) => {
                    const isBest = taxRegimeComparison.bestRegime?.simulationId === regime.simulationId
                    return (
                      <tr
                        key={regime.simulationId}
                        className={isBest ? 'comparison-tax-row-best' : ''}
                      >
                        <td className="comparison-tax-regime-cell">
                          <div>
                            <div className="comparison-tax-regime-name">{regime.taxRegimeLabel}</div>
                            <div className="comparison-tax-regime-sim-name">{regime.simulationName}</div>
                          </div>
                        </td>
                        {years.map((year) => {
                          const yearData = regime.yearlyTaxData.find((y) => y.year === year)
                          if (!yearData) {
                            return (
                              <td key={year} className="comparison-tax-year-cell">
                                -
                              </td>
                            )
                          }
                          return (
                            <td key={year} className="comparison-tax-year-cell">
                              <div className="comparison-tax-year-amount">
                                {currencyFormatter.format(yearData.totalTax)}
                              </div>
                              {yearData.resaleTax !== undefined && yearData.resaleTax > 0 && (
                                <div className="comparison-tax-year-resale">
                                  <span className="comparison-tax-year-resale-label">
                                    {strings.taxRegimeComparisonResaleTax}:
                                  </span>
                                  <span className="comparison-tax-year-resale-value">
                                    {currencyFormatter.format(yearData.resaleTax)}
                                  </span>
                                </div>
                              )}
                            </td>
                          )
                        })}
                        <td className="comparison-tax-total-cell">
                          <div className="comparison-tax-total-value">
                            {currencyFormatter.format(regime.totalTaxOverPeriod)}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            </div>
          </div>
        )
      })()}

      <div className="comparison-grid" style={{ gridTemplateColumns: `repeat(${simulations.length}, 1fr)` }}>
        {calculatedResults.map((sim, index) => {
          const isBest = bestScenario?.bestSimulationIds.includes(sim.id) ?? false
          return (
            <div
              key={sim.id}
              className={`comparison-column ${isBest ? 'comparison-column-best' : ''}`}
              ref={(el) => {
                scrollRefs.current[index] = el
              }}
            >
              <div className="comparison-column-header">
                <div className="comparison-column-header-title">
                  <h3>{sim.name}</h3>
                  {isBest && (
                    <span className="comparison-best-badge" title={bestScenario?.reason}>
                      {strings.bestScenario}
                    </span>
                  )}
                </div>
                <span className={`comparison-type-badge comparison-type-${sim.type}`}>
                  {sim.type === 'rental' ? strings.sectionInvestissementLocatif : strings.sectionMarchandDeBiens}
                </span>
                <button
                  type="button"
                  className="comparison-remove-btn"
                  onClick={() => comparisonStore.removeFromComparison(sim.id)}
                  title={strings.removeFromComparison}
                >
                  ×
                </button>
              </div>
              <div className="comparison-column-content">
                {sim.type === 'rental' && sim.calculated && 'grossYield' in sim.calculated ? (
                  <>
                    {/* Tax Regime Badge */}
                    {(() => {
                      const original = simulations.find((s) => s.id === sim.id)
                      if (original && original.type === 'rental') {
                        const rentalData = original.data as SimulationFormValues
                        const taxRegimeLabel = getTaxRegimeLabel(rentalData.taxRegime, strings)
                        return (
                          <div className="comparison-tax-regime-badge">
                            <span className="comparison-tax-regime-label">{strings.taxRegimeLabel}:</span>
                            <span className="comparison-tax-regime-value">{taxRegimeLabel}</span>
                          </div>
                        )
                      }
                      return null
                    })()}
                    <ResultTile
                      label={strings.grossYield}
                      value={percentFormatter.format(sim.calculated.grossYield)}
                      variant={sim.calculated.grossYield > 0 ? 'positive' : 'negative'}
                    />
                    <ResultTile
                      label={strings.netYield}
                      value={percentFormatter.format(sim.calculated.netYield)}
                      variant={sim.calculated.netYield > 0 ? 'positive' : 'negative'}
                    />
                    <ResultTile
                      label={strings.annualCashflow}
                      value={currencyFormatter.format(sim.calculated.annualCashflow)}
                      variant={sim.calculated.annualCashflow > 0 ? 'positive' : 'negative'}
                    />
                    {sim.calculated.annualTax !== undefined && (
                      <ResultTile
                        label={strings.estimatedAnnualTax}
                        value={currencyFormatter.format(sim.calculated.annualTax)}
                        variant={sim.calculated.annualTax > 0 ? 'negative' : 'default'}
                      />
                    )}
                    {sim.calculated.annualCashflowAfterTax !== undefined && (
                      <ResultTile
                        label={strings.annualCashflowAfterTax}
                        value={currencyFormatter.format(sim.calculated.annualCashflowAfterTax)}
                        variant={sim.calculated.annualCashflowAfterTax > 0 ? 'positive' : 'negative'}
                      />
                    )}
                    <ResultTile
                      label={strings.totalCost}
                      value={currencyFormatter.format(sim.calculated.totalCost)}
                    />
                    <ResultTile
                      label={strings.loanAmount}
                      value={currencyFormatter.format(sim.calculated.loanAmount)}
                    />
                    {sim.calculated.monthlyCashflow !== undefined && (
                      <ResultTile
                        label={strings.monthlyCashflow}
                        value={currencyFormatter.format(sim.calculated.monthlyCashflow)}
                        variant={sim.calculated.monthlyCashflow > 0 ? 'positive' : 'negative'}
                      />
                    )}
                    {sim.calculated.monthlyPayment !== undefined && (
                      <ResultTile
                        label={strings.mbMonthlyPayment || 'Mensualité'}
                        value={currencyFormatter.format(sim.calculated.monthlyPayment)}
                      />
                    )}
                  </>
                ) : sim.type === 'property-flipping' && sim.calculated && 'margin' in sim.calculated ? (
                  <>
                    <ResultTile
                      label={strings.mbMarge || 'Marge'}
                      value={percentFormatter.format(sim.calculated.margin / 100)}
                      variant={sim.calculated.margin > 0 ? 'positive' : 'negative'}
                    />
                    <ResultTile
                      label={strings.mbBeneficesNets || 'Bénéfices nets'}
                      value={currencyFormatter.format(sim.calculated.totalProfit)}
                      variant={sim.calculated.totalProfit > 0 ? 'positive' : 'negative'}
                    />
                    <ResultTile
                      label={strings.totalCost}
                      value={currencyFormatter.format(sim.calculated.totalCost)}
                    />
                    <ResultTile
                      label={strings.mbReventeLogic || 'Revente logique'}
                      value={currencyFormatter.format(sim.calculated.totalResale)}
                    />
                  {sim.calculated.financialCost !== undefined && (
                    <ResultTile
                      label={strings.mbFinancialCost || 'Coût financier'}
                      value={currencyFormatter.format(sim.calculated.financialCost)}
                    />
                  )}
                  {sim.calculated.annualizedReturn !== undefined && sim.calculated.annualizedReturn > 0 && (
                    <ResultTile
                      label={strings.strategyComparisonAnnualizedReturn || 'Rentabilité annualisée'}
                      value={percentFormatter.format(sim.calculated.annualizedReturn / 100)}
                      variant={sim.calculated.annualizedReturn > 0 ? 'positive' : 'negative'}
                    />
                  )}
                </>
              ) : (
                  <div className="comparison-error">Unable to calculate results</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}
