import type { TaxRegime } from '../../../shared/types'
import { toNumber } from '../../../shared/lib/format'
import {
  LAND_PERCENT,
  BUILDING_DEPRECIATION_RATE,
  FURNITURE_DEPRECIATION_RATE,
  BAILLEUR_PRIVE_BUILDING_RATE,
  BAILLEUR_PRIVE_TAX_CAP_EUR,
} from './constants'
import type { ChargesBreakdown, YearlyChartPoint } from '../../../shared/types/chart'
import type { SimulationFormValues, SimulationResults } from '../model/types'

function getNotaryFees(purchasePrice: number, reducedNotaryFees?: boolean): number {
  return purchasePrice * (reducedNotaryFees ? 0.03 : 0.08)
}

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
  const notaryFees = getNotaryFees(purchasePrice, values.reducedNotaryFees)
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

export function computeLoanChartsData(
  values: SimulationFormValues,
): { year: number; principal: number; interest: number; ltv: number }[] {
  const purchasePrice = toNumber(values.purchasePrice)
  const notaryFees = getNotaryFees(purchasePrice, values.reducedNotaryFees)
  const agencyFees = toNumber(values.agencyFees)
  const renovationBudget = toNumber(values.renovationBudget)
  const furnitureBudget = toNumber(values.furnitureBudget)
  const ownFunds = toNumber(values.ownFunds)
  const interestRate = toNumber(values.interestRate) / 100
  const loanDurationMonths = Math.max(toNumber(values.loanDurationMonths), 1)
  const deferralMonths = Math.max(0, Math.min(toNumber(values.deferralMonths ?? '0'), loanDurationMonths - 1))
  const deferralType = (values.deferralType || 'none') as 'none' | 'partial' | 'total'
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

  if (loanAmount <= 0) return []

  const monthlyRate = interestRate / 12
  const schedule = computeAmortizationSchedule(
    loanAmount,
    loanDurationMonths,
    monthlyRate,
    deferralMonths,
    deferralType,
  )

  const propertyValue = totalCost
  const data: { year: number; principal: number; interest: number; ltv: number }[] = []

  for (let y = 0; y < schedule.loanDurationYears; y++) {
    const principal = schedule.principalPerYear[y] ?? 0
    const interest = schedule.interestPerYear[y] ?? 0
    const balance = schedule.balanceEndOfYear[y] ?? 0
    const ltv = propertyValue > 0 ? (balance / propertyValue) * 100 : 0

    data.push({
      year: y + 1,
      principal,
      interest,
      ltv,
    })
  }

  return data
}

/** Calcule le TRI par la méthode de Newton-Raphson */
function computeIRR(cashFlows: number[], maxIterations = 100): number | null {
  if (cashFlows.length < 2 || cashFlows[0] >= 0) return null

  const npv = (r: number) => {
    let sum = 0
    for (let i = 0; i < cashFlows.length; i++) {
      sum += cashFlows[i] / Math.pow(1 + r, i)
    }
    return sum
  }

  const npvDerivative = (r: number) => {
    let sum = 0
    for (let i = 1; i < cashFlows.length; i++) {
      sum -= (i * cashFlows[i]) / Math.pow(1 + r, i + 1)
    }
    return sum
  }

  let r = 0.1
  for (let i = 0; i < maxIterations; i++) {
    const v = npv(r)
    const dv = npvDerivative(r)
    if (Math.abs(v) < 1e-9) return r
    if (dv === 0) break
    r = r - v / dv
    if (r <= -0.99) r = -0.98
    if (r > 10) return null
  }
  return Math.abs(npv(r)) < 1e-6 ? r : null
}

export type IRRDetail = {
  year: number
  irr: number
  cashFlows: number[]
  breakdown?: {
    initialInvestment: number
    annualCashflows: Array<{
      year: number
      revenue: number
      charges: number
      loanPayments: number
      tax: number
      cashflow: number
    }>
    saleProceeds: number
    saleTax: number
    loanBalance: number
  }
}

