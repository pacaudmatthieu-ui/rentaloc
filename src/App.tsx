import { useMemo, useState } from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import './App.css'

type Locale = 'en' | 'fr'

type TaxRegime =
  | 'none'
  | 'micro_foncier'
  | 'reel_foncier'
  | 'lmnp_micro_bic'
  | 'lmnp_reel'
  | 'sci_ir'
  | 'sci_is'
  | 'bailleur_prive'

type SimulationFormValues = {
  purchasePrice: string
  notaryFees: string
  agencyFees: string
  renovationBudget: string
  furnitureBudget: string
  ownFunds: string
  interestRate: string
  insuranceRate: string
  loanDurationYears: string
  monthlyRent: string
  monthlyRecoverableCharges: string
  vacancyRate: string
  annualPropertyTax: string
  annualNonRecoverableCharges: string
  annualManagementPercent: string
  annualMaintenance: string
  annualInsurancePNO: string
  otherAnnualExpenses: string
  taxRegime: TaxRegime
  marginalTaxRate: string
  socialChargesRate: string
  corporateTaxRate: string
}

type SimulationResults = {
  totalCost: number
  loanAmount: number
  annualRentEffective: number
  annualCharges: number
  annualLoanAndInsurance: number
  annualCashflow: number
  monthlyCashflow: number
  grossYield: number // 0–1
  netYield: number // 0–1
  cashOnCash: number // 0–1
  annualTax: number
  annualCashflowAfterTax: number
  monthlyCashflowAfterTax: number
  annualDepreciation: number
}

const INITIAL_VALUES: SimulationFormValues = {
  purchasePrice: '200000',
  notaryFees: '15000',
  agencyFees: '8000',
  renovationBudget: '20000',
  furnitureBudget: '5000',
  ownFunds: '40000',
  interestRate: '3.0',
  insuranceRate: '0.3',
  loanDurationYears: '20',
  monthlyRent: '1200',
  monthlyRecoverableCharges: '50',
  vacancyRate: '5',
  annualPropertyTax: '1200',
  annualNonRecoverableCharges: '600',
  annualManagementPercent: '6',
  annualMaintenance: '600',
  annualInsurancePNO: '200',
  otherAnnualExpenses: '0',
  taxRegime: 'none',
  marginalTaxRate: '30',
  socialChargesRate: '17.2',
  corporateTaxRate: '25',
}

type AppSection = 'investissement_locatif' | 'marchand_de_biens'

