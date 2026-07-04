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

// Cas par défaut réaliste (T2 en ville moyenne, régime simple pour débuter)
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
  monthlyRecoverableCharges: '50',
  rentRevaluationPercent: '1',
  vacancyRate: '5',
  annualPropertyTax: '900',
  annualNonRecoverableCharges: '500',
  annualManagementPercent: '0',
  annualMaintenance: '500',
  annualInsurancePNO: '180',
  otherAnnualExpenses: '0',
  taxRegime: 'lmnp_micro_bic',
  feesAmortizeYear1: true,
  marginalTaxRate: '30',
  socialChargesRate: '17.2',
  corporateTaxRate: '25',
  resaleHoldingMonths: '',
  resalePrice: '',
  sciIsWithdrawFlatTax: false,
  reducedNotaryFees: false,
}
