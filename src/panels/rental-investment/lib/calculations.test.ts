import { describe, expect, it } from 'vitest'
import {
  calculateResults,
  computeAmortizationSchedule,
  computeIRRByYearData,
  computeYearlyTableData,
} from './calculations'
import type { SimulationFormValues } from '../model/types'
import { INITIAL_VALUES } from '../model/types'

/** Simulation de base neutre : tout à zéro sauf ce que le test précise. */
function makeValues(overrides: Partial<SimulationFormValues>): SimulationFormValues {
  return {
    ...INITIAL_VALUES,
    purchasePrice: '100000',
    notaryFeesOverride: '0',
    agencyFees: '0',
    renovationBudget: '0',
    furnitureBudget: '0',
    ownFunds: '0',
    interestRate: '0',
    insuranceRate: '0',
    loanFees: '0',
    guaranteeFees: '0',
    loanDurationMonths: '240',
    deferralMonths: '0',
    deferralType: 'none',
    monthlyRent: '0',
    monthlyRecoverableCharges: '0',
    rentRevaluationPercent: '0',
    vacancyRate: '0',
    annualPropertyTax: '0',
    annualNonRecoverableCharges: '0',
    annualManagementPercent: '0',
    annualMaintenance: '0',
    annualInsurancePNO: '0',
    otherAnnualExpenses: '0',
    taxRegime: 'none',
    feesAmortizeYear1: false,
    marginalTaxRate: '30',
    socialChargesRate: '17.2',
    corporateTaxRate: '25',
    resaleHoldingMonths: '',
    resalePrice: '',
    sciIsWithdrawFlatTax: false,
    reducedNotaryFees: false,
    ...overrides,
  }
}

describe('computeAmortizationSchedule', () => {
  it('calcule la mensualité classique (100 k€, 3 %, 240 mois → ≈ 554,60 €/mois)', () => {
    const s = computeAmortizationSchedule(100000, 240, 0.03 / 12, 0, 'none')
    expect(s.paymentPerYear[0]).toBeCloseTo(554.5976 * 12, 0)
    // Le capital remboursé sur la vie du prêt = montant emprunté
    const totalPrincipal = s.principalPerYear.reduce((a, b) => a + b, 0)
    expect(totalPrincipal).toBeCloseTo(100000, 1)
    expect(s.balanceEndOfYear[19]).toBeCloseTo(0, 1)
  })

  it('prêt à taux 0 % : paiements annuels corrects (bug des accumulateurs écrasés)', () => {
    // Avant correction : 120 000 € / 120 mois / 0 % affichait 1 000 €/an au lieu de 12 000 €
    const s = computeAmortizationSchedule(120000, 120, 0, 0, 'none')
    for (let y = 0; y < 10; y++) {
      expect(s.paymentPerYear[y]).toBeCloseTo(12000, 6)
      expect(s.principalPerYear[y]).toBeCloseTo(12000, 6)
      expect(s.interestPerYear[y]).toBe(0)
    }
    const totalPrincipal = s.principalPerYear.reduce((a, b) => a + b, 0)
    expect(totalPrincipal).toBeCloseTo(120000, 6)
  })

  it('différé total : intérêts capitalisés courus mais non décaissés', () => {
    const s = computeAmortizationSchedule(100000, 240, 0.03 / 12, 12, 'total')
    // Année 1 : aucun décaissement
    expect(s.paymentPerYear[0]).toBe(0)
    expect(s.interestPaidPerYear[0]).toBe(0)
    // …mais des intérêts courus (capitalisés)
    expect(s.interestPerYear[0]).toBeGreaterThan(0)
  })

  it('différé partiel : les intérêts sont payés pendant le différé', () => {
    const s = computeAmortizationSchedule(100000, 240, 0.03 / 12, 12, 'partial')
    expect(s.paymentPerYear[0]).toBeCloseTo(3000, 0)
    expect(s.interestPaidPerYear[0]).toBeCloseTo(3000, 0)
    expect(s.principalPerYear[0]).toBe(0)
  })
})

