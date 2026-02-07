import { useMemo, useRef, useState } from 'react'
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
  loanFees: string
  guaranteeFees: string
  loanDurationYears: string
  monthlyRent: string
  monthlyRecoverableCharges: string
  rentRevaluationPercent: string
  vacancyRate: string
  annualPropertyTax: string
  annualNonRecoverableCharges: string
  annualManagementPercent: string
  annualMaintenance: string
  annualInsurancePNO: string
  otherAnnualExpenses: string
  taxRegime: TaxRegime
  feesAmortizeYear1: boolean
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
  purchasePrice: '100000',
  notaryFees: '15000',
  agencyFees: '8000',
  renovationBudget: '20000',
  furnitureBudget: '5000',
  ownFunds: '40000',
  interestRate: '3.0',
  insuranceRate: '0.3',
  loanFees: '1500',
  guaranteeFees: '2000',
  loanDurationYears: '20',
  monthlyRent: '1200',
  monthlyRecoverableCharges: '50',
  rentRevaluationPercent: '0.5',
  vacancyRate: '5',
  annualPropertyTax: '1200',
  annualNonRecoverableCharges: '600',
  annualManagementPercent: '6',
  annualMaintenance: '600',
  annualInsurancePNO: '200',
  otherAnnualExpenses: '0',
  taxRegime: 'none',
  feesAmortizeYear1: true,
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
    loanFees: 'Loan application fees',
    guaranteeFees: 'Guarantee fees',
    loanDurationYears: 'Loan duration (years)',
    monthlyRent: 'Monthly rent',
    monthlyRecoverableCharges: 'Monthly recoverable charges',
    rentRevaluationPercent: 'Annual rent revaluation (%)',
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
    feesAmortizeYear1: 'Notary + agency fees deductible in year 1 (LMNP/SCI IS)',
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
    chartChargeCarryforward: 'Deficit carryforward used',
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
    mbTaxation: 'VAT taxation',
    mbTaxationDescription: 'VAT by regime (pessimistic / logical / optimistic)',
    mbVatMarge: 'VAT on margin',
    mbVatMargeHint: 'When works > margin. Deductible VAT on works/fees.',
    mbVatCharge: 'Deductible VAT (on works, agency)',
    mbVatChargeHint: 'When margin > works. Imputed against VAT on margin.',
    mbVatTotal: 'VAT on total',
    mbVatTotalHint: 'Old-to-new conversion or construction',
    mbVatSurMarge: 'VAT on margin',
    mbAResterPayer: 'Net to pay',
    mbCreditTva: 'VAT credit',
    mbFiscalResult: 'Fiscal result',
    mbFiscalResultDescription: 'Taxable profit, corporate tax and net in pocket.',
    mbTypeTva: 'VAT type',
    mbVatRegimeMarge: 'VAT on margin',
    mbVatRegimeTotal: 'VAT on total',
    mbBeneficeImposable: 'Taxable profit',
    mbImpotsSocietes: 'Corporate tax',
    mbBeneficesNets: 'Net profit',
    mbFlatTaxe: 'Flat tax',
    mbBeneficesEnPoche: 'Net in pocket',
    mbVatSurTotal: 'VAT on total',
    mbReste: 'Net',
    vatTooltipMargeLigne: 'Margin = Sale − Cost → VAT = Margin × 20%/1.20; Deductible = Works×10%/1.10 + Agency×20%/1.20; Net = VAT − Deductible',
    vatTooltipChargeLigne: 'Deductible VAT: Works × 10%/1.10 + Agency × 20%/1.20. Imputed against VAT on margin.',
    vatTooltipTotalLigne: 'VAT = Sale × 20%/1.20; Deductible = Works × 10%/1.10; Net = VAT − Deductible',
    vatTooltipMarge: 'Margin',
    vatTooltipVat: 'VAT',
    vatTooltipDeductible: 'Deductible',
    vatTooltipNet: 'Net',
    vatTooltipTravaux: 'Works',
    vatTooltipAgence: 'Agency',
    vatTooltipRevente: 'Sale',
    vatTooltipCout: 'Cost',
    tableTitle: 'Yearly detailed breakdown',
    tableYear: 'Year',
    tableCredit: 'Loan',
    tableInterest: 'Interest',
    tablePrincipal: 'Principal',
    tableCRD: 'Balance',
    tableRent: 'Rent',
    tableCharges: 'Charges',
    tableCF: 'CF',
    tableDepreciation: 'Depreciation',
    tableTaxBase: 'Tax base',
    tableTax: 'Tax',
    tableCarryforward: 'Carryforward',
    tableCashDispo: 'Cash avail.',
    tableSaleTax: 'Sale tax',
    exportData: 'Export data',
    importData: 'Import data',
    exportSuccess: 'Data exported',
    importSuccess: 'Data imported',
    importErrorInvalidJson: 'Invalid JSON format',
    importErrorInvalidFormat: 'Invalid file format. Expected simu_renta export.',
    captchaLabel: 'Security check: what is',
    captchaPlaceholder: 'Answer',
    captchaError: 'Incorrect answer',
    cancel: 'Cancel',
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
    loanFees: 'Frais de dossier',
    guaranteeFees: 'Frais de garantie',
    loanDurationYears: 'Durée du prêt (années)',
    monthlyRent: 'Loyer mensuel',
    monthlyRecoverableCharges: 'Charges récupérables mensuelles',
    rentRevaluationPercent: 'Revalorisation annuelle des loyers (%)',
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
    feesAmortizeYear1: 'Frais notaire + agence déductibles en année 1 (LMNP/SCI IS)',
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
    chartChargeCarryforward: 'Report de déficit utilisé',
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
    mbTaxation: 'Fiscalité TVA',
    mbTaxationDescription: 'TVA par régime (pessimiste / logique / optimiste)',
    mbVatMarge: 'TVA sur marge',
    mbVatMargeHint: 'Travaux > marge. TVA sur travaux et frais déductible.',
    mbVatCharge: 'TVA déductible (travaux, agence)',
    mbVatChargeHint: 'Marge > travaux. S\'impute sur la TVA sur marge.',
    mbVatTotal: 'TVA sur total',
    mbVatTotalHint: 'Ancien en neuf / construction',
    mbVatSurMarge: 'TVA sur marge',
    mbAResterPayer: 'Reste à payer',
    mbCreditTva: 'Crédit de TVA',
    mbFiscalResult: 'Résultat fiscal',
    mbFiscalResultDescription: 'Bénéfice imposable, impôts sur les sociétés et bénéfices en poche.',
    mbTypeTva: 'Type TVA',
    mbVatRegimeMarge: 'TVA sur marge',
    mbVatRegimeTotal: 'TVA sur total',
    mbBeneficeImposable: 'Bénéfice imposable',
    mbImpotsSocietes: 'Impôts sur les sociétés',
    mbBeneficesNets: 'Bénéfices nets',
    mbFlatTaxe: 'Flat taxe',
    mbBeneficesEnPoche: 'Bénéfices en poche',
    mbVatSurTotal: 'TVA sur total',
    mbReste: 'Reste',
    vatTooltipMargeLigne: 'Marge = Revente − Coût → TVA = Marge × 20%/1,20 ; Déductible = Travaux×10%/1,10 + Agence×20%/1,20 ; Reste = TVA − Déductible',
    vatTooltipChargeLigne: 'TVA déductible : Travaux × 10%/1,10 + Agence × 20%/1,20. S\'impute sur la TVA sur marge.',
    vatTooltipTotalLigne: 'TVA = Revente × 20%/1,20 ; Déductible = Travaux × 10%/1,10 ; Reste = TVA − Déductible',
    vatTooltipMarge: 'Marge',
    vatTooltipVat: 'TVA',
    vatTooltipDeductible: 'Déductible',
    vatTooltipNet: 'Reste',
    vatTooltipTravaux: 'Travaux',
    vatTooltipAgence: 'Agence',
    vatTooltipRevente: 'Revente',
    vatTooltipCout: 'Coût',
    tableTitle: 'Détail annuel',
    tableYear: 'Année',
    tableCredit: 'Crédit',
    tableInterest: 'Intérêt',
    tablePrincipal: 'Capital',
    tableCRD: 'CRD',
    tableRent: 'Loyer',
    tableCharges: 'Charges',
    tableCF: 'CF',
    tableDepreciation: 'Amortissement',
    tableTaxBase: 'Résultat',
    tableTax: 'Impôts',
    tableCarryforward: 'Report',
    tableCashDispo: 'Cash dispo',
    tableSaleTax: 'Impôt revente',
    exportData: 'Exporter les données',
    importData: 'Importer les données',
    exportSuccess: 'Données exportées',
    importSuccess: 'Données importées',
    importErrorInvalidJson: 'Format JSON invalide',
    importErrorInvalidFormat: 'Format de fichier invalide. Fichier export simu_renta attendu.',
    captchaLabel: 'Vérification : combien font',
    captchaPlaceholder: 'Réponse',
    captchaError: 'Réponse incorrecte',
    cancel: 'Annuler',
  },
} as const

