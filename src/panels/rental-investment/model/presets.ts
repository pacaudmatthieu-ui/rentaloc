import type { SimulationFormValues } from './types'
import { INITIAL_VALUES } from './types'

export type RentalPreset = {
  key: 'studio' | 't2' | 'immeuble'
  /** Clé i18n du libellé (presetStudio, presetT2, presetImmeuble) */
  labelKey: string
  values: SimulationFormValues
}

/**
 * Scénarios d'exemple chargeables en un clic (mode Essentiel) —
 * des cas crédibles signés JM Académie, pas des cas mirifiques.
 */
export const RENTAL_PRESETS: RentalPreset[] = [
  {
    key: 'studio',
    labelKey: 'presetStudio',
    values: {
      ...INITIAL_VALUES,
      purchasePrice: '90000',
      notaryFeesOverride: '',
      agencyFees: '4000',
      renovationBudget: '8000',
      furnitureBudget: '4000',
      ownFunds: '10000',
      interestRate: '3.4',
      insuranceRate: '0.3',
      loanFees: '1000',
      guaranteeFees: '1200',
      loanDurationMonths: '240',
      monthlyRent: '480',
      monthlyRecoverableCharges: '40',
      rentRevaluationPercent: '1',
      vacancyRate: '6',
      annualPropertyTax: '700',
      annualNonRecoverableCharges: '400',
      annualManagementPercent: '0',
      annualMaintenance: '400',
      annualInsurancePNO: '150',
      otherAnnualExpenses: '0',
      taxRegime: 'lmnp_micro_bic',
      marginalTaxRate: '30',
    },
  },
  {
    key: 't2',
    labelKey: 'presetT2',
    values: {
      ...INITIAL_VALUES,
      purchasePrice: '180000',
      notaryFeesOverride: '',
      agencyFees: '6000',
      renovationBudget: '5000',
      furnitureBudget: '5000',
      ownFunds: '20000',
      interestRate: '3.3',
      insuranceRate: '0.3',
      loanFees: '1200',
      guaranteeFees: '1800',
      loanDurationMonths: '300',
      monthlyRent: '750',
      monthlyRecoverableCharges: '60',
      rentRevaluationPercent: '1',
      vacancyRate: '4',
      annualPropertyTax: '1100',
      annualNonRecoverableCharges: '800',
      annualManagementPercent: '6',
      annualMaintenance: '500',
      annualInsurancePNO: '180',
      otherAnnualExpenses: '0',
      taxRegime: 'lmnp_micro_bic',
      marginalTaxRate: '30',
    },
  },
  {
    key: 'immeuble',
    labelKey: 'presetImmeuble',
    values: {
      ...INITIAL_VALUES,
      purchasePrice: '320000',
      notaryFeesOverride: '',
      agencyFees: '10000',
      renovationBudget: '60000',
      furnitureBudget: '8000',
      ownFunds: '40000',
      interestRate: '3.6',
      insuranceRate: '0.3',
      loanFees: '1500',
      guaranteeFees: '2500',
      loanDurationMonths: '240',
      monthlyRent: '2600',
      monthlyRecoverableCharges: '150',
      rentRevaluationPercent: '1',
      vacancyRate: '7',
      annualPropertyTax: '2800',
      annualNonRecoverableCharges: '0',
      annualManagementPercent: '7',
      annualMaintenance: '1500',
      annualInsurancePNO: '600',
      otherAnnualExpenses: '0',
      taxRegime: 'lmnp_reel',
      marginalTaxRate: '30',
    },
  },
]