const STRINGS = {
  en: {
    title: 'Rental Investment Simulator',
    subtitle:
      'Quickly estimate cashflow and yield for a rental project in a few inputs.',
    sectionInvestissementLocatif: 'Investissement locatif',
    sectionMarchandDeBiens: 'Marchand de Biens',
    languageLabel: 'Language',
    languageEnglish: 'English',
    languageFrench: 'Français',
    sectionAcquisition: 'Acquisition',
    sectionFinancing: 'Financing / Bank',
    sectionRevenues: 'Revenues',
    sectionCharges: 'Expenses',
    sectionTaxation: 'Taxation (France – simplified)',
    acquisitionDescription:
      'Describe the acquisition costs of your project (purchase price, notary, works…).',
    financingDescription:
      'Configure the bank loan: interest rate, insurance and duration.',
    revenuesDescription:
      'Estimate your gross monthly rent and charges recovered from the tenant.',
    chargesDescription:
      'Estimate recurring annual expenses such as taxes, management and maintenance.',
    taxDescription:
      'Optionally estimate income tax for common French rental tax regimes.',
    purchasePrice: 'Property price',
    notaryFees: 'Notary fees (8% of property price)',
    agencyFees: 'Agency fees',
    renovationBudget: 'Renovation / works',
    furnitureBudget: 'Furniture',
    ownFunds: 'Own funds (cash down)',
    interestRate: 'Interest rate (yearly, %)',
    insuranceRate: 'Insurance rate (yearly, %)',
    loanDurationYears: 'Loan duration (years)',
    monthlyRent: 'Monthly rent',
    monthlyRecoverableCharges: 'Monthly recoverable charges',
    vacancyRate: 'Vacancy rate (%)',
    annualPropertyTax: 'Property tax (annual)',
    annualNonRecoverableCharges: 'Non-recoverable copro charges (annual)',
    annualManagementPercent: 'Property management (% of rent)',
    annualMaintenance: 'Maintenance budget (annual)',
    annualInsurancePNO: 'Insurance / PNO (annual)',
    otherAnnualExpenses: 'Other expenses (annual)',
    taxRegimeLabel: 'Tax regime',
    taxNone: 'No tax estimation',
    taxMicroFoncier: 'Micro-foncier',
    taxReelFoncier: 'Réel foncier / SCI IR',
    taxLmnpMicro: 'LMNP micro-BIC',
    taxLmnpReel: 'LMNP réel',
    taxSciIs: 'SCI IS',
    taxBailleurPrive: 'Bailleur Privé',
    marginalTaxRate: 'Marginal income tax rate (TMI, %)',
    socialChargesRate: 'Social charges rate (% – CSG/CRDS, etc.)',
    corporateTaxRate: 'Corporate tax rate (SCI IS, %)',
    resultsTitle: 'Results',
    keyMetrics: 'Key metrics',
    monthlyCashflow: 'Monthly cashflow (net)',
    annualCashflow: 'Annual cashflow (net)',
    monthlyCashflowAfterTax: 'Monthly cashflow after tax',
    annualCashflowAfterTax: 'Annual cashflow after tax',
    grossYield: 'Gross yield',
    netYield: 'Net yield (after main charges)',
    cashOnCash: 'Cash-on-cash return',
    breakdownTitle: 'Breakdown (annual)',
    totalCost: 'Total cost (purchase + fees + works)',
    loanAmount: 'Loan amount',
    effectiveRent: 'Effective rent (after vacancy)',
    annualChargesLabel: 'Annual expenses (excluding loan)',
    annualLoanAndInsuranceLabel: 'Loan + insurance (annual)',
    estimatedAnnualTax: 'Estimated annual tax (simplified)',
    annualDepreciation: 'Annual depreciation (amort.)',
    disclaimer:
      'This tool is a quick estimation and does not replace professional financial advice.',
    chartTitle: 'Cash flow over time',
    chartRevenueLabel: 'Revenue (rent)',
    chartExpensesLabel: 'Expenses',
    chartCashflowLabel: 'Cash flow',
    chartDepreciationLabel: 'Depreciation (amort.)',
    chartTaxLabel: 'Tax',
    chartTooltipRevenue: 'Revenue',
    chartTooltipCharges: 'Charges',
    chartTooltipCashflow: 'Cash flow',
    chartChargePropertyTax: 'Property tax',
    chartChargeCopro: 'Copro (non-recoverable)',
    chartChargeManagement: 'Management',
    chartChargeMaintenance: 'Maintenance',
    chartChargeInsurance: 'Insurance',
    chartChargeOther: 'Other',
    chartChargeLoan: 'Loan + insurance',
    chartChargeDepreciation: 'Depreciation (reduces tax)',
    chartChargeTax: 'Corporate / income tax',
    mbAcquisition: 'Acquisition',
    mbAcquisitionDescription: 'Purchase price, agency fees, works. Notary fees: 3% of price.',
    mbFinancialCost: 'Financial cost',
    mbNotaryFees: 'Notary fees (3% of property price)',
    mbApartments: 'Apartments',
    mbApartmentsDescription: 'Add apartments with type and surface.',
    mbAddApartment: 'Add apartment',
    mbApartmentType: 'Type',
    mbApartmentSuperficie: 'Surface (m²)',
    mbApartmentT1: 'T1',
    mbApartmentT2: 'T2',
    mbApartmentT3: 'T3',
    mbApartmentT4: 'T4',
    mbApartmentT5: 'T5',
    mbRemove: 'Remove',
    mbNoApartments: 'No apartments yet. Add one to get started.',
    mbReventePessimistic: 'Resale – pessimistic',
    mbReventeLogic: 'Resale – logical',
    mbReventeOptimistic: 'Resale – optimistic',
    mbResalePrice: 'Resale price',
    mbPricePerSqm: '€/m²',
    mbTotal: 'Total',
    mbPlusValue: 'Plus-value',
    mbMarge: 'Marge',
    mbFinancials: 'Financials',
    mbFinancialsDescription: 'Loan simulation for the operation.',
    mbOperationAmount: 'Amount of operation',
    mbApportAmount: 'Down payment (apport)',
    mbApportPercent: 'Apport (%)',
    mbFinancementAmount: 'Amount to finance',
    mbRatePerYear: 'Interest rate per year (%)',
    mbDurationMonths: 'Duration (months)',
    mbMonthlyPayment: 'Monthly payment',
    mbTotalPayments: 'Total payments',
  },
  fr: {
    title: "Simulateur d'investissement locatif",
    subtitle:
      'Estimez rapidement le cashflow et la rentabilité de votre projet immobilier.',
    sectionInvestissementLocatif: 'Investissement locatif',
    sectionMarchandDeBiens: 'Marchand de Biens',
    languageLabel: 'Langue',
    languageEnglish: 'English',
    languageFrench: 'Français',
    sectionAcquisition: 'Acquisition',
    sectionFinancing: 'Financement / Banque',
    sectionRevenues: 'Revenus',
    sectionCharges: 'Charges',
    sectionTaxation: 'Fiscalité (France – simplifiée)',
    acquisitionDescription:
      "Décrivez les coûts d'acquisition de votre projet (prix, notaire, travaux…).",
    financingDescription:
      'Paramétrez le prêt bancaire : taux, assurance et durée.',
    revenuesDescription:
      'Estimez votre loyer mensuel brut et les charges récupérables.',
    chargesDescription:
      'Estimez les charges annuelles récurrentes : taxe foncière, gestion, entretien…',
    taxDescription:
      "Estimez optionnellement l'impôt pour les régimes fiscaux locatifs français.",
    purchasePrice: 'Prix du bien',
    notaryFees: 'Frais de notaire (8 % du prix)',
    agencyFees: "Frais d'agence",
    renovationBudget: 'Travaux / rénovation',
    furnitureBudget: 'Mobilier',
    ownFunds: 'Apport personnel',
    interestRate: "Taux d'intérêt (annuel, %)",
    insuranceRate: "Taux d'assurance (annuel, %)",
    loanDurationYears: 'Durée du prêt (années)',
    monthlyRent: 'Loyer mensuel',
    monthlyRecoverableCharges: 'Charges récupérables mensuelles',
    vacancyRate: 'Vacance locative (%)',
    annualPropertyTax: 'Taxe foncière (annuelle)',
    annualNonRecoverableCharges: 'Charges de copro non récupérables (annuelles)',
    annualManagementPercent: 'Gestion locative (% du loyer)',
    annualMaintenance: 'Entretien / maintenance (annuel)',
    annualInsurancePNO: 'Assurance / PNO (annuelle)',
    otherAnnualExpenses: 'Autres charges (annuelles)',
    taxRegimeLabel: 'Régime fiscal',
    taxNone: "Pas d'estimation fiscale",
    taxMicroFoncier: 'Micro-foncier',
    taxReelFoncier: 'Réel foncier / SCI IR',
    taxLmnpMicro: 'LMNP micro-BIC',
    taxLmnpReel: 'LMNP réel',
    taxSciIs: 'SCI IS',
    taxBailleurPrive: 'Bailleur Privé',
    marginalTaxRate: "Taux marginal d'imposition (TMI, %)",
    socialChargesRate: 'Taux de prélèvements sociaux (% – CSG/CRDS, etc.)',
    corporateTaxRate: "Taux IS (SCI IS, %)",
    resultsTitle: 'Résultats',
    keyMetrics: 'Indicateurs clés',
    monthlyCashflow: 'Cashflow mensuel (net)',
    annualCashflow: 'Cashflow annuel (net)',
    monthlyCashflowAfterTax: 'Cashflow mensuel après impôts',
    annualCashflowAfterTax: 'Cashflow annuel après impôts',
    grossYield: 'Rentabilité brute',
    netYield: 'Rentabilité nette (après charges principales)',
    cashOnCash: 'Cash-on-cash',
    breakdownTitle: 'Détail (annuel)',
    totalCost: "Coût total (achat + frais + travaux)",
    loanAmount: 'Montant du prêt',
    effectiveRent: 'Loyer effectif (après vacance)',
    annualChargesLabel: 'Charges annuelles (hors crédit)',
    annualLoanAndInsuranceLabel: 'Crédit + assurance (annuel)',
    estimatedAnnualTax: 'Impôt annuel estimé (simplifié)',
    annualDepreciation: 'Amortissements annuels',
    disclaimer:
      "Cet outil fournit une estimation rapide et ne remplace pas un conseil financier professionnel.",
    chartTitle: 'Cash flow dans le temps',
    chartRevenueLabel: 'Revenus (loyer)',
    chartExpensesLabel: 'Charges',
    chartCashflowLabel: 'Cash flow',
    chartDepreciationLabel: 'Amortissements',
    chartTaxLabel: 'Impôt',
    chartTooltipRevenue: 'Revenus',
    chartTooltipCharges: 'Charges',
    chartTooltipCashflow: 'Cash flow',
    chartChargePropertyTax: 'Taxe foncière',
    chartChargeCopro: 'Copro (non récup.)',
    chartChargeManagement: 'Gestion',
    chartChargeMaintenance: 'Entretien',
    chartChargeInsurance: 'Assurance',
    chartChargeOther: 'Autres',
    chartChargeLoan: 'Crédit + assurance',
    chartChargeDepreciation: 'Amortissement (réduit l\'impôt)',
    chartChargeTax: 'Impôt société / revenu',
    mbAcquisition: 'Acquisition',
    mbAcquisitionDescription: 'Prix d\'achat, frais d\'agence, travaux. Frais de notaire : 3 % du prix.',
    mbFinancialCost: 'Coût du financement',
    mbNotaryFees: 'Frais de notaire (3 % du prix)',
    mbApartments: 'Appartements',
    mbApartmentsDescription: 'Ajoutez des appartements avec type et superficie.',
    mbAddApartment: 'Ajouter un appartement',
    mbApartmentType: 'Type',
    mbApartmentSuperficie: 'Superficie (m²)',
    mbApartmentT1: 'T1',
    mbApartmentT2: 'T2',
    mbApartmentT3: 'T3',
    mbApartmentT4: 'T4',
    mbApartmentT5: 'T5',
    mbRemove: 'Supprimer',
    mbNoApartments: 'Aucun appartement. Ajoutez-en un pour commencer.',
    mbReventePessimistic: 'Revente – pessimiste',
    mbReventeLogic: 'Revente – logique',
    mbReventeOptimistic: 'Revente – optimiste',
    mbResalePrice: 'Prix de revente',
    mbPricePerSqm: '€/m²',
    mbTotal: 'Total',
    mbPlusValue: 'Plus-value',
    mbMarge: 'Marge',
    mbFinancials: 'Financement',
    mbFinancialsDescription: 'Simulation du crédit pour l\'opération.',
    mbOperationAmount: 'Montant de l\'opération',
    mbApportAmount: 'Montant de l\'apport',
    mbApportPercent: 'Apport (%)',
    mbFinancementAmount: 'Montant à financer',
    mbRatePerYear: 'Taux par an (%)',
    mbDurationMonths: 'Durée (mois)',
    mbMonthlyPayment: 'Mensualité',
    mbTotalPayments: 'Total des mensualités',
  },
} as const

