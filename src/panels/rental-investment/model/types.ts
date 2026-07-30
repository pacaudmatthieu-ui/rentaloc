import type { TaxRegime } from '../../../shared/types'

export type SimulationFormValues = {
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
  loanDurationMonths: string
  deferralMonths: string
  deferralType: 'none' | 'partial' | 'total'
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
  /** Durée de détention en mois (projet de revente) */
  resaleHoldingMonths: string
  /** Prix de revente prévu (projet de revente) */
  resalePrice: string
  /** SCI IS : appliquer la flat tax (PFU) sur le retrait (argent accumulé pendant la détention) */
  sciIsWithdrawFlatTax?: boolean
  /** Frais de notaire réduits (engagement de revente) : 3 % au lieu de 8 % */
  reducedNotaryFees?: boolean
  /** Override frais de notaire (vide = auto) */
  notaryFeesOverride?: string
  /** Revalorisation annuelle des charges (%/an) : taxe foncière, copro, entretien… */
  chargesRevaluationPercent?: string
  /** Frais de revente (agence, diagnostics) en % du prix de vente */
  resaleFeesPercent?: string
  /** CFE annuelle (location meublée / SCI IS), exonérée l'année d'acquisition */
  annualCFE?: string
  /** Frais de comptabilité annuels (LMNP réel, SCI IS) */
  annualAccountingFees?: string
  /** Surface habitable (m²) — sert à estimer le budget travaux, hors calculs financiers */
  surfaceM2?: string
}

export type SimulationResults = {
  totalCost: number
  loanAmount: number
  annualRentEffective: number
  annualCharges: number
  annualLoanAndInsurance: number
  annualCashflow: number
  monthlyCashflow: number
  grossYield: number
  netYield: number
  cashOnCash: number
  annualTax: number
  annualCashflowAfterTax: number
  monthlyCashflowAfterTax: number
  annualDepreciation: number
  /** Loyers annuels HC au-dessus du plafond micro-foncier (15 000 €) */
  microFoncierCapExceeded?: boolean
  /** Recettes annuelles au-dessus du plafond micro-BIC (77 700 €) */
  microBicCapExceeded?: boolean
}

// Cas par défaut : projet type pré-rempli côté acquisition/financement,
// charges laissées vides (budgets estimés proposés dans les bulles d'aide)
export const INITIAL_VALUES: SimulationFormValues = {
  purchasePrice: '150000',
  notaryFees: '',
  agencyFees: '5000',
  renovationBudget: '10000',
  furnitureBudget: '3000',
  ownFunds: '15000',
  interestRate: '3.4',
  insuranceRate: '0.3',
  loanFees: '1200',
  guaranteeFees: '1800',
  loanDurationMonths: '240',
  deferralMonths: '0',
  deferralType: 'none',
  monthlyRent: '700',
  monthlyRecoverableCharges: '',
  rentRevaluationPercent: '1',
  vacancyRate: '0',
  annualPropertyTax: '',
  annualNonRecoverableCharges: '',
  annualManagementPercent: '0',
  annualMaintenance: '',
  annualInsurancePNO: '',
  otherAnnualExpenses: '',
  taxRegime: 'lmnp_micro_bic',
  feesAmortizeYear1: true,
  marginalTaxRate: '30',
  socialChargesRate: '17.2',
  corporateTaxRate: '25',
  resaleHoldingMonths: '',
  resalePrice: '',
  sciIsWithdrawFlatTax: false,
  reducedNotaryFees: false,
  chargesRevaluationPercent: '',
  resaleFeesPercent: '',
  annualCFE: '',
  annualAccountingFees: '',
  surfaceM2: '',
}
