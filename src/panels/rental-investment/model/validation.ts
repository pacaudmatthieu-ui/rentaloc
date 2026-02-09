import type { SimulationFormValues } from './types'

export function validateInvestissementData(data: unknown): data is SimulationFormValues {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  const required: (keyof SimulationFormValues)[] = [
    'purchasePrice', 'notaryFees', 'agencyFees', 'renovationBudget', 'furnitureBudget',
    'ownFunds', 'interestRate', 'insuranceRate', 'loanFees', 'guaranteeFees',
    'monthlyRent', 'monthlyRecoverableCharges', 'rentRevaluationPercent',
    'vacancyRate', 'annualPropertyTax', 'annualNonRecoverableCharges', 'annualManagementPercent',
    'annualMaintenance', 'annualInsurancePNO', 'otherAnnualExpenses', 'taxRegime',
    'feesAmortizeYear1', 'marginalTaxRate', 'socialChargesRate', 'corporateTaxRate',
  ]
  for (const k of required) {
    if (!(k in d)) return false
  }
  if (typeof d.taxRegime !== 'string') return false
  if (typeof d.feesAmortizeYear1 !== 'boolean') return false
  if (d.deferralType !== undefined && !['none', 'partial', 'total'].includes(String(d.deferralType))) return false
  if (!('loanDurationMonths' in d) && !('loanDurationYears' in d)) return false
  return true
}
