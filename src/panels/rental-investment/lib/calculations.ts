import type { TaxRegime } from '../../../shared/types'
import { toNumber } from '../../../shared/lib/format'
import {
  LAND_PERCENT,
  BUILDING_DEPRECIATION_RATE,
  FURNITURE_DEPRECIATION_RATE,
  BAILLEUR_PRIVE_BUILDING_RATE,
  BAILLEUR_PRIVE_TAX_CAP_EUR,
} from './constants'
import {
  FLAT_TAX_RATE,
  MICRO_FONCIER_ABATTEMENT,
  MICRO_FONCIER_CAP,
  MICRO_BIC_ABATTEMENT,
  MICRO_BIC_CAP,
  DEFICIT_FONCIER_GLOBAL_CAP,
  DEFICIT_CARRYFORWARD_YEARS,
  computeIS,
  computeMarginalIS,
  computePVParticuliers,
} from '../../../entities/finance/fiscal'
import type { ChargesBreakdown, YearlyChartPoint } from '../../../shared/types/chart'
import type { SimulationFormValues, SimulationResults } from '../model/types'

function getNotaryFees(purchasePrice: number, reducedNotaryFees?: boolean, notaryFeesOverride?: string): number {
  if (notaryFeesOverride && notaryFeesOverride !== '') {
    return Number(notaryFeesOverride) || 0
  }
  return purchasePrice * (reducedNotaryFees ? 0.03 : 0.08)
}

/**
 * Amortissements comptables de l'année (bâti + mobilier).
 * NB : les frais d'acquisition passés en charges l'année 1 (option LMNP réel / SCI IS)
 * ne sont PAS des amortissements — ils sont retournés à part (`acquisitionFees`)
 * et traités comme des charges déductibles par le moteur fiscal.
 */
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
      // Pas d'amortissement comptable en réel foncier / SCI IR (location nue)
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
    total: building + furniture,
  }
}