const EXPORT_VERSION = 1

type ExportPayload<T> = {
  version: number
  section: 'investissement_locatif' | 'marchand_de_biens'
  exportedAt: string
  data: T
}

function exportToJson<T>(section: ExportPayload<T>['section'], data: T): void {
  const payload: ExportPayload<T> = {
    version: EXPORT_VERSION,
    section,
    exportedAt: new Date().toISOString(),
    data,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `simu_renta_${section}_${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function validateImportPayload(
  parsed: unknown,
  section: 'investissement_locatif' | 'marchand_de_biens',
): { valid: true; data: unknown } | { valid: false; error: string } {
  if (parsed === null || typeof parsed !== 'object') {
    return { valid: false, error: 'invalid_json' }
  }
  const p = parsed as Record<string, unknown>
  if (p.version !== EXPORT_VERSION) {
    return { valid: false, error: 'invalid_format' }
  }
  if (p.section !== section) {
    return { valid: false, error: 'invalid_format' }
  }
  if (!p.data || typeof p.data !== 'object') {
    return { valid: false, error: 'invalid_format' }
  }
  return { valid: true, data: p.data }
}

function validateInvestissementData(data: unknown): data is SimulationFormValues {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  const required: (keyof SimulationFormValues)[] = [
    'purchasePrice', 'notaryFees', 'agencyFees', 'renovationBudget', 'furnitureBudget',
    'ownFunds', 'interestRate', 'insuranceRate', 'loanFees', 'guaranteeFees',
    'loanDurationYears', 'monthlyRent', 'monthlyRecoverableCharges', 'rentRevaluationPercent',
    'vacancyRate', 'annualPropertyTax', 'annualNonRecoverableCharges', 'annualManagementPercent',
    'annualMaintenance', 'annualInsurancePNO', 'otherAnnualExpenses', 'taxRegime',
    'feesAmortizeYear1', 'marginalTaxRate', 'socialChargesRate', 'corporateTaxRate',
  ]
  for (const k of required) {
    if (!(k in d)) return false
  }
  if (typeof d.taxRegime !== 'string') return false
  if (typeof d.feesAmortizeYear1 !== 'boolean') return false
  return true
}

function validateMarchandData(data: unknown): data is MarchandDeBiensValues {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  if (!Array.isArray(d.apartments)) return false
  const required: (keyof MarchandDeBiensValues)[] = [
    'purchasePrice', 'agencyFees', 'renovationBudget', 'apartments',
    'apportPercent', 'ratePerYear', 'durationMonths',
  ]
  for (const k of required) {
    if (!(k in d)) return false
  }
  for (const apt of d.apartments as unknown[]) {
    if (!apt || typeof apt !== 'object') return false
    const a = apt as Record<string, unknown>
    if (!['T1','T2','T3','T4','T5'].includes(String(a.type))) return false
    if (typeof a.superficie !== 'string') return false
    if (typeof a.resalePessimistic !== 'string') return false
    if (typeof a.resaleLogic !== 'string') return false
    if (typeof a.resaleOptimistic !== 'string') return false
  }
  return true
}

function ExportImportPanel<T>(
  props: {
    section: 'investissement_locatif' | 'marchand_de_biens'
    data: T
    onImport: (data: T) => void
    validateData: (d: unknown) => d is T
    strings: Record<string, string>
  },
) {
  const { section, data, onImport, validateData, strings } = props
  const [showImportModal, setShowImportModal] = useState(false)
  const [captchaA, setCaptchaA] = useState(0)
  const [captchaB, setCaptchaB] = useState(0)
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const [captchaError, setCaptchaError] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = () => {
    exportToJson(section, data)
  }

  const openImportModal = () => {
    setShowImportModal(true)
    setCaptchaA(Math.floor(Math.random() * 9) + 1)
    setCaptchaB(Math.floor(Math.random() * 9) + 1)
    setCaptchaAnswer('')
    setCaptchaError(false)
    setImportError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const closeImportModal = () => {
    setShowImportModal(false)
  }

  const handleImport = () => {
    setCaptchaError(false)
    setImportError(null)
    const expected = captchaA + captchaB
    if (String(expected) !== captchaAnswer.trim()) {
      setCaptchaError(true)
      return
    }
    const file = fileInputRef.current?.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = reader.result as string
        const parsed = JSON.parse(text)
        const payloadResult = validateImportPayload(parsed, section)
        if (!payloadResult.valid) {
          setImportError(payloadResult.error === 'invalid_json' ? 'invalid_json' : 'invalid_format')
          return
        }
        if (!validateData(payloadResult.data)) {
          setImportError('invalid_format')
          return
        }
        onImport(payloadResult.data as T)
        closeImportModal()
      } catch {
        setImportError('invalid_json')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="export-import-panel">
      <button type="button" className="export-import-btn" onClick={handleExport}>
        {strings.exportData}
      </button>
      <button type="button" className="export-import-btn" onClick={openImportModal}>
        {strings.importData}
      </button>
      {showImportModal && (
        <div className="export-import-overlay" onClick={closeImportModal}>
          <div className="export-import-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{strings.importData}</h3>
            <div className="export-import-captcha">
              <label>
                {strings.captchaLabel} {captchaA} + {captchaB} ?
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder={strings.captchaPlaceholder}
                value={captchaAnswer}
                onChange={(e) => setCaptchaAnswer(e.target.value)}
                className={captchaError ? 'export-import-input-error' : ''}
              />
              {captchaError && (
                <span className="export-import-error">{strings.captchaError}</span>
              )}
            </div>
            <div className="export-import-file">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="export-import-file-input"
              />
            </div>
            {importError && (
              <span className="export-import-error">
                {importError === 'invalid_json' ? strings.importErrorInvalidJson : strings.importErrorInvalidFormat}
              </span>
            )}
            <div className="export-import-modal-actions">
              <button type="button" onClick={closeImportModal}>
                {strings.cancel}
              </button>
              <button type="button" className="export-import-confirm" onClick={handleImport}>
                {strings.importData}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

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
      <ExportImportPanel
        section="marchand_de_biens"
        data={values}
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
        <>
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

        <div className="mb-taxation-section">
          <h2 className="mb-taxation-title">{strings.mbTaxation}</h2>
          <p className="mb-taxation-description">{strings.mbTaxationDescription}</p>
          <MargeVatTable
            apartments={values.apartments}
            totalCostForMarge={totalCostForMarge}
            renovationBudget={Number(values.renovationBudget) || 0}
            agencyFees={Number(values.agencyFees) || 0}
            currencyFormatter={currencyFormatter}
            strings={strings}
          />
        </div>
        <div className="mb-taxation-section">
          <h2 className="mb-taxation-title">{strings.mbFiscalResult}</h2>
          <p className="mb-taxation-description">{strings.mbFiscalResultDescription}</p>
          <MbFiscalResultTable
            apartments={values.apartments}
            totalCostForMarge={totalCostForMarge}
            renovationBudget={Number(values.renovationBudget) || 0}
            agencyFees={Number(values.agencyFees) || 0}
            currencyFormatter={currencyFormatter}
            strings={strings}
          />
        </div>
        </>
      )}
    </main>
  )
}

const VAT_RATE_MARGE = 0.2
const VAT_RATE_AGENCE = 0.2
const VAT_RATE_TRAVAUX = 0.1

function computeTvaSurMarge(totalRevente: number, totalCost: number): number {
  const margeBrute = totalRevente - totalCost
  if (margeBrute <= 0) return 0
  return margeBrute * (VAT_RATE_MARGE / (1 + VAT_RATE_MARGE))
}

function computeTvaDeductible(
  renovationBudget: number,
  agencyFees: number,
): number {
  const tvaTravaux = renovationBudget * (VAT_RATE_TRAVAUX / (1 + VAT_RATE_TRAVAUX))
  const tvaAgence = agencyFees * (VAT_RATE_AGENCE / (1 + VAT_RATE_AGENCE))
  return tvaTravaux + tvaAgence
}

function computeAResterPayer(
  tvaSurMarge: number,
  tvaDeductible: number,
): number {
  return tvaSurMarge - tvaDeductible
}

function computeTvaSurTotal(totalRevente: number): number {
  return totalRevente * (VAT_RATE_MARGE / (1 + VAT_RATE_MARGE))
}

function computeResteTvaTotal(
  tvaSurTotal: number,
  tvaDeductibleTotal: number,
): number {
  return Math.max(0, tvaSurTotal - tvaDeductibleTotal)
}

function MargeVatTable({
  apartments,
  totalCostForMarge,
  renovationBudget,
  agencyFees,
  currencyFormatter,
  strings,
}: {
  apartments: ApartmentItem[]
  totalCostForMarge: number
  renovationBudget: number
  agencyFees: number
  currencyFormatter: Intl.NumberFormat
  strings: Record<string, string>
}) {
  const totalPessimistic = apartments.reduce(
    (s, a) => s + (Number(a.resalePessimistic) || 0),
    0,
  )
  const totalLogic = apartments.reduce(
    (s, a) => s + (Number(a.resaleLogic) || 0),
    0,
  )
  const totalOptimistic = apartments.reduce(
    (s, a) => s + (Number(a.resaleOptimistic) || 0),
    0,
  )

  const tvaDeductible = computeTvaDeductible(renovationBudget, agencyFees)

  const tvaSurMargePessimistic = computeTvaSurMarge(
    totalPessimistic,
    totalCostForMarge,
  )
  const tvaSurMargeLogic = computeTvaSurMarge(
    totalLogic,
    totalCostForMarge,
  )
  const tvaSurMargeOptimistic = computeTvaSurMarge(
    totalOptimistic,
    totalCostForMarge,
  )

  const aRestoPayerPessimistic = computeAResterPayer(
    tvaSurMargePessimistic,
    tvaDeductible,
  )
  const aRestoPayerLogic = computeAResterPayer(
    tvaSurMargeLogic,
    tvaDeductible,
  )
  const aRestoPayerOptimistic = computeAResterPayer(
    tvaSurMargeOptimistic,
    tvaDeductible,
  )

  const tvaSurTotalPessimistic = computeTvaSurTotal(totalPessimistic)
  const tvaSurTotalLogic = computeTvaSurTotal(totalLogic)
  const tvaSurTotalOptimistic = computeTvaSurTotal(totalOptimistic)

  const tvaDeductibleTotal = renovationBudget * (VAT_RATE_TRAVAUX / (1 + VAT_RATE_TRAVAUX))

  const restePessimistic = computeResteTvaTotal(
    tvaSurTotalPessimistic,
    tvaDeductibleTotal,
  )
  const resteLogic = computeResteTvaTotal(
    tvaSurTotalLogic,
    tvaDeductibleTotal,
  )
  const resteOptimistic = computeResteTvaTotal(
    tvaSurTotalOptimistic,
    tvaDeductibleTotal,
  )

  const formatResto = (v: number) =>
    v < 0
      ? { text: `${strings.mbCreditTva} ${currencyFormatter.format(-v)}`, isCredit: true }
      : { text: currencyFormatter.format(v), isCredit: false }

  const tvaTravaux = renovationBudget * (VAT_RATE_TRAVAUX / (1 + VAT_RATE_TRAVAUX))
  const tvaAgence = agencyFees * (VAT_RATE_AGENCE / (1 + VAT_RATE_AGENCE))

  const VatTooltip = ({
    children,
    lines,
    className,
  }: {
    children: React.ReactNode
    lines: string[]
    className?: string
  }) => (
    <div className={`mb-vat-cell-tooltip ${className ?? ''}`}>
      {children}
      <div className="mb-vat-tooltip-content">
        {lines.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="mb-taxation-table">
      <table className="mb-vat-table">
        <thead>
          <tr>
            <th></th>
            <th>{strings.mbReventePessimistic}</th>
            <th>{strings.mbReventeLogic}</th>
            <th>{strings.mbReventeOptimistic}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="mb-vat-regime-label">
              {strings.mbVatMarge}
              <span className="mb-vat-hint"> ({strings.mbVatMargeHint})</span>
            </td>
            <td className="mb-vat-cell">
              <VatTooltip
                lines={[
                  `${strings.vatTooltipMarge} = ${strings.vatTooltipRevente} − ${strings.vatTooltipCout} = ${currencyFormatter.format(totalPessimistic)} − ${currencyFormatter.format(totalCostForMarge)} = ${currencyFormatter.format(totalPessimistic - totalCostForMarge)}`,
                  `${strings.mbVatSurMarge} = ${strings.vatTooltipMarge} × 20% / 1.20 = ${currencyFormatter.format(totalPessimistic - totalCostForMarge)} × 0.1667 = ${currencyFormatter.format(tvaSurMargePessimistic)}`,
                  `${strings.vatTooltipDeductible} = ${strings.vatTooltipTravaux} (10%) + ${strings.vatTooltipAgence} (20%) = ${currencyFormatter.format(tvaTravaux)} + ${currencyFormatter.format(tvaAgence)} = ${currencyFormatter.format(tvaDeductible)}`,
                  `${strings.mbAResterPayer} = ${strings.mbVatSurMarge} − ${strings.vatTooltipDeductible} = ${currencyFormatter.format(tvaSurMargePessimistic)} − ${currencyFormatter.format(tvaDeductible)} = ${formatResto(aRestoPayerPessimistic).text}`,
                ]}
              >
                <div>{strings.mbVatSurMarge}: {currencyFormatter.format(tvaSurMargePessimistic)}</div>
                <div className={`mb-vat-resto ${formatResto(aRestoPayerPessimistic).isCredit ? 'mb-vat-credit' : ''}`}>
                  {strings.mbAResterPayer}: {formatResto(aRestoPayerPessimistic).text}
                </div>
              </VatTooltip>
            </td>
            <td className="mb-vat-cell">
              <VatTooltip
                lines={[
                  `${strings.vatTooltipMarge} = ${strings.vatTooltipRevente} − ${strings.vatTooltipCout} = ${currencyFormatter.format(totalLogic)} − ${currencyFormatter.format(totalCostForMarge)} = ${currencyFormatter.format(totalLogic - totalCostForMarge)}`,
                  `${strings.mbVatSurMarge} = ${strings.vatTooltipMarge} × 20% / 1.20 = ${currencyFormatter.format(totalLogic - totalCostForMarge)} × 0.1667 = ${currencyFormatter.format(tvaSurMargeLogic)}`,
                  `${strings.vatTooltipDeductible} = ${strings.vatTooltipTravaux} (10%) + ${strings.vatTooltipAgence} (20%) = ${currencyFormatter.format(tvaTravaux)} + ${currencyFormatter.format(tvaAgence)} = ${currencyFormatter.format(tvaDeductible)}`,
                  `${strings.mbAResterPayer} = ${strings.mbVatSurMarge} − ${strings.vatTooltipDeductible} = ${currencyFormatter.format(tvaSurMargeLogic)} − ${currencyFormatter.format(tvaDeductible)} = ${formatResto(aRestoPayerLogic).text}`,
                ]}
              >
                <div>{strings.mbVatSurMarge}: {currencyFormatter.format(tvaSurMargeLogic)}</div>
                <div className={`mb-vat-resto ${formatResto(aRestoPayerLogic).isCredit ? 'mb-vat-credit' : ''}`}>
                  {strings.mbAResterPayer}: {formatResto(aRestoPayerLogic).text}
                </div>
              </VatTooltip>
            </td>
            <td className="mb-vat-cell">
              <VatTooltip
                lines={[
                  `${strings.vatTooltipMarge} = ${strings.vatTooltipRevente} − ${strings.vatTooltipCout} = ${currencyFormatter.format(totalOptimistic)} − ${currencyFormatter.format(totalCostForMarge)} = ${currencyFormatter.format(totalOptimistic - totalCostForMarge)}`,
                  `${strings.mbVatSurMarge} = ${strings.vatTooltipMarge} × 20% / 1.20 = ${currencyFormatter.format(totalOptimistic - totalCostForMarge)} × 0.1667 = ${currencyFormatter.format(tvaSurMargeOptimistic)}`,
                  `${strings.vatTooltipDeductible} = ${strings.vatTooltipTravaux} (10%) + ${strings.vatTooltipAgence} (20%) = ${currencyFormatter.format(tvaTravaux)} + ${currencyFormatter.format(tvaAgence)} = ${currencyFormatter.format(tvaDeductible)}`,
                  `${strings.mbAResterPayer} = ${strings.mbVatSurMarge} − ${strings.vatTooltipDeductible} = ${currencyFormatter.format(tvaSurMargeOptimistic)} − ${currencyFormatter.format(tvaDeductible)} = ${formatResto(aRestoPayerOptimistic).text}`,
                ]}
              >
                <div>{strings.mbVatSurMarge}: {currencyFormatter.format(tvaSurMargeOptimistic)}</div>
                <div className={`mb-vat-resto ${formatResto(aRestoPayerOptimistic).isCredit ? 'mb-vat-credit' : ''}`}>
                  {strings.mbAResterPayer}: {formatResto(aRestoPayerOptimistic).text}
                </div>
              </VatTooltip>
            </td>
          </tr>
          <tr>
            <td className="mb-vat-regime-label">
              {strings.mbVatCharge}
              <span className="mb-vat-hint"> ({strings.mbVatChargeHint})</span>
            </td>
            <td colSpan={3} className="mb-vat-cell mb-vat-cell-same">
              <VatTooltip
                lines={[
                  `TVA ${strings.vatTooltipTravaux} = ${currencyFormatter.format(renovationBudget)} × 10% / 1.10 = ${currencyFormatter.format(tvaTravaux)}`,
                  `TVA ${strings.vatTooltipAgence} = ${currencyFormatter.format(agencyFees)} × 20% / 1.20 = ${currencyFormatter.format(tvaAgence)}`,
                  `${strings.vatTooltipDeductible} = ${currencyFormatter.format(tvaTravaux)} + ${currencyFormatter.format(tvaAgence)} = ${currencyFormatter.format(tvaDeductible)}`,
                ]}
              >
                {currencyFormatter.format(tvaDeductible)}
              </VatTooltip>
            </td>
          </tr>
          <tr>
            <td className="mb-vat-regime-label">
              {strings.mbVatTotal}
              <span className="mb-vat-hint"> ({strings.mbVatTotalHint})</span>
            </td>
            <td className="mb-vat-cell">
              <VatTooltip
                lines={[
                  `${strings.mbVatSurTotal} = ${strings.vatTooltipRevente} × 20% / 1.20 = ${currencyFormatter.format(totalPessimistic)} × 0.1667 = ${currencyFormatter.format(tvaSurTotalPessimistic)}`,
                  `${strings.vatTooltipDeductible} = ${strings.vatTooltipTravaux} × 10% / 1.10 = ${currencyFormatter.format(renovationBudget)} × 0.0909 = ${currencyFormatter.format(tvaDeductibleTotal)}`,
                  `${strings.mbReste} = ${strings.mbVatSurTotal} − ${strings.vatTooltipDeductible} = ${currencyFormatter.format(tvaSurTotalPessimistic)} − ${currencyFormatter.format(tvaDeductibleTotal)} = ${currencyFormatter.format(restePessimistic)}`,
                ]}
              >
                {currencyFormatter.format(tvaSurTotalPessimistic)} → {strings.mbReste} {currencyFormatter.format(restePessimistic)}
              </VatTooltip>
            </td>
            <td className="mb-vat-cell">
              <VatTooltip
                lines={[
                  `${strings.mbVatSurTotal} = ${strings.vatTooltipRevente} × 20% / 1.20 = ${currencyFormatter.format(totalLogic)} × 0.1667 = ${currencyFormatter.format(tvaSurTotalLogic)}`,
                  `${strings.vatTooltipDeductible} = ${strings.vatTooltipTravaux} × 10% / 1.10 = ${currencyFormatter.format(renovationBudget)} × 0.0909 = ${currencyFormatter.format(tvaDeductibleTotal)}`,
                  `${strings.mbReste} = ${strings.mbVatSurTotal} − ${strings.vatTooltipDeductible} = ${currencyFormatter.format(tvaSurTotalLogic)} − ${currencyFormatter.format(tvaDeductibleTotal)} = ${currencyFormatter.format(resteLogic)}`,
                ]}
              >
                {currencyFormatter.format(tvaSurTotalLogic)} → {strings.mbReste} {currencyFormatter.format(resteLogic)}
              </VatTooltip>
            </td>
            <td className="mb-vat-cell">
              <VatTooltip
                lines={[
                  `${strings.mbVatSurTotal} = ${strings.vatTooltipRevente} × 20% / 1.20 = ${currencyFormatter.format(totalOptimistic)} × 0.1667 = ${currencyFormatter.format(tvaSurTotalOptimistic)}`,
                  `${strings.vatTooltipDeductible} = ${strings.vatTooltipTravaux} × 10% / 1.10 = ${currencyFormatter.format(renovationBudget)} × 0.0909 = ${currencyFormatter.format(tvaDeductibleTotal)}`,
                  `${strings.mbReste} = ${strings.mbVatSurTotal} − ${strings.vatTooltipDeductible} = ${currencyFormatter.format(tvaSurTotalOptimistic)} − ${currencyFormatter.format(tvaDeductibleTotal)} = ${currencyFormatter.format(resteOptimistic)}`,
                ]}
              >
                {currencyFormatter.format(tvaSurTotalOptimistic)} → {strings.mbReste} {currencyFormatter.format(resteOptimistic)}
              </VatTooltip>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

const MB_IS_RATE = 0.25
const MB_FLAT_TAX_RATE = 0.30

type VatRegimeForFiscal = 'marge' | 'total'

function MbFiscalResultTable({
  apartments,
  totalCostForMarge,
  renovationBudget,
  agencyFees,
  currencyFormatter,
  strings,
}: {
  apartments: ApartmentItem[]
  totalCostForMarge: number
  renovationBudget: number
  agencyFees: number
  currencyFormatter: Intl.NumberFormat
  strings: Record<string, string>
}) {
  const [vatRegime, setVatRegime] = useState<VatRegimeForFiscal>('marge')

  const totalPessimistic = apartments.reduce(
    (s, a) => s + (Number(a.resalePessimistic) || 0),
    0,
  )
  const totalLogic = apartments.reduce(
    (s, a) => s + (Number(a.resaleLogic) || 0),
    0,
  )
  const totalOptimistic = apartments.reduce(
    (s, a) => s + (Number(a.resaleOptimistic) || 0),
    0,
  )

  const tvaDeductible = computeTvaDeductible(renovationBudget, agencyFees)
  const tvaSurMargeP = computeTvaSurMarge(totalPessimistic, totalCostForMarge)
  const tvaSurMargeL = computeTvaSurMarge(totalLogic, totalCostForMarge)
  const tvaSurMargeO = computeTvaSurMarge(totalOptimistic, totalCostForMarge)
  const aRestoPayerP = computeAResterPayer(tvaSurMargeP, tvaDeductible)
  const aRestoPayerL = computeAResterPayer(tvaSurMargeL, tvaDeductible)
  const aRestoPayerO = computeAResterPayer(tvaSurMargeO, tvaDeductible)

  const tvaDeductibleTotal = renovationBudget * (VAT_RATE_TRAVAUX / (1 + VAT_RATE_TRAVAUX))
  const tvaSurTotalP = computeTvaSurTotal(totalPessimistic)
  const tvaSurTotalL = computeTvaSurTotal(totalLogic)
  const tvaSurTotalO = computeTvaSurTotal(totalOptimistic)
  const resteP = computeResteTvaTotal(tvaSurTotalP, tvaDeductibleTotal)
  const resteL = computeResteTvaTotal(tvaSurTotalL, tvaDeductibleTotal)
  const resteO = computeResteTvaTotal(tvaSurTotalO, tvaDeductibleTotal)

  const margeP = totalPessimistic - totalCostForMarge
  const margeL = totalLogic - totalCostForMarge
  const margeO = totalOptimistic - totalCostForMarge

  const beneficeImposableP =
    vatRegime === 'marge'
      ? Math.max(0, margeP - aRestoPayerP)
      : Math.max(0, totalPessimistic - totalCostForMarge - resteP)
  const beneficeImposableL =
    vatRegime === 'marge'
      ? Math.max(0, margeL - aRestoPayerL)
      : Math.max(0, totalLogic - totalCostForMarge - resteL)
  const beneficeImposableO =
    vatRegime === 'marge'
      ? Math.max(0, margeO - aRestoPayerO)
      : Math.max(0, totalOptimistic - totalCostForMarge - resteO)

  const impotsSocietesP = beneficeImposableP * MB_IS_RATE
  const impotsSocietesL = beneficeImposableL * MB_IS_RATE
  const impotsSocietesO = beneficeImposableO * MB_IS_RATE

  const beneficesNetsP = beneficeImposableP - impotsSocietesP
  const beneficesNetsL = beneficeImposableL - impotsSocietesL
  const beneficesNetsO = beneficeImposableO - impotsSocietesO

  const flatTaxeP = beneficeImposableP * MB_FLAT_TAX_RATE
  const flatTaxeL = beneficeImposableL * MB_FLAT_TAX_RATE
  const flatTaxeO = beneficeImposableO * MB_FLAT_TAX_RATE

  const beneficesEnPocheP = beneficeImposableP - flatTaxeP
  const beneficesEnPocheL = beneficeImposableL - flatTaxeL
  const beneficesEnPocheO = beneficeImposableO - flatTaxeO

  const FiscalTooltip = ({
    children,
    lines,
  }: {
    children: React.ReactNode
    lines: string[]
  }) => (
    <div className="mb-vat-cell-tooltip">
      {children}
      <div className="mb-vat-tooltip-content">
        {lines.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    </div>
  )

  const linesBeneficeP =
    vatRegime === 'marge'
      ? [
          `${strings.vatTooltipMarge} = ${strings.vatTooltipRevente} − ${strings.vatTooltipCout} = ${currencyFormatter.format(totalPessimistic)} − ${currencyFormatter.format(totalCostForMarge)} = ${currencyFormatter.format(margeP)}`,
          `${strings.mbBeneficeImposable} = ${strings.vatTooltipMarge} − ${strings.mbAResterPayer} = ${currencyFormatter.format(margeP)} − ${currencyFormatter.format(aRestoPayerP)} = ${currencyFormatter.format(beneficeImposableP)}`,
        ]
      : [
          `${strings.mbVatSurTotal} = ${strings.vatTooltipRevente} × 20% / 1.20 = ${currencyFormatter.format(totalPessimistic)} × 0.1667 = ${currencyFormatter.format(tvaSurTotalP)}`,
          `${strings.vatTooltipDeductible} = ${strings.vatTooltipTravaux} × 10% / 1.10 = ${currencyFormatter.format(renovationBudget)} × 0.0909 = ${currencyFormatter.format(tvaDeductibleTotal)}`,
          `${strings.mbReste} = ${strings.mbVatSurTotal} − ${strings.vatTooltipDeductible} = ${currencyFormatter.format(tvaSurTotalP)} − ${currencyFormatter.format(tvaDeductibleTotal)} = ${currencyFormatter.format(resteP)}`,
          `${strings.mbBeneficeImposable} = ${strings.vatTooltipRevente} − ${strings.vatTooltipCout} − ${strings.mbReste} = ${currencyFormatter.format(totalPessimistic)} − ${currencyFormatter.format(totalCostForMarge)} − ${currencyFormatter.format(resteP)} = ${currencyFormatter.format(beneficeImposableP)}`,
        ]
  const linesBeneficeL =
    vatRegime === 'marge'
      ? [
          `${strings.vatTooltipMarge} = ${currencyFormatter.format(totalLogic)} − ${currencyFormatter.format(totalCostForMarge)} = ${currencyFormatter.format(margeL)}`,
          `${strings.mbBeneficeImposable} = ${currencyFormatter.format(margeL)} − ${currencyFormatter.format(aRestoPayerL)} = ${currencyFormatter.format(beneficeImposableL)}`,
        ]
      : [
          `${strings.mbVatSurTotal} = ${currencyFormatter.format(totalLogic)} × 0.1667 = ${currencyFormatter.format(tvaSurTotalL)}`,
          `${strings.mbReste} = ${currencyFormatter.format(tvaSurTotalL)} − ${currencyFormatter.format(tvaDeductibleTotal)} = ${currencyFormatter.format(resteL)}`,
          `${strings.mbBeneficeImposable} = ${currencyFormatter.format(totalLogic)} − ${currencyFormatter.format(totalCostForMarge)} − ${currencyFormatter.format(resteL)} = ${currencyFormatter.format(beneficeImposableL)}`,
        ]
  const linesBeneficeO =
    vatRegime === 'marge'
      ? [
          `${strings.vatTooltipMarge} = ${currencyFormatter.format(totalOptimistic)} − ${currencyFormatter.format(totalCostForMarge)} = ${currencyFormatter.format(margeO)}`,
          `${strings.mbBeneficeImposable} = ${currencyFormatter.format(margeO)} − ${currencyFormatter.format(aRestoPayerO)} = ${currencyFormatter.format(beneficeImposableO)}`,
        ]
      : [
          `${strings.mbVatSurTotal} = ${currencyFormatter.format(totalOptimistic)} × 0.1667 = ${currencyFormatter.format(tvaSurTotalO)}`,
          `${strings.mbReste} = ${currencyFormatter.format(tvaSurTotalO)} − ${currencyFormatter.format(tvaDeductibleTotal)} = ${currencyFormatter.format(resteO)}`,
          `${strings.mbBeneficeImposable} = ${currencyFormatter.format(totalOptimistic)} − ${currencyFormatter.format(totalCostForMarge)} − ${currencyFormatter.format(resteO)} = ${currencyFormatter.format(beneficeImposableO)}`,
        ]

  return (
    <div className="mb-taxation-table mb-fiscal-result-table">
      <div className="mb-fiscal-regime-selector">
        <label className="mb-fiscal-regime-label">{strings.mbTypeTva}</label>
        <div className="mb-fiscal-regime-options">
          <label className="mb-fiscal-regime-option">
            <input
              type="radio"
              name="vatRegime"
              checked={vatRegime === 'marge'}
              onChange={() => setVatRegime('marge')}
            />
            <span>{strings.mbVatRegimeMarge}</span>
          </label>
          <label className="mb-fiscal-regime-option">
            <input
              type="radio"
              name="vatRegime"
              checked={vatRegime === 'total'}
              onChange={() => setVatRegime('total')}
            />
            <span>{strings.mbVatRegimeTotal}</span>
          </label>
        </div>
      </div>
      <table className="mb-vat-table">
        <thead>
          <tr>
            <th></th>
            <th>{strings.mbReventePessimistic}</th>
            <th>{strings.mbReventeLogic}</th>
            <th>{strings.mbReventeOptimistic}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="mb-vat-regime-label">{strings.mbBeneficeImposable}</td>
            <td className="mb-vat-cell">
              <FiscalTooltip lines={linesBeneficeP}>{currencyFormatter.format(beneficeImposableP)}</FiscalTooltip>
            </td>
            <td className="mb-vat-cell">
              <FiscalTooltip lines={linesBeneficeL}>{currencyFormatter.format(beneficeImposableL)}</FiscalTooltip>
            </td>
            <td className="mb-vat-cell">
              <FiscalTooltip lines={linesBeneficeO}>{currencyFormatter.format(beneficeImposableO)}</FiscalTooltip>
            </td>
          </tr>
          <tr>
            <td className="mb-vat-regime-label">{strings.mbImpotsSocietes}</td>
            <td className="mb-vat-cell">
              <FiscalTooltip
                lines={[`${strings.mbImpotsSocietes} = ${strings.mbBeneficeImposable} × 25% = ${currencyFormatter.format(beneficeImposableP)} × 0.25 = ${currencyFormatter.format(impotsSocietesP)}`]}
              >
                {currencyFormatter.format(impotsSocietesP)}
              </FiscalTooltip>
            </td>
            <td className="mb-vat-cell">
              <FiscalTooltip
                lines={[`${strings.mbImpotsSocietes} = ${currencyFormatter.format(beneficeImposableL)} × 0.25 = ${currencyFormatter.format(impotsSocietesL)}`]}
              >
                {currencyFormatter.format(impotsSocietesL)}
              </FiscalTooltip>
            </td>
            <td className="mb-vat-cell">
              <FiscalTooltip
                lines={[`${strings.mbImpotsSocietes} = ${currencyFormatter.format(beneficeImposableO)} × 0.25 = ${currencyFormatter.format(impotsSocietesO)}`]}
              >
                {currencyFormatter.format(impotsSocietesO)}
              </FiscalTooltip>
            </td>
          </tr>
          <tr>
            <td className="mb-vat-regime-label">{strings.mbBeneficesNets}</td>
            <td className="mb-vat-cell">
              <FiscalTooltip
                lines={[`${strings.mbBeneficesNets} = ${strings.mbBeneficeImposable} − ${strings.mbImpotsSocietes} = ${currencyFormatter.format(beneficeImposableP)} − ${currencyFormatter.format(impotsSocietesP)} = ${currencyFormatter.format(beneficesNetsP)}`]}
              >
                {currencyFormatter.format(beneficesNetsP)}
              </FiscalTooltip>
            </td>
            <td className="mb-vat-cell">
              <FiscalTooltip
                lines={[`${strings.mbBeneficesNets} = ${currencyFormatter.format(beneficeImposableL)} − ${currencyFormatter.format(impotsSocietesL)} = ${currencyFormatter.format(beneficesNetsL)}`]}
              >
                {currencyFormatter.format(beneficesNetsL)}
              </FiscalTooltip>
            </td>
            <td className="mb-vat-cell">
              <FiscalTooltip
                lines={[`${strings.mbBeneficesNets} = ${currencyFormatter.format(beneficeImposableO)} − ${currencyFormatter.format(impotsSocietesO)} = ${currencyFormatter.format(beneficesNetsO)}`]}
              >
                {currencyFormatter.format(beneficesNetsO)}
              </FiscalTooltip>
            </td>
          </tr>
          <tr>
            <td className="mb-vat-regime-label">{strings.mbFlatTaxe}</td>
            <td className="mb-vat-cell">
              <FiscalTooltip
                lines={[`${strings.mbFlatTaxe} = ${strings.mbBeneficeImposable} × 30% = ${currencyFormatter.format(beneficeImposableP)} × 0.30 = ${currencyFormatter.format(flatTaxeP)}`]}
              >
                {currencyFormatter.format(flatTaxeP)}
              </FiscalTooltip>
            </td>
            <td className="mb-vat-cell">
              <FiscalTooltip
                lines={[`${strings.mbFlatTaxe} = ${currencyFormatter.format(beneficeImposableL)} × 0.30 = ${currencyFormatter.format(flatTaxeL)}`]}
              >
                {currencyFormatter.format(flatTaxeL)}
              </FiscalTooltip>
            </td>
            <td className="mb-vat-cell">
              <FiscalTooltip
                lines={[`${strings.mbFlatTaxe} = ${currencyFormatter.format(beneficeImposableO)} × 0.30 = ${currencyFormatter.format(flatTaxeO)}`]}
              >
                {currencyFormatter.format(flatTaxeO)}
              </FiscalTooltip>
            </td>
          </tr>
          <tr>
            <td className="mb-vat-regime-label">{strings.mbBeneficesEnPoche}</td>
            <td className="mb-vat-cell">
              <FiscalTooltip
                lines={[`${strings.mbBeneficesEnPoche} = ${strings.mbBeneficeImposable} − ${strings.mbFlatTaxe} = ${currencyFormatter.format(beneficeImposableP)} − ${currencyFormatter.format(flatTaxeP)} = ${currencyFormatter.format(beneficesEnPocheP)}`]}
              >
                {currencyFormatter.format(beneficesEnPocheP)}
              </FiscalTooltip>
            </td>
            <td className="mb-vat-cell">
              <FiscalTooltip
                lines={[`${strings.mbBeneficesEnPoche} = ${currencyFormatter.format(beneficeImposableL)} − ${currencyFormatter.format(flatTaxeL)} = ${currencyFormatter.format(beneficesEnPocheL)}`]}
              >
                {currencyFormatter.format(beneficesEnPocheL)}
              </FiscalTooltip>
            </td>
            <td className="mb-vat-cell">
              <FiscalTooltip
                lines={[`${strings.mbBeneficesEnPoche} = ${currencyFormatter.format(beneficeImposableO)} − ${currencyFormatter.format(flatTaxeO)} = ${currencyFormatter.format(beneficesEnPocheO)}`]}
              >
                {currencyFormatter.format(beneficesEnPocheO)}
              </FiscalTooltip>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
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

function computeDepreciationForYear(
  purchasePrice: number,
  notaryFees: number,
  agencyFees: number,
  renovationBudget: number,
  furnitureBudget: number,
  taxRegime: TaxRegime,
  yearIndex: number,
  feesAmortizeYear1: boolean,
): { building: number; furniture: number; acquisitionFees: number; total: number } {
  const buildingBaseFull =
    (purchasePrice + notaryFees + agencyFees + renovationBudget) *
    (1 - LAND_PERCENT)
  const buildingBaseWithoutFees =
    (purchasePrice + renovationBudget) * (1 - LAND_PERCENT)

  let building = 0
  let furniture = 0
  let acquisitionFees = 0

  const useFeesYear1 =
    feesAmortizeYear1 && (taxRegime === 'lmnp_reel' || taxRegime === 'sci_is')

  switch (taxRegime) {
    case 'lmnp_reel':
    case 'sci_is':
      building = useFeesYear1
        ? buildingBaseWithoutFees * BUILDING_DEPRECIATION_RATE
        : buildingBaseFull * BUILDING_DEPRECIATION_RATE
      furniture = furnitureBudget * FURNITURE_DEPRECIATION_RATE
      if (useFeesYear1 && yearIndex === 0) {
        acquisitionFees = notaryFees + agencyFees
      }
      break
    case 'reel_foncier':
    case 'sci_ir':
      building = buildingBaseFull * BUILDING_DEPRECIATION_RATE
      break
    case 'bailleur_prive':
      building = buildingBaseFull * BAILLEUR_PRIVE_BUILDING_RATE
      break
    default:
      break
  }

  return {
    building,
    furniture,
    acquisitionFees,
    total: building + furniture + acquisitionFees,
  }
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

  const loanFees = toNumber(values.loanFees)
  const guaranteeFees = toNumber(values.guaranteeFees)

  const totalCost =
    purchasePrice +
    notaryFees +
    agencyFees +
    renovationBudget +
    furnitureBudget +
    loanFees +
    guaranteeFees

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

  const feesAmortizeYear1 = values.feesAmortizeYear1
  const depreciation = computeDepreciationForYear(
    purchasePrice,
    notaryFees,
    agencyFees,
    renovationBudget,
    furnitureBudget,
    taxRegime,
    0,
    feesAmortizeYear1,
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
  carryforwardUsed: number
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
  const loanFees = toNumber(values.loanFees)
  const guaranteeFees = toNumber(values.guaranteeFees)

  const totalCost =
    purchasePrice +
    notaryFees +
    agencyFees +
    renovationBudget +
    furnitureBudget +
    loanFees +
    guaranteeFees
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
  const annualRentEffectiveBase = effectiveMonthlyIncome * 12
  const rentRevaluationRate = toNumber(values.rentRevaluationPercent) / 100

  const annualLoanAndInsurance = (monthlyLoan + monthlyInsurance) * 12
  const tmiPlusSocial = marginalTaxRate + socialChargesRate
  const feesAmortizeYear1 = values.feesAmortizeYear1

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
  let deficitCarryforward = 0

  for (let y = 0; y < loanDurationYears; y++) {
    const interestThisYear = interestPerYear[y] ?? 0
    const revenue =
      annualRentEffectiveBase * Math.pow(1 + rentRevaluationRate, y)
    const annualManagementY = revenue * annualManagementPercent
    const annualChargesY =
      annualPropertyTax +
      annualNonRecoverableCharges +
      annualManagementY +
      annualMaintenance +
      annualInsurancePNO +
      otherAnnualExpenses
    const expenses = annualChargesY + annualLoanAndInsurance

    const depreciationY = computeDepreciationForYear(
      purchasePrice,
      notaryFees,
      agencyFees,
      renovationBudget,
      furnitureBudget,
      taxRegime,
      y,
      feesAmortizeYear1,
    )

    let base = 0
    let taxable = 0
    let carryforwardUsed = 0

    switch (taxRegime) {
      case 'micro_foncier':
        base = revenue * 0.7
        taxable = base
        break
      case 'reel_foncier':
      case 'lmnp_reel':
      case 'sci_ir':
        base =
          revenue -
          annualChargesY -
          interestThisYear -
          depreciationY.total
        if (base < 0) {
          deficitCarryforward += -base
          taxable = 0
        } else {
          carryforwardUsed = Math.min(base, deficitCarryforward)
          taxable = Math.max(0, base - deficitCarryforward)
          deficitCarryforward = Math.max(0, deficitCarryforward - base)
        }
        break
      case 'lmnp_micro_bic':
        base = revenue * 0.5
        taxable = base
        break
      case 'sci_is':
        base =
          revenue -
          annualChargesY -
          annualLoanAndInsurance -
          depreciationY.total
        if (base < 0) {
          deficitCarryforward += -base
          taxable = 0
        } else {
          carryforwardUsed = Math.min(base, deficitCarryforward)
          taxable = Math.max(0, base - deficitCarryforward)
          deficitCarryforward = Math.max(0, deficitCarryforward - base)
        }
        break
      case 'bailleur_prive': {
        base =
          revenue -
          annualChargesY -
          interestThisYear -
          depreciationY.total
        if (base < 0) {
          deficitCarryforward += -base
          taxable = 0
        } else {
          carryforwardUsed = Math.min(base, deficitCarryforward)
          taxable = Math.max(0, base - deficitCarryforward)
          deficitCarryforward = Math.max(0, deficitCarryforward - base)
        }
        break
      }
      default:
        break
    }

    let tax = 0
    switch (taxRegime) {
      case 'micro_foncier':
        tax = Math.max(taxable * tmiPlusSocial, 0)
        break
      case 'reel_foncier':
      case 'lmnp_reel':
      case 'sci_ir':
        tax = taxable * tmiPlusSocial
        break
      case 'lmnp_micro_bic':
        tax = Math.max(taxable * tmiPlusSocial, 0)
        break
      case 'sci_is':
        tax = taxable * corporateTaxRate
        break
      case 'bailleur_prive': {
        const taxWithDepreciation = taxable * tmiPlusSocial
        const taxWithoutDepreciation = Math.max(
          (revenue - annualChargesY - interestThisYear) * tmiPlusSocial,
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
        management: annualManagementY,
        maintenance: annualMaintenance,
        insurance: annualInsurancePNO,
        other: otherAnnualExpenses,
        loanAndInsurance: annualLoanAndInsurance,
        depreciation: depreciationY.total,
        carryforwardUsed,
        tax,
      },
    })
  }

  return data
}

type YearlyTableRow = {
  year: number
  credit: number
  interest: number
  principal: number
  crd: number
  rent: number
  charges: number
  cfBeforeTax: number
  depreciation: number
  taxBase: number
  tax: number
  carryforwardUsed: number
  cashDispo: number
  saleTax: number
}

function computeYearlyTableData(
  values: SimulationFormValues,
): YearlyTableRow[] {
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
  const rentRevaluationRate = toNumber(values.rentRevaluationPercent) / 100
  const feesAmortizeYear1 = values.feesAmortizeYear1
  const loanFees = toNumber(values.loanFees)
  const guaranteeFees = toNumber(values.guaranteeFees)

  const totalCost =
    purchasePrice +
    notaryFees +
    agencyFees +
    renovationBudget +
    furnitureBudget +
    loanFees +
    guaranteeFees
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
  const annualRentEffectiveBase = effectiveMonthlyIncome * 12
  const tmiPlusSocial = marginalTaxRate + socialChargesRate

  const interestPerYear: number[] = []
  const principalPerYear: number[] = []
  const balanceEndOfYear: number[] = []

  if (loanAmount > 0 && monthlyRate > 0) {
    let balance = loanAmount
    for (let m = 0; m < months; m++) {
      const interest = balance * monthlyRate
      const principal = monthlyLoan - interest
      balance -= principal
      const yearIndex = Math.floor(m / 12)
      if (!interestPerYear[yearIndex]) {
        interestPerYear[yearIndex] = 0
        principalPerYear[yearIndex] = 0
      }
      interestPerYear[yearIndex] += interest
      principalPerYear[yearIndex] += principal
      if (m % 12 === 11) {
        balanceEndOfYear[yearIndex] = balance
      }
    }
  }

  const data: YearlyTableRow[] = []
  let deficitCarryforward = 0
  let totalDepreciationTaken = 0

  for (let y = 0; y < loanDurationYears; y++) {
    const interestThisYear = interestPerYear[y] ?? 0
    const principalThisYear = principalPerYear[y] ?? 0
    const creditThisYear = (monthlyLoan + monthlyInsurance) * 12
    const crd = balanceEndOfYear[y] ?? 0

    const revenue =
      annualRentEffectiveBase * Math.pow(1 + rentRevaluationRate, y)
    const annualManagementY = revenue * annualManagementPercent
    const annualChargesY =
      annualPropertyTax +
      annualNonRecoverableCharges +
      annualManagementY +
      annualMaintenance +
      annualInsurancePNO +
      otherAnnualExpenses

    const depreciationY = computeDepreciationForYear(
      purchasePrice,
      notaryFees,
      agencyFees,
      renovationBudget,
      furnitureBudget,
      taxRegime,
      y,
      feesAmortizeYear1,
    )
    totalDepreciationTaken += depreciationY.total

    const cfBeforeTax = revenue - annualChargesY - creditThisYear

    let base = 0
    let taxable = 0
    let carryforwardUsed = 0

    switch (taxRegime) {
      case 'micro_foncier':
        base = revenue * 0.7
        taxable = base
        break
      case 'reel_foncier':
      case 'lmnp_reel':
      case 'sci_ir':
        base =
          revenue -
          annualChargesY -
          interestThisYear -
          depreciationY.total
        if (base < 0) {
          deficitCarryforward += -base
          taxable = 0
        } else {
          carryforwardUsed = Math.min(base, deficitCarryforward)
          taxable = Math.max(0, base - deficitCarryforward)
          deficitCarryforward = Math.max(0, deficitCarryforward - base)
        }
        break
      case 'lmnp_micro_bic':
        base = revenue * 0.5
        taxable = base
        break
      case 'sci_is':
        base =
          revenue -
          annualChargesY -
          creditThisYear -
          depreciationY.total
        if (base < 0) {
          deficitCarryforward += -base
          taxable = 0
        } else {
          carryforwardUsed = Math.min(base, deficitCarryforward)
          taxable = Math.max(0, base - deficitCarryforward)
          deficitCarryforward = Math.max(0, deficitCarryforward - base)
        }
        break
      case 'bailleur_prive': {
        base =
          revenue -
          annualChargesY -
          interestThisYear -
          depreciationY.total
        if (base < 0) {
          deficitCarryforward += -base
          taxable = 0
        } else {
          carryforwardUsed = Math.min(base, deficitCarryforward)
          taxable = Math.max(0, base - deficitCarryforward)
          deficitCarryforward = Math.max(0, deficitCarryforward - base)
        }
        break
      }
      default:
        break
    }

    let tax = 0
    switch (taxRegime) {
      case 'micro_foncier':
        tax = Math.max(taxable * tmiPlusSocial, 0)
        break
      case 'reel_foncier':
      case 'lmnp_reel':
      case 'sci_ir':
        tax = taxable * tmiPlusSocial
        break
      case 'lmnp_micro_bic':
        tax = Math.max(taxable * tmiPlusSocial, 0)
        break
      case 'sci_is':
        tax = taxable * corporateTaxRate
        break
      case 'bailleur_prive': {
        const taxWithDepreciation = taxable * tmiPlusSocial
        const taxWithoutDepreciation = Math.max(
          (revenue - annualChargesY - interestThisYear) * tmiPlusSocial,
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

    const cashDispo = cfBeforeTax - tax

    let saleTax = 0
    if (taxRegime === 'sci_is' && y === loanDurationYears - 1) {
      const acquisitionCost = totalCost
      const estimatedSalePrice =
        purchasePrice * Math.pow(1 + rentRevaluationRate, loanDurationYears)
      const vnc = acquisitionCost - totalDepreciationTaken
      const taxableGain = Math.max(0, estimatedSalePrice - vnc)
      saleTax = taxableGain * corporateTaxRate
    }

    data.push({
      year: y + 1,
      credit: creditThisYear,
      interest: interestThisYear,
      principal: principalThisYear,
      crd,
      rent: revenue,
      charges: annualChargesY,
      cfBeforeTax,
      depreciation: depreciationY.total,
      taxBase: base,
      tax,
      carryforwardUsed,
      cashDispo,
      saleTax,
    })
  }

  return data
}

function App() {
  const [locale, setLocale] = useState<Locale>('fr')
  const [values, setValues] = useState<SimulationFormValues>(INITIAL_VALUES)

  const strings = STRINGS[locale]

  const results = useMemo(() => calculateResults(values), [values])
  const chartData = useMemo(() => computeYearlyChartData(values), [values])
  const tableData = useMemo(() => computeYearlyTableData(values), [values])

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

  const handleFeesAmortizeYear1Change = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setValues((prev) => ({
      ...prev,
      feesAmortizeYear1: event.target.checked,
    }))
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
          <ExportImportPanel
            section="investissement_locatif"
            data={values}
            onImport={(data) => setValues(data)}
            validateData={validateInvestissementData}
            strings={strings}
          />
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
                <FormField
                  label={strings.loanFees}
                  value={values.loanFees}
                  onChange={handleChange('loanFees')}
                />
                <FormField
                  label={strings.guaranteeFees}
                  value={values.guaranteeFees}
                  onChange={handleChange('guaranteeFees')}
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
                  label={strings.rentRevaluationPercent}
                  value={values.rentRevaluationPercent}
                  onChange={handleChange('rentRevaluationPercent')}
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
                {(values.taxRegime === 'lmnp_reel' ||
                  values.taxRegime === 'sci_is') && (
                  <label className="form-field form-field-checkbox">
                    <input
                      type="checkbox"
                      checked={values.feesAmortizeYear1}
                      onChange={handleFeesAmortizeYear1Change}
                    />
                    <span>{strings.feesAmortizeYear1}</span>
                  </label>
                )}
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
              carryforward: strings.chartChargeCarryforward,
              tax: strings.chartChargeTax,
            }}
          />
        </div>
      </section>

      {values.taxRegime !== 'none' && (
        <section className="yearly-table-section">
          <h2 className="yearly-table-title">{strings.tableTitle}</h2>
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
                  <th>{strings.tableCashDispo}</th>
                  <th>{strings.tableSaleTax}</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((row) => (
                  <tr key={row.year}>
                    <td>{row.year}</td>
                    <td className="yearly-table-num">
                      {currencyFormatter.format(row.credit)}
                    </td>
                    <td className="yearly-table-num">
                      {currencyFormatter.format(row.interest)}
                    </td>
                    <td className="yearly-table-num">
                      {currencyFormatter.format(row.principal)}
                    </td>
                    <td className="yearly-table-num">
                      {currencyFormatter.format(row.crd)}
                    </td>
                    <td className="yearly-table-num">
                      {currencyFormatter.format(row.rent)}
                    </td>
                    <td className="yearly-table-num">
                      {currencyFormatter.format(row.charges)}
                    </td>
                    <td className="yearly-table-num">
                      {currencyFormatter.format(row.cfBeforeTax)}
                    </td>
                    <td className="yearly-table-num">
                      {currencyFormatter.format(row.depreciation)}
                    </td>
                    <td className="yearly-table-num">
                      {currencyFormatter.format(row.taxBase)}
                    </td>
                    <td className="yearly-table-num">
                      {currencyFormatter.format(row.tax)}
                    </td>
                    <td className="yearly-table-num">
                      {currencyFormatter.format(row.carryforwardUsed)}
                    </td>
                    <td className="yearly-table-num">
                      {currencyFormatter.format(row.cashDispo)}
                    </td>
                    <td className="yearly-table-num">
                      {currencyFormatter.format(row.saleTax)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
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
  carryforward: string
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
          {b.carryforwardUsed > 0 && (
            <div className="chart-tooltip-row chart-tooltip-carryforward">
              <span>{tooltipStrings.carryforward}</span>
              <span>{currencyFormatter.format(b.carryforwardUsed)}</span>
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