type ApartmentItem = {
  id: string
  type: 'T1' | 'T2' | 'T3' | 'T4' | 'T5'
  superficie: string
  resalePessimistic: string
  resaleLogic: string
  resaleOptimistic: string
}

type MarchandDeBiensValues = {
  purchasePrice: string
  agencyFees: string
  renovationBudget: string
  apartments: ApartmentItem[]
  apportPercent: string
  ratePerYear: string
  durationMonths: string
}

const MB_INITIAL: MarchandDeBiensValues = {
  purchasePrice: '150000',
  agencyFees: '6000',
  renovationBudget: '25000',
  apartments: [],
  apportPercent: '20',
  ratePerYear: '8',
  durationMonths: '12',
}

function MarchandDeBiensView({
  locale,
  strings,
}: {
  locale: Locale
  strings: Record<string, string>
}) {
  const [values, setValues] = useState<MarchandDeBiensValues>(MB_INITIAL)

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

  return (
    <main className="app-main marchand-de-biens-main">
      <div className="form-grid form-grid-mb">
        <div className="form-card">
          <div className="form-card-header">
            <h2>{strings.mbAcquisition}</h2>
            <p>{strings.mbAcquisitionDescription}</p>
          </div>
          <div className="form-card-body">
            <FormField
              label={strings.purchasePrice}
              value={values.purchasePrice}
              onChange={handleChange('purchasePrice')}
            />
            <FormFieldReadOnly
              label={strings.mbNotaryFees}
              value={currencyFormatter.format(notaryFees)}
            />
            <FormField
              label={strings.agencyFees}
              value={values.agencyFees}
              onChange={handleChange('agencyFees')}
            />
            <FormField
              label={strings.renovationBudget}
              value={values.renovationBudget}
              onChange={handleChange('renovationBudget')}
            />
            <FormFieldReadOnly
              label={strings.mbFinancialCost}
              value={currencyFormatter.format(totalPayments)}
            />
          </div>
        </div>

        <div className="form-card">
          <div className="form-card-header">
            <h2>{strings.mbApartments}</h2>
            <p>{strings.mbApartmentsDescription}</p>
          </div>
          <div className="form-card-body">
            <button
              type="button"
              className="mb-add-apartment-btn"
              onClick={addApartment}
            >
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
                      onChange={(e) =>
                        updateApartment(apt.id, 'superficie', e.target.value)
                      }
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
        </div>

        <div className="form-card">
          <div className="form-card-header">
            <h2>{strings.mbFinancials}</h2>
            <p>{strings.mbFinancialsDescription}</p>
          </div>
          <div className="form-card-body">
            <FormFieldReadOnly
              label={strings.mbOperationAmount}
              value={currencyFormatter.format(amountOfOperation)}
            />
            <FormField
              label={strings.mbApportPercent}
              value={values.apportPercent}
              onChange={handleChange('apportPercent')}
            />
            <FormFieldReadOnly
              label={strings.mbApportAmount}
              value={currencyFormatter.format(apportAmount)}
            />
            <FormFieldReadOnly
              label={strings.mbFinancementAmount}
              value={currencyFormatter.format(financementAmount)}
            />
            <FormField
              label={strings.mbRatePerYear}
              value={values.ratePerYear}
              onChange={handleChange('ratePerYear')}
            />
            <FormField
              label={strings.mbDurationMonths}
              value={values.durationMonths}
              onChange={handleChange('durationMonths')}
            />
            <FormFieldReadOnly
              label={strings.mbMonthlyPayment}
              value={currencyFormatter.format(monthlyPayment)}
            />
            <FormFieldReadOnly
              label={strings.mbTotalPayments}
              value={currencyFormatter.format(totalPayments)}
            />
          </div>
        </div>
      </div>

      {values.apartments.length > 0 && (
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
      )}
    </main>
  )
}

type ApartmentUpdateField =
  | 'type'
  | 'superficie'
  | 'resalePessimistic'
  | 'resaleLogic'
  | 'resaleOptimistic'