describe('assurance emprunteur', () => {
  it('cesse à la fin du prêt même si la détention continue (F6)', () => {
    const rows = computeYearlyTableData(
      makeValues({
        purchasePrice: '100000',
        ownFunds: '0',
        interestRate: '3',
        insuranceRate: '0.36',
        loanDurationMonths: '12',
        monthlyRent: '800',
        resalePrice: '100000',
        resaleHoldingMonths: '36',
      }),
    )
    expect(rows).toHaveLength(3)
    // Année 1 : crédit + assurance présents
    expect(rows[0].credit).toBeGreaterThan(0)
    // Années 2 et 3 : prêt terminé → plus AUCUNE charge de crédit ni d'assurance
    expect(rows[1].credit).toBe(0)
    expect(rows[2].credit).toBe(0)
  })

  it('est déductible fiscalement au réel (F7) : à loyers égaux, la base LMNP réel baisse', () => {
    const base = {
      purchasePrice: '100000',
      ownFunds: '0',
      interestRate: '3',
      loanDurationMonths: '240',
      monthlyRent: '1500',
      taxRegime: 'lmnp_reel' as const,
      feesAmortizeYear1: false,
    }
    const sansAssurance = calculateResults(makeValues({ ...base, insuranceRate: '0' }))
    const avecAssurance = calculateResults(makeValues({ ...base, insuranceRate: '0.5' }))
    // L'assurance (500 €/an ici) réduit l'impôt au réel
    expect(avecAssurance.annualTax).toBeLessThan(sansAssurance.annualTax)
  })
})

describe('charges récupérables (F8)', () => {
  it('sont neutres en cash-flow hors vacance (encaissées puis reversées à la copro)', () => {
    const sans = calculateResults(
      makeValues({ monthlyRent: '700', monthlyRecoverableCharges: '0', vacancyRate: '0' }),
    )
    const avec = calculateResults(
      makeValues({ monthlyRent: '700', monthlyRecoverableCharges: '80', vacancyRate: '0' }),
    )
    expect(avec.annualCashflow).toBeCloseTo(sans.annualCashflow, 6)
  })

  it('coûtent au bailleur pendant la vacance (payées à la copro, non refacturées)', () => {
    const avec = calculateResults(
      makeValues({ monthlyRent: '700', monthlyRecoverableCharges: '100', vacancyRate: '10' }),
    )
    const sans = calculateResults(
      makeValues({ monthlyRent: '700', monthlyRecoverableCharges: '0', vacancyRate: '10' }),
    )
    // Écart = 100 € × 12 × 10 % de vacance = 120 €/an à la charge du bailleur
    expect(sans.annualCashflow - avec.annualCashflow).toBeCloseTo(120, 4)
  })

  it('sont exclues de la base micro-foncier (abattement sur loyers HC)', () => {
    const r = calculateResults(
      makeValues({
        monthlyRent: '1000',
        monthlyRecoverableCharges: '200',
        vacancyRate: '0',
        taxRegime: 'micro_foncier',
      }),
    )
    // Base = 12 000 × 70 % = 8 400 → impôt = 8 400 × 47,2 %
    expect(r.annualTax).toBeCloseTo(8400 * 0.472, 2)
  })

  it('sont incluses dans les recettes micro-BIC (loyers charges comprises)', () => {
    const r = calculateResults(
      makeValues({
        monthlyRent: '1000',
        monthlyRecoverableCharges: '200',
        vacancyRate: '0',
        taxRegime: 'lmnp_micro_bic',
      }),
    )
    // Base = 14 400 × 50 % = 7 200 → impôt = 7 200 × 47,2 %
    expect(r.annualTax).toBeCloseTo(7200 * 0.472, 2)
  })
})

describe('rendement brut (définition usuelle)', () => {
  it('= loyer annuel hors charges / coût total, sans vacance ni charges récupérables', () => {
    const r = calculateResults(
      makeValues({
        purchasePrice: '100000',
        monthlyRent: '500',
        monthlyRecoverableCharges: '100',
        vacancyRate: '10',
      }),
    )
    expect(r.grossYield).toBeCloseTo(6000 / 100000, 6)
  })
})

