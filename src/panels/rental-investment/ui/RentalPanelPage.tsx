import { useEffect, useMemo, useRef, useState } from 'react'
import type { Locale } from '../../../shared/types'
import { toNumber } from '../../../shared/lib/format'
import { FormField, YearsField, ResultTile, BreakdownRow, CashflowChart, LoanChartsSection, SortableSectionList, VerdictBar, HelpTip } from '../../../shared/ui'
import type { VerdictKpi } from '../../../shared/ui'
import { usePanelLayout } from '../../../shared/hooks/usePanelLayout'
import { ExportImportPanel } from '../../../features/export-json'
import { SavedSimulationsPanel } from '../../../shared/ui/SavedSimulationsPanel'
import { TaxComparisonPanel } from './sections/TaxComparisonPanel'
import { INITIAL_VALUES } from '../model/types'
import type { SimulationFormValues } from '../model/types'
import { validateInvestissementData } from '../model/validation'
import { saveRentalSimulation, loadCurrentSimulationComparisonId } from '../../../shared/utils/storage'
import { useComparisonStore } from '../../../shared/stores/useComparisonStore'
import {
  calculateResults,
  computeIRRByYearData,
  computeLoanChartsData,
  computeYearlyChartData,
  computeYearlyTableData,
} from '../lib/calculations'

/** Structure par défaut : Ligne 1: Acquisition | Résultat | Ligne 2: Financement | Revenus | Charge | Ligne 3: Fiscalité | Projet revente | Ligne 4: Cash flow | Ligne 5: Détail | Ligne 6: Évolution crédit */
const RENTAL_DEFAULT_ORDER = [
  'acquisition',
  'results',
  'financing',
  'revenues',
  'charges',
  'taxation',
  'tax-comparison',
  'resale',
  'chart',
  'yearly-table',
  'loan-charts',
]
const RENTAL_GRID_LAYOUT = [2, 3, 2, 1, 1, 1, 1] as const

const TAX_REGIME_OPTIONS: SimulationFormValues['taxRegime'][] = [
  'none',
  'micro_foncier',
  'reel_foncier',
  'lmnp_micro_bic',
  'lmnp_reel',
  'sci_ir',
  'sci_is',
  'bailleur_prive',
]

interface RentalPanelPageProps {
  locale: Locale
  strings: Record<string, string>
  initialValues?: SimulationFormValues | null
  valuesRef?: React.MutableRefObject<SimulationFormValues | null>
  uiMode?: 'simple' | 'expert'
  onRequestExpertMode?: () => void
}