export function computeIRRByYearData(
  values: SimulationFormValues,
  includeDetails = false,
): { year: number; irr: number; details?: IRRDetail['breakdown'] }[] {
  const purchasePrice = toNumber(values.purchasePrice)
  const loanDurationMonths = Math.max(toNumber(values.loanDurationMonths), 1)
  
  // Use default values if resale not specified:
  // - Resale price = purchase price (no capital gain/loss)
  // - Holding period = loan duration
  const resalePrice = toNumber(values.resalePrice ?? '0')
  const resaleHoldingMonthsInput = toNumber(values.resaleHoldingMonths ?? '0')
  
  // If resale not specified, use defaults
  const effectiveResalePrice = resalePrice > 0 ? resalePrice : purchasePrice
  const effectiveResaleHoldingMonths = resaleHoldingMonthsInput > 0 ? resaleHoldingMonthsInput : loanDurationMonths
  
  // Always calculate IRR (even with default values)
  const resaleHoldingMonths = Math.max(1, effectiveResaleHoldingMonths)

  const notaryFees = getNotaryFees(purchasePrice, values.reducedNotaryFees)
  const agencyFees = toNumber(values.agencyFees)
  const renovationBudget = toNumber(values.renovationBudget)
  const furnitureBudget = toNumber(values.furnitureBudget)
  const ownFunds = toNumber(values.ownFunds)
  const interestRate = toNumber(values.interestRate) / 100
  const insuranceRate = toNumber(values.insuranceRate) / 100
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

  const numYears = Math.max(1, Math.ceil(resaleHoldingMonths / 12))
  const data: { year: number; irr: number; details?: IRRDetail['breakdown'] }[] = []

  for (let saleYear = 1; saleYear <= numYears; saleYear++) {
    // Initial cash flow: own funds invested (negative = outflow)
    const cashFlows: number[] = [-ownFunds]
    let totalDepreciationTaken = 0
    let deficitCarryforward = 0

    // Check if sale happens immediately after purchase (saleYear = 1 means sale at end of year 0)
    const isImmediateSale = saleYear === 1

    // Store breakdown details for tooltip
    let breakdown: IRRDetail['breakdown'] | undefined = undefined
    
    // For immediate sale, simplify the calculation
    if (isImmediateSale) {
      // No rental income, no charges, no loan payments (we repay full loan at sale)
      // Only calculate sale proceeds
      // For immediate sale: VNC = totalCost (no depreciation taken)
      const vnc = totalCost // Value net comptable = total cost (no depreciation)
      const taxableGain = Math.max(0, effectiveResalePrice - vnc)
      
      let saleTax = 0
      if (taxRegime !== 'none' && taxableGain > 0) {
        switch (taxRegime) {
          case 'sci_is':
            saleTax = taxableGain * corporateTaxRate
            break
          case 'reel_foncier':
          case 'lmnp_reel':
          case 'sci_ir':
          case 'micro_foncier':
          case 'lmnp_micro_bic':
          case 'bailleur_prive':
            saleTax = taxableGain * tmiPlusSocial
            break
          default:
            saleTax = 0
        }
      }
      
      // For immediate sale, repay full loan amount
      // Cashflow = sale price - sale tax - loan balance
      const cashflowAtSale = effectiveResalePrice - saleTax - loanAmount
      cashFlows.push(cashflowAtSale)
      
      if (includeDetails) {
        breakdown = {
          initialInvestment: -ownFunds,
          annualCashflows: [],
          saleProceeds: effectiveResalePrice,
          saleTax,
          loanBalance: loanAmount,
        }
      }
    } else {
      // Normal case: calculate year by year
      const annualBreakdown: IRRDetail['breakdown'] = {
        initialInvestment: -ownFunds,
        annualCashflows: [],
        saleProceeds: 0,
        saleTax: 0,
        loanBalance: 0,
      }
      
      for (let y = 0; y < saleYear; y++) {
      const interestThisYear = schedule.interestPerYear[y] ?? 0
      
      // For immediate sale (year 0), we don't pay full year's loan payments
      // We only pay interest accrued until sale, then repay the full loan balance
      let creditThisYear = 0
      if (isImmediateSale && y === 0) {
        // For immediate sale: only pay interest for a very short period (approximate as 0)
        // The full loan balance will be repaid at sale
        creditThisYear = 0
      } else {
        creditThisYear = (schedule.paymentPerYear[y] ?? 0) + monthlyInsurance * 12
      }
      
      // For immediate sale (year 0), no rental income or annual charges should be considered
      // Only the sale proceeds matter
      let revenue = 0
      let annualManagementY = 0
      let annualChargesY = 0
      
      if (!isImmediateSale || y > 0) {
        // Normal case: calculate rental income and charges
        revenue =
          annualRentEffectiveBase * Math.pow(1 + rentRevaluationRate, y)
        annualManagementY = revenue * annualManagementPercent
        annualChargesY =
          annualPropertyTax +
          annualNonRecoverableCharges +
          annualManagementY +
          annualMaintenance +
          annualInsurancePNO +
          otherAnnualExpenses
      }

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
            taxable = Math.max(0, base - deficitCarryforward)
            deficitCarryforward = Math.max(0, deficitCarryforward - base)
          }
          break
        }
        default:
          taxable = 0
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

      let annualCashflow = cfBeforeTax - tax

      if (y === saleYear - 1) {
        const saleTax =
          taxRegime !== 'none'
            ? computeSaleTaxAtResale(
                effectiveResalePrice,
                totalCost,
                totalDepreciationTaken,
                taxRegime,
                corporateTaxRate,
                tmiPlusSocial,
              )
            : 0
        
        // For immediate sale, the loan balance is the full loan amount (no payments made yet)
        // For other sales, use the balance at end of year
        const crd = isImmediateSale && y === 0
          ? loanAmount  // Full loan amount for immediate sale
          : (y < schedule.loanDurationYears - 1
              ? schedule.balanceEndOfYear[y] ?? 0
              : 0)
        
        // For immediate sale: cashflow = sale proceeds - sale tax - full loan balance
        // For other sales: cashflow = sale proceeds - sale tax - remaining loan balance
        // The creditThisYear (loan payments) are already subtracted in cfBeforeTax for non-immediate sales
        annualCashflow += effectiveResalePrice - saleTax - crd
        
        if (includeDetails) {
          annualBreakdown.saleProceeds = effectiveResalePrice
          annualBreakdown.saleTax = saleTax
          annualBreakdown.loanBalance = crd
        }
      }
      
      if (includeDetails) {
        annualBreakdown.annualCashflows.push({
          year: y + 1,
          revenue,
          charges: annualChargesY,
          loanPayments: creditThisYear,
          tax,
          cashflow: annualCashflow,
        })
      }

      cashFlows.push(annualCashflow)
      }
      
      if (includeDetails) {
        breakdown = annualBreakdown
      }
    }

    // For immediate sale with only 2 cash flows, calculate IRR manually if computeIRR fails
    let irr: number | null = null
    if (isImmediateSale && cashFlows.length === 2) {
      // Simple case: -CF0 + CF1/(1+r) = 0 => r = CF1/CF0 - 1
      const cf0 = cashFlows[0] // Should be negative (ownFunds)
      const cf1 = cashFlows[1] // Sale proceeds
      if (cf0 < 0 && cf1 !== 0) {
        irr = cf1 / Math.abs(cf0) - 1
        // Clamp to reasonable range
        if (irr < -0.99) irr = -0.99
        if (irr > 10) irr = null
      } else {
        irr = computeIRR(cashFlows)
      }
    } else {
      irr = computeIRR(cashFlows)
    }
    
    data.push({
      year: saleYear,
      irr: irr != null ? irr * 100 : 0,
      details: includeDetails ? breakdown : undefined,
    })
  }

  return data
}

