import type { TaxRegime } from '../../../shared/types'
import { toNumber } from '../../../shared/lib/format'
import {
  LAND_PERCENT,
  BUILDING_DEPRECIATION_RATE,
  FURNITURE_DEPRECIATION_RATE,
  BAILLEUR_PRIVE_BUILDING_RATE,
  BAILLEUR_PRIVE_TAX_CAP_EUR,
} from './constants'
import type { YearlyChartPoint } from '../../../shared/types/chart'
import type { SimulationFormValues, SimulationResults } from '../model/types'

export function computeDepreciationForYear(
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

export type AmortizationSchedule = {
  interestPerYear: number[]
  principalPerYear: number[]
  paymentPerYear: number[]
  balanceEndOfYear: number[]
  loanDurationYears: number
}

/**
 * Calcule le tableau d'amortissement avec support du différé bancaire.
 * - Différé total : pas de paiement pendant le différé, intérêts capitalisés.
 * - Différé partiel : paiement des intérêts uniquement pendant le différé.
 */
export function computeAmortizationSchedule(
  loanAmount: number,
  months: number,
  monthlyRate: number,
  deferralMonths: number,
  deferralType: 'none' | 'partial' | 'total',
): AmortizationSchedule {
  const effectiveDeferral = Math.min(deferralMonths, Math.max(0, months - 1))
  const amortizationMonths = months - effectiveDeferral

  const interestPerYear: number[] = []
  const principalPerYear: number[] = []
  const paymentPerYear: number[] = []
  const balanceEndOfYear: number[] = []

  if (loanAmount <= 0) {
    const numYears = Math.ceil(months / 12)
    for (let y = 0; y < numYears; y++) {
      interestPerYear[y] = 0
      principalPerYear[y] = 0
      paymentPerYear[y] = 0
      balanceEndOfYear[y] = 0
    }
    return {
      interestPerYear,
      principalPerYear,
      paymentPerYear,
      balanceEndOfYear,
      loanDurationYears: numYears,
    }
  }

  let balance = loanAmount

  if (deferralType === 'total' && effectiveDeferral > 0) {
    for (let m = 0; m < effectiveDeferral; m++) {
      balance += balance * monthlyRate
    }
  }

  let monthlyPayment = 0
  if (monthlyRate > 0 && amortizationMonths > 0) {
    const factor = Math.pow(1 + monthlyRate, amortizationMonths)
    monthlyPayment = (balance * monthlyRate * factor) / (factor - 1)
  } else if (amortizationMonths > 0) {
    monthlyPayment = balance / amortizationMonths
  }

  balance = loanAmount
  const numYears = Math.ceil(months / 12)

  for (let m = 0; m < months; m++) {
    const interest = balance * monthlyRate
    let principal = 0
    let payment = 0

    if (m < effectiveDeferral) {
      if (deferralType === 'total') {
        principal = 0
        payment = 0
        balance += interest
      } else {
        principal = 0
        payment = interest
      }
    } else {
      if (monthlyRate === 0) {
        const remainingMonths = months - m
        principal = balance / Math.max(remainingMonths, 1)
      } else {
        principal = monthlyPayment - interest
      }
      payment = principal + interest
      balance -= principal
    }

    const yearIndex = Math.floor(m / 12)
    if (!interestPerYear[yearIndex]) {
      interestPerYear[yearIndex] = 0
      principalPerYear[yearIndex] = 0
      paymentPerYear[yearIndex] = 0
    }
    interestPerYear[yearIndex] += interest
    principalPerYear[yearIndex] += principal
    paymentPerYear[yearIndex] += payment
    if (m % 12 === 11 || m === months - 1) {
      balanceEndOfYear[yearIndex] = balance
    }
  }

  return {
    interestPerYear,
    principalPerYear,
    paymentPerYear,
    balanceEndOfYear,
    loanDurationYears: numYears,
  }
}

export function calculateResults(values: SimulationFormValues): SimulationResults {
  const purchasePrice = toNumber(values.purchasePrice)
  const notaryFees = purchasePrice * 0.08
  const agencyFees = toNumber(values.agencyFees)
  const renovationBudget = toNumber(values.renovationBudget)
  const furnitureBudget = toNumber(values.furnitureBudget)
  const ownFunds = toNumber(values.ownFunds)
  const interestRate = toNumber(values.interestRate) / 100
  const insuranceRate = toNumber(values.insuranceRate) / 100
  const loanDurationMonths = Math.max(toNumber(values.loanDurationMonths), 1)
  const deferralMonths = Math.max(0, Math.min(toNumber(values.deferralMonths ?? '0'), loanDurationMonths - 1))
  const deferralType = (values.deferralType || 'none') as 'none' | 'partial' | 'total'
  const monthlyRent = toNumber(values.monthlyRent)
  const monthlyRecoverableCharges = toNumber(values.monthlyRecoverableCharges)
  const vacancyRate = toNumber(values.vacancyRate) / 100
  const annualPropertyTax = toNumber(values.annualPropertyTax)
  const annualNonRecoverableCharges = toNumber(values.annualNonRecoverableCharges)
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

  const monthlyRate = interestRate / 12
  const schedule = computeAmortizationSchedule(
    loanAmount,
    loanDurationMonths,
    monthlyRate,
    deferralMonths,
    deferralType,
  )

  const monthlyInsurance = loanAmount * (insuranceRate / 12)
  const annualLoanAndInsuranceYear0 = (schedule.paymentPerYear[0] ?? 0) + monthlyInsurance * 12

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

  const annualLoanAndInsurance = annualLoanAndInsuranceYear0

  const annualCashflow =
    annualRentEffective - annualCharges - annualLoanAndInsurance
  const monthlyCashflow = annualCashflow / 12

  const annualInterestApprox = schedule.interestPerYear[0] ?? loanAmount * interestRate

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

export function computeYearlyChartData(
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
  const loanDurationMonths = Math.max(toNumber(values.loanDurationMonths), 1)
  const deferralMonths = Math.max(0, Math.min(toNumber(values.deferralMonths ?? '0'), loanDurationMonths - 1))
  const deferralType = (values.deferralType || 'none') as 'none' | 'partial' | 'total'
  const monthlyRent = toNumber(values.monthlyRent)
  const monthlyRecoverableCharges = toNumber(values.monthlyRecoverableCharges)
  const vacancyRate = toNumber(values.vacancyRate) / 100
  const annualPropertyTax = toNumber(values.annualPropertyTax)
  const annualNonRecoverableCharges = toNumber(values.annualNonRecoverableCharges)
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

  const monthlyRate = interestRate / 12
  const schedule = computeAmortizationSchedule(
    loanAmount,
    loanDurationMonths,
    monthlyRate,
    deferralMonths,
    deferralType,
  )

  const monthlyInsurance = loanAmount * (insuranceRate / 12)
  const grossMonthlyIncome = monthlyRent + monthlyRecoverableCharges
  const effectiveMonthlyIncome = grossMonthlyIncome * (1 - vacancyRate)
  const annualRentEffectiveBase = effectiveMonthlyIncome * 12
  const rentRevaluationRate = toNumber(values.rentRevaluationPercent) / 100

  const tmiPlusSocial = marginalTaxRate + socialChargesRate
  const feesAmortizeYear1 = values.feesAmortizeYear1

  const data: YearlyChartPoint[] = []
  let deficitCarryforward = 0

  for (let y = 0; y < schedule.loanDurationYears; y++) {
    const interestThisYear = schedule.interestPerYear[y] ?? 0
    const annualLoanAndInsurance =
      (schedule.paymentPerYear[y] ?? 0) + monthlyInsurance * 12
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

export type YearlyTableRow = {
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

export function computeYearlyTableData(
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
  const loanDurationMonths = Math.max(toNumber(values.loanDurationMonths), 1)
  const deferralMonths = Math.max(0, Math.min(toNumber(values.deferralMonths ?? '0'), loanDurationMonths - 1))
  const deferralType = (values.deferralType || 'none') as 'none' | 'partial' | 'total'
  const monthlyRent = toNumber(values.monthlyRent)
  const monthlyRecoverableCharges = toNumber(values.monthlyRecoverableCharges)
  const vacancyRate = toNumber(values.vacancyRate) / 100
  const annualPropertyTax = toNumber(values.annualPropertyTax)
  const annualNonRecoverableCharges = toNumber(values.annualNonRecoverableCharges)
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

  const monthlyRate = interestRate / 12
  const schedule = computeAmortizationSchedule(
    loanAmount,
    loanDurationMonths,
    monthlyRate,
    deferralMonths,
    deferralType,
  )

  const monthlyInsurance = loanAmount * (insuranceRate / 12)
  const grossMonthlyIncome = monthlyRent + monthlyRecoverableCharges
  const effectiveMonthlyIncome = grossMonthlyIncome * (1 - vacancyRate)
  const annualRentEffectiveBase = effectiveMonthlyIncome * 12
  const tmiPlusSocial = marginalTaxRate + socialChargesRate

  const data: YearlyTableRow[] = []
  let deficitCarryforward = 0
  let totalDepreciationTaken = 0

  for (let y = 0; y < schedule.loanDurationYears; y++) {
    const interestThisYear = schedule.interestPerYear[y] ?? 0
    const principalThisYear = schedule.principalPerYear[y] ?? 0
    const creditThisYear =
      (schedule.paymentPerYear[y] ?? 0) + monthlyInsurance * 12
    const crd = schedule.balanceEndOfYear[y] ?? 0

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
    if (taxRegime === 'sci_is' && y === schedule.loanDurationYears - 1) {
      const acquisitionCost = totalCost
      const loanDurationYears = schedule.loanDurationYears
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
