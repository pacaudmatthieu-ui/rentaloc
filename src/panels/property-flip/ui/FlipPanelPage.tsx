import { useEffect, useMemo, useRef, useState } from 'react'
import type { Locale } from '../../../shared/types'
import { FormField, FormFieldReadOnly, SortableSectionList } from '../../../shared/ui'
import { usePanelLayout } from '../../../shared/hooks/usePanelLayout'
import { ExportImportPanel } from '../../../features/export-json'
import type { ApartmentItem, MarchandDeBiensValues } from '../model/types'
import { MB_INITIAL } from '../model/types'
import { validateMarchandData } from '../model/validation'
import { savePropertyFlippingSimulation, loadCurrentSimulationComparisonId } from '../../../shared/utils/storage'
import { useComparisonStore } from '../../../shared/stores/useComparisonStore'
import { MargeVatTable } from './sections/MargeVatTable'
import { MbFiscalResultTable } from './sections/MbFiscalResultTable'
import { ReventeTable } from './sections/ReventeTable'

/** Structure par défaut : Ligne 1: Acquisition | Appartements | Financement | Ligne 2: Revente | Ligne 3: Fiscalité | Ligne 4: Résultat */
const FLIP_DEFAULT_ORDER = [
  'acquisition',
  'apartments',
  'financials',
  'revente',
  'marge-vat',
  'fiscal-result',
]
const FLIP_GRID_LAYOUT = [3, 1, 1, 1] as const

interface FlipPanelPageProps {
  locale: Locale
  strings: Record<string, string>
  initialValues?: MarchandDeBiensValues | null
  valuesRef?: React.MutableRefObject<MarchandDeBiensValues | null>
}

