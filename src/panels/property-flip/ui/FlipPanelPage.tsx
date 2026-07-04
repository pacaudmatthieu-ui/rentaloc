import { useEffect, useMemo, useRef, useState } from 'react'
import type { Locale } from '../../../shared/types'
import { FormField, FormFieldReadOnly, SortableSectionList, VerdictBar, HelpTip } from '../../../shared/ui'
import { usePanelLayout } from '../../../shared/hooks/usePanelLayout'
import { ExportImportPanel } from '../../../features/export-json'
import { EmailCaptureCard } from '../../../features/lead-capture/EmailCaptureCard'
import { buildFlipReport } from '../../../features/export-pdf/report'
import type { LotItem, LotType, TvaRegime, MarchandDeBiensValues } from '../model/types'
import { MB_INITIAL, LOT_TYPES } from '../model/types'
import { computeFlipResults } from '../lib/computeFlipResults'
import { validateMarchandData } from '../model/validation'
import { savePropertyFlippingSimulation, loadCurrentSimulationComparisonId } from '../../../shared/utils/storage'
import { useComparisonStore } from '../../../shared/stores/useComparisonStore'
import { MargeVatTable } from './sections/MargeVatTable'
import { MbOperationResultTable, MbFiscalResultTable } from './sections/MbFiscalResultTable'
import { SavedSimulationsPanel } from '../../../shared/ui/SavedSimulationsPanel'

/** Structure par défaut : Ligne 1: Acquisition | Appartements | Financement | Ligne 2: Revente | Ligne 3: Fiscalité | Ligne 4: Résultat */
const FLIP_DEFAULT_ORDER = [
  'acquisition',
  'apartments',
  'charges',
  'financials',
  'marge-vat',
  'operation-result',
  'fiscal-result',
]
const FLIP_GRID_LAYOUT = [3, 1, 1, 1, 1] as const

interface FlipPanelPageProps {
  locale: Locale
  strings: Record<string, string>
  initialValues?: MarchandDeBiensValues | null
  valuesRef?: React.MutableRefObject<MarchandDeBiensValues | null>
}