export function computeYearlyChartData(
  values: SimulationFormValues,
): YearlyChartPoint[] {
  const purchasePrice = toNumber(values.purchasePrice)
  const notaryFees = getNotaryFees(purchasePrice, values.reducedNotaryFees)
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
  const resaleHoldingMonths = Math.max(0, toNumber(values.resaleHoldingMonths ?? '0'))
  const resalePrice = toNumber(values.resalePrice ?? '0')
  const hasResale = resalePrice > 0 && resaleHoldingMonths > 0
  const chartNumYears = hasResale
    ? Math.max(1, Math.ceil(resaleHoldingMonths / 12))
    : schedule.loanDurationYears
  const chartResaleYearIndex = hasResale ? chartNumYears - 1 : -1

  const tmiPlusSocial = marginalTaxRate + socialChargesRate
  const feesAmortizeYear1 = values.feesAmortizeYear1

  const data: YearlyChartPoint[] = []
  let deficitCarryforward = 0
  let totalDepreciationForChart = 0
  const sciIsWithdrawFlatTax = !!values.sciIsWithdrawFlatTax
  let sumAnnualAccumulatedForFlatTax = 0

  for (let y = 0; y < chartNumYears; y++) {
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
    totalDepreciationForChart += depreciationY.total

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

    let saleTaxChart = 0
    if (hasResale && y === chartResaleYearIndex && taxRegime !== 'none') {
      saleTaxChart = computeSaleTaxAtResale(
        resalePrice,
        totalCost,
        totalDepreciationForChart,
        taxRegime,
        corporateTaxRate,
        tmiPlusSocial,
      )
    }

    if (taxRegime === 'sci_is' && sciIsWithdrawFlatTax) {
      const cfBeforeTax = revenue - annualChargesY - annualLoanAndInsurance
      sumAnnualAccumulatedForFlatTax += cfBeforeTax - tax
    }

    const crdAtSale =
      hasResale &&
      y === chartResaleYearIndex &&
      y < schedule.loanDurationYears - 1
        ? schedule.balanceEndOfYear[y] ?? 0
        : 0
    const totalCharges = expenses + tax + saleTaxChart + crdAtSale
    const revenueWithResale = revenue + (hasResale && y === chartResaleYearIndex ? resalePrice : 0)
    const cashflow = revenueWithResale - totalCharges

    const breakdown: ChargesBreakdown = {
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
    }
    if (saleTaxChart > 0) breakdown.saleTax = saleTaxChart

    data.push({
      year: `${y + 1}`,
      revenue: revenueWithResale,
      charges: -totalCharges,
      cashflow,
      chargesBreakdown: breakdown,
      ...(hasResale && y === chartResaleYearIndex ? { resalePrice } : {}),
    })
  }

  // SCI IS : appliquer flat tax sur l'argent accumulé au graphique aussi
  if (
    taxRegime === 'sci_is' &&
    hasResale &&
    sciIsWithdrawFlatTax &&
    data.length > 0 &&
    chartResaleYearIndex >= 0
  ) {
    const FLAT_TAX_RATE = 0.314
    const resalePoint = data[chartResaleYearIndex]
    const crdAtResale =
      chartResaleYearIndex < schedule.loanDurationYears - 1
        ? schedule.balanceEndOfYear[chartResaleYearIndex] ?? 0
        : 0
    const corporateTaxOnGain = computeSaleTaxAtResale(
      resalePrice,
      totalCost,
      totalDepreciationForChart,
      taxRegime,
      corporateTaxRate,
      tmiPlusSocial,
    )
    const resaleNet = resalePrice - crdAtResale - corporateTaxOnGain
    const totalAccumulated = sumAnnualAccumulatedForFlatTax + resaleNet
    const flatTaxAmount = totalAccumulated * FLAT_TAX_RATE
    const totalResaleTax = corporateTaxOnGain + flatTaxAmount

    const oldSaleTax = resalePoint.chargesBreakdown?.saleTax ?? 0
    const totalChargesDelta = totalResaleTax - oldSaleTax
    const currentTotalCharges = -resalePoint.charges
    const newTotalCharges = currentTotalCharges + totalChargesDelta
    const newCashflow = resalePoint.revenue - newTotalCharges

    data[chartResaleYearIndex] = {
      ...resalePoint,
      charges: -newTotalCharges,
      cashflow: newCashflow,
      chargesBreakdown: {
        ...resalePoint.chargesBreakdown!,
        saleTax: totalResaleTax,
        corporateTaxOnGain,
        flatTax: flatTaxAmount,
      },
    }
  }

  return data
}

