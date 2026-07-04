import type { SimulationFormValues } from './types'

const TAX_REGIMES = [
  'none',
  'micro_foncier',
  'reel_foncier',
  'lmnp_micro_bic',
  'lmnp_reel',
  'sci_ir',
  'sci_is',
  'bailleur_prive',
]

/** Champs numériques saisis sous forme de chaîne : présence ET type vérifiés
 *  (un objet ou un nombre à la place ferait planter les calculs en aval). */
const REQUIRED_STRING_FIELDS: (keyof SimulationFormValues)[] = [
  'purchasePrice', 'notaryFees', 'agencyFees', 'renovationBudget', 'furnitureBudget',
  'ownFunds', 'interestRate', 'insuranceRate', 'loanFees', 'guaranteeFees',
  'monthlyRent', 'monthlyRecoverableCharges', 'rentRevaluationPercent',
  'vacancyRate', 'annualPropertyTax', 'annualNonRecoverableCharges', 'annualManagementPercent',
  'annualMaintenance', 'annualInsurancePNO', 'otherAnnualExpenses',
  'marginalTaxRate', 'socialChargesRate', 'corporateTaxRate',
]

const OPTIONAL_STRING_FIELDS: (keyof SimulationFormValues)[] = [
  'loanDurationMonths', 'deferralMonths', 'resaleHoldingMonths', 'resalePrice', 'notaryFeesOverride',
]

export function validateInvestissementData(data: unknown): data is SimulationFormValues {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>

  for (const k of REQUIRED_STRING_FIELDS) {
    if (typeof d[k] !== 'string') return false
  }
  for (const k of OPTIONAL_STRING_FIELDS) {
    if (d[k] !== undefined && typeof d[k] !== 'string') return false
  }
  if (!TAX_REGIMES.includes(String(d.taxRegime))) return false
  if (typeof d.feesAmortizeYear1 !== 'boolean') return false
  if (d.sciIsWithdrawFlatTax !== undefined && typeof d.sciIsWithdrawFlatTax !== 'boolean') return false
  if (d.reducedNotaryFees !== undefined && typeof d.reducedNotaryFees !== 'boolean') return false
  if (d.deferralType !== undefined && !['none', 'partial', 'total'].includes(String(d.deferralType))) return false
  if (!('loanDurationMonths' in d) && !('loanDurationYears' in d)) return false
  return true
}