function ReventeTable({
  title,
  apartments,
  resaleField,
  updateApartment,
  strings,
  currencyFormatter,
  totalAcquisitionCost,
  locale,
}: {
  title: string
  apartments: ApartmentItem[]
  resaleField: 'resalePessimistic' | 'resaleLogic' | 'resaleOptimistic'
  updateApartment: (id: string, field: ApartmentUpdateField, value: string) => void
  strings: Record<string, string>
  currencyFormatter: Intl.NumberFormat
  totalAcquisitionCost: number
  locale: Locale
}) {
  const typeLabels: Record<ApartmentItem['type'], string> = {
    T1: strings.mbApartmentT1,
    T2: strings.mbApartmentT2,
    T3: strings.mbApartmentT3,
    T4: strings.mbApartmentT4,
    T5: strings.mbApartmentT5,
  }

  const totalRevente = apartments.reduce(
    (sum, apt) => sum + (Number(apt[resaleField]) || 0),
    0,
  )
  const plusValue = totalRevente - totalAcquisitionCost
  const marge =
    totalAcquisitionCost > 0
      ? (totalRevente - totalAcquisitionCost) / totalAcquisitionCost
      : 0

  const percentFormatter = new Intl.NumberFormat(
    locale === 'fr' ? 'fr-FR' : 'en-US',
    {
    style: 'percent',
    maximumFractionDigits: 1,
  },
  )

  return (
    <div className="mb-revente-card">
      <h3 className="mb-revente-title">{title}</h3>
      <div className="mb-revente-table">
        <div className="mb-revente-header">
          <span>{strings.mbApartmentType}</span>
          <span>{strings.mbApartmentSuperficie}</span>
          <span>{strings.mbResalePrice}</span>
          <span>{strings.mbPricePerSqm}</span>
        </div>
        {apartments.map((apt) => {
          const superficie = Number(apt.superficie) || 0
          const resalePrice = Number(apt[resaleField]) || 0
          const pricePerSqm = superficie > 0 ? resalePrice / superficie : 0

          return (
            <div key={apt.id} className="mb-revente-row">
              <span className="mb-revente-cell-type">{typeLabels[apt.type]}</span>
              <span className="mb-revente-cell-superficie">{apt.superficie} m²</span>
              <input
                type="text"
                inputMode="decimal"
                className="mb-revente-input"
                value={apt[resaleField]}
                onChange={(e) =>
                  updateApartment(apt.id, resaleField, e.target.value)
                }
              />
              <span className="mb-revente-cell-price">
                {resalePrice > 0 ? currencyFormatter.format(pricePerSqm) : '–'}
              </span>
            </div>
          )
        })}
        <div className="mb-revente-row mb-revente-total-row">
          <span className="mb-revente-cell-type">{strings.mbTotal}</span>
          <span className="mb-revente-cell-superficie">–</span>
          <span className="mb-revente-cell-total">
            {currencyFormatter.format(totalRevente)}
          </span>
          <span className="mb-revente-cell-price">–</span>
        </div>
        <div className="mb-revente-summary">
          <div className="mb-revente-summary-row">
            <span>{strings.mbPlusValue}</span>
            <span
              className={
                plusValue >= 0 ? 'mb-revente-positive' : 'mb-revente-negative'
              }
            >
              {currencyFormatter.format(plusValue)}
            </span>
          </div>
          <div className="mb-revente-summary-row">
            <span>{strings.mbMarge}</span>
            <span>
              {totalRevente > 0 && totalAcquisitionCost > 0
                ? percentFormatter.format(marge)
                : '–'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function toNumber(value: string): number {
  if (!value) return 0
  const normalized = value.replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

const LAND_PERCENT = 0.2
const BUILDING_DEPRECIATION_RATE = 0.025
const FURNITURE_DEPRECIATION_RATE = 0.1
const BAILLEUR_PRIVE_BUILDING_RATE = 0.03
const BAILLEUR_PRIVE_TAX_CAP_EUR = 8000

function computeAnnualDepreciation(
  purchasePrice: number,
  notaryFees: number,
  agencyFees: number,
  renovationBudget: number,
  furnitureBudget: number,
  taxRegime: TaxRegime,
): { building: number; furniture: number; total: number } {
  const buildingBase =
    (purchasePrice + notaryFees + agencyFees + renovationBudget) *
    (1 - LAND_PERCENT)

  let building = 0
  let furniture = 0

  switch (taxRegime) {
    case 'lmnp_reel':
    case 'sci_is':
      building = buildingBase * BUILDING_DEPRECIATION_RATE
      furniture = furnitureBudget * FURNITURE_DEPRECIATION_RATE
      break
    case 'reel_foncier':
    case 'sci_ir':
      building = buildingBase * BUILDING_DEPRECIATION_RATE
      break
    case 'bailleur_prive':
      building = buildingBase * BAILLEUR_PRIVE_BUILDING_RATE
      break
    default:
      break
  }

  return { building, furniture, total: building + furniture }
}

function calculateResults(values: SimulationFormValues): SimulationResults {
  const purchasePrice = toNumber(values.purchasePrice)
  const notaryFees = purchasePrice * 0.08
  const agencyFees = toNumber(values.agencyFees)
  const renovationBudget = toNumber(values.renovationBudget)
  const furnitureBudget = toNumber(values.furnitureBudget)
  const ownFunds = toNumber(values.ownFunds)
  const interestRate = toNumber(values.interestRate) / 100
  const insuranceRate = toNumber(values.insuranceRate) / 100
  const loanDurationYears = Math.max(toNumber(values.loanDurationYears), 1)
  const monthlyRent = toNumber(values.monthlyRent)
  const monthlyRecoverableCharges = toNumber(values.monthlyRecoverableCharges)
  const vacancyRate = toNumber(values.vacancyRate) / 100
  const annualPropertyTax = toNumber(values.annualPropertyTax)
  const annualNonRecoverableCharges = toNumber(
    values.annualNonRecoverableCharges,
  )
  const annualManagementPercent = toNumber(values.annualManagementPercent) / 100
  const annualMaintenance = toNumber(values.annualMaintenance)
  const annualInsurancePNO = toNumber(values.annualInsurancePNO)
  const otherAnnualExpenses = toNumber(values.otherAnnualExpenses)
  const marginalTaxRate = toNumber(values.marginalTaxRate) / 100
  const socialChargesRate = toNumber(values.socialChargesRate) / 100
  const corporateTaxRate = toNumber(values.corporateTaxRate) / 100
  const taxRegime = values.taxRegime

  const totalCost =
    purchasePrice + notaryFees + agencyFees + renovationBudget + furnitureBudget

  const loanAmount = Math.max(totalCost - ownFunds, 0)

  const months = loanDurationYears * 12
  const monthlyRate = interestRate / 12

  let monthlyLoan = 0
  if (loanAmount > 0) {
    if (monthlyRate === 0) {
      monthlyLoan = loanAmount / months
    } else {
      const factor = Math.pow(1 + monthlyRate, months)
      monthlyLoan = (loanAmount * monthlyRate * factor) / (factor - 1)
    }
  }

  const monthlyInsurance = loanAmount * (insuranceRate / 12)

  const grossMonthlyIncome = monthlyRent + monthlyRecoverableCharges
  const effectiveMonthlyIncome = grossMonthlyIncome * (1 - vacancyRate)
  const annualRentEffective = effectiveMonthlyIncome * 12

  const annualManagement = annualRentEffective * annualManagementPercent

  const annualCharges =
    annualPropertyTax +
    annualNonRecoverableCharges +
    annualManagement +
    annualMaintenance +
    annualInsurancePNO +
    otherAnnualExpenses

  const annualLoanAndInsurance = (monthlyLoan + monthlyInsurance) * 12

  const annualCashflow =
    annualRentEffective - annualCharges - annualLoanAndInsurance
  const monthlyCashflow = annualCashflow / 12

  const annualInterestApprox = loanAmount * interestRate

  let grossYield = 0
  let netYield = 0
  let cashOnCash = 0
  let annualTax = 0

  if (totalCost > 0) {
    grossYield = annualRentEffective / totalCost
    const annualNetIncome = annualRentEffective - annualCharges
    netYield = annualNetIncome / totalCost
  }

  if (ownFunds > 0) {
    cashOnCash = annualCashflow / ownFunds
  }

  const tmiPlusSocial = marginalTaxRate + socialChargesRate

  const depreciation = computeAnnualDepreciation(
    purchasePrice,
    notaryFees,
    agencyFees,
    renovationBudget,
    furnitureBudget,
    taxRegime,
  )

  switch (taxRegime) {
    case 'micro_foncier': {
      const base = annualRentEffective * 0.7
      annualTax = Math.max(base * tmiPlusSocial, 0)
      break
    }
    case 'reel_foncier':
    case 'lmnp_reel':
    case 'sci_ir': {
      const base =
        annualRentEffective -
        annualCharges -
        annualInterestApprox -
        depreciation.total
      const taxable = Math.max(base, 0)
      annualTax = taxable * tmiPlusSocial
      break
    }
    case 'lmnp_micro_bic': {
      const base = annualRentEffective * 0.5
      annualTax = Math.max(base * tmiPlusSocial, 0)
      break
    }
    case 'sci_is': {
      const base =
        annualRentEffective -
        annualCharges -
        annualLoanAndInsurance -
        depreciation.total
      const taxable = Math.max(base, 0)
      annualTax = taxable * corporateTaxRate
      break
    }
    case 'bailleur_prive': {
      const base =
        annualRentEffective -
        annualCharges -
        annualInterestApprox -
        depreciation.total
      const taxWithDepreciation = Math.max(base, 0) * tmiPlusSocial
      const taxWithoutDepreciation = Math.max(
        (annualRentEffective - annualCharges - annualInterestApprox) *
          tmiPlusSocial,
        0,
      )
      const taxAdvantage = Math.min(
        taxWithoutDepreciation - taxWithDepreciation,
        BAILLEUR_PRIVE_TAX_CAP_EUR,
      )
      annualTax = taxWithoutDepreciation - taxAdvantage
      break
    }
    case 'none':
    default:
      annualTax = 0
  }

  const annualCashflowAfterTax = annualCashflow - annualTax
  const monthlyCashflowAfterTax = annualCashflowAfterTax / 12

  return {
    totalCost,
    loanAmount,
    annualRentEffective,
    annualCharges,
    annualLoanAndInsurance,
    annualCashflow,
    monthlyCashflow,
    grossYield,
    netYield,
    cashOnCash,
    annualTax,
    annualCashflowAfterTax,
    monthlyCashflowAfterTax,
    annualDepreciation: depreciation.total,
  }
}

type ChargesBreakdown = {
  propertyTax: number
  copro: number
  management: number
  maintenance: number
  insurance: number
  other: number
  loanAndInsurance: number
  depreciation: number
  tax: number
}

type YearlyChartPoint = {
  year: string
  revenue: number
  charges: number
  cashflow: number
  chargesBreakdown: ChargesBreakdown
}

function computeYearlyChartData(
  values: SimulationFormValues,
): YearlyChartPoint[] {
  const purchasePrice = toNumber(values.purchasePrice)
  const notaryFees = purchasePrice * 0.08
  const agencyFees = toNumber(values.agencyFees)
  const renovationBudget = toNumber(values.renovationBudget)
  const furnitureBudget = toNumber(values.furnitureBudget)
  const ownFunds = toNumber(values.ownFunds)
  const interestRate = toNumber(values.interestRate) / 100
  const insuranceRate = toNumber(values.insuranceRate) / 100
  const loanDurationYears = Math.max(toNumber(values.loanDurationYears), 1)
  const monthlyRent = toNumber(values.monthlyRent)
  const monthlyRecoverableCharges = toNumber(values.monthlyRecoverableCharges)
  const vacancyRate = toNumber(values.vacancyRate) / 100
  const annualPropertyTax = toNumber(values.annualPropertyTax)
  const annualNonRecoverableCharges = toNumber(
    values.annualNonRecoverableCharges,
  )
  const annualManagementPercent = toNumber(values.annualManagementPercent) / 100
  const annualMaintenance = toNumber(values.annualMaintenance)
  const annualInsurancePNO = toNumber(values.annualInsurancePNO)
  const otherAnnualExpenses = toNumber(values.otherAnnualExpenses)
  const marginalTaxRate = toNumber(values.marginalTaxRate) / 100
  const socialChargesRate = toNumber(values.socialChargesRate) / 100
  const corporateTaxRate = toNumber(values.corporateTaxRate) / 100
  const taxRegime = values.taxRegime

  const totalCost =
    purchasePrice + notaryFees + agencyFees + renovationBudget + furnitureBudget
  const loanAmount = Math.max(totalCost - ownFunds, 0)

  const months = loanDurationYears * 12
  const monthlyRate = interestRate / 12

  let monthlyLoan = 0
  if (loanAmount > 0) {
    if (monthlyRate === 0) {
      monthlyLoan = loanAmount / months
    } else {
      const factor = Math.pow(1 + monthlyRate, months)
      monthlyLoan = (loanAmount * monthlyRate * factor) / (factor - 1)
    }
  }

  const monthlyInsurance = loanAmount * (insuranceRate / 12)
  const grossMonthlyIncome = monthlyRent + monthlyRecoverableCharges
  const effectiveMonthlyIncome = grossMonthlyIncome * (1 - vacancyRate)
  const annualRentEffective = effectiveMonthlyIncome * 12

  const annualManagement = annualRentEffective * annualManagementPercent
  const annualCharges =
    annualPropertyTax +
    annualNonRecoverableCharges +
    annualManagement +
    annualMaintenance +
    annualInsurancePNO +
    otherAnnualExpenses

  const annualLoanAndInsurance = (monthlyLoan + monthlyInsurance) * 12
  const tmiPlusSocial = marginalTaxRate + socialChargesRate

  const depreciation = computeAnnualDepreciation(
    purchasePrice,
    notaryFees,
    agencyFees,
    renovationBudget,
    furnitureBudget,
    taxRegime,
  )

  const interestPerYear: number[] = []
  if (loanAmount > 0 && monthlyRate > 0) {
    let balance = loanAmount
    for (let m = 0; m < months; m++) {
      const interest = balance * monthlyRate
      const principal = monthlyLoan - interest
      balance -= principal
      const yearIndex = Math.floor(m / 12)
      if (!interestPerYear[yearIndex]) interestPerYear[yearIndex] = 0
      interestPerYear[yearIndex] += interest
    }
  }

  const data: YearlyChartPoint[] = []
  for (let y = 0; y < loanDurationYears; y++) {
    const interestThisYear = interestPerYear[y] ?? 0
    const revenue = annualRentEffective
    const expenses = annualCharges + annualLoanAndInsurance

    let tax = 0
    switch (taxRegime) {
      case 'micro_foncier':
        tax = Math.max(annualRentEffective * 0.7 * tmiPlusSocial, 0)
        break
      case 'reel_foncier':
      case 'lmnp_reel':
      case 'sci_ir':
        tax = Math.max(
          (annualRentEffective -
            annualCharges -
            interestThisYear -
            depreciation.total) *
            tmiPlusSocial,
          0,
        )
        break
      case 'lmnp_micro_bic':
        tax = Math.max(annualRentEffective * 0.5 * tmiPlusSocial, 0)
        break
      case 'sci_is':
        tax = Math.max(
          (annualRentEffective -
            annualCharges -
            annualLoanAndInsurance -
            depreciation.total) *
            corporateTaxRate,
          0,
        )
        break
      case 'bailleur_prive': {
        const base =
          annualRentEffective -
          annualCharges -
          interestThisYear -
          depreciation.total
        const taxWithDepreciation = Math.max(base, 0) * tmiPlusSocial
        const taxWithoutDepreciation = Math.max(
          (annualRentEffective - annualCharges - interestThisYear) *
            tmiPlusSocial,
          0,
        )
        const taxAdvantage = Math.min(
          taxWithoutDepreciation - taxWithDepreciation,
          BAILLEUR_PRIVE_TAX_CAP_EUR,
        )
        tax = taxWithoutDepreciation - taxAdvantage
        break
      }
      default:
        break
    }

    const cashflow = revenue - expenses - tax
    const totalCharges = expenses + tax

    data.push({
      year: `${y + 1}`,
      revenue,
      charges: -totalCharges,
      cashflow,
      chargesBreakdown: {
        propertyTax: annualPropertyTax,
        copro: annualNonRecoverableCharges,
        management: annualManagement,
        maintenance: annualMaintenance,
        insurance: annualInsurancePNO,
        other: otherAnnualExpenses,
        loanAndInsurance: annualLoanAndInsurance,
        depreciation: depreciation.total,
        tax,
      },
    })
  }

  return data
}

function App() {
  const [locale, setLocale] = useState<Locale>('en')
  const [values, setValues] = useState<SimulationFormValues>(INITIAL_VALUES)

  const strings = STRINGS[locale]

  const results = useMemo(() => calculateResults(values), [values])
  const chartData = useMemo(() => computeYearlyChartData(values), [values])

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
      const { value } = event.target
      setValues((prev) => ({ ...prev, [field]: value }))
    }

  const handleTaxRegimeChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const { value } = event.target
    setValues((prev) => ({ ...prev, taxRegime: value as TaxRegime }))
  }

  const [appSection, setAppSection] = useState<AppSection>('investissement_locatif')

  return (
    <div className="app-root">
      <header className="app-header">
        <div>
          <h1>{strings.title}</h1>
          <p className="app-subtitle">{strings.subtitle}</p>
          <div className="section-tabs">
            <button
              type="button"
              className={`section-tab ${appSection === 'investissement_locatif' ? 'section-tab-active' : ''}`}
              onClick={() => setAppSection('investissement_locatif')}
            >
              {strings.sectionInvestissementLocatif}
            </button>
            <button
              type="button"
              className={`section-tab ${appSection === 'marchand_de_biens' ? 'section-tab-active' : ''}`}
              onClick={() => setAppSection('marchand_de_biens')}
            >
              {strings.sectionMarchandDeBiens}
            </button>
          </div>
        </div>
        <div className="language-switcher">
          <label className="field-label" htmlFor="language-select">
            {strings.languageLabel}
          </label>
          <select
            id="language-select"
            className="language-select"
            value={locale}
            onChange={(event) => setLocale(event.target.value as Locale)}
          >
            <option value="en">{strings.languageEnglish}</option>
            <option value="fr">{strings.languageFrench}</option>
          </select>
        </div>
      </header>

      {appSection === 'marchand_de_biens' ? (
        <MarchandDeBiensView locale={locale} strings={STRINGS[locale]} />
      ) : (
      <>
      <main className="app-main">
        <section className="form-section">
          <div className="form-grid">
            <div className="form-card">
              <div className="form-card-header">
                <h2>{strings.sectionAcquisition}</h2>
                <p>{strings.acquisitionDescription}</p>
              </div>
              <div className="form-card-body">
                <FormField
                  label={strings.purchasePrice}
                  value={values.purchasePrice}
                  onChange={handleChange('purchasePrice')}
                />
                <FormFieldReadOnly
                  label={strings.notaryFees}
                  value={currencyFormatter.format(
                    toNumber(values.purchasePrice) * 0.08,
                  )}
                />
                <FormField
                  label={strings.agencyFees}
                  value={values.agencyFees}
                  onChange={handleChange('agencyFees')}
                />
                <FormField
                  label={strings.renovationBudget}
                  value={values.renovationBudget}
                  onChange={handleChange('renovationBudget')}
                />
                <FormField
                  label={strings.furnitureBudget}
                  value={values.furnitureBudget}
                  onChange={handleChange('furnitureBudget')}
                />
                <FormField
                  label={strings.ownFunds}
                  value={values.ownFunds}
                  onChange={handleChange('ownFunds')}
                />
              </div>
            </div>

            <div className="form-card">
              <div className="form-card-header">
                <h2>{strings.sectionFinancing}</h2>
                <p>{strings.financingDescription}</p>
              </div>
              <div className="form-card-body">
                <FormField
                  label={strings.interestRate}
                  value={values.interestRate}
                  onChange={handleChange('interestRate')}
                />
                <FormField
                  label={strings.insuranceRate}
                  value={values.insuranceRate}
                  onChange={handleChange('insuranceRate')}
                />
                <FormField
                  label={strings.loanDurationYears}
                  value={values.loanDurationYears}
                  onChange={handleChange('loanDurationYears')}
                />
              </div>
            </div>

            <div className="form-card">
              <div className="form-card-header">
                <h2>{strings.sectionRevenues}</h2>
                <p>{strings.revenuesDescription}</p>
              </div>
              <div className="form-card-body">
                <FormField
                  label={strings.monthlyRent}
                  value={values.monthlyRent}
                  onChange={handleChange('monthlyRent')}
                />
                <FormField
                  label={strings.monthlyRecoverableCharges}
                  value={values.monthlyRecoverableCharges}
                  onChange={handleChange('monthlyRecoverableCharges')}
                />
                <FormField
                  label={strings.vacancyRate}
                  value={values.vacancyRate}
                  onChange={handleChange('vacancyRate')}
                />
              </div>
            </div>

            <div className="form-card">
              <div className="form-card-header">
                <h2>{strings.sectionCharges}</h2>
                <p>{strings.chargesDescription}</p>
              </div>
              <div className="form-card-body">
                <FormField
                  label={strings.annualPropertyTax}
                  value={values.annualPropertyTax}
                  onChange={handleChange('annualPropertyTax')}
                />
                <FormField
                  label={strings.annualNonRecoverableCharges}
                  value={values.annualNonRecoverableCharges}
                  onChange={handleChange('annualNonRecoverableCharges')}
                />
                <FormField
                  label={strings.annualManagementPercent}
                  value={values.annualManagementPercent}
                  onChange={handleChange('annualManagementPercent')}
                />
                <FormField
                  label={strings.annualMaintenance}
                  value={values.annualMaintenance}
                  onChange={handleChange('annualMaintenance')}
                />
                <FormField
                  label={strings.annualInsurancePNO}
                  value={values.annualInsurancePNO}
                  onChange={handleChange('annualInsurancePNO')}
                />
                <FormField
                  label={strings.otherAnnualExpenses}
                  value={values.otherAnnualExpenses}
                  onChange={handleChange('otherAnnualExpenses')}
                />
              </div>
            </div>

            <div className="form-card">
              <div className="form-card-header">
                <h2>{strings.sectionTaxation}</h2>
                <p>{strings.taxDescription}</p>
              </div>
              <div className="form-card-body">
                <label className="form-field">
                  <span className="field-label">{strings.taxRegimeLabel}</span>
                  <select
                    className="field-input"
                    value={values.taxRegime}
                    onChange={handleTaxRegimeChange}
                  >
                    <option value="none">{strings.taxNone}</option>
                    <option value="micro_foncier">
                      {strings.taxMicroFoncier}
                    </option>
                    <option value="reel_foncier">
                      {strings.taxReelFoncier}
                    </option>
                    <option value="lmnp_micro_bic">
                      {strings.taxLmnpMicro}
                    </option>
                    <option value="lmnp_reel">{strings.taxLmnpReel}</option>
                    <option value="sci_ir">{strings.taxReelFoncier}</option>
                    <option value="sci_is">{strings.taxSciIs}</option>
                    <option value="bailleur_prive">
                      {strings.taxBailleurPrive}
                    </option>
                  </select>
                </label>
                <FormField
                  label={strings.marginalTaxRate}
                  value={values.marginalTaxRate}
                  onChange={handleChange('marginalTaxRate')}
                />
                <FormField
                  label={strings.socialChargesRate}
                  value={values.socialChargesRate}
                  onChange={handleChange('socialChargesRate')}
                />
                <FormField
                  label={strings.corporateTaxRate}
                  value={values.corporateTaxRate}
                  onChange={handleChange('corporateTaxRate')}
                />
              </div>
            </div>
          </div>
        </section>

        <aside className="results-section">
          <div className="results-card">
            <h2>{strings.resultsTitle}</h2>
            <p className="results-subtitle">{strings.keyMetrics}</p>

            <div className="results-grid">
              <ResultTile
                label={strings.monthlyCashflow}
                value={currencyFormatter.format(results.monthlyCashflow)}
                variant={
                  results.monthlyCashflow >= 0 ? 'positive' : 'negative'
                }
              />
              <ResultTile
                label={strings.annualCashflow}
                value={currencyFormatter.format(results.annualCashflow)}
                variant={
                  results.annualCashflow >= 0 ? 'positive' : 'negative'
                }
              />
              <ResultTile
                label={strings.grossYield}
                value={percentFormatter.format(results.grossYield)}
              />
              <ResultTile
                label={strings.netYield}
                value={percentFormatter.format(results.netYield)}
              />
              <ResultTile
                label={strings.cashOnCash}
                value={percentFormatter.format(results.cashOnCash)}
              />
              <ResultTile
                label={strings.monthlyCashflowAfterTax}
                value={currencyFormatter.format(results.monthlyCashflowAfterTax)}
                variant={
                  results.monthlyCashflowAfterTax >= 0
                    ? 'positive'
                    : 'negative'
                }
              />
              <ResultTile
                label={strings.annualCashflowAfterTax}
                value={currencyFormatter.format(results.annualCashflowAfterTax)}
                variant={
                  results.annualCashflowAfterTax >= 0
                    ? 'positive'
                    : 'negative'
                }
              />
            </div>

            <h3 className="results-breakdown-title">
              {strings.breakdownTitle}
            </h3>
            <div className="results-breakdown">
              <BreakdownRow
                label={strings.totalCost}
                value={currencyFormatter.format(results.totalCost)}
              />
              <BreakdownRow
                label={strings.loanAmount}
                value={currencyFormatter.format(results.loanAmount)}
              />
              <BreakdownRow
                label={strings.effectiveRent}
                value={currencyFormatter.format(results.annualRentEffective)}
              />
              <BreakdownRow
                label={strings.annualChargesLabel}
                value={currencyFormatter.format(results.annualCharges)}
              />
              <BreakdownRow
                label={strings.annualLoanAndInsuranceLabel}
                value={currencyFormatter.format(
                  results.annualLoanAndInsurance,
                )}
              />
              <BreakdownRow
                label={strings.estimatedAnnualTax}
                value={currencyFormatter.format(results.annualTax)}
              />
              {results.annualDepreciation > 0 && (
                <BreakdownRow
                  label={strings.annualDepreciation}
                  value={currencyFormatter.format(results.annualDepreciation)}
                />
              )}
            </div>

            <p className="results-disclaimer">{strings.disclaimer}</p>
          </div>
        </aside>
      </main>

      <section className="chart-section">
        <h2 className="chart-section-title">{strings.chartTitle}</h2>
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
              tax: strings.chartChargeTax,
            }}
          />
        </div>
      </section>
      </>
      )}
    </div>
  )
}