export function RentalPanelPage({ locale, strings, initialValues, valuesRef, uiMode = 'expert', onRequestExpertMode }: RentalPanelPageProps) {
  const comparisonStore = useComparisonStore()
  const [comparisonButtonState, setComparisonButtonState] = useState<'idle' | 'success' | 'error'>('idle')
  const [comparisonError, setComparisonError] = useState<string | null>(null)

  // Initialize comparison store on mount
  useEffect(() => {
    comparisonStore.initialize()
  }, [comparisonStore])

  // Initialize with provided initial values, saved values, or default values
  // Priority: initialValues (from localStorage) > INITIAL_VALUES (defaults)
  const [values, setValues] = useState<SimulationFormValues>(() => {
    try {
      if (initialValues && typeof initialValues === 'object') {
        return initialValues
      }
      return INITIAL_VALUES
    } catch (error) {
      console.error('Error initializing RentalPanelPage:', error)
      return INITIAL_VALUES
    }
  })
  const pdfRef = useRef<HTMLDivElement>(null)

  // Update values when initialValues prop changes (when switching back to this simulation type)
  useEffect(() => {
    if (initialValues && typeof initialValues === 'object') {
      setValues(initialValues)
    }
  }, [initialValues])

  // Keep ref in sync with current values
  useEffect(() => {
    if (valuesRef) {
      valuesRef.current = values
    }
  }, [values, valuesRef])

  // Save values to localStorage whenever they change
  useEffect(() => {
    saveRentalSimulation(values)
  }, [values])

  // Check if current simulation is already in comparison
  const isInComparison = useMemo(() => {
    const storedComparisonId = loadCurrentSimulationComparisonId()
    if (storedComparisonId) {
      const state = comparisonStore.simulations
      const found = state.find((sim) => sim.id === storedComparisonId && sim.type === 'rental')
      if (found) return true
    }
    return comparisonStore.isInComparison('rental', values)
  }, [comparisonStore, values])

  // Use ref to track last updated values to prevent infinite loops
  const lastUpdatedValuesRef = useRef<string>('')

  useEffect(() => {
    if (isInComparison) {
      const currentValuesStr = JSON.stringify(values)
      if (lastUpdatedValuesRef.current !== currentValuesStr) {
        lastUpdatedValuesRef.current = currentValuesStr
        comparisonStore.updateSimulationData('rental', values)
      }
    }
  }, [values, isInComparison, comparisonStore])

  const results = useMemo(() => calculateResults(values), [values])
  const chartData = useMemo(() => computeYearlyChartData(values), [values])
  const tableData = useMemo(() => computeYearlyTableData(values), [values])
  const loanChartsData = useMemo(() => computeLoanChartsData(values), [values])
  const irrByYearData = useMemo(() => computeIRRByYearData(values, true), [values])

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

  const handleChange =
    (field: keyof SimulationFormValues) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setValues((prev) => ({ ...prev, [field]: event.target.value }))
    }

  const handleTaxRegimeChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setValues((prev) => ({ ...prev, taxRegime: event.target.value as SimulationFormValues['taxRegime'] }))
  }

  const handleFeesAmortizeYear1Change = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setValues((prev) => ({
      ...prev,
      feesAmortizeYear1: event.target.checked,
    }))
  }

  const handleReducedNotaryFeesChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setValues((prev) => ({
      ...prev,
      reducedNotaryFees: event.target.checked,
    }))
  }

  const handleDeferralTypeChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const v = event.target.value as SimulationFormValues['deferralType']
    setValues((prev) => ({
      ...prev,
      deferralType: v,
      ...(v === 'none' ? { deferralMonths: '0' } : {}),
    }))
  }

  const inv = strings.invalidNumber

  const regimeLabels: Record<string, string> = {
    none: strings.taxNone,
    micro_foncier: strings.taxMicroFoncier,
    reel_foncier: strings.taxReelFoncier,
    lmnp_micro_bic: strings.taxLmnpMicro,
    lmnp_reel: strings.taxLmnpReel,
    sci_ir: strings.taxSciIr,
    sci_is: strings.taxSciIs,
    bailleur_prive: strings.taxBailleurPrive,
  }

  // ----- Bandeau verdict -----
  const verdict = useMemo(() => {
    const cfMonth = results.monthlyCashflowAfterTax
    const tone: 'positive' | 'negative' | 'neutral' =
      cfMonth >= 1 ? 'positive' : cfMonth <= -1 ? 'negative' : 'neutral'
    const totalOutflow =
      results.annualCharges + results.annualLoanAndInsurance + Math.max(0, results.annualTax)
    const selfFinancing = totalOutflow > 0 ? results.annualRentEffective / totalOutflow : 1
    const amount = currencyFormatter.format(Math.abs(cfMonth))
    let phrase = strings.verdictBreakEven
    if (tone === 'positive') phrase = strings.verdictPositive.replace('{amount}', amount)
    if (tone === 'negative')
      phrase = strings.verdictNegative
        .replace('{amount}', amount)
        .replace('{percent}', percentFormatter.format(Math.min(selfFinancing, 1)))
    const lastIrr = irrByYearData.length > 0 ? irrByYearData[irrByYearData.length - 1].irr : null
    const kpis: VerdictKpi[] = [
      { label: strings.grossYield, value: percentFormatter.format(results.grossYield), tone: 'positive', help: strings.helpGrossYield },
      { label: strings.netYield, value: percentFormatter.format(results.netYield), tone: 'positive', help: strings.helpNetYield },
      {
        label: `${strings.verdictIrrLabel} (${irrByYearData.length} ${strings.taxComparisonYears})`,
        value: lastIrr != null ? percentFormatter.format(lastIrr / 100) : '—',
        tone: lastIrr != null && lastIrr > 0 ? 'positive' : 'neutral',
        help: strings.helpIrr,
      },
    ]
    return {
      figure: currencyFormatter.format(cfMonth),
      tone,
      phrase,
      kpis,
    }
  }, [results, irrByYearData, currencyFormatter, percentFormatter, strings])

  // ----- Tableau annuel (colonnes essentielles / complètes) -----
  const compactTable = (
    <div className="yearly-table-wrapper">
      <table className="yearly-table yearly-table-compact">
        <thead>
          <tr>
            <th>{strings.tableYear}</th>
            <th>{strings.tableRent}</th>
            <th>{strings.tableCharges}</th>
            <th>{strings.tableCredit}</th>
            <th>{strings.tableTax}</th>
            <th>{strings.tableCashDispo}</th>
          </tr>
        </thead>
        <tbody>
          {tableData.map((row) => (
            <tr key={row.year}>
              <td>{row.year}</td>
              <td className="yearly-table-num">{currencyFormatter.format(row.rent)}</td>
              <td className="yearly-table-num">{currencyFormatter.format(row.charges)}</td>
              <td className="yearly-table-num">{currencyFormatter.format(row.credit)}</td>
              <td className={`yearly-table-num ${row.tax + row.saleTax < 0 ? 'yearly-table-pos' : ''}`}>{currencyFormatter.format(row.tax + row.saleTax)}</td>
              <td className={`yearly-table-num ${row.cashDispo < 0 ? 'yearly-table-neg' : 'yearly-table-pos'}`}>{currencyFormatter.format(row.cashDispo)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const sections = useMemo(
    () => [
      {
        id: 'acquisition',
        title: strings.sectionAcquisition,
        description: strings.acquisitionDescription,
        content: (
          <div className="form-card-body">
            <FormField label={strings.purchasePrice} value={values.purchasePrice} onChange={handleChange('purchasePrice')} unit={strings.unitEuro} help={strings.helpPurchasePrice} invalidMessage={inv} />
            <div className="form-field-with-hint">
              <FormField
                label={strings.notaryFees}
                value={values.notaryFeesOverride ?? ''}
                onChange={(e) => setValues((prev) => ({ ...prev, notaryFeesOverride: e.target.value }))}
                unit={strings.unitEuro}
                invalidMessage={inv}
              />
              <span className="form-field-hint">
                {values.notaryFeesOverride
                  ? strings.mbNotaryFeesHint
                  : `auto : ${currencyFormatter.format(toNumber(values.purchasePrice) * (values.reducedNotaryFees ? 0.03 : 0.08))}`}
              </span>
            </div>
            <label className="form-field form-field-checkbox">
              <input type="checkbox" checked={!!values.reducedNotaryFees} onChange={handleReducedNotaryFeesChange} />
              <span>{strings.reducedNotaryFees}</span>
            </label>
            <FormField label={strings.agencyFees} value={values.agencyFees} onChange={handleChange('agencyFees')} unit={strings.unitEuro} invalidMessage={inv} />
            <FormField label={strings.renovationBudget} value={values.renovationBudget} onChange={handleChange('renovationBudget')} unit={strings.unitEuro} help={strings.helpRenovation} invalidMessage={inv} />
            <FormField label={strings.furnitureBudget} value={values.furnitureBudget} onChange={handleChange('furnitureBudget')} unit={strings.unitEuro} help={strings.helpFurniture} invalidMessage={inv} />
            <FormField label={strings.ownFunds} value={values.ownFunds} onChange={handleChange('ownFunds')} unit={strings.unitEuro} help={strings.helpOwnFunds} invalidMessage={inv} />
          </div>
        ),
      },
      {
        id: 'financing',
        title: strings.sectionFinancing,
        description: strings.financingDescription,
        content: (
          <div className="form-card-body">
            <FormField label={strings.interestRate} value={values.interestRate} onChange={handleChange('interestRate')} unit={strings.unitPercent} help={strings.helpInterestRate} invalidMessage={inv} />
            <FormField label={strings.insuranceRate} value={values.insuranceRate} onChange={handleChange('insuranceRate')} unit={strings.unitPercent} help={strings.helpInsuranceRate} invalidMessage={inv} />
            <YearsField
              label={strings.loanDurationYears}
              months={values.loanDurationMonths}
              onMonthsChange={(m) => setValues((prev) => ({ ...prev, loanDurationMonths: m || '1' }))}
              unit={strings.unitYears}
              help={strings.helpLoanDuration}
              invalidMessage={inv}
            />
            <label className="form-field">
              <span className="field-label">{strings.deferralType}</span>
              <select className="field-input" value={values.deferralType} onChange={handleDeferralTypeChange}>
                <option value="none">{strings.deferralNone}</option>
                <option value="partial">{strings.deferralPartial}</option>
                <option value="total">{strings.deferralTotal}</option>
              </select>
            </label>
            {values.deferralType !== 'none' && (
              <FormField label={strings.deferralMonths} value={values.deferralMonths} onChange={handleChange('deferralMonths')} unit={strings.unitMonths} invalidMessage={inv} />
            )}
            <FormField label={strings.loanFees} value={values.loanFees} onChange={handleChange('loanFees')} unit={strings.unitEuro} help={strings.helpLoanFees} invalidMessage={inv} />
            <FormField label={strings.guaranteeFees} value={values.guaranteeFees} onChange={handleChange('guaranteeFees')} unit={strings.unitEuro} help={strings.helpGuaranteeFees} invalidMessage={inv} />
          </div>
        ),
      },
      {
        id: 'revenues',
        title: strings.sectionRevenues,
        description: strings.revenuesDescription,
        content: (
          <div className="form-card-body">
            <FormField label={strings.monthlyRent} value={values.monthlyRent} onChange={handleChange('monthlyRent')} unit={strings.unitEuroPerMonth} help={strings.helpMonthlyRent} invalidMessage={inv} />
            <FormField label={strings.monthlyRecoverableCharges} value={values.monthlyRecoverableCharges} onChange={handleChange('monthlyRecoverableCharges')} unit={strings.unitEuroPerMonth} help={strings.helpRecoverableCharges} invalidMessage={inv} />
            <FormField label={strings.rentRevaluationPercent} value={values.rentRevaluationPercent} onChange={handleChange('rentRevaluationPercent')} unit={strings.unitPercent} help={strings.helpRentRevaluation} invalidMessage={inv} />
            <FormField label={strings.vacancyRate} value={values.vacancyRate} onChange={handleChange('vacancyRate')} unit={strings.unitPercent} help={strings.helpVacancy} invalidMessage={inv} />
          </div>
        ),
      },
      {
        id: 'charges',
        title: strings.sectionCharges,
        description: strings.chargesDescription,
        content: (
          <div className="form-card-body">
            <FormField label={strings.annualPropertyTax} value={values.annualPropertyTax} onChange={handleChange('annualPropertyTax')} unit={strings.unitEuroPerYear} help={strings.helpPropertyTax} invalidMessage={inv} />
            <FormField label={strings.annualNonRecoverableCharges} value={values.annualNonRecoverableCharges} onChange={handleChange('annualNonRecoverableCharges')} unit={strings.unitEuroPerYear} help={strings.helpNonRecoverable} invalidMessage={inv} />
            <FormField label={strings.annualManagementPercent} value={values.annualManagementPercent} onChange={handleChange('annualManagementPercent')} unit={strings.unitPercent} help={strings.helpManagement} invalidMessage={inv} />
            <FormField label={strings.annualMaintenance} value={values.annualMaintenance} onChange={handleChange('annualMaintenance')} unit={strings.unitEuroPerYear} help={strings.helpMaintenance} invalidMessage={inv} />
            <FormField label={strings.annualInsurancePNO} value={values.annualInsurancePNO} onChange={handleChange('annualInsurancePNO')} unit={strings.unitEuroPerYear} help={strings.helpPNO} invalidMessage={inv} />
            <FormField label={strings.otherAnnualExpenses} value={values.otherAnnualExpenses} onChange={handleChange('otherAnnualExpenses')} unit={strings.unitEuroPerYear} invalidMessage={inv} />
          </div>
        ),
      },
      {
        id: 'tax-comparison',
        title: strings.taxComparisonTitle,
        description: strings.taxComparisonDescription,
        content: (
          <TaxComparisonPanel
            values={values}
            currencyFormatter={currencyFormatter}
            strings={strings}
          />
        ),
      },
      {
        id: 'resale',
        title: strings.sectionResale,
        description: strings.resaleDescription,
        content: (
          <div className="form-card-body">
            <YearsField
              label={strings.resaleHoldingYears}
              months={values.resaleHoldingMonths}
              onMonthsChange={(m) => setValues((prev) => ({ ...prev, resaleHoldingMonths: m }))}
              unit={strings.unitYears}
              help={strings.helpResale}
              invalidMessage={inv}
            />
            <FormField
              label={strings.resalePrice}
              value={values.resalePrice}
              onChange={handleChange('resalePrice')}
              unit={strings.unitEuro}
              help={strings.helpResalePrice}
              invalidMessage={inv}
            />
          </div>
        ),
      },
      {
        id: 'taxation',
        title: strings.sectionTaxation,
        description: strings.taxDescription,
        className: 'section-allow-tooltip-overflow',
        content: (
          <div className="form-card-body">
            <label className="form-field">
              <span className="field-label">{strings.taxRegimeLabel}</span>
              <select className="field-input" value={values.taxRegime} onChange={handleTaxRegimeChange}>
                {TAX_REGIME_OPTIONS.map((key) => (
                  <option key={key} value={key}>{regimeLabels[key]}</option>
                ))}
              </select>
            </label>
            <p className="regime-hint">{strings[`regimeHint_${values.taxRegime}`]}</p>
            <FormField label={strings.marginalTaxRate} value={values.marginalTaxRate} onChange={handleChange('marginalTaxRate')} unit={strings.unitPercent} help={strings.helpTmi} invalidMessage={inv} />
            <FormField label={strings.socialChargesRate} value={values.socialChargesRate} onChange={handleChange('socialChargesRate')} unit={strings.unitPercent} help={strings.helpSocialCharges} invalidMessage={inv} />
            <FormField label={strings.corporateTaxRate} value={values.corporateTaxRate} onChange={handleChange('corporateTaxRate')} unit={strings.unitPercent} help={strings.helpCorporateTax} invalidMessage={inv} />
            {(values.taxRegime === 'lmnp_reel' || values.taxRegime === 'sci_is') && (
              <label className="form-field form-field-checkbox">
                <input type="checkbox" checked={values.feesAmortizeYear1} onChange={handleFeesAmortizeYear1Change} />
                <span>{strings.feesAmortizeYear1}</span>
              </label>
            )}
            {values.taxRegime === 'sci_is' && (() => {
              const flatTaxDetail = tableData.find((r) => r.flatTaxDetail)?.flatTaxDetail
              return (
                <div className="form-field-checkbox-with-pfu-tooltip">
                  <label className="form-field form-field-checkbox">
                    <input
                      type="checkbox"
                      checked={!!values.sciIsWithdrawFlatTax}
                      onChange={(e) => setValues((prev) => ({ ...prev, sciIsWithdrawFlatTax: e.target.checked }))}
                    />
                    <span>{strings.sciIsWithdrawFlatTax}</span>
                  </label>
                  {flatTaxDetail && (
                    <div className="pfu-detail-tooltip">
                      <div className="pfu-detail-tooltip-content">
                        <h4 className="pfu-detail-tooltip-title">{strings.flatTaxDetailTitle}</h4>
                        <p className="pfu-detail-tooltip-intro">{strings.flatTaxAccumulatedPerYear}:</p>
                        <ul className="pfu-detail-tooltip-list">
                          {flatTaxDetail.annualAccumulated.map((a) => (
                            <li key={a.year}>
                              {strings.flatTaxYear.replace('{year}', String(a.year))}: {currencyFormatter.format(a.cfBeforeTax)} − {currencyFormatter.format(a.corporateTax)} = {currencyFormatter.format(a.amount)}
                            </li>
                          ))}
                        </ul>
                        <div className="pfu-detail-tooltip-steps">
                          <div className="pfu-detail-tooltip-row">
                            <span>{strings.flatTaxSumAnnual}</span>
                            <span>{currencyFormatter.format(flatTaxDetail.annualAccumulated.reduce((s, a) => s + a.amount, 0))}</span>
                          </div>
                          <div className="pfu-detail-tooltip-row">
                            <span>{strings.flatTaxResaleNet}</span>
                            <span>{currencyFormatter.format(flatTaxDetail.resalePrice)} − {currencyFormatter.format(flatTaxDetail.crdAtResale)} − {currencyFormatter.format(flatTaxDetail.corporateTaxOnGain)} = {currencyFormatter.format(flatTaxDetail.resaleNet)}</span>
                          </div>
                          <div className="pfu-detail-tooltip-row pfu-detail-tooltip-total">
                            <span>{strings.flatTaxTotalAccumulated}</span>
                            <span>{currencyFormatter.format(flatTaxDetail.totalAccumulated)}</span>
                          </div>
                          <div className="pfu-detail-tooltip-row">
                            <span>{strings.flatTaxRate}</span>
                            <span>{(flatTaxDetail.flatTaxRate * 100).toFixed(1)} %</span>
                          </div>
                          <div className="pfu-detail-tooltip-row">
                            <span>{strings.flatTaxAmount}</span>
                            <span>{currencyFormatter.format(Math.max(0, flatTaxDetail.totalAccumulated - flatTaxDetail.ownFundsReturned))} × {(flatTaxDetail.flatTaxRate * 100).toFixed(1)} % = {currencyFormatter.format(flatTaxDetail.flatTaxAmount)}</span>
                          </div>
                          <div className="pfu-detail-tooltip-row">
                            <span>{strings.flatTaxCorporateOnGain}</span>
                            <span>{currencyFormatter.format(flatTaxDetail.corporateTaxOnGain)}</span>
                          </div>
                          <div className="pfu-detail-tooltip-row pfu-detail-tooltip-total">
                            <span>{strings.flatTaxTotalResaleTax}</span>
                            <span>{currencyFormatter.format(flatTaxDetail.totalResaleTax)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        ),
      },
      {
        id: 'results',
        title: strings.resultsTitle,
        description: strings.keyMetrics,
        content: (
          <>
            <div className="results-grid">
              <ResultTile label={strings.monthlyCashflowAfterTax} value={currencyFormatter.format(results.monthlyCashflowAfterTax)} variant={results.monthlyCashflowAfterTax >= 0 ? 'positive' : 'negative'} help={strings.helpCashflow} />
              <ResultTile label={strings.monthlyCashflow} value={currencyFormatter.format(results.monthlyCashflow)} variant={results.monthlyCashflow >= 0 ? 'positive' : 'negative'} />
              <ResultTile label={strings.annualCashflow} value={currencyFormatter.format(results.annualCashflow)} variant={results.annualCashflow >= 0 ? 'positive' : 'negative'} />
              <ResultTile label={strings.grossYield} value={percentFormatter.format(results.grossYield)} help={strings.helpGrossYield} />
              <ResultTile label={strings.netYield} value={percentFormatter.format(results.netYield)} help={strings.helpNetYield} />
              <ResultTile label={strings.cashOnCash} value={percentFormatter.format(results.cashOnCash)} help={strings.helpCashOnCash} />
              <ResultTile label={strings.annualCashflowAfterTax} value={currencyFormatter.format(results.annualCashflowAfterTax)} variant={results.annualCashflowAfterTax >= 0 ? 'positive' : 'negative'} />
            </div>
            <h3 className="results-breakdown-title">{strings.breakdownTitle}</h3>
            <div className="results-breakdown">
              <BreakdownRow label={strings.totalCost} value={currencyFormatter.format(results.totalCost)} />
              <BreakdownRow label={strings.loanAmount} value={currencyFormatter.format(results.loanAmount)} />
              <BreakdownRow label={strings.effectiveRent} value={currencyFormatter.format(results.annualRentEffective)} />
              <BreakdownRow label={strings.annualChargesLabel} value={currencyFormatter.format(results.annualCharges)} />
              <BreakdownRow label={strings.annualLoanAndInsuranceLabel} value={currencyFormatter.format(results.annualLoanAndInsurance)} />
              <BreakdownRow label={strings.estimatedAnnualTax} value={currencyFormatter.format(results.annualTax)} />
              {results.annualDepreciation > 0 && (
                <BreakdownRow label={strings.annualDepreciation} value={currencyFormatter.format(results.annualDepreciation)} />
              )}
            </div>
            <p className="results-disclaimer">{strings.disclaimer}</p>
          </>
        ),
        className: 'results-card',
      },
      {
        id: 'chart',
        title: strings.chartTitle,
        content: (
          <div className="chart-section-content">
            <CashflowChart
              data={chartData}
              currencyFormatter={currencyFormatter}
              revenueLabel={strings.chartRevenueLabel}
              chargesLabel={strings.chartExpensesLabel}
              cashflowLabel={strings.chartCashflowLabel}
              tooltipStrings={{
                revenue: strings.chartTooltipRevenue,
                charges: strings.chartTooltipCharges,
                cashflow: strings.chartTooltipCashflow,
                propertyTax: strings.chartChargePropertyTax,
                copro: strings.chartChargeCopro,
                management: strings.chartChargeManagement,
                maintenance: strings.chartChargeMaintenance,
                insurance: strings.chartChargeInsurance,
                other: strings.chartChargeOther,
                loan: strings.chartChargeLoan,
                depreciation: strings.chartChargeDepreciation,
                carryforward: strings.chartChargeCarryforward,
                tax: strings.chartChargeTax,
                saleTax: strings.chartChargeSaleTax,
                corporateTaxOnGain: strings.chartChargeCorporateOnGain,
                flatTax: strings.chartChargeFlatTax,
              }}
            />
          </div>
        ),
      },
      {
        id: 'yearly-table',
        title: strings.tableTitle,
        content:
          values.taxRegime !== 'none' ||
          (values.resalePrice && Number(values.resalePrice) > 0 && values.resaleHoldingMonths && Number(values.resaleHoldingMonths) > 0) ? (
            <div className="yearly-table-wrapper">
              <table className="yearly-table">
                <thead>
                  <tr>
                    <th>{strings.tableYear}</th>
                    <th>{strings.tableCredit}</th>
                    <th>{strings.tableInterest}</th>
                    <th>{strings.tablePrincipal}</th>
                    <th>{strings.tableCRD}<HelpTip text={strings.helpCrd} /></th>
                    <th>{strings.tableRent}</th>
                    <th>{strings.tableCharges}</th>
                    <th>{strings.tableCF}<HelpTip text={strings.helpCfBeforeTax} /></th>
                    <th>{strings.tableDepreciation}<HelpTip text={strings.helpDepreciation} /></th>
                    <th>{strings.tableTaxBase}<HelpTip text={strings.helpTaxBase} /></th>
                    <th>{strings.tableTax}</th>
                    <th>{strings.tableCarryforward}<HelpTip text={strings.helpCarryforwardUsed} /></th>
                    <th>{strings.tableDeficitRemaining}<HelpTip text={strings.helpDeficitRemaining} /></th>
                    <th>{strings.tableDepreciationReserve}<HelpTip text={strings.helpDepreciationReserve} /></th>
                    <th>{strings.tableResalePrice}</th>
                    <th>{strings.tableCashDispo}<HelpTip text={strings.helpCashDispo} /></th>
                    <th>{strings.tableSaleTax}<HelpTip text={strings.helpSaleTaxCol} /></th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row) => (
                    <tr key={row.year}>
                      <td>{row.year}</td>
                      <td className="yearly-table-num">{currencyFormatter.format(row.credit)}</td>
                      <td className="yearly-table-num">{currencyFormatter.format(row.interest)}</td>
                      <td className="yearly-table-num">{currencyFormatter.format(row.principal)}</td>
                      <td className="yearly-table-num">{currencyFormatter.format(row.crd)}</td>
                      <td className="yearly-table-num">{currencyFormatter.format(row.rent)}</td>
                      <td className="yearly-table-num">{currencyFormatter.format(row.charges)}</td>
                      <td className={`yearly-table-num ${row.cfBeforeTax < 0 ? 'yearly-table-neg' : ''}`}>{currencyFormatter.format(row.cfBeforeTax)}</td>
                      <td className="yearly-table-num">{currencyFormatter.format(row.depreciation)}</td>
                      <td className="yearly-table-num">{currencyFormatter.format(row.taxBase)}</td>
                      <td className={`yearly-table-num ${row.tax < 0 ? 'yearly-table-pos' : ''}`}>{currencyFormatter.format(row.tax)}</td>
                      <td className="yearly-table-num">{currencyFormatter.format(row.carryforwardUsed)}</td>
                      <td className="yearly-table-num">{currencyFormatter.format(row.deficitRemaining)}</td>
                      <td className="yearly-table-num">{currencyFormatter.format(row.depreciationReserve)}</td>
                      <td className="yearly-table-num">{row.resalePrice > 0 ? currencyFormatter.format(row.resalePrice) : '–'}</td>
                      <td className={`yearly-table-num ${row.cashDispo < 0 ? 'yearly-table-neg' : 'yearly-table-pos'}`}>{currencyFormatter.format(row.cashDispo)}</td>
                      <td className="yearly-table-num">{currencyFormatter.format(row.saleTax)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="results-disclaimer">{strings.taxDescription}</p>
          ),
      },
      {
        id: 'loan-charts',
        title: strings.sectionLoanCharts,
        description: strings.loanChartsDescription,
        content: (
          <LoanChartsSection
            data={loanChartsData}
            currencyFormatter={currencyFormatter}
            percentFormatter={percentFormatter}
            principalLabel={strings.loanChartPrincipal}
            interestLabel={strings.loanChartInterest}
            ltvLabel={strings.loanChartLtv}
            yearLabel={strings.tableYear}
            irrData={irrByYearData}
            irrLabel={strings.loanChartIrr}
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [values, strings, currencyFormatter, percentFormatter, results, chartData, tableData, loanChartsData, irrByYearData],
  )

  const { order, collapsed, moveSection, setCollapsed } = usePanelLayout(
    'rental',
    RENTAL_DEFAULT_ORDER,
  )

  // ============================================================
  // MODE ESSENTIEL : 6 champs, verdict, résultats, projection
  // ============================================================
  if (uiMode === 'simple') {
    return (
      <main className="app-main simple-main">
        <VerdictBar
          figure={verdict.figure}
          figureUnit={strings.verdictPerMonth}
          tone={verdict.tone}
          phrase={verdict.phrase}
          kpis={verdict.kpis}
        />
        <div className="simple-layout">
          <section className="simple-card">
            <h3 className="simple-card-title"><span className="step-dot">1</span> {strings.simpleFormTitle}</h3>
            <p className="simple-card-sub">{strings.simpleFormSubtitle}</p>
            <FormField label={strings.purchasePrice} value={values.purchasePrice} onChange={handleChange('purchasePrice')} unit={strings.unitEuro} help={strings.helpPurchasePrice} invalidMessage={inv} />
            <FormField label={strings.monthlyRent} value={values.monthlyRent} onChange={handleChange('monthlyRent')} unit={strings.unitEuroPerMonth} help={strings.helpMonthlyRent} invalidMessage={inv} />
            <FormField label={strings.ownFunds} value={values.ownFunds} onChange={handleChange('ownFunds')} unit={strings.unitEuro} help={strings.helpOwnFunds} invalidMessage={inv} />
            <div className="two-col">
              <YearsField
                label={strings.loanDurationYears}
                months={values.loanDurationMonths}
                onMonthsChange={(m) => setValues((prev) => ({ ...prev, loanDurationMonths: m || '1' }))}
                unit={strings.unitYears}
                help={strings.helpLoanDuration}
                invalidMessage={inv}
              />
              <FormField label={strings.interestRate} value={values.interestRate} onChange={handleChange('interestRate')} unit={strings.unitPercent} help={strings.helpInterestRate} invalidMessage={inv} />
            </div>
            <label className="form-field">
              <span className="field-label">{strings.taxRegimeLabel}</span>
              <select className="field-input" value={values.taxRegime} onChange={handleTaxRegimeChange}>
                {TAX_REGIME_OPTIONS.map((key) => (
                  <option key={key} value={key}>{regimeLabels[key]}</option>
                ))}
              </select>
            </label>
            <p className="regime-hint">{strings[`regimeHint_${values.taxRegime}`]}</p>
            <button type="button" className="simple-advanced-cta" onClick={onRequestExpertMode}>
              {strings.simpleAdvancedCta}
            </button>
          </section>

          <section className="simple-card">
            <h3 className="simple-card-title"><span className="step-dot">2</span> {strings.simpleResultsTitle}</h3>
            <p className="simple-card-sub">{strings.simpleResultsSubtitle}</p>
            <div className="results-grid">
              <ResultTile label={strings.monthlyCashflowAfterTax} value={currencyFormatter.format(results.monthlyCashflowAfterTax)} variant={results.monthlyCashflowAfterTax >= 0 ? 'positive' : 'negative'} help={strings.helpCashflow} />
              <ResultTile label={strings.totalCost} value={currencyFormatter.format(results.totalCost)} />
              <ResultTile label={strings.loanAmount} value={currencyFormatter.format(results.loanAmount)} />
              <ResultTile label={strings.estimatedAnnualTax} value={currencyFormatter.format(results.annualTax)} />
              <ResultTile label={strings.grossYield} value={percentFormatter.format(results.grossYield)} help={strings.helpGrossYield} />
              <ResultTile label={strings.netYield} value={percentFormatter.format(results.netYield)} help={strings.helpNetYield} />
            </div>
            <h4 className="simple-projection-title">{strings.simpleProjectionTitle}</h4>
            {compactTable}
            <p className="simple-table-note">{strings.simpleTableNote}</p>
          </section>
        </div>
        <section className="simple-card simple-chart-card">
          <h3 className="simple-card-title">{strings.chartTitle}</h3>
          <div className="chart-section-content">
            <CashflowChart
              data={chartData}
              currencyFormatter={currencyFormatter}
              revenueLabel={strings.chartRevenueLabel}
              chargesLabel={strings.chartExpensesLabel}
              cashflowLabel={strings.chartCashflowLabel}
              tooltipStrings={{
                revenue: strings.chartTooltipRevenue,
                charges: strings.chartTooltipCharges,
                cashflow: strings.chartTooltipCashflow,
                propertyTax: strings.chartChargePropertyTax,
                copro: strings.chartChargeCopro,
                management: strings.chartChargeManagement,
                maintenance: strings.chartChargeMaintenance,
                insurance: strings.chartChargeInsurance,
                other: strings.chartChargeOther,
                loan: strings.chartChargeLoan,
                depreciation: strings.chartChargeDepreciation,
                carryforward: strings.chartChargeCarryforward,
                tax: strings.chartChargeTax,
                saleTax: strings.chartChargeSaleTax,
                corporateTaxOnGain: strings.chartChargeCorporateOnGain,
                flatTax: strings.chartChargeFlatTax,
              }}
            />
          </div>
        </section>
        <p className="results-disclaimer simple-disclaimer">{strings.disclaimer}</p>
      </main>
    )
  }

  // ============================================================
  // MODE EXPERT : interface complète
  // ============================================================
  return (
    <>
      <main className="app-main app-main-sortable" ref={pdfRef}>
        <VerdictBar
          figure={verdict.figure}
          figureUnit={strings.verdictPerMonth}
          tone={verdict.tone}
          phrase={verdict.phrase}
          kpis={verdict.kpis}
        />
        <SavedSimulationsPanel
          type="rental"
          currentData={values}
          onLoad={(data) => {
            setValues({ ...INITIAL_VALUES, ...(data as SimulationFormValues) })
          }}
          strings={strings}
        />
        <ExportImportPanel
          section="investissement_locatif"
          data={values}
          onImport={(data) => {
            const d = data as SimulationFormValues & { loanDurationYears?: string }
            setValues({
              ...d,
              loanDurationMonths: d.loanDurationMonths ?? String((Number(d.loanDurationYears) || 20) * 12),
              deferralMonths: d.deferralMonths ?? '0',
              deferralType: d.deferralType ?? 'none',
              resaleHoldingMonths: d.resaleHoldingMonths ?? '',
              resalePrice: d.resalePrice ?? '',
              sciIsWithdrawFlatTax: d.sciIsWithdrawFlatTax ?? false,
            })
          }}
          validateData={validateInvestissementData}
          strings={strings}
          pdfContentRef={pdfRef}
          extraButton={
            <button
              type="button"
              className={`export-import-btn ${isInComparison ? 'export-import-btn-disabled' : ''} ${comparisonButtonState === 'success' ? 'export-import-btn-success' : ''}`}
              onClick={() => {
                if (isInComparison) return
                const result = comparisonStore.addToComparison('rental', values)
                if (result.success) {
                  setComparisonButtonState('success')
                  setComparisonError(null)
                  setTimeout(() => setComparisonButtonState('idle'), 2000)
                } else {
                  setComparisonButtonState('error')
                  setComparisonError(result.error === 'already_in_comparison' ? strings.alreadyInComparison : strings.maxComparisonReached)
                  setTimeout(() => {
                    setComparisonButtonState('idle')
                    setComparisonError(null)
                  }, 3000)
                }
              }}
              disabled={isInComparison}
              title={isInComparison ? strings.alreadyInComparison : comparisonError || strings.addToComparison}
            >
              {isInComparison ? strings.addedToComparison : comparisonButtonState === 'success' ? strings.addedToComparison : strings.addToComparison}
            </button>
          }
        />
        <SortableSectionList
          sections={sections}
          order={order}
          collapsed={collapsed}
          onMove={moveSection}
          onCollapsedChange={setCollapsed}
          gridLayout={RENTAL_GRID_LAYOUT}
        />
      </main>
    </>
  )
}