function computeSaleTaxAtResale(
  resalePrice: number,
  totalCost: number,
  totalDepreciationTaken: number,
  taxRegime: TaxRegime,
  corporateTaxRate: number,
  tmiPlusSocial: number,
): number {
  if (resalePrice <= 0) return 0
  const vnc = totalCost - totalDepreciationTaken
  const taxableGain = Math.max(0, resalePrice - vnc)
  if (taxableGain <= 0) return 0
  switch (taxRegime) {
    case 'sci_is':
      return taxableGain * corporateTaxRate
    case 'reel_foncier':
    case 'lmnp_reel':
    case 'sci_ir':
    case 'micro_foncier':
    case 'lmnp_micro_bic':
    case 'bailleur_prive':
      return taxableGain * tmiPlusSocial
    default:
      return 0
  }
}

export type FlatTaxDetail = {
  annualAccumulated: { year: number; amount: number; cfBeforeTax: number; corporateTax: number }[]
  resaleNet: number
  resalePrice: number
  crdAtResale: number
  corporateTaxOnGain: number
  totalAccumulated: number
  flatTaxRate: number
  flatTaxAmount: number
  totalResaleTax: number
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
  resalePrice: number
  /** Détail du calcul PFU (si SCI IS + option retrait activée et année de revente) */
  flatTaxDetail?: FlatTaxDetail
}

