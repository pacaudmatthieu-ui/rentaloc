import { toNumber } from '../../../shared/lib/format'
import { computeIS, FLAT_TAX_RATE, IS_REDUCED_THRESHOLD, IS_REDUCED_RATE, IS_STANDARD_RATE } from '../../../entities/finance/fiscal'
import type { MarchandDeBiensValues } from '../model/types'

/** Frais de notaire réduits marchand de biens (engagement de revendre, art. 1115 CGI) */
export const MB_NOTARY_RATE = 0.03
export const VAT_STANDARD_RATE = 0.2
export const VAT_TRAVAUX_DEFAULT_RATE = 0.1

export type FlipResults = {
  // Acquisition
  purchasePrice: number
  autoNotaryFees: number
  effectiveNotaryFees: number
  isNotaryManual: boolean
  agencyFees: number
  // Charges & travaux
  travauxHT: number
  tvaTravaux: number
  autresChargesHT: number
  /** TVA sur travaux + autres charges (hors agence, comptée à part) */
  tvaCharges: number
  totalChargesHT: number
  totalChargesTTC: number
  // Financement (crédit in fine, tirage intégral dès le jour 1 — convention prudente)
  amountOfOperation: number
  apportAmount: number
  financementAmount: number
  monthlyPayment: number
  financialCost: number
  /** Coût de revient économique complet (TTC + frais financiers) */
  totalCostForMarge: number
  // Lots
  totalRevente: number
  totalExonere: number
  totalMarge: number
  totalTvaTotal: number
  nbExonere: number
  nbMarge: number
  nbTotal: number
  hasLotsMarge: boolean
  autoTerrainProportion: number
  effectiveTerrainProportion: number
  isTerrainProportionManual: boolean
  ratioMarge: number
  ratioTotal: number
  ratioExonere: number
  // Coûts alloués par bloc (vision économique, pour l'affichage)
  coutAlloueMarge: number
  coutAlloueTotal: number
  coutAlloueExonere: number
  // TVA — art. 268 CGI
  /** Prix d'acquisition au sens de la TVA sur marge : prix d'achat + frais d'acte */
  acquisitionBase: number
  /** Quote-part du prix d'acquisition allouée aux lots en TVA sur marge */
  acquisitionAlloueMarge: number
  /** Marge taxable = prix de vente TTC des lots marge − quote-part du prix d'acquisition */
  margeTaxable: number
  tvaSurMarge: number
  /** TVA collectée sur les lots vendus en TVA sur prix total */
  tvaCollecteeTotal: number
  /** Part du chiffre d'affaires ouvrant droit à déduction (lots taxés / total) */
  deductibleShare: number
  tvaDeductibleBrute: number
  tvaDeductible: number
  /** TVA nette due — négative = crédit de TVA remboursable */
  tvaNette: number
  // Résultat
  margeNetteAvantIS: number
  margePercent: number | null
  beneficeImposable: number
  isTranche1: number
  isTranche2: number
  impotsSocietes: number
  beneficesNets: number
  flatTax: number
  flatTaxRate: number
  dividendesEnPoche: number
  // Rendements
  roiFondsPropres: number | null
  /** Rendement annualisé sur fonds propres (durée < 12 mois → annualisation) */
  annualizedReturnOnEquity: number | null
  durationMonths: number
}

/**
 * Moteur de calcul UNIQUE du bilan marchand de biens.
 * Utilisé par le panneau MDB, la comparaison et le store — les mêmes hypothèses
 * produisent les mêmes chiffres partout.
 *
 * TVA sur marge (art. 268 CGI) : la marge taxable est la différence entre le
 * prix de vente et le PRIX D'ACQUISITION (prix payé au vendeur + frais d'acte).
 * Les travaux, honoraires et frais financiers n'entrent PAS dans ce calcul :
 * leur TVA se récupère séparément (dans la limite de la part d'activité taxée).
 */