export function FlipPanelPage({ locale, strings, initialValues, valuesRef }: FlipPanelPageProps) {
  const comparisonStore = useComparisonStore()
  const [comparisonButtonState, setComparisonButtonState] = useState<'idle' | 'success' | 'error'>('idle')
  const [comparisonError, setComparisonError] = useState<string | null>(null)
  
  // Initialize comparison store on mount
  useEffect(() => {
    comparisonStore.initialize()
  }, [comparisonStore])
  
  // Initialize with provided initial values, saved values, or default values
  // Priority: initialValues (from localStorage) > MB_INITIAL (defaults)
  const [values, setValues] = useState<MarchandDeBiensValues>(() => {
    try {
      // Use provided initial values if available (from localStorage)
      if (initialValues && typeof initialValues === 'object') {
        return initialValues
      }
      // Fallback to default MB_INITIAL
      if (!MB_INITIAL || typeof MB_INITIAL !== 'object') {
        console.error('MB_INITIAL is invalid, using empty defaults')
        return {
          purchasePrice: '',
          agencyFees: '',
          renovationBudget: '',
          apartments: [],
          apportPercent: '',
          ratePerYear: '',
          durationMonths: '',
        }
      }
      return MB_INITIAL
    } catch (error) {
      console.error('Error initializing FlipPanelPage:', error)
      return {
        purchasePrice: '',
        agencyFees: '',
        renovationBudget: '',
        apartments: [],
        apportPercent: '',
        ratePerYear: '',
        durationMonths: '',
      }
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
    savePropertyFlippingSimulation(values)
  }, [values])

  // Check if current simulation is already in comparison
  // Use stored comparison ID or data matching
  const isInComparison = useMemo(() => {
    // First check if we have a stored comparison ID (simulation opened from comparison)
    const storedComparisonId = loadCurrentSimulationComparisonId()
    if (storedComparisonId) {
      const state = comparisonStore.simulations
      const found = state.find((sim) => sim.id === storedComparisonId && sim.type === 'property-flipping')
      if (found) return true
    }
    // Fallback to data matching
    return comparisonStore.isInComparison('property-flipping', values)
  }, [comparisonStore, values])

  // Use ref to track last updated values to prevent infinite loops
  const lastUpdatedValuesRef = useRef<string>('')
  
  // Update comparison store if this simulation is in comparison
  // Use separate effect with ref check to avoid infinite loops
  useEffect(() => {
    if (isInComparison) {
      const currentValuesStr = JSON.stringify(values)
      // Only update if values actually changed
      if (lastUpdatedValuesRef.current !== currentValuesStr) {
        lastUpdatedValuesRef.current = currentValuesStr
        comparisonStore.updateSimulationData('property-flipping', values)
      }
    }
  }, [values, isInComparison, comparisonStore])

  const notaryFees = useMemo(() => {
    const price = Number(values.purchasePrice) || 0
    return price * 0.03
  }, [values.purchasePrice])

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }),
    [locale],
  )

  const amountOfOperation =
    (Number(values.purchasePrice) || 0) +
    notaryFees +
    (Number(values.agencyFees) || 0) +
    (Number(values.renovationBudget) || 0)

  const apportAmount = amountOfOperation * ((Number(values.apportPercent) || 0) / 100)
  const financementAmount = amountOfOperation - apportAmount

  const ratePerYear = (Number(values.ratePerYear) || 0) / 100
  const months = Math.max(Number(values.durationMonths) || 1, 1)

  const annualInterest = financementAmount * ratePerYear
  const monthlyPayment = annualInterest / 12
  const totalPayments = monthlyPayment * months

  const financialCost = totalPayments
  const totalCostForMarge = amountOfOperation + financialCost

  const handleChange =
    (field: keyof MarchandDeBiensValues) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setValues((prev) => ({ ...prev, [field]: e.target.value }))
    }

  const addApartment = () => {
    setValues((prev) => ({
      ...prev,
      apartments: [
        ...prev.apartments,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'T1',
          superficie: '25',
          resalePessimistic: '',
          resaleLogic: '',
          resaleOptimistic: '',
        },
      ],
    }))
  }

  const removeApartment = (id: string) => {
    setValues((prev) => ({
      ...prev,
      apartments: prev.apartments.filter((a) => a.id !== id),
    }))
  }

  const updateApartment = (
    id: string,
    field: 'type' | 'superficie' | 'resalePessimistic' | 'resaleLogic' | 'resaleOptimistic',
    value: string,
  ) => {
    setValues((prev) => ({
      ...prev,
      apartments: prev.apartments.map((a) =>
        a.id === id ? { ...a, [field]: value } : a,
      ),
    }))
  }

  const { order, collapsed, moveSection, setCollapsed } = usePanelLayout(
    'flip',
    FLIP_DEFAULT_ORDER,
  )

  const sections = useMemo(
    () => [
      {
        id: 'acquisition',
        title: strings.mbAcquisition,
        description: strings.mbAcquisitionDescription,
        content: (
          <div className="form-card-body">
            <FormField label={strings.purchasePrice} value={values.purchasePrice} onChange={handleChange('purchasePrice')} />
            <FormFieldReadOnly label={strings.mbNotaryFees} value={currencyFormatter.format(notaryFees)} />
            <FormField label={strings.agencyFees} value={values.agencyFees} onChange={handleChange('agencyFees')} />
            <FormField label={strings.renovationBudget} value={values.renovationBudget} onChange={handleChange('renovationBudget')} />
            <FormFieldReadOnly label={strings.mbFinancialCost} value={currencyFormatter.format(totalPayments)} />
          </div>
        ),
      },
      {
        id: 'apartments',
        title: strings.mbApartments,
        description: strings.mbApartmentsDescription,
        content: (
          <div className="form-card-body">
            <button type="button" className="mb-add-apartment-btn" onClick={addApartment}>
              {strings.mbAddApartment}
            </button>
            {values.apartments.length === 0 ? (
              <p className="mb-no-apartments">{strings.mbNoApartments}</p>
            ) : (
              <div className="mb-apartment-list">
                {values.apartments.map((apt) => (
                  <div key={apt.id} className="mb-apartment-row">
                    <select
                      className="mb-apartment-type"
                      value={apt.type}
                      onChange={(e) =>
                        updateApartment(apt.id, 'type', e.target.value as ApartmentItem['type'])
                      }
                    >
                      <option value="T1">{strings.mbApartmentT1}</option>
                      <option value="T2">{strings.mbApartmentT2}</option>
                      <option value="T3">{strings.mbApartmentT3}</option>
                      <option value="T4">{strings.mbApartmentT4}</option>
                      <option value="T5">{strings.mbApartmentT5}</option>
                    </select>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="mb-apartment-superficie"
                      placeholder={strings.mbApartmentSuperficie}
                      value={apt.superficie}
                      onChange={(e) => updateApartment(apt.id, 'superficie', e.target.value)}
                    />
                    <span className="mb-apartment-suffix">m²</span>
                    <button
                      type="button"
                      className="mb-remove-btn"
                      onClick={() => removeApartment(apt.id)}
                      title={strings.mbRemove}
                    >
                      {strings.mbRemove}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ),
      },
      {
        id: 'financials',
        title: strings.mbFinancials,
        description: strings.mbFinancialsDescription,
        content: (
          <div className="form-card-body">
            <FormFieldReadOnly label={strings.mbOperationAmount} value={currencyFormatter.format(amountOfOperation)} />
            <FormField label={strings.mbApportPercent} value={values.apportPercent} onChange={handleChange('apportPercent')} />
            <FormFieldReadOnly label={strings.mbApportAmount} value={currencyFormatter.format(apportAmount)} />
            <FormFieldReadOnly label={strings.mbFinancementAmount} value={currencyFormatter.format(financementAmount)} />
            <FormField label={strings.mbRatePerYear} value={values.ratePerYear} onChange={handleChange('ratePerYear')} />
            <FormField label={strings.mbDurationMonths} value={values.durationMonths} onChange={handleChange('durationMonths')} />
            <FormFieldReadOnly label={strings.mbMonthlyPayment} value={currencyFormatter.format(monthlyPayment)} />
            <FormFieldReadOnly label={strings.mbTotalPayments} value={currencyFormatter.format(totalPayments)} />
          </div>
        ),
      },
      {
        id: 'revente',
        title: strings.mbReventeLogic.replace(/\s*–\s*.*$/, ''),
        description: `${strings.mbReventePessimistic} / ${strings.mbReventeLogic} / ${strings.mbReventeOptimistic}`,
        content:
          values.apartments.length > 0 ? (
            <div className="mb-revente-section">
              <div className="mb-revente-mobile-hidden">
                <ReventeTable
                  title={strings.mbReventePessimistic}
                  apartments={values.apartments}
                  resaleField="resalePessimistic"
                  updateApartment={updateApartment}
                  strings={strings}
                  currencyFormatter={currencyFormatter}
                  totalAcquisitionCost={totalCostForMarge}
                  locale={locale}
                />
              </div>
              <ReventeTable
                title={strings.mbReventeLogic}
                apartments={values.apartments}
                resaleField="resaleLogic"
                updateApartment={updateApartment}
                strings={strings}
                currencyFormatter={currencyFormatter}
                totalAcquisitionCost={totalCostForMarge}
                locale={locale}
              />
              <div className="mb-revente-mobile-hidden">
                <ReventeTable
                  title={strings.mbReventeOptimistic}
                  apartments={values.apartments}
                  resaleField="resaleOptimistic"
                  updateApartment={updateApartment}
                  strings={strings}
                  currencyFormatter={currencyFormatter}
                  totalAcquisitionCost={totalCostForMarge}
                  locale={locale}
                />
              </div>
            </div>
          ) : (
            <p className="mb-no-apartments">{strings.mbNoApartments}</p>
          ),
      },
      {
        id: 'marge-vat',
        title: strings.mbTaxation,
        description: strings.mbTaxationDescription,
        content:
          values.apartments.length > 0 ? (
            <MargeVatTable
              apartments={values.apartments}
              totalCostForMarge={totalCostForMarge}
              renovationBudget={Number(values.renovationBudget) || 0}
              agencyFees={Number(values.agencyFees) || 0}
              currencyFormatter={currencyFormatter}
              strings={strings}
            />
          ) : (
            <p className="mb-no-apartments">{strings.mbNoApartments}</p>
          ),
      },
      {
        id: 'fiscal-result',
        title: strings.mbFiscalResult,
        description: strings.mbFiscalResultDescription,
        content:
          values.apartments.length > 0 ? (
            <MbFiscalResultTable
              apartments={values.apartments}
              totalCostForMarge={totalCostForMarge}
              renovationBudget={Number(values.renovationBudget) || 0}
              agencyFees={Number(values.agencyFees) || 0}
              currencyFormatter={currencyFormatter}
              strings={strings}
            />
          ) : (
            <p className="mb-no-apartments">{strings.mbNoApartments}</p>
          ),
      },
    ],
    [
      values,
      strings,
      locale,
      currencyFormatter,
      notaryFees,
      amountOfOperation,
      apportAmount,
      financementAmount,
      monthlyPayment,
      totalPayments,
      totalCostForMarge,
      addApartment,
      removeApartment,
      updateApartment,
    ],
  )

  return (
    <main className="app-main marchand-de-biens-main app-main-sortable" ref={pdfRef}>
      <ExportImportPanel
        section="marchand_de_biens"
        data={values}
        pdfContentRef={pdfRef}
        onImport={(data) => {
          const imported = data as MarchandDeBiensValues
          const apartments = imported.apartments.map((a, i) => ({
            ...a,
            id: a.id || `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          }))
          setValues({ ...imported, apartments })
        }}
        validateData={validateMarchandData}
        strings={strings}
        extraButton={
          <button
            type="button"
            className={`export-import-btn ${isInComparison ? 'export-import-btn-disabled' : ''} ${comparisonButtonState === 'success' ? 'export-import-btn-success' : ''}`}
            onClick={() => {
              if (isInComparison) return
              const result = comparisonStore.addToComparison('property-flipping', values)
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
        gridLayout={FLIP_GRID_LAYOUT}
      />
    </main>
  )
}
