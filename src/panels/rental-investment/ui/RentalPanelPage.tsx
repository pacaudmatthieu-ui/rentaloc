import { useEffect, useMemo, useRef, useState } from 'react'
import type { Locale } from '../../../shared/types'
import { toNumber } from '../../../shared/lib/format'
import { FormField, FormFieldReadOnly, ResultTile, BreakdownRow, CashflowChart, LoanChartsSection, SortableSectionList } from '../../../shared/ui'
import { usePanelLayout } from '../../../shared/hooks/usePanelLayout'
import { ExportImportPanel } from '../../../features/export-json'
import { INITIAL_VALUES } from '../model/types'
import type { SimulationFormValues } from '../model/types'
import { validateInvestissementData } from '../model/validation'
import { saveRentalSimulation } from '../../../shared/utils/storage'
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
  'resale',
  'chart',
  'yearly-table',
  'loan-charts',
]
const RENTAL_GRID_LAYOUT = [2, 3, 2, 1, 1, 1] as const

interface RentalPanelPageProps {
  locale: Locale
  strings: Record<string, string>
  initialValues?: SimulationFormValues | null
  valuesRef?: React.MutableRefObject<SimulationFormValues | null>
}

export function RentalPanelPage({ locale, strings, initialValues, valuesRef }: RentalPanelPageProps) {
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
      // Use provided initial values if available (from localStorage)
      if (initialValues && typeof initialValues === 'object') {
        return initialValues
      }
      // Fallback to default INITIAL_VALUES
      if (!INITIAL_VALUES || typeof INITIAL_VALUES !== 'object') {
        console.error('INITIAL_VALUES is invalid, using empty defaults')
        return {} as SimulationFormValues
      }
      return INITIAL_VALUES
    } catch (error) {
      console.error('Error initializing RentalPanelPage:', error)
      return {} as SimulationFormValues
    }
  })
  const pdfRef = useRef<HTMLDivElement>(null)

  // Update values when initialValues prop changes (when switching back to this simulation type)
  useEffect(() => {
    if (initialValues && typeof initialValues === 'object') {
      setValues(initialValues)
    }
  }, [initialValues])

  // Check if current simulation is already in comparison
  const isInComparison = useMemo(() => {
    return comparisonStore.isInComparison('rental', values)
  }, [comparisonStore, values])

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

  const results = useMemo(() => calculateResults(values), [values])
  const chartData = useMemo(() => computeYearlyChartData(values), [values])
  const tableData = useMemo(() => computeYearlyTableData(values), [values])
  const loanChartsData = useMemo(() => computeLoanChartsData(values), [values])
  const irrByYearData = useMemo(() => computeIRRByYearData(values), [values])

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

  const { order, collapsed, moveSection, setCollapsed } = usePanelLayout(
    'rental',
    RENTAL_DEFAULT_ORDER,
  )

  const sections = useMemo(
    () => [
      {
        id: 'acquisition',
        title: strings.sectionAcquisition,
        description: strings.acquisitionDescription,
        content: (
          <div className="form-card-body">
            <FormField label={strings.purchasePrice} value={values.purchasePrice} onChange={handleChange('purchasePrice')} />
            <FormFieldReadOnly label={strings.notaryFees} value={currencyFormatter.format(toNumber(values.purchasePrice) * 0.08)} />
            <FormField label={strings.agencyFees} value={values.agencyFees} onChange={handleChange('agencyFees')} />
            <FormField label={strings.renovationBudget} value={values.renovationBudget} onChange={handleChange('renovationBudget')} />
            <FormField label={strings.furnitureBudget} value={values.furnitureBudget} onChange={handleChange('furnitureBudget')} />
            <FormField label={strings.ownFunds} value={values.ownFunds} onChange={handleChange('ownFunds')} />
          </div>
        ),
      },
      {
        id: 'financing',
        title: strings.sectionFinancing,
        description: strings.financingDescription,
        content: (
          <div className="form-card-body">
            <FormField label={strings.interestRate} value={values.interestRate} onChange={handleChange('interestRate')} />
            <FormField label={strings.insuranceRate} value={values.insuranceRate} onChange={handleChange('insuranceRate')} />
            <FormField label={strings.loanDurationMonths} value={values.loanDurationMonths} onChange={handleChange('loanDurationMonths')} />
            <label className="form-field">
              <span className="field-label">{strings.deferralType}</span>
              <select className="field-input" value={values.deferralType} onChange={handleDeferralTypeChange}>
                <option value="none">{strings.deferralNone}</option>
                <option value="partial">{strings.deferralPartial}</option>
                <option value="total">{strings.deferralTotal}</option>
              </select>
            </label>
            {values.deferralType !== 'none' && (
              <FormField label={strings.deferralMonths} value={values.deferralMonths} onChange={handleChange('deferralMonths')} />
            )}
            <FormField label={strings.loanFees} value={values.loanFees} onChange={handleChange('loanFees')} />
            <FormField label={strings.guaranteeFees} value={values.guaranteeFees} onChange={handleChange('guaranteeFees')} />
          </div>
        ),
      },
      {
        id: 'revenues',
        title: strings.sectionRevenues,
        description: strings.revenuesDescription,
        content: (
          <div className="form-card-body">
            <FormField label={strings.monthlyRent} value={values.monthlyRent} onChange={handleChange('monthlyRent')} />
            <FormField label={strings.monthlyRecoverableCharges} value={values.monthlyRecoverableCharges} onChange={handleChange('monthlyRecoverableCharges')} />
            <FormField label={strings.rentRevaluationPercent} value={values.rentRevaluationPercent} onChange={handleChange('rentRevaluationPercent')} />
            <FormField label={strings.vacancyRate} value={values.vacancyRate} onChange={handleChange('vacancyRate')} />
          </div>
        ),
      },
      {
        id: 'charges',
        title: strings.sectionCharges,
        description: strings.chargesDescription,
        content: (
          <div className="form-card-body">
            <FormField label={strings.annualPropertyTax} value={values.annualPropertyTax} onChange={handleChange('annualPropertyTax')} />
            <FormField label={strings.annualNonRecoverableCharges} value={values.annualNonRecoverableCharges} onChange={handleChange('annualNonRecoverableCharges')} />
            <FormField label={strings.annualManagementPercent} value={values.annualManagementPercent} onChange={handleChange('annualManagementPercent')} />
            <FormField label={strings.annualMaintenance} value={values.annualMaintenance} onChange={handleChange('annualMaintenance')} />
            <FormField label={strings.annualInsurancePNO} value={values.annualInsurancePNO} onChange={handleChange('annualInsurancePNO')} />
            <FormField label={strings.otherAnnualExpenses} value={values.otherAnnualExpenses} onChange={handleChange('otherAnnualExpenses')} />
          </div>
        ),
      },
      {
        id: 'resale',
        title: strings.sectionResale,
        description: strings.resaleDescription,
        content: (
          <div className="form-card-body">
            <FormField
              label={strings.resaleHoldingMonths}
              value={values.resaleHoldingMonths}
              onChange={handleChange('resaleHoldingMonths')}
            />
            <FormField
              label={strings.resalePrice}
              value={values.resalePrice}
              onChange={handleChange('resalePrice')}
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
                <option value="none">{strings.taxNone}</option>
                <option value="micro_foncier">{strings.taxMicroFoncier}</option>
                <option value="reel_foncier">{strings.taxReelFoncier}</option>
                <option value="lmnp_micro_bic">{strings.taxLmnpMicro}</option>
                <option value="lmnp_reel">{strings.taxLmnpReel}</option>
                <option value="sci_ir">{strings.taxReelFoncier}</option>
                <option value="sci_is">{strings.taxSciIs}</option>
                <option value="bailleur_prive">{strings.taxBailleurPrive}</option>
              </select>
            </label>
            <FormField label={strings.marginalTaxRate} value={values.marginalTaxRate} onChange={handleChange('marginalTaxRate')} />
            <FormField label={strings.socialChargesRate} value={values.socialChargesRate} onChange={handleChange('socialChargesRate')} />
            <FormField label={strings.corporateTaxRate} value={values.corporateTaxRate} onChange={handleChange('corporateTaxRate')} />
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
                            <span>{currencyFormatter.format(flatTaxDetail.totalAccumulated)} × {(flatTaxDetail.flatTaxRate * 100).toFixed(1)} % = {currencyFormatter.format(flatTaxDetail.flatTaxAmount)}</span>
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
              <ResultTile label={strings.monthlyCashflow} value={currencyFormatter.format(results.monthlyCashflow)} variant={results.monthlyCashflow >= 0 ? 'positive' : 'negative'} />
              <ResultTile label={strings.annualCashflow} value={currencyFormatter.format(results.annualCashflow)} variant={results.annualCashflow >= 0 ? 'positive' : 'negative'} />
              <ResultTile label={strings.grossYield} value={percentFormatter.format(results.grossYield)} />
              <ResultTile label={strings.netYield} value={percentFormatter.format(results.netYield)} />
              <ResultTile label={strings.cashOnCash} value={percentFormatter.format(results.cashOnCash)} />
              <ResultTile label={strings.monthlyCashflowAfterTax} value={currencyFormatter.format(results.monthlyCashflowAfterTax)} variant={results.monthlyCashflowAfterTax >= 0 ? 'positive' : 'negative'} />
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
                    <th>{strings.tableCRD}</th>
                    <th>{strings.tableRent}</th>
                    <th>{strings.tableCharges}</th>
                    <th>{strings.tableCF}</th>
                    <th>{strings.tableDepreciation}</th>
                    <th>{strings.tableTaxBase}</th>
                    <th>{strings.tableTax}</th>
                    <th>{strings.tableCarryforward}</th>
                    <th>{strings.tableResalePrice}</th>
                    <th>{strings.tableCashDispo}</th>
                    <th>{strings.tableSaleTax}</th>
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
                      <td className="yearly-table-num">{currencyFormatter.format(row.cfBeforeTax)}</td>
                      <td className="yearly-table-num">{currencyFormatter.format(row.depreciation)}</td>
                      <td className="yearly-table-num">{currencyFormatter.format(row.taxBase)}</td>
                      <td className="yearly-table-num">{currencyFormatter.format(row.tax)}</td>
                    <td className="yearly-table-num">{currencyFormatter.format(row.carryforwardUsed)}</td>
                    <td className="yearly-table-num">{row.resalePrice > 0 ? currencyFormatter.format(row.resalePrice) : '–'}</td>
                    <td className="yearly-table-num">{currencyFormatter.format(row.cashDispo)}</td>
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
    [
      values,
      strings,
      currencyFormatter,
      percentFormatter,
      results,
      chartData,
      tableData,
      loanChartsData,
      irrByYearData,
      handleChange,
      handleTaxRegimeChange,
      handleDeferralTypeChange,
      handleFeesAmortizeYear1Change,
    ],
  )

  return (
    <>
      <main className="app-main app-main-sortable" ref={pdfRef}>
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