export type AmortizationSchedule = {
  /** Intérêts courus (y compris capitalisés pendant un différé total) — base fiscale IS */
  interestPerYear: number[]
  /** Intérêts effectivement décaissés — base fiscale des régimes IR (comptabilité de caisse) */
  interestPaidPerYear: number[]
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

  const numYears = Math.max(1, Math.ceil(months / 12))
  const interestPerYear: number[] = new Array(numYears).fill(0)
  const interestPaidPerYear: number[] = new Array(numYears).fill(0)
  const principalPerYear: number[] = new Array(numYears).fill(0)
  const paymentPerYear: number[] = new Array(numYears).fill(0)
  const balanceEndOfYear: number[] = new Array(numYears).fill(0)

  if (loanAmount <= 0) {
    return {
      interestPerYear,
      interestPaidPerYear,
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

  for (let m = 0; m < months; m++) {
    const interest = balance * monthlyRate
    let principal = 0
    let payment = 0
    let interestPaid = interest

    if (m < effectiveDeferral) {
      if (deferralType === 'total') {
        // Intérêts capitalisés : courus mais non décaissés
        principal = 0
        payment = 0
        interestPaid = 0
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
    interestPerYear[yearIndex] += interest
    interestPaidPerYear[yearIndex] += interestPaid
    principalPerYear[yearIndex] += principal
    paymentPerYear[yearIndex] += payment
    if (m % 12 === 11 || m === months - 1) {
      balanceEndOfYear[yearIndex] = balance
    }
  }

  return {
    interestPerYear,
    interestPaidPerYear,
    principalPerYear,
    paymentPerYear,
    balanceEndOfYear,
    loanDurationYears: numYears,
  }
}

// ---------------------------------------------------------------------------
// Entrées normalisées — parsing unique partagé par tous les calculs
// ---------------------------------------------------------------------------

type EngineInputs = {
  purchasePrice: number
  notaryFees: number
  agencyFees: number
  renovationBudget: number
  furnitureBudget: number
  ownFunds: number
  loanFees: number
  guaranteeFees: number
  totalCost: number
  loanAmount: number
  loanDurationMonths: number
  schedule: AmortizationSchedule
  monthlyInsurance: number
  monthlyRent: number
  monthlyRecoverableCharges: number
  vacancyRate: number
  rentRevaluationRate: number
  annualPropertyTax: number
  annualNonRecoverableCharges: number
  annualManagementPercent: number
  annualMaintenance: number
  annualInsurancePNO: number
  otherAnnualExpenses: number
  marginalTaxRate: number
  socialChargesRate: number
  tmiPlusSocial: number
  taxRegime: TaxRegime
  feesAmortizeYear1: boolean
  acquisitionCostForPV: number
}

function parseInputs(values: SimulationFormValues): EngineInputs {
  const purchasePrice = toNumber(values.purchasePrice)
  const notaryFees = getNotaryFees(purchasePrice, values.reducedNotaryFees, values.notaryFeesOverride)
  const agencyFees = toNumber(values.agencyFees)
  const renovationBudget = toNumber(values.renovationBudget)
  const furnitureBudget = toNumber(values.furnitureBudget)
  const ownFunds = toNumber(values.ownFunds)
  const interestRate = toNumber(values.interestRate) / 100
  const insuranceRate = toNumber(values.insuranceRate) / 100
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

  const schedule = computeAmortizationSchedule(
    loanAmount,
    loanDurationMonths,
    interestRate / 12,
    deferralMonths,
    deferralType,
  )

  const marginalTaxRate = toNumber(values.marginalTaxRate) / 100
  const socialChargesRate = toNumber(values.socialChargesRate) / 100

  return {
    purchasePrice,
    notaryFees,
    agencyFees,
    renovationBudget,
    furnitureBudget,
    ownFunds,
    loanFees,
    guaranteeFees,
    totalCost,
    loanAmount,
    loanDurationMonths,
    schedule,
    monthlyInsurance: loanAmount * (insuranceRate / 12),
    monthlyRent: toNumber(values.monthlyRent),
    monthlyRecoverableCharges: toNumber(values.monthlyRecoverableCharges),
    vacancyRate: toNumber(values.vacancyRate) / 100,
    rentRevaluationRate: toNumber(values.rentRevaluationPercent) / 100,
    annualPropertyTax: toNumber(values.annualPropertyTax),
    annualNonRecoverableCharges: toNumber(values.annualNonRecoverableCharges),
    annualManagementPercent: toNumber(values.annualManagementPercent) / 100,
    annualMaintenance: toNumber(values.annualMaintenance),
    annualInsurancePNO: toNumber(values.annualInsurancePNO),
    otherAnnualExpenses: toNumber(values.otherAnnualExpenses),
    marginalTaxRate,
    socialChargesRate,
    tmiPlusSocial: marginalTaxRate + socialChargesRate,
    taxRegime: values.taxRegime,
    feesAmortizeYear1: values.feesAmortizeYear1,
    acquisitionCostForPV: purchasePrice + notaryFees + agencyFees + renovationBudget,
  }
}

// ---------------------------------------------------------------------------
// Moteur fiscal annuel unique — utilisé par TOUS les calculs (résultats,
// tableau annuel, graphiques, TRI) pour garantir des chiffres identiques partout.
// ---------------------------------------------------------------------------

type DeficitEntry = { amount: number; expiresAfterYear: number }

type FiscalState = {
  deficits: DeficitEntry[]
  depreciationReserve: number
  /** Cumul des amortissements réellement admis en déduction (réintégration PV — LF 2025) */
  amortizationDeducted: number
}

function createFiscalState(): FiscalState {
  return { deficits: [], depreciationReserve: 0, amortizationDeducted: 0 }
}

function addDeficit(state: FiscalState, year: number, amount: number, unlimited = false) {
  if (amount <= 0) return
  state.deficits.push({
    amount,
    expiresAfterYear: unlimited ? Number.POSITIVE_INFINITY : year + DEFICIT_CARRYFORWARD_YEARS,
  })
}

/** Consomme les reports de déficit (FIFO, avec péremption à 10 ans) sur une base positive. */
function consumeDeficits(state: FiscalState, year: number, positiveBase: number): { taxable: number; used: number } {
  state.deficits = state.deficits.filter((d) => d.expiresAfterYear >= year && d.amount > 0)
  let remaining = positiveBase
  let used = 0
  for (const entry of state.deficits) {
    if (remaining <= 0) break
    const take = Math.min(entry.amount, remaining)
    entry.amount -= take
    remaining -= take
    used += take
  }
  state.deficits = state.deficits.filter((d) => d.amount > 0)
  return { taxable: remaining, used }
}

function deficitRemaining(state: FiscalState): number {
  return state.deficits.reduce((s, d) => s + d.amount, 0)
}

type FiscalYearInput = {
  y: number
  /** Encaissements locatifs (loyers + charges récupérables refacturées, après vacance) */
  cashIncome: number
  /** Loyers hors charges encaissés (après vacance) — base du micro-foncier */
  rentHCEffective: number
  /** Charges d'exploitation décaissées (incl. charges de copro récupérables payées) */
  operatingCharges: number
  interestAccrued: number
  interestPaid: number
  /** Frais de dossier + garantie bancaire, déductibles l'année 1 (frais d'emprunt) */
  loanCostsYear1: number
  /** Frais de notaire + agence passés en charges l'année 1 (option LMNP réel / SCI IS) */
  acquisitionFeesExpensed: number
  insuranceCost: number
  depreciation: { building: number; furniture: number; total: number }
}

type FiscalYearResult = {
  /** Résultat comptable de l'année (peut être négatif) */
  base: number
  /** Base réellement imposée après reports */
  taxable: number
  /** Impôt de l'année (négatif = économie d'impôt via déficit foncier imputé au global) */
  tax: number
  carryforwardUsed: number
  /** Déficit foncier imputé sur le revenu global (max 10 700 €/an) */
  globalDeficitUsed: number
  depreciationUsed: number
}

function applyFiscalYear(
  inputs: EngineInputs,
  input: FiscalYearInput,
  state: FiscalState,
): FiscalYearResult {
  const { taxRegime, tmiPlusSocial, marginalTaxRate } = inputs
  const result: FiscalYearResult = {
    base: 0,
    taxable: 0,
    tax: 0,
    carryforwardUsed: 0,
    globalDeficitUsed: 0,
    depreciationUsed: 0,
  }

  switch (taxRegime) {
    case 'micro_foncier': {
      // Abattement 30 % sur les loyers hors charges encaissés
      result.base = input.rentHCEffective * (1 - MICRO_FONCIER_ABATTEMENT)
      result.taxable = Math.max(0, result.base)
      result.tax = result.taxable * tmiPlusSocial
      break
    }
    case 'lmnp_micro_bic': {
      // Abattement 50 % sur les recettes brutes (loyers charges comprises)
      result.base = input.cashIncome * (1 - MICRO_BIC_ABATTEMENT)
      result.taxable = Math.max(0, result.base)
      result.tax = result.taxable * tmiPlusSocial
      break
    }
    case 'lmnp_reel': {
      // BIC réel non professionnel.
      // Art. 39 C : l'amortissement ne peut pas créer de déficit ; l'excédent part
      // en réserve, reportable sans limite de durée.
      // Le déficit issu des charges (hors amortissement) est reportable 10 ans
      // sur les bénéfices de même nature.
      const charges =
        input.operatingCharges +
        input.insuranceCost +
        input.loanCostsYear1 +
        input.acquisitionFeesExpensed
      const resultBeforeDepreciation = input.cashIncome - input.interestPaid - charges
      if (resultBeforeDepreciation < 0) {
        addDeficit(state, input.y, -resultBeforeDepreciation)
        state.depreciationReserve += input.depreciation.total
        result.base = resultBeforeDepreciation
        result.taxable = 0
        result.tax = 0
      } else {
        const available = input.depreciation.total + state.depreciationReserve
        const depreciationUsed = Math.min(available, resultBeforeDepreciation)
        state.depreciationReserve = available - depreciationUsed
        state.amortizationDeducted += depreciationUsed
        result.depreciationUsed = depreciationUsed
        result.base = resultBeforeDepreciation - depreciationUsed
        const { taxable, used } = consumeDeficits(state, input.y, result.base)
        result.carryforwardUsed = used
        result.taxable = taxable
        result.tax = taxable * tmiPlusSocial
      }
      break
    }
    case 'reel_foncier':
    case 'sci_ir': {
      // Régime réel foncier (art. 156 CGI) :
      // - Les intérêts et frais d'emprunt (assurance, dossier, garantie) s'imputent
      //   en priorité ; le déficit qu'ils génèrent n'est reportable QUE sur les
      //   revenus fonciers des 10 années suivantes.
      // - Le déficit issu des autres charges s'impute sur le revenu global
      //   jusqu'à 10 700 €/an (économie au TMI, sans PS) ; le surplus est
      //   reportable 10 ans sur les revenus fonciers.
      const interestBucket = input.interestPaid + input.insuranceCost + input.loanCostsYear1
      const afterInterest = input.cashIncome - interestBucket
      const interestDeficit = Math.max(0, -afterInterest)
      const afterCharges = Math.max(afterInterest, 0) - input.operatingCharges
      result.base = input.cashIncome - interestBucket - input.operatingCharges
      if (afterCharges >= 0 && interestDeficit === 0) {
        const { taxable, used } = consumeDeficits(state, input.y, afterCharges)
        result.carryforwardUsed = used
        result.taxable = taxable
        result.tax = taxable * tmiPlusSocial
      } else {
        const chargesDeficit = Math.max(0, -afterCharges)
        const globalDeficitUsed = Math.min(DEFICIT_FONCIER_GLOBAL_CAP, chargesDeficit)
        addDeficit(state, input.y, chargesDeficit - globalDeficitUsed + interestDeficit)
        result.globalDeficitUsed = globalDeficitUsed
        result.taxable = 0
        // Économie d'impôt sur le revenu global : au TMI seul (pas de PS)
        result.tax = globalDeficitUsed > 0 ? -globalDeficitUsed * marginalTaxRate : 0
      }
      break
    }
    case 'sci_is': {
      // IS : comptabilité d'engagement — intérêts courus déductibles (y compris
      // capitalisés en différé total), amortissements toujours comptabilisés,
      // déficits reportables sans limite de durée.
      const charges =
        input.operatingCharges +
        input.insuranceCost +
        input.loanCostsYear1 +
        input.acquisitionFeesExpensed
      result.base =
        input.cashIncome -
        input.interestAccrued -
        charges -
        input.depreciation.total
      state.amortizationDeducted += input.depreciation.total
      result.depreciationUsed = input.depreciation.total
      if (result.base < 0) {
        addDeficit(state, input.y, -result.base, true)
        result.taxable = 0
        result.tax = 0
      } else {
        const { taxable, used } = consumeDeficits(state, input.y, result.base)
        result.carryforwardUsed = used
        result.taxable = taxable
        result.tax = computeIS(taxable)
      }
      break
    }
    case 'bailleur_prive': {
      // Statut du bailleur privé (PLF 2026 — dispositif à confirmer) :
      // moteur du réel foncier + amortissement du bâti qui ne peut pas créer de
      // déficit, avantage fiscal plafonné à 8 000 €/an.
      const interestBucket = input.interestPaid + input.insuranceCost + input.loanCostsYear1
      const afterInterest = input.cashIncome - interestBucket
      const interestDeficit = Math.max(0, -afterInterest)
      const afterCharges = Math.max(afterInterest, 0) - input.operatingCharges
      result.base = input.cashIncome - interestBucket - input.operatingCharges - input.depreciation.total
      if (afterCharges >= 0 && interestDeficit === 0) {
        const { taxable: taxableFoncier, used } = consumeDeficits(state, input.y, afterCharges)
        result.carryforwardUsed = used
        const taxFoncier = taxableFoncier * tmiPlusSocial
        const depreciationUsed = Math.min(input.depreciation.total, taxableFoncier)
        const advantage = Math.min(depreciationUsed * tmiPlusSocial, BAILLEUR_PRIVE_TAX_CAP_EUR)
        result.depreciationUsed = depreciationUsed
        result.taxable = taxableFoncier - depreciationUsed
        result.tax = taxFoncier - advantage
      } else {
        const chargesDeficit = Math.max(0, -afterCharges)
        const globalDeficitUsed = Math.min(DEFICIT_FONCIER_GLOBAL_CAP, chargesDeficit)
        addDeficit(state, input.y, chargesDeficit - globalDeficitUsed + interestDeficit)
        result.globalDeficitUsed = globalDeficitUsed
        result.taxable = 0
        result.tax = globalDeficitUsed > 0 ? -globalDeficitUsed * marginalTaxRate : 0
      }
      break
    }
    case 'none':
    default:
      break
  }

  return result
}

// ---------------------------------------------------------------------------
// Simulation année par année (partagée par tableau, graphiques et TRI)
// ---------------------------------------------------------------------------

type EngineYearRow = {
  year: number
  revenue: number
  rentHCEffective: number
  charges: number
  managementCost: number
  recoverablePaid: number
  credit: number
  interest: number
  principal: number
  crd: number
  insuranceCost: number
  depreciation: number
  cfBeforeTax: number
  base: number
  taxable: number
  tax: number
  carryforwardUsed: number
  globalDeficitUsed: number
  deficitRemaining: number
  depreciationReserve: number
  /** Cumul des amortissements admis en déduction à fin d'année (réintégration PV) */
  amortizationDeductedCum: number
}

function simulateYears(inputs: EngineInputs, numYears: number): EngineYearRow[] {
  const state = createFiscalState()
  const rows: EngineYearRow[] = []

  for (let y = 0; y < numYears; y++) {
    // L'assurance emprunteur n'est due que pendant la durée du prêt
    // (convention : calculée sur le capital initial — assurance groupe)
    const monthsWithLoan = Math.max(0, Math.min(12, inputs.loanDurationMonths - y * 12))
    const insuranceCost = inputs.monthlyInsurance * monthsWithLoan
    const credit = (inputs.schedule.paymentPerYear[y] ?? 0) + insuranceCost

    const revalFactor = Math.pow(1 + inputs.rentRevaluationRate, y)
    const rentHCEffective = inputs.monthlyRent * 12 * (1 - inputs.vacancyRate) * revalFactor
    // Charges récupérables : refacturées au locataire quand le bien est occupé…
    const recoverableReceived =
      inputs.monthlyRecoverableCharges * 12 * (1 - inputs.vacancyRate) * revalFactor
    // …mais payées à la copropriété toute l'année (la vacance reste à la charge du bailleur)
    const recoverablePaid = inputs.monthlyRecoverableCharges * 12 * revalFactor
    const cashIncome = rentHCEffective + recoverableReceived
    const managementCost = cashIncome * inputs.annualManagementPercent
    const operatingCharges =
      inputs.annualPropertyTax +
      inputs.annualNonRecoverableCharges +
      managementCost +
      inputs.annualMaintenance +
      inputs.annualInsurancePNO +
      inputs.otherAnnualExpenses +
      recoverablePaid

    const depreciation = computeDepreciationForYear(
      inputs.purchasePrice,
      inputs.notaryFees,
      inputs.agencyFees,
      inputs.renovationBudget,
      inputs.furnitureBudget,
      inputs.taxRegime,
      y,
      inputs.feesAmortizeYear1,
    )

    const fiscal = applyFiscalYear(
      inputs,
      {
        y,
        cashIncome,
        rentHCEffective,
        operatingCharges,
        interestAccrued: inputs.schedule.interestPerYear[y] ?? 0,
        interestPaid: inputs.schedule.interestPaidPerYear[y] ?? 0,
        loanCostsYear1: y === 0 ? inputs.loanFees + inputs.guaranteeFees : 0,
        acquisitionFeesExpensed: depreciation.acquisitionFees,
        insuranceCost,
        depreciation,
      },
      state,
    )

    const cfBeforeTax = cashIncome - operatingCharges - credit

    rows.push({
      year: y + 1,
      revenue: cashIncome,
      rentHCEffective,
      charges: operatingCharges,
      managementCost,
      recoverablePaid,
      credit,
      interest: inputs.schedule.interestPerYear[y] ?? 0,
      principal: inputs.schedule.principalPerYear[y] ?? 0,
      crd: inputs.schedule.balanceEndOfYear[y] ?? 0,
      insuranceCost,
      depreciation: depreciation.total,
      cfBeforeTax,
      base: fiscal.base,
      taxable: fiscal.taxable,
      tax: fiscal.tax,
      carryforwardUsed: fiscal.carryforwardUsed,
      globalDeficitUsed: fiscal.globalDeficitUsed,
      deficitRemaining: deficitRemaining(state),
      depreciationReserve: state.depreciationReserve,
      amortizationDeductedCum: state.amortizationDeducted,
    })
  }

  return rows
}

/**
 * Impôt dû sur la cession en fin d'année `saleYearIndex` (0-based).
 * - SCI IS : PV professionnelle = prix − VNC, imposée à l'IS MARGINAL de
 *   l'exercice (la tranche à 15 % n'est consommée qu'une fois par an).
 * - Autres régimes : PV des particuliers, avec réintégration des amortissements
 *   admis en déduction pour le LMNP réel (LF 2025).
 */
function computeSaleTaxForYear(
  inputs: EngineInputs,
  rows: EngineYearRow[],
  saleYearIndex: number,
  resalePrice: number,
): number {
  if (resalePrice <= 0 || inputs.taxRegime === 'none') return 0
  const row = rows[saleYearIndex]
  const holdingYears = saleYearIndex + 1

  if (inputs.taxRegime === 'sci_is') {
    const vnc = inputs.totalCost - (row?.amortizationDeductedCum ?? 0)
    const gain = Math.max(0, resalePrice - vnc)
    return computeMarginalIS(row?.taxable ?? 0, gain)
  }

  const amortizationToReintegrate =
    inputs.taxRegime === 'lmnp_reel' ? row?.amortizationDeductedCum ?? 0 : 0
  return computePVParticuliers(
    resalePrice,
    inputs.acquisitionCostForPV,
    holdingYears,
    amortizationToReintegrate,
  )
}

// ---------------------------------------------------------------------------
// API publique
// ---------------------------------------------------------------------------

export function calculateResults(values: SimulationFormValues): SimulationResults {
  const inputs = parseInputs(values)
  const [year1] = simulateYears(inputs, 1)

  const annualCashflow = year1.cfBeforeTax
  const monthlyCashflow = annualCashflow / 12

  let grossYield = 0
  let netYield = 0
  let cashOnCash = 0

  if (inputs.totalCost > 0) {
    // Rendement brut : définition usuelle = loyer annuel hors charges / coût total
    grossYield = (inputs.monthlyRent * 12) / inputs.totalCost
    netYield = (year1.revenue - year1.charges) / inputs.totalCost
  }
  if (inputs.ownFunds > 0) {
    cashOnCash = annualCashflow / inputs.ownFunds
  }

  const annualCashflowAfterTax = annualCashflow - year1.tax

  return {
    totalCost: inputs.totalCost,
    loanAmount: inputs.loanAmount,
    annualRentEffective: year1.revenue,
    annualCharges: year1.charges,
    annualLoanAndInsurance: year1.credit,
    annualCashflow,
    monthlyCashflow,
    grossYield,
    netYield,
    cashOnCash,
    annualTax: year1.tax,
    annualCashflowAfterTax,
    monthlyCashflowAfterTax: annualCashflowAfterTax / 12,
    annualDepreciation: year1.depreciation,
    microFoncierCapExceeded:
      inputs.taxRegime === 'micro_foncier' && inputs.monthlyRent * 12 > MICRO_FONCIER_CAP,
    microBicCapExceeded:
      inputs.taxRegime === 'lmnp_micro_bic' &&
      (inputs.monthlyRent + inputs.monthlyRecoverableCharges) * 12 > MICRO_BIC_CAP,
  }
}

export function computeLoanChartsData(
  values: SimulationFormValues,
): { year: number; principal: number; interest: number; ltv: number }[] {
  const inputs = parseInputs(values)
  if (inputs.loanAmount <= 0) return []

  const { schedule, totalCost } = inputs
  const data: { year: number; principal: number; interest: number; ltv: number }[] = []

  for (let y = 0; y < schedule.loanDurationYears; y++) {
    const principal = schedule.principalPerYear[y] ?? 0
    const interest = schedule.interestPerYear[y] ?? 0
    const balance = schedule.balanceEndOfYear[y] ?? 0
    const ltv = totalCost > 0 ? (balance / totalCost) * 100 : 0

    data.push({ year: y + 1, principal, interest, ltv })
  }

  return data
}

/**
 * TRI par Newton-Raphson, avec bissection en secours (convergence garantie
 * quand la fonction change de signe sur l'intervalle).
 * Retourne null si le TRI n'est pas calculable (apport nul, pas de changement
 * de signe, divergence) — à afficher « — », jamais 0 %.
 */
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

  // Newton-Raphson
  let r = 0.1
  for (let i = 0; i < maxIterations; i++) {
    const v = npv(r)
    const dv = npvDerivative(r)
    if (Math.abs(v) < 1e-9) return r
    if (dv === 0) break
    r = r - v / dv
    if (r <= -0.99) r = -0.98
    if (r > 10) break
  }
  if (r > -0.99 && r <= 10 && Math.abs(npv(r)) < 1e-6) return r

  // Bissection de secours sur [-0.99, 10]
  let lo = -0.9899
  let hi = 10
  let vLo = npv(lo)
  const vHi = npv(hi)
  if (vLo === 0) return lo
  if (vHi === 0) return hi
  if (Math.sign(vLo) === Math.sign(vHi)) return null
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    const vMid = npv(mid)
    if (Math.abs(vMid) < 1e-9 || hi - lo < 1e-9) return mid
    if (Math.sign(vMid) === Math.sign(vLo)) {
      lo = mid
      vLo = vMid
    } else {
      hi = mid
    }
  }
  return (lo + hi) / 2
}

export type IRRDetail = {
  year: number
  irr: number | null
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
): { year: number; irr: number | null; details?: IRRDetail['breakdown'] }[] {
  const inputs = parseInputs(values)

  // Valeurs par défaut si le projet de revente n'est pas renseigné :
  // prix de revente = prix d'achat, durée de détention = durée du prêt
  const resalePrice = toNumber(values.resalePrice ?? '0')
  const resaleHoldingMonthsInput = toNumber(values.resaleHoldingMonths ?? '0')
  const effectiveResalePrice = resalePrice > 0 ? resalePrice : inputs.purchasePrice
  const effectiveResaleHoldingMonths =
    resaleHoldingMonthsInput > 0 ? resaleHoldingMonthsInput : inputs.loanDurationMonths

  const numYears = Math.max(1, Math.ceil(Math.max(1, effectiveResaleHoldingMonths) / 12))
  const rows = simulateYears(inputs, numYears)

  const data: { year: number; irr: number | null; details?: IRRDetail['breakdown'] }[] = []

  for (let saleYear = 1; saleYear <= numYears; saleYear++) {
    const cashFlows: number[] = [-inputs.ownFunds]
    const saleYearIndex = saleYear - 1
    const saleTax = computeSaleTaxForYear(inputs, rows, saleYearIndex, effectiveResalePrice)
    const crdAtSale = rows[saleYearIndex]?.crd ?? 0

    const breakdown: IRRDetail['breakdown'] | undefined = includeDetails
      ? {
          initialInvestment: -inputs.ownFunds,
          annualCashflows: [],
          saleProceeds: effectiveResalePrice,
          saleTax,
          loanBalance: crdAtSale,
        }
      : undefined

    for (let y = 0; y < saleYear; y++) {
      const row = rows[y]
      let annualCashflow = row.cfBeforeTax - row.tax
      if (y === saleYearIndex) {
        annualCashflow += effectiveResalePrice - saleTax - crdAtSale
      }
      cashFlows.push(annualCashflow)
      if (breakdown) {
        breakdown.annualCashflows.push({
          year: y + 1,
          revenue: row.revenue,
          charges: row.charges,
          loanPayments: row.credit,
          tax: row.tax,
          cashflow: annualCashflow,
        })
      }
    }

    const irr = computeIRR(cashFlows)
    data.push({
      year: saleYear,
      irr: irr != null ? irr * 100 : null,
      details: breakdown,
    })
  }

  return data
}

export function computeYearlyChartData(
  values: SimulationFormValues,
): YearlyChartPoint[] {
  const inputs = parseInputs(values)

  const resaleHoldingMonths = Math.max(0, toNumber(values.resaleHoldingMonths ?? '0'))
  const resalePrice = toNumber(values.resalePrice ?? '0')
  const hasResale = resalePrice > 0 && resaleHoldingMonths > 0
  const numYears = hasResale
    ? Math.max(1, Math.ceil(resaleHoldingMonths / 12))
    : inputs.schedule.loanDurationYears
  const resaleYearIndex = hasResale ? numYears - 1 : -1

  const rows = simulateYears(inputs, numYears)

  let saleTax = 0
  let crdAtSale = 0
  let flatTaxAmount = 0
  if (hasResale && resaleYearIndex >= 0) {
    saleTax = computeSaleTaxForYear(inputs, rows, resaleYearIndex, resalePrice)
    crdAtSale = rows[resaleYearIndex]?.crd ?? 0

    // SCI IS + option retrait : PFU sur le boni de liquidation uniquement
    // (le remboursement de l'apport n'est pas un dividende)
    if (inputs.taxRegime === 'sci_is' && values.sciIsWithdrawFlatTax) {
      const sumAnnualAccumulated = rows.reduce((s, r) => s + (r.cfBeforeTax - r.tax), 0)
      const resaleNet = resalePrice - crdAtSale - saleTax
      const totalAccumulated = sumAnnualAccumulated + resaleNet
      flatTaxAmount = Math.max(0, totalAccumulated - inputs.ownFunds) * FLAT_TAX_RATE
    }
  }

  return rows.map((row, y) => {
    const isResaleYear = hasResale && y === resaleYearIndex
    const saleTaxTotal = isResaleYear ? saleTax + flatTaxAmount : 0
    const crd = isResaleYear ? crdAtSale : 0
    const totalCharges = row.charges + row.credit + row.tax + saleTaxTotal + crd
    const revenueWithResale = row.revenue + (isResaleYear ? resalePrice : 0)

    const breakdown: ChargesBreakdown = {
      propertyTax: inputs.annualPropertyTax,
      copro: inputs.annualNonRecoverableCharges + row.recoverablePaid,
      management: row.managementCost,
      maintenance: inputs.annualMaintenance,
      insurance: inputs.annualInsurancePNO,
      other: inputs.otherAnnualExpenses,
      loanAndInsurance: row.credit,
      depreciation: row.depreciation,
      carryforwardUsed: row.carryforwardUsed,
      tax: row.tax,
    }
    if (saleTaxTotal > 0) {
      breakdown.saleTax = saleTaxTotal
      if (flatTaxAmount > 0) {
        breakdown.corporateTaxOnGain = saleTax
        breakdown.flatTax = flatTaxAmount
      }
    }

    return {
      year: `${row.year}`,
      revenue: revenueWithResale,
      charges: -totalCharges,
      cashflow: revenueWithResale - totalCharges,
      chargesBreakdown: breakdown,
      ...(isResaleYear ? { resalePrice } : {}),
    }
  })
}

export type FlatTaxDetail = {
  annualAccumulated: { year: number; amount: number; cfBeforeTax: number; corporateTax: number }[]
  resaleNet: number
  resalePrice: number
  crdAtResale: number
  corporateTaxOnGain: number
  totalAccumulated: number
  /** Apport remboursé en franchise d'impôt (le PFU ne frappe que le boni) */
  ownFundsReturned: number
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
  /** Déficit foncier imputé sur le revenu global (max 10 700 €/an) */
  globalDeficitUsed: number
  /** Déficit reportable restant à fin d'année (cumulé non encore consommé) */
  deficitRemaining: number
  /** Réserve d'amortissement LMNP réel (reportée sans limite) */
  depreciationReserve: number
  cashDispo: number
  saleTax: number
  resalePrice: number
  /** Détail du calcul PFU (si SCI IS + option retrait activée et année de revente) */
  flatTaxDetail?: FlatTaxDetail
}

export function computeYearlyTableData(
  values: SimulationFormValues,
): YearlyTableRow[] {
  const inputs = parseInputs(values)

  const resaleHoldingMonths = Math.max(0, toNumber(values.resaleHoldingMonths ?? '0'))
  const resalePrice = toNumber(values.resalePrice ?? '0')
  const hasResale = resalePrice > 0 && resaleHoldingMonths > 0
  const numYears = hasResale
    ? Math.max(1, Math.ceil(resaleHoldingMonths / 12))
    : inputs.schedule.loanDurationYears
  const resaleYearIndex = hasResale ? numYears - 1 : -1

  const rows = simulateYears(inputs, numYears)

  let saleTax = 0
  let crdAtSale = 0
  if (hasResale && resaleYearIndex >= 0) {
    saleTax = computeSaleTaxForYear(inputs, rows, resaleYearIndex, resalePrice)
    crdAtSale = rows[resaleYearIndex]?.crd ?? 0
  }

  const data: YearlyTableRow[] = rows.map((row, y) => {
    const isResaleYear = hasResale && y === resaleYearIndex
    const cashDispo =
      row.cfBeforeTax -
      row.tax -
      (isResaleYear ? saleTax : 0) +
      (isResaleYear ? resalePrice : 0) -
      (isResaleYear ? crdAtSale : 0)

    return {
      year: row.year,
      credit: row.credit,
      interest: row.interest,
      principal: row.principal,
      crd: row.crd,
      rent: row.revenue,
      charges: row.charges,
      cfBeforeTax: row.cfBeforeTax,
      depreciation: row.depreciation,
      taxBase: row.base,
      tax: row.tax,
      carryforwardUsed: row.carryforwardUsed,
      globalDeficitUsed: row.globalDeficitUsed,
      deficitRemaining: row.deficitRemaining,
      depreciationReserve: row.depreciationReserve,
      cashDispo,
      saleTax: isResaleYear ? saleTax : 0,
      resalePrice: isResaleYear ? resalePrice : 0,
    }
  })

  // SCI IS + option retrait : PFU sur le boni de liquidation uniquement
  // (l'apport initial est remboursé en franchise d'impôt)
  if (
    inputs.taxRegime === 'sci_is' &&
    hasResale &&
    values.sciIsWithdrawFlatTax &&
    data.length > 0 &&
    resaleYearIndex >= 0
  ) {
    const annualAccumulated = data.map((row) => ({
      year: row.year,
      amount: row.cfBeforeTax - row.tax,
      cfBeforeTax: row.cfBeforeTax,
      corporateTax: row.tax,
    }))
    const sumAnnualAccumulated = annualAccumulated.reduce((s, a) => s + a.amount, 0)
    const resaleRow = data[resaleYearIndex]
    const corporateTaxOnGain = saleTax
    const resaleNet = resalePrice - crdAtSale - corporateTaxOnGain
    const totalAccumulated = sumAnnualAccumulated + resaleNet
    const ownFundsReturned = Math.min(inputs.ownFunds, Math.max(0, totalAccumulated))
    const flatTaxAmount = Math.max(0, totalAccumulated - inputs.ownFunds) * FLAT_TAX_RATE
    const totalResaleTax = corporateTaxOnGain + flatTaxAmount

    resaleRow.saleTax = totalResaleTax
    resaleRow.cashDispo =
      resaleRow.cfBeforeTax - resaleRow.tax - totalResaleTax + resalePrice - crdAtSale

    resaleRow.flatTaxDetail = {
      annualAccumulated,
      resaleNet,
      resalePrice,
      crdAtResale: crdAtSale,
      corporateTaxOnGain,
      totalAccumulated,
      ownFundsReturned,
      flatTaxRate: FLAT_TAX_RATE,
      flatTaxAmount,
      totalResaleTax,
    }
  }

  return data
}