describe('déficit foncier (F9 — art. 156 CGI)', () => {
  it('impute jusqu’à 10 700 € sur le revenu global → économie d’impôt au TMI (sans PS)', () => {
    const r = calculateResults(
      makeValues({
        purchasePrice: '100000',
        ownFunds: '100000', // pas d'emprunt : déficit 100 % « hors intérêts »
        monthlyRent: '500',
        annualMaintenance: '15000', // 6 000 − 15 000 = −9 000 de déficit
        taxRegime: 'reel_foncier',
        marginalTaxRate: '30',
      }),
    )
    // Économie = 9 000 × 30 % (TMI seul, pas de prélèvements sociaux)
    expect(r.annualTax).toBeCloseTo(-2700, 2)
  })

  it('plafonne l’imputation à 10 700 €, reporte le surplus et le consomme plus tard', () => {
    const rows = computeYearlyTableData(
      makeValues({
        purchasePrice: '100000',
        ownFunds: '100000',
        monthlyRent: '2000',
        rentRevaluationPercent: '100', // loyer doublé en année 2 → résultat positif
        otherAnnualExpenses: '43000', // année 1 : 24 000 − 43 000 = −19 000
        taxRegime: 'reel_foncier',
        marginalTaxRate: '30',
        resalePrice: '100000',
        resaleHoldingMonths: '24',
      }),
    )
    // Année 1 : imputation globale plafonnée à 10 700 € → économie 3 210 €
    expect(rows[0].globalDeficitUsed).toBeCloseTo(10700, 2)
    expect(rows[0].tax).toBeCloseTo(-10700 * 0.3, 2)
    // Report = 19 000 − 10 700 = 8 300 €
    expect(rows[0].deficitRemaining).toBeCloseTo(8300, 2)
    // Année 2 : 48 000 − 43 000 = 5 000 de bénéfice → consomme 5 000 du report
    expect(rows[1].carryforwardUsed).toBeCloseTo(5000, 2)
    expect(rows[1].tax).toBe(0)
    expect(rows[1].deficitRemaining).toBeCloseTo(3300, 2)
  })

  it('le déficit issu des intérêts d’emprunt ne s’impute PAS sur le revenu global', () => {
    // Cas d'école : intérêts seuls supérieurs aux loyers
    const r = calculateResults(
      makeValues({
        purchasePrice: '200000',
        ownFunds: '0',
        interestRate: '6', // ≈ 11 900 € d'intérêts année 1
        loanDurationMonths: '300',
        monthlyRent: '500', // 6 000 € de loyers < intérêts
        taxRegime: 'reel_foncier',
      }),
    )
    // Aucune économie d'impôt au global : déficit 100 % intérêts → report foncier uniquement
    expect(r.annualTax).toBe(0)
  })
})

describe('LMNP réel — art. 39 C (réserve d’amortissement)', () => {
  it('l’amortissement ne crée pas de déficit : l’excédent part en réserve', () => {
    const rows = computeYearlyTableData(
      makeValues({
        purchasePrice: '100000',
        ownFunds: '100000',
        monthlyRent: '100', // résultat avant amortissement très faible
        taxRegime: 'lmnp_reel',
        resalePrice: '100000',
        resaleHoldingMonths: '24',
      }),
    )
    // Amortissement bâti = 100 000 × 80 % × 2,5 % = 2 000/an ; résultat avant amort = 1 200
    expect(rows[0].tax).toBe(0)
    expect(rows[0].depreciationReserve).toBeCloseTo(800, 2) // 2 000 dispo − 1 200 utilisés
  })
})

describe('plus-value à la revente', () => {
  it('LMNP réel : réintègre les amortissements déduits (F2 — LF 2025)', () => {
    const common = {
      purchasePrice: '100000',
      ownFunds: '100000',
      monthlyRent: '1200',
      resalePrice: '150000',
      resaleHoldingMonths: '60',
    }
    const lmnp = computeYearlyTableData(makeValues({ ...common, taxRegime: 'lmnp_reel' }))
    const foncier = computeYearlyTableData(makeValues({ ...common, taxRegime: 'reel_foncier' }))
    const saleTaxLmnp = lmnp[lmnp.length - 1].saleTax
    const saleTaxFoncier = foncier[foncier.length - 1].saleTax
    // Mêmes chiffres, mais le LMNP a déduit ~2 000 €/an d'amortissements
    // → sa PV imposable est plus grande → impôt de cession plus élevé
    expect(saleTaxLmnp).toBeGreaterThan(saleTaxFoncier)
  })

  it('vente en année 1 : traitée par le moteur général, loyers inclus (F5)', () => {
    const data = computeIRRByYearData(
      makeValues({
        purchasePrice: '100000',
        ownFunds: '20000',
        interestRate: '3',
        monthlyRent: '800',
        taxRegime: 'reel_foncier',
        resalePrice: '110000',
        resaleHoldingMonths: '60',
      }),
      true,
    )
    const year1 = data[0]
    expect(year1.details?.annualCashflows).toHaveLength(1)
    // Les loyers de l'année 1 sont bien comptés
    expect(year1.details?.annualCashflows[0].revenue).toBeCloseTo(9600, 0)
    // L'impôt de cession suit le régime des particuliers (PV 10 000 € → 19 % + 17,2 %)
    expect(year1.details?.saleTax).toBeCloseTo(10000 * 0.362, 0)
  })
})