type ChartTooltipStrings = {
  revenue: string
  charges: string
  cashflow: string
  propertyTax: string
  copro: string
  management: string
  maintenance: string
  insurance: string
  other: string
  loan: string
  depreciation: string
  tax: string
}

type CashflowChartProps = {
  data: YearlyChartPoint[]
  currencyFormatter: Intl.NumberFormat
  revenueLabel: string
  chargesLabel: string
  cashflowLabel: string
  tooltipStrings: ChartTooltipStrings
}

function ChartTooltipContent({
  active,
  payload,
  label,
  currencyFormatter,
  tooltipStrings,
}: {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: YearlyChartPoint }>
  label?: string | number
  currencyFormatter: Intl.NumberFormat
  tooltipStrings: ChartTooltipStrings
}) {
  if (!active || !payload?.length || !label) return null

  const point = payload[0]?.payload
  if (!point) return null

  const b = point.chargesBreakdown

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">Year {String(label)}</div>
      <div className="chart-tooltip-row">
        <span>{tooltipStrings.revenue}</span>
        <span>{currencyFormatter.format(point.revenue)}</span>
      </div>
      <div className="chart-tooltip-section">
        <div className="chart-tooltip-row chart-tooltip-total">
          <span>{tooltipStrings.charges}</span>
          <span>{currencyFormatter.format(Math.abs(point.charges))}</span>
        </div>
        <div className="chart-tooltip-breakdown">
          {b.propertyTax > 0 && (
            <div className="chart-tooltip-row">
              <span>{tooltipStrings.propertyTax}</span>
              <span>{currencyFormatter.format(b.propertyTax)}</span>
            </div>
          )}
          {b.copro > 0 && (
            <div className="chart-tooltip-row">
              <span>{tooltipStrings.copro}</span>
              <span>{currencyFormatter.format(b.copro)}</span>
            </div>
          )}
          {b.management > 0 && (
            <div className="chart-tooltip-row">
              <span>{tooltipStrings.management}</span>
              <span>{currencyFormatter.format(b.management)}</span>
            </div>
          )}
          {b.maintenance > 0 && (
            <div className="chart-tooltip-row">
              <span>{tooltipStrings.maintenance}</span>
              <span>{currencyFormatter.format(b.maintenance)}</span>
            </div>
          )}
          {b.insurance > 0 && (
            <div className="chart-tooltip-row">
              <span>{tooltipStrings.insurance}</span>
              <span>{currencyFormatter.format(b.insurance)}</span>
            </div>
          )}
          {b.other > 0 && (
            <div className="chart-tooltip-row">
              <span>{tooltipStrings.other}</span>
              <span>{currencyFormatter.format(b.other)}</span>
            </div>
          )}
          <div className="chart-tooltip-row">
            <span>{tooltipStrings.loan}</span>
            <span>{currencyFormatter.format(b.loanAndInsurance)}</span>
          </div>
          {b.depreciation > 0 && (
            <div className="chart-tooltip-row chart-tooltip-depreciation">
              <span>{tooltipStrings.depreciation}</span>
              <span>{currencyFormatter.format(b.depreciation)}</span>
            </div>
          )}
          {b.tax > 0 && (
            <div className="chart-tooltip-row">
              <span>{tooltipStrings.tax}</span>
              <span>{currencyFormatter.format(b.tax)}</span>
            </div>
          )}
        </div>
      </div>
      <div className="chart-tooltip-row">
        <span>{tooltipStrings.cashflow}</span>
        <span>{currencyFormatter.format(point.cashflow)}</span>
      </div>
    </div>
  )
}

