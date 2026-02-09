import { useMemo, useRef, useState } from 'react'
import type { Locale } from '../../../shared/types'
import { FormField, FormFieldReadOnly, SortableSectionList } from '../../../shared/ui'
import { usePanelLayout } from '../../../shared/hooks/usePanelLayout'
import { ExportImportPanel } from '../../../features/export-json'
import type { ApartmentItem, MarchandDeBiensValues } from '../model/types'
import { MB_INITIAL } from '../model/types'
import { validateMarchandData } from '../model/validation'
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
}

export function FlipPanelPage({ locale, strings }: FlipPanelPageProps) {
  const [values, setValues] = useState<MarchandDeBiensValues>(MB_INITIAL)
  const pdfRef = useRef<HTMLDivElement>(null)

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
