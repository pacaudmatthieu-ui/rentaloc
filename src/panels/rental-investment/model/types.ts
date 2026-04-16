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
}

export const INITIAL_VALUES: SimulationFormValues = {
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
  loanDurationMonths: '240',
  deferralMonths: '0',
  deferralType: 'none',
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
  taxRegime: 'sci_is',
  feesAmortizeYear1: true,
  marginalTaxRate: '30',
  socialChargesRate: '17.2',
  corporateTaxRate: '25',
  resaleHoldingMonths: '',
  resalePrice: '',
  sciIsWithdrawFlatTax: false,
  reducedNotaryFees: false,
}