export function FlipPanelPage({ locale, strings, initialValues, valuesRef }: FlipPanelPageProps) {
  const comparisonSimulations = useComparisonStore((s) => s.simulations)
  const initializeComparison = useComparisonStore((s) => s.initialize)
  const addToComparison = useComparisonStore((s) => s.addToComparison)
  const updateSimulationData = useComparisonStore((s) => s.updateSimulationData)
  const isInComparisonCheck = useComparisonStore((s) => s.isInComparison)
  const [comparisonButtonState, setComparisonButtonState] = useState<'idle' | 'success' | 'error'>('idle')
  const [comparisonError, setComparisonError] = useState<string | null>(null)

  // Initialize comparison store on mount
  useEffect(() => {
    initializeComparison()
  }, [initializeComparison])
  
  // Initialize with provided initial values merged with defaults to ensure all fields exist
  const [values, setValues] = useState<MarchandDeBiensValues>(() => {
    try {
      if (initialValues && typeof initialValues === 'object') {
        return { ...MB_INITIAL, ...initialValues }
      }
      return MB_INITIAL
    } catch {
      return MB_INITIAL
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
      const found = comparisonSimulations.find((sim) => sim.id === storedComparisonId && sim.type === 'property-flipping')
      if (found) return true
    }
    // Fallback to data matching
    return isInComparisonCheck('property-flipping', values)
  }, [comparisonSimulations, isInComparisonCheck, values])

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
        updateSimulationData('property-flipping', values)
      }
    }
  }, [values, isInComparison, updateSimulationData])

  // Moteur de calcul unique (mêmes chiffres ici, en comparaison et dans le store)
  const flip = useMemo(() => computeFlipResults(values), [values])
  const {
    autoNotaryFees,
    isNotaryManual,
    hasLotsMarge,
    autoTerrainProportion,
    isTerrainProportionManual,
    totalChargesHT,
    tvaCharges,
    totalChargesTTC,
    amountOfOperation,
    apportAmount,
    financementAmount,
    monthlyPayment,
    financialCost,
    totalRevente,
    travauxHT,
  } = flip

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }),
    [locale],
  )

  const handleChange =
    (field: keyof MarchandDeBiensValues) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setValues((prev) => ({ ...prev, [field]: e.target.value }))
    }

  const addLot = () => {
    setValues((prev) => ({
      ...prev,
      apartments: [
        ...prev.apartments,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'appartement-t2' as LotType,
          tvaRegime: 'marge' as TvaRegime,
          superficie: '45',
          resalePrice: '',
        },
      ],
    }))
  }

  const removeLot = (id: string) => {
    setValues((prev) => ({
      ...prev,
      apartments: prev.apartments.filter((a) => a.id !== id),
    }))
  }

  const updateLot = (
    id: string,
    field: keyof LotItem,
    value: string,
  ) => {
    setValues((prev) => ({
      ...prev,
      apartments: prev.apartments.map((a) =>
        a.id === id ? { ...a, [field]: value } : a,
      ),
    }))
  }

  const lotTypeLabels: Record<LotType, string> = {
    'appartement-t1': strings.mbLotAppartementT1,
    'appartement-t2': strings.mbLotAppartementT2,
    'appartement-t3': strings.mbLotAppartementT3,
    'appartement-t4': strings.mbLotAppartementT4,
    'appartement-t5': strings.mbLotAppartementT5,
    'maison': strings.mbLotMaison,
    'terrain': strings.mbLotTerrain,
    'immeuble': strings.mbLotImmeuble,
    'local-commercial': strings.mbLotLocalCommercial,
    'parking': strings.mbLotParking,
    'cave': strings.mbLotCave,
    'garage': strings.mbLotGarage,
    'bureau': strings.mbLotBureau,
    'autre': strings.mbLotAutre,
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
            <FormField label={strings.purchasePrice} value={values.purchasePrice} onChange={handleChange('purchasePrice')} unit={strings.unitEuro} help={strings.helpMbPurchasePrice} invalidMessage={strings.invalidNumber} />
            <div className="form-field-with-hint">
              <FormField
                label={strings.mbNotaryFees}
                value={values.notaryFeesOverride}
                onChange={handleChange('notaryFeesOverride')}
                unit={strings.unitEuro}
                help={strings.helpMbNotary}
                invalidMessage={strings.invalidNumber}
              />
              <span className="form-field-hint">
                {isNotaryManual
                  ? strings.mbNotaryFeesHint
                  : `${strings.mbTerrainProportionAuto}: ${currencyFormatter.format(autoNotaryFees)}`}
              </span>
            </div>
            <FormField label={strings.agencyFees} value={values.agencyFees} onChange={handleChange('agencyFees')} unit={strings.unitEuro} help={strings.helpMbAgency} invalidMessage={strings.invalidNumber} />
            {hasLotsMarge && (
              <div className="form-field-with-hint">
                <FormField
                  label={strings.mbTerrainProportion}
                  value={values.terrainProportion}
                  onChange={handleChange('terrainProportion')}
                  unit={strings.unitPercent}
                  help={strings.helpMbTerrainProportion}
                  invalidMessage={strings.invalidNumber}
                />
                <span className="form-field-hint">
                  {isTerrainProportionManual
                    ? `${strings.mbTerrainProportionHint}`
                    : `${strings.mbTerrainProportionAuto}: ${autoTerrainProportion.toFixed(1)}%`}
                </span>
              </div>
            )}
            <FormFieldReadOnly label={strings.mbFinancialCost} value={currencyFormatter.format(financialCost)} />
          </div>
        ),
      },
      {
        id: 'apartments',
        title: strings.mbApartments,
        description: strings.mbApartmentsDescription,
        content: (
          <div className="form-card-body">
            <button type="button" className="mb-add-apartment-btn" onClick={addLot}>
              {strings.mbAddApartment}
            </button>
            {values.apartments.length === 0 ? (
              <p className="mb-no-apartments">{strings.mbNoApartments}</p>
            ) : (
              <>
                <div className="mb-lot-table">
                  <div className="mb-lot-header">
                    <span>{strings.mbApartmentType}</span>
                    <span>{strings.mbLotTvaRegime}<HelpTip text={strings.helpMbTvaRegimes} /></span>
                    <span>{strings.mbApartmentSuperficie}</span>
                    <span>{strings.mbResalePrice}</span>
                    <span>{strings.mbPricePerSqm}</span>
                    <span></span>
                  </div>
                  {values.apartments.map((lot) => {
                    const sup = Number(lot.superficie) || 0
                    const price = Number(lot.resalePrice) || 0
                    const ppm = sup > 0 ? price / sup : 0
                    return (
                      <div key={lot.id} className="mb-lot-row">
                        <select
                          className="mb-lot-select"
                          aria-label={strings.mbApartmentType}
                          value={lot.type}
                          onChange={(e) => updateLot(lot.id, 'type', e.target.value)}
                        >
                          {LOT_TYPES.map((t) => (
                            <option key={t} value={t}>{lotTypeLabels[t]}</option>
                          ))}
                        </select>
                        <select
                          className="mb-lot-select"
                          aria-label={strings.mbLotTvaRegime}
                          value={lot.tvaRegime}
                          onChange={(e) => updateLot(lot.id, 'tvaRegime', e.target.value)}
                        >
                          <option value="exonere">{strings.mbTvaExonere}</option>
                          <option value="marge">{strings.mbTvaMarge}</option>
                          <option value="total">{strings.mbTvaTotal}</option>
                        </select>
                        <div className="mb-lot-superficie">
                          <input
                            type="text"
                            inputMode="decimal"
                            aria-label={strings.mbApartmentSuperficie}
                            value={lot.superficie}
                            onChange={(e) => updateLot(lot.id, 'superficie', e.target.value)}
                          />
                          <span>m²</span>
                        </div>
                        <input
                          type="text"
                          inputMode="decimal"
                          className="mb-lot-price"
                          aria-label={strings.mbResalePrice}
                          placeholder="0"
                          value={lot.resalePrice}
                          onChange={(e) => updateLot(lot.id, 'resalePrice', e.target.value)}
                        />
                        <span className="mb-lot-ppm">
                          {price > 0 ? currencyFormatter.format(ppm) : '–'}
                        </span>
                        <button
                          type="button"
                          className="mb-remove-btn"
                          onClick={() => removeLot(lot.id)}
                        >
                          ✕
                        </button>
                      </div>
                    )
                  })}
                </div>
                <div className="mb-lot-summary">
                  <div className="mb-lot-summary-row">
                    <span>{strings.mbTotal}</span>
                    <strong>{currencyFormatter.format(totalRevente)}</strong>
                  </div>
                  <div className="mb-lot-summary-row">
                    <span>{strings.mbPlusValue}</span>
                    <span className={flip.margeNetteAvantIS >= 0 ? 'mb-revente-positive' : 'mb-revente-negative'}>
                      {currencyFormatter.format(flip.margeNetteAvantIS)}
                    </span>
                  </div>
                  <div className="mb-lot-summary-row">
                    <span>{strings.mbMarge}</span>
                    <span>
                      {flip.margePercent != null && totalRevente > 0
                        ? `${flip.margePercent.toFixed(1)}%`
                        : '–'}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        ),
      },
      {
        id: 'charges',
        title: strings.mbCharges,
        description: strings.mbChargesDescription,
        content: (
          <div className="form-card-body">
            <FormField label={strings.mbHuissierFees} value={values.huissierFees} onChange={handleChange('huissierFees')} unit={strings.unitEuro} invalidMessage={strings.invalidNumber} />
            <FormField label={strings.mbGeometreFees} value={values.geometreFees} onChange={handleChange('geometreFees')} unit={strings.unitEuro} invalidMessage={strings.invalidNumber} />
            <FormField label={strings.mbArchitecteFees} value={values.architecteFees} onChange={handleChange('architecteFees')} unit={strings.unitEuro} invalidMessage={strings.invalidNumber} />
            {!values.travauxDetailOpen ? (
              <div className="form-field-with-hint">
                <FormField label={strings.mbTravauxHT} value={values.travauxHT} onChange={handleChange('travauxHT')} unit={strings.unitEuro} help={strings.helpMbTravaux} invalidMessage={strings.invalidNumber} />
                <button
                  type="button"
                  className="mb-travaux-detail-btn"
                  onClick={() => setValues((prev) => ({
                    ...prev,
                    travauxDetailOpen: true,
                    travaux10: prev.travauxHT,
                    travaux55: '',
                    travaux20: '',
                  }))}
                >
                  {strings.mbTravauxDetail}
                </button>
              </div>
            ) : (
              <div className="mb-travaux-detail">
                <div className="mb-travaux-detail-header">
                  <span className="mb-travaux-detail-title">{strings.mbTravauxHT}</span>
                  <button
                    type="button"
                    className="mb-travaux-detail-btn"
                    onClick={() => setValues((prev) => ({
                      ...prev,
                      travauxDetailOpen: false,
                      travauxHT: String((Number(prev.travaux55) || 0) + (Number(prev.travaux10) || 0) + (Number(prev.travaux20) || 0)),
                    }))}
                  >
                    ✕
                  </button>
                </div>
                <FormField label={strings.mbTravaux55} value={values.travaux55} onChange={handleChange('travaux55')} unit={strings.unitEuro} invalidMessage={strings.invalidNumber} />
                <FormField label={strings.mbTravaux10} value={values.travaux10} onChange={handleChange('travaux10')} unit={strings.unitEuro} invalidMessage={strings.invalidNumber} />
                <FormField label={strings.mbTravaux20} value={values.travaux20} onChange={handleChange('travaux20')} unit={strings.unitEuro} invalidMessage={strings.invalidNumber} />
                <FormFieldReadOnly label={strings.mbTravauxHT} value={currencyFormatter.format(travauxHT)} />
              </div>
            )}
            {(values.extraCharges ?? []).map((charge) => (
              <div key={charge.id} className="mb-extra-charge-row">
                <input
                  type="text"
                  className="mb-extra-charge-label"
                  placeholder={strings.mbExtraChargeLabelPlaceholder}
                  value={charge.label}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      extraCharges: prev.extraCharges.map((c) =>
                        c.id === charge.id ? { ...c, label: e.target.value } : c,
                      ),
                    }))
                  }
                />
                <input
                  type="text"
                  inputMode="decimal"
                  className="mb-extra-charge-amount"
                  placeholder={strings.mbExtraChargeAmountPlaceholder}
                  value={charge.amount}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      extraCharges: prev.extraCharges.map((c) =>
                        c.id === charge.id ? { ...c, amount: e.target.value } : c,
                      ),
                    }))
                  }
                />
                <button
                  type="button"
                  className="mb-remove-btn"
                  onClick={() =>
                    setValues((prev) => ({
                      ...prev,
                      extraCharges: prev.extraCharges.filter((c) => c.id !== charge.id),
                    }))
                  }
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              className="mb-add-charge-btn"
              onClick={() =>
                setValues((prev) => ({
                  ...prev,
                  extraCharges: [
                    ...(prev.extraCharges ?? []),
                    {
                      id: `charge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                      label: '',
                      amount: '',
                    },
                  ],
                }))
              }
            >
              + {strings.mbAddCharge}
            </button>
            <FormFieldReadOnly label={strings.mbTotalChargesHT} value={currencyFormatter.format(totalChargesHT)} />
            <FormFieldReadOnly label={strings.mbTvaCharges} value={currencyFormatter.format(tvaCharges)} />
            <FormFieldReadOnly label={strings.mbTotalChargesTTC} value={currencyFormatter.format(totalChargesTTC)} />
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
            <FormField label={strings.mbApportPercent} value={values.apportPercent} onChange={handleChange('apportPercent')} unit={strings.unitPercent} help={strings.helpMbApport} invalidMessage={strings.invalidNumber} />
            <FormFieldReadOnly label={strings.mbApportAmount} value={currencyFormatter.format(apportAmount)} />
            <FormFieldReadOnly label={strings.mbFinancementAmount} value={currencyFormatter.format(financementAmount)} />
            <FormField label={strings.mbRatePerYear} value={values.ratePerYear} onChange={handleChange('ratePerYear')} unit={strings.unitPercent} help={strings.helpMbRate} invalidMessage={strings.invalidNumber} />
            <FormField label={strings.mbDurationMonths} value={values.durationMonths} onChange={handleChange('durationMonths')} unit={strings.unitMonths} help={strings.helpMbDuration} invalidMessage={strings.invalidNumber} />
            <FormFieldReadOnly label={strings.mbMonthlyPayment} value={currencyFormatter.format(monthlyPayment)} />
            <FormFieldReadOnly label={strings.mbTotalPayments} value={currencyFormatter.format(financialCost)} />
          </div>
        ),
      },
      {
        id: 'marge-vat',
        title: strings.mbTaxation,
        description: strings.mbTaxationDescription,
        content:
          values.apartments.length > 0 ? (
            <MargeVatTable
              results={flip}
              currencyFormatter={currencyFormatter}
              strings={strings}
            />
          ) : (
            <p className="mb-no-apartments">{strings.mbNoApartments}</p>
          ),
      },
      {
        id: 'operation-result',
        title: strings.mbOperationResult,
        description: strings.mbOperationResultDescription,
        content:
          values.apartments.length > 0 ? (
            <MbOperationResultTable
              results={flip}
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
              results={flip}
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
      flip,
      addLot,
      removeLot,
      updateLot,
      lotTypeLabels,
    ],
  )

  return (
    <main className="app-main marchand-de-biens-main app-main-sortable" ref={pdfRef}>
      <SavedSimulationsPanel
        type="property-flipping"
        currentData={values}
        onLoad={(data) => {
          const loaded = data as MarchandDeBiensValues
          setValues({ ...MB_INITIAL, ...loaded })
        }}
        strings={strings}
      />
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
        pdfReportBuilder={() => buildFlipReport(flip, strings, locale, currencyFormatter)}
        shareType="flip"
        extraButton={
          <button
            type="button"
            className={`export-import-btn ${isInComparison ? 'export-import-btn-disabled' : ''} ${comparisonButtonState === 'success' ? 'export-import-btn-success' : ''}`}
            onClick={() => {
              if (isInComparison) return
              const result = addToComparison('property-flipping', values)
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
      {totalRevente > 0 ? (
        <VerdictBar
          figure={currencyFormatter.format(flip.margeNetteAvantIS)}
          figureUnit={strings.verdictMbUnit}
          tone={flip.margeNetteAvantIS >= 0 ? 'positive' : 'negative'}
          phrase={(flip.margeNetteAvantIS >= 0 ? strings.verdictMbPositive : strings.verdictMbNegative)
            .replace('{amount}', currencyFormatter.format(Math.abs(flip.margeNetteAvantIS)))
            .replace('{percent}', flip.margePercent != null ? `${flip.margePercent.toFixed(1)} %` : '–')}
          kpis={[
            {
              label: strings.mbMarginPercent,
              value: flip.margePercent != null ? `${flip.margePercent.toFixed(1)} %` : '–',
              tone: flip.margeNetteAvantIS >= 0 ? 'positive' : 'negative',
              help: strings.helpMbMargin,
            },
            {
              label: strings.mbRoiFondsPropres,
              value: flip.roiFondsPropres != null ? `${flip.roiFondsPropres.toFixed(1)} %` : '–',
              tone: flip.margeNetteAvantIS >= 0 ? 'positive' : 'negative',
              help: strings.helpMbRoi,
            },
            {
              label: strings.mbDividendesEnPoche,
              value: currencyFormatter.format(flip.dividendesEnPoche),
              tone: flip.dividendesEnPoche >= 0 ? 'positive' : 'negative',
              help: strings.helpMbDividends,
            },
          ]}
        />
      ) : (
        <VerdictBar
          figure="—"
          figureUnit={strings.verdictMbUnit}
          tone="neutral"
          phrase={strings.verdictMbEmpty}
          kpis={[
            { label: strings.mbMarginPercent, value: '–', help: strings.helpMbMargin },
            { label: strings.mbRoiFondsPropres, value: '–', help: strings.helpMbRoi },
            { label: strings.mbDividendesEnPoche, value: '–', help: strings.helpMbDividends },
          ]}
        />
      )}
      <SortableSectionList
        sections={sections}
        order={order}
        collapsed={collapsed}
        onMove={moveSection}
        onCollapsedChange={setCollapsed}
        gridLayout={FLIP_GRID_LAYOUT}
      />
      <EmailCaptureCard strings={strings} />
    </main>
  )
}