describe('TRI (F14)', () => {
  it('retourne null (pas 0 %) quand l’apport est nul — financement à 110 %', () => {
    const data = computeIRRByYearData(
      makeValues({
        purchasePrice: '100000',
        ownFunds: '0',
        interestRate: '3',
        monthlyRent: '900',
        resalePrice: '120000',
        resaleHoldingMonths: '120',
      }),
    )
    for (const point of data) {
      expect(point.irr).toBeNull()
    }
  })

  it('calcule un TRI plausible avec apport', () => {
    const data = computeIRRByYearData(
      makeValues({
        purchasePrice: '100000',
        ownFunds: '20000',
        interestRate: '3',
        monthlyRent: '900',
        resalePrice: '120000',
        resaleHoldingMonths: '120',
      }),
    )
    const last = data[data.length - 1]
    expect(last.irr).not.toBeNull()
    expect(last.irr!).toBeGreaterThan(0)
    expect(last.irr!).toBeLessThan(100)
  })
})

describe('SCI IS', () => {
  it('flat tax appliquée au boni seulement : l’apport remboursé n’est pas taxé (F10)', () => {
    const rows = computeYearlyTableData(
      makeValues({
        purchasePrice: '100000',
        ownFunds: '40000',
        interestRate: '3',
        monthlyRent: '900',
        taxRegime: 'sci_is',
        sciIsWithdrawFlatTax: true,
        resalePrice: '130000',
        resaleHoldingMonths: '120',
      }),
    )
    const detail = rows[rows.length - 1].flatTaxDetail
    expect(detail).toBeDefined()
    // PFU = 31,4 % × (total accumulé − apport), jamais sur l'apport lui-même
    expect(detail!.flatTaxAmount).toBeCloseTo(
      Math.max(0, detail!.totalAccumulated - 40000) * 0.314,
      2,
    )
  })

  it('la tranche IS à 15 % ne se cumule pas entre résultat courant et PV de cession (F13)', () => {
    const rows = computeYearlyTableData(
      makeValues({
        purchasePrice: '100000',
        ownFunds: '100000',
        monthlyRent: '2000', // résultat courant confortable
        taxRegime: 'sci_is',
        feesAmortizeYear1: false,
        resalePrice: '200000',
        resaleHoldingMonths: '12',
      }),
    )
    const row = rows[0]
    // VNC = 100 000 − 2 000 (amort année 1) = 98 000 → gain = 102 000
    // Le résultat courant a déjà entamé la tranche 15 % : le gain doit être taxé
    // à l'IS marginal, pas repartir de zéro.
    const gain = 200000 - (100000 - 2000)
    const operatingTaxable = row.taxBase // pas de report ici
    const expectedFullIS =
      Math.min(operatingTaxable + gain, 42500) * 0.15 +
      Math.max(0, operatingTaxable + gain - 42500) * 0.25
    const expectedOperatingIS =
      Math.min(operatingTaxable, 42500) * 0.15 + Math.max(0, operatingTaxable - 42500) * 0.25
    expect(row.saleTax).toBeCloseTo(expectedFullIS - expectedOperatingIS, 0)
  })
})

describe('cohérence inter-vues', () => {
  it('le TRI et le tableau annuel utilisent exactement les mêmes flux', () => {
    const values = makeValues({
      purchasePrice: '150000',
      ownFunds: '30000',
      interestRate: '3.5',
      insuranceRate: '0.3',
      monthlyRent: '850',
      annualPropertyTax: '1100',
      taxRegime: 'lmnp_reel',
      resalePrice: '180000',
      resaleHoldingMonths: '120',
    })
    const table = computeYearlyTableData(values)
    const irr = computeIRRByYearData(values, true)
    const lastIrr = irr[irr.length - 1]
    // Les flux annuels du TRI (hors année de vente) = cash dispo du tableau
    for (let y = 0; y < table.length - 1; y++) {
      expect(lastIrr.details!.annualCashflows[y].cashflow).toBeCloseTo(
        table[y].cfBeforeTax - table[y].tax,
        4,
      )
    }
    // Même impôt de cession dans les deux vues
    expect(lastIrr.details!.saleTax).toBeCloseTo(table[table.length - 1].saleTax, 4)
  })
})
