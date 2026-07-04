import { describe, expect, it } from 'vitest'
import { computeFlipResults } from './computeFlipResults'
import type { LotItem, MarchandDeBiensValues } from '../model/types'
import { MB_INITIAL } from '../model/types'

let lotCounter = 0
function lot(tvaRegime: LotItem['tvaRegime'], resalePrice: string): LotItem {
  return {
    id: `test-lot-${lotCounter++}`,
    type: 'appartement-t2',
    tvaRegime,
    superficie: '45',
    resalePrice,
  }
}

function makeValues(overrides: Partial<MarchandDeBiensValues>): MarchandDeBiensValues {
  return {
    ...MB_INITIAL,
    purchasePrice: '100000',
    agencyFees: '0',
    notaryFeesOverride: '',
    terrainProportion: '',
    apartments: [],
    huissierFees: '',
    geometreFees: '',
    architecteFees: '',
    fraisDivers: '',
    travauxHT: '0',
    travaux55: '',
    travaux10: '',
    travaux20: '',
    travauxDetailOpen: false,
    extraCharges: [],
    apportPercent: '100', // pas de financement par défaut → pas de frais financiers
    ratePerYear: '0',
    durationMonths: '12',
    ...overrides,
  }
}

describe('TVA sur marge — assiette légale (art. 268 CGI)', () => {
  it('marge taxable = prix de vente − quote-part du prix d’acquisition (achat + notaire)', () => {
    const r = computeFlipResults(
      makeValues({ apartments: [lot('marge', '200000')] }),
    )
    // Notaire auto 3 % → prix d'acquisition = 103 000 €
    expect(r.acquisitionBase).toBeCloseTo(103000, 2)
    expect(r.margeTaxable).toBeCloseTo(200000 - 103000, 2)
    expect(r.tvaSurMarge).toBeCloseTo(97000 * (0.2 / 1.2), 2)
  })

  it('les travaux ne réduisent PAS la marge taxable — leur TVA se déduit à part', () => {
    const sans = computeFlipResults(makeValues({ apartments: [lot('marge', '200000')] }))
    const avec = computeFlipResults(
      makeValues({ apartments: [lot('marge', '200000')], travauxHT: '20000' }),
    )
    // Même assiette de TVA sur marge…
    expect(avec.margeTaxable).toBeCloseTo(sans.margeTaxable, 2)
    expect(avec.tvaSurMarge).toBeCloseTo(sans.tvaSurMarge, 2)
    // …mais 2 000 € de TVA travaux (10 %) déductibles en plus
    expect(avec.tvaDeductible - sans.tvaDeductible).toBeCloseTo(2000, 2)
    expect(avec.tvaNette).toBeCloseTo(sans.tvaNette - 2000, 2)
  })

  it('un crédit de TVA n’est pas écrasé (F20) et améliore la marge nette', () => {
    // Vente à peine au-dessus du prix d'acquisition → TVA marge ≈ 0, travaux déductibles
    const r = computeFlipResults(
      makeValues({ apartments: [lot('marge', '100000')], travauxHT: '20000' }),
    )
    expect(r.tvaSurMarge).toBe(0)
    expect(r.tvaNette).toBeCloseTo(-2000, 2) // crédit remboursable
    // Le crédit augmente la marge nette (− (−2000) = +2000)
    const coutTotal = r.totalCostForMarge
    expect(r.margeNetteAvantIS).toBeCloseTo(100000 - coutTotal + 2000, 2)
  })

  it('les ventes exonérées réduisent la part de TVA déductible', () => {
    const r = computeFlipResults(
      makeValues({
        apartments: [lot('exonere', '100000'), lot('marge', '100000')],
        travauxHT: '20000',
      }),
    )
    expect(r.deductibleShare).toBeCloseTo(0.5, 6)
    expect(r.tvaDeductible).toBeCloseTo(1000, 2) // 2 000 × 50 %
  })

  it('TVA sur prix total : TVA collectée = prix TTC × 20/120', () => {
    const r = computeFlipResults(makeValues({ apartments: [lot('total', '120000')] }))
    expect(r.tvaCollecteeTotal).toBeCloseTo(20000, 2)
  })
})