function CashflowChart({
  data,
  currencyFormatter,
  revenueLabel,
  chargesLabel,
  cashflowLabel,
  tooltipStrings,
}: CashflowChartProps) {
  if (data.length === 0) return null

  return (
    <ResponsiveContainer width="100%" height={420}>
      <ComposedChart
        data={data}
        margin={{ top: 20, right: 20, bottom: 20, left: 10 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.3)" />
        <XAxis
          dataKey="year"
          tick={{ fill: '#9ca3af', fontSize: 11 }}
          tickLine={{ stroke: 'rgba(148,163,184,0.4)' }}
          axisLine={{ stroke: 'rgba(148,163,184,0.4)' }}
        />
        <YAxis
          tick={{ fill: '#9ca3af', fontSize: 11 }}
          tickLine={{ stroke: 'rgba(148,163,184,0.4)' }}
          axisLine={{ stroke: 'rgba(148,163,184,0.4)' }}
          tickFormatter={(v) => currencyFormatter.format(v)}
        />
        <Tooltip
          content={(props) => (
            <ChartTooltipContent
              {...props}
              currencyFormatter={currencyFormatter}
              tooltipStrings={tooltipStrings}
            />
          )}
          cursor={{ fill: 'rgba(148,163,184,0.1)' }}
        />
        <Legend
          wrapperStyle={{ fontSize: '0.75rem' }}
          formatter={(value) =>
            value === 'revenue'
              ? revenueLabel
              : value === 'charges'
                ? chargesLabel
                : cashflowLabel
          }
        />
        <Bar
          dataKey="revenue"
          fill="#22c55e"
          name="revenue"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="charges"
          fill="#ef4444"
          name="charges"
          radius={[0, 0, 4, 4]}
        />
        <Line
          type="monotone"
          dataKey="cashflow"
          stroke="#38bdf8"
          strokeWidth={2}
          dot={{ fill: '#0ea5e9', r: 4 }}
          name="cashflow"
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

type FormFieldProps = {
  label: string
  value: string
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
}

function FormField({ label, value, onChange }: FormFieldProps) {
  return (
    <label className="form-field">
      <span className="field-label">{label}</span>
      <input
        className="field-input"
        type="text"
        inputMode="decimal"
        value={value}
        onChange={onChange}
      />
    </label>
  )
}

function FormFieldReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div className="form-field">
      <span className="field-label">{label}</span>
      <span className="field-input field-input-readonly">{value}</span>
    </div>
  )
}

type ResultTileProps = {
  label: string
  value: string
  variant?: 'default' | 'positive' | 'negative'
}

function ResultTile({
  label,
  value,
  variant = 'default',
}: ResultTileProps) {
  return (
    <div className={`result-tile result-tile-${variant}`}>
      <span className="result-label">{label}</span>
      <span className="result-value">{value}</span>
    </div>
  )
}

type BreakdownRowProps = {
  label: string
  value: string
}

function BreakdownRow({ label, value }: BreakdownRowProps) {
  return (
    <div className="breakdown-row">
      <span className="breakdown-label">{label}</span>
      <span className="breakdown-value">{value}</span>
    </div>
  )
}

export default App