export function computeYearlyTableData(
  values: SimulationFormValues,
): YearlyTableRow[] {
  const purchasePrice = toNumber(values.purchasePrice)
  const notaryFees = getNotaryFees(purchasePrice, values.reducedNotaryFees)
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
  const resaleHoldingMonths = Math.max(0, toNumber(values.resaleHoldingMonths ?? '0'))
  const resalePrice = toNumber(values.resalePrice ?? '0')
  const hasResale = resalePrice > 0 && resaleHoldingMonths > 0

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

  const numYears = hasResale
    ? Math.max(1, Math.ceil(resaleHoldingMonths / 12))
    : schedule.loanDurationYears
  const resaleYearIndex = hasResale ? numYears - 1 : -1

  const data: YearlyTableRow[] = []
  let deficitCarryforward = 0
  let totalDepreciationTaken = 0

  for (let y = 0; y < numYears; y++) {
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

    let saleTax = 0
    if (hasResale && y === resaleYearIndex && taxRegime !== 'none') {
      saleTax = computeSaleTaxAtResale(
        resalePrice,
        totalCost,
        totalDepreciationTaken,
        taxRegime,
        corporateTaxRate,
        tmiPlusSocial,
      )
    }

    const cashDispo =
      cfBeforeTax -
      tax -
      saleTax +
      (hasResale && y === resaleYearIndex ? resalePrice : 0) -
      (hasResale &&
      y === resaleYearIndex &&
      y < schedule.loanDurationYears - 1
        ? schedule.balanceEndOfYear[y] ?? 0
        : 0)

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
      resalePrice: hasResale && y === resaleYearIndex ? resalePrice : 0,
    })
  }

  // SCI IS : option flat tax (PFU) sur l'argent accumulé (comme si on n'avait pas touché au bien)
  const sciIsWithdrawFlatTax = !!values.sciIsWithdrawFlatTax
  if (
    taxRegime === 'sci_is' &&
    hasResale &&
    sciIsWithdrawFlatTax &&
    data.length > 0
  ) {
    const FLAT_TAX_RATE = 0.314
    // Calculer le détail pour le tooltip
    const annualAccumulated = data.map((row) => ({
      year: row.year,
      amount: row.cfBeforeTax - row.tax,
      cfBeforeTax: row.cfBeforeTax,
      corporateTax: row.tax,
    }))
    const sumAnnualAccumulated = annualAccumulated.reduce((s, a) => s + a.amount, 0)
    const resaleRow = data[resaleYearIndex]
    const corporateTaxOnGain = resaleRow.saleTax
    const resaleNet = resalePrice - (resaleRow.crd ?? 0) - corporateTaxOnGain
    const totalAccumulated = sumAnnualAccumulated + resaleNet
    const flatTaxAmount = totalAccumulated * FLAT_TAX_RATE
    const totalResaleTax = corporateTaxOnGain + flatTaxAmount

    resaleRow.saleTax = totalResaleTax
    resaleRow.cashDispo =
      resaleRow.cfBeforeTax -
      resaleRow.tax -
      totalResaleTax +
      resalePrice -
      (resaleYearIndex < schedule.loanDurationYears - 1 ? (resaleRow.crd ?? 0) : 0)
    
    // Ajouter le détail PFU pour le tooltip
    resaleRow.flatTaxDetail = {
      annualAccumulated,
      resaleNet,
      resalePrice,
      crdAtResale: resaleRow.crd ?? 0,
      corporateTaxOnGain,
      totalAccumulated,
      flatTaxRate: FLAT_TAX_RATE,
      flatTaxAmount,
      totalResaleTax,
    }
  }

  return data
}