export function computeFlipResults(values: MarchandDeBiensValues): FlipResults {
  const purchasePrice = toNumber(values.purchasePrice)
  const agencyFees = toNumber(values.agencyFees)
  const autoNotaryFees = purchasePrice * MB_NOTARY_RATE
  const isNotaryManual = values.notaryFeesOverride !== ''
  const effectiveNotaryFees = isNotaryManual
    ? toNumber(values.notaryFeesOverride)
    : autoNotaryFees

  // Travaux : détail par taux de TVA (5,5 / 10 / 20 %) ou champ global à 10 %
  const t55 = toNumber(values.travaux55)
  const t10 = toNumber(values.travaux10)
  const t20 = toNumber(values.travaux20)
  const travauxGlobal = toNumber(values.travauxHT)
  const travauxHT = values.travauxDetailOpen ? t55 + t10 + t20 : travauxGlobal
  const tvaTravaux = values.travauxDetailOpen
    ? t55 * 0.055 + t10 * 0.1 + t20 * 0.2
    : travauxGlobal * VAT_TRAVAUX_DEFAULT_RATE

  const extraChargesTotal = (values.extraCharges ?? []).reduce(
    (s, c) => s + toNumber(c.amount),
    0,
  )
  const autresChargesHT =
    toNumber(values.huissierFees) +
    toNumber(values.geometreFees) +
    toNumber(values.architecteFees) +
    toNumber(values.fraisDivers) +
    extraChargesTotal

  const tvaAutresCharges = autresChargesHT * VAT_STANDARD_RATE
  // Frais d'agence saisis TTC
  const tvaAgence = agencyFees * (VAT_STANDARD_RATE / (1 + VAT_STANDARD_RATE))

  const tvaCharges = tvaTravaux + tvaAutresCharges
  const totalChargesHT = autresChargesHT + travauxHT
  const totalChargesTTC = totalChargesHT + tvaCharges

  const amountOfOperation =
    purchasePrice + effectiveNotaryFees + agencyFees + totalChargesTTC

  const apportAmount = amountOfOperation * (toNumber(values.apportPercent) / 100)
  const financementAmount = amountOfOperation - apportAmount
  const ratePerYear = toNumber(values.ratePerYear) / 100
  const durationMonths = Math.max(toNumber(values.durationMonths), 1)
  const monthlyPayment = (financementAmount * ratePerYear) / 12
  const financialCost = monthlyPayment * durationMonths
  const totalCostForMarge = amountOfOperation + financialCost

  // Lots par régime de TVA
  const lots = values.apartments ?? []
  const sumBy = (regime: 'exonere' | 'marge' | 'total') =>
    lots
      .filter((a) => a.tvaRegime === regime)
      .reduce((s, a) => s + toNumber(a.resalePrice), 0)
  const totalExonere = sumBy('exonere')
  const totalMarge = sumBy('marge')
  const totalTvaTotal = sumBy('total')
  const totalRevente = totalExonere + totalMarge + totalTvaTotal
  const nbExonere = lots.filter((a) => a.tvaRegime === 'exonere').length
  const nbMarge = lots.filter((a) => a.tvaRegime === 'marge').length
  const nbTotal = lots.filter((a) => a.tvaRegime === 'total').length
  const hasLotsMarge = nbMarge > 0

  // Répartition du coût : proportion manuelle ou prorata des prix de vente
  const autoTerrainProportion = totalRevente > 0 ? (totalMarge / totalRevente) * 100 : 0
  const isTerrainProportionManual = values.terrainProportion !== ''
  const effectiveTerrainProportion = isTerrainProportionManual
    ? toNumber(values.terrainProportion)
    : autoTerrainProportion

  const ratioTotal = totalRevente > 0 ? totalTvaTotal / totalRevente : 0
  // Garde-fou : la part allouée aux lots marge ne peut pas dépasser ce qui reste
  // après les lots en TVA totale (sinon coût alloué exonéré négatif)
  const ratioMarge = Math.min(
    Math.max(0, effectiveTerrainProportion / 100),
    Math.max(0, 1 - ratioTotal),
  )
  const ratioExonere = Math.max(0, 1 - ratioMarge - ratioTotal)

  // Vision économique (affichage) : coût de revient complet réparti par bloc
  const coutAlloueMarge = totalCostForMarge * ratioMarge
  const coutAlloueTotal = totalCostForMarge * ratioTotal
  const coutAlloueExonere = Math.max(0, totalCostForMarge - coutAlloueMarge - coutAlloueTotal)

  // --- TVA sur marge : assiette légale (art. 268 CGI) ---
  const acquisitionBase = purchasePrice + effectiveNotaryFees
  const acquisitionAlloueMarge = acquisitionBase * ratioMarge
  const margeTaxable = totalMarge - acquisitionAlloueMarge
  const tvaSurMarge =
    margeTaxable > 0
      ? margeTaxable * (VAT_STANDARD_RATE / (1 + VAT_STANDARD_RATE))
      : 0

  // TVA collectée sur les lots vendus en TVA sur le prix total (prix TTC)
  const tvaCollecteeTotal = totalTvaTotal * (VAT_STANDARD_RATE / (1 + VAT_STANDARD_RATE))

  // TVA déductible : au prorata de la part d'activité taxée
  // (les ventes exonérées n'ouvrent pas droit à déduction)
  const deductibleShare =
    totalRevente > 0 ? (totalMarge + totalTvaTotal) / totalRevente : 1
  const tvaDeductibleBrute = tvaTravaux + tvaAutresCharges + tvaAgence
  const tvaDeductible = tvaDeductibleBrute * deductibleShare

  // TVA nette — un solde négatif est un crédit de TVA remboursable (pas écrasé)
  const tvaNette = tvaSurMarge + tvaCollecteeTotal - tvaDeductible

  // --- Résultat d'opération et fiscalité (structure IS + distribution) ---
  const margeNetteAvantIS = totalRevente - totalCostForMarge - tvaNette
  const margePercent =
    totalCostForMarge > 0 ? (margeNetteAvantIS / totalCostForMarge) * 100 : null

  const beneficeImposable = margeNetteAvantIS
  const isTranche1 = Math.min(Math.max(0, beneficeImposable), IS_REDUCED_THRESHOLD) * IS_REDUCED_RATE
  const isTranche2 = Math.max(0, beneficeImposable - IS_REDUCED_THRESHOLD) * IS_STANDARD_RATE
  const impotsSocietes = computeIS(beneficeImposable)
  const beneficesNets = beneficeImposable - impotsSocietes
  const flatTax = Math.max(0, beneficesNets) * FLAT_TAX_RATE
  const dividendesEnPoche = beneficesNets - flatTax

  const roiFondsPropres =
    apportAmount > 0 ? (margeNetteAvantIS / apportAmount) * 100 : null
  const annualizedReturnOnEquity =
    apportAmount > 0 && durationMonths > 0
      ? (Math.pow(1 + margeNetteAvantIS / apportAmount, 12 / durationMonths) - 1) * 100
      : null

  return {
    purchasePrice,
    autoNotaryFees,
    effectiveNotaryFees,
    isNotaryManual,
    agencyFees,
    travauxHT,
    tvaTravaux,
    autresChargesHT,
    tvaCharges,
    totalChargesHT,
    totalChargesTTC,
    amountOfOperation,
    apportAmount,
    financementAmount,
    monthlyPayment,
    financialCost,
    totalCostForMarge,
    totalRevente,
    totalExonere,
    totalMarge,
    totalTvaTotal,
    nbExonere,
    nbMarge,
    nbTotal,
    hasLotsMarge,
    autoTerrainProportion,
    effectiveTerrainProportion,
    isTerrainProportionManual,
    ratioMarge,
    ratioTotal,
    ratioExonere,
    coutAlloueMarge,
    coutAlloueTotal,
    coutAlloueExonere,
    acquisitionBase,
    acquisitionAlloueMarge,
    margeTaxable,
    tvaSurMarge,
    tvaCollecteeTotal,
    deductibleShare,
    tvaDeductibleBrute,
    tvaDeductible,
    tvaNette,
    margeNetteAvantIS,
    margePercent,
    beneficeImposable,
    isTranche1,
    isTranche2,
    impotsSocietes,
    beneficesNets,
    flatTax,
    flatTaxRate: FLAT_TAX_RATE,
    dividendesEnPoche,
    roiFondsPropres,
    annualizedReturnOnEquity,
    durationMonths,
  }
}