describe('garde-fous d’allocation (F22)', () => {
  it('le coût alloué aux lots exonérés ne devient jamais négatif', () => {
    const r = computeFlipResults(
      makeValues({
        apartments: [lot('marge', '100000'), lot('total', '100000')],
        terrainProportion: '90', // manuel : 90 % + 50 % de lots total > 100 %
      }),
    )
    expect(r.coutAlloueExonere).toBeGreaterThanOrEqual(0)
    expect(r.ratioMarge + r.ratioTotal).toBeLessThanOrEqual(1.000001)
  })
})

describe('résultat fiscal (IS + flat tax centralisés)', () => {
  it('IS à deux tranches sur le bénéfice', () => {
    const r = computeFlipResults(makeValues({ apartments: [lot('marge', '200000')] }))
    const expectedIS =
      Math.min(r.beneficeImposable, 42500) * 0.15 +
      Math.max(0, r.beneficeImposable - 42500) * 0.25
    expect(r.impotsSocietes).toBeCloseTo(expectedIS, 2)
  })

  it('flat tax 31,4 % sur les bénéfices nets distribués', () => {
    const r = computeFlipResults(makeValues({ apartments: [lot('marge', '200000')] }))
    expect(r.flatTaxRate).toBe(0.314)
    expect(r.flatTax).toBeCloseTo(Math.max(0, r.beneficesNets) * 0.314, 2)
    expect(r.dividendesEnPoche).toBeCloseTo(r.beneficesNets - r.flatTax, 2)
  })

  it('pas d’IS ni de flat tax en cas de perte', () => {
    const r = computeFlipResults(makeValues({ apartments: [lot('marge', '50000')] }))
    expect(r.margeNetteAvantIS).toBeLessThan(0)
    expect(r.impotsSocietes).toBe(0)
    expect(r.flatTax).toBe(0)
  })
})

describe('cohérence des hypothèses (F12)', () => {
  it('respecte les frais de notaire saisis manuellement', () => {
    const auto = computeFlipResults(makeValues({ apartments: [lot('marge', '200000')] }))
    const manuel = computeFlipResults(
      makeValues({ apartments: [lot('marge', '200000')], notaryFeesOverride: '10000' }),
    )
    expect(auto.effectiveNotaryFees).toBeCloseTo(3000, 2)
    expect(manuel.effectiveNotaryFees).toBe(10000)
    expect(manuel.acquisitionBase).toBe(110000)
  })

  it('utilise le détail des travaux par taux de TVA quand il est ouvert', () => {
    const r = computeFlipResults(
      makeValues({
        apartments: [lot('marge', '200000')],
        travauxDetailOpen: true,
        travaux55: '10000',
        travaux10: '10000',
        travaux20: '10000',
      }),
    )
    expect(r.travauxHT).toBe(30000)
    expect(r.tvaTravaux).toBeCloseTo(10000 * 0.055 + 10000 * 0.1 + 10000 * 0.2, 2)
  })

  it('intègre les frais financiers dans le coût de revient', () => {
    const r = computeFlipResults(
      makeValues({
        apartments: [lot('marge', '200000')],
        apportPercent: '20',
        ratePerYear: '6',
        durationMonths: '12',
      }),
    )
    // In fine : 80 % du montant d'opération × 6 % × 12/12
    expect(r.financialCost).toBeCloseTo(r.financementAmount * 0.06, 2)
    expect(r.totalCostForMarge).toBeCloseTo(r.amountOfOperation + r.financialCost, 2)
  })

  it('gère la virgule décimale française dans les saisies', () => {
    const r = computeFlipResults(
      makeValues({ apartments: [lot('marge', '200000,50')] }),
    )
    expect(r.totalRevente).toBeCloseTo(200000.5, 2)
  })
})
