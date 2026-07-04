/**
 * Constantes et barèmes fiscaux français — centralisés.
 * Dernière vérification : juillet 2026.
 *
 * Sources principales :
 * - PFU (flat tax) : 31,4 % depuis le 01/01/2026 (12,8 % IR + 18,6 % PS, CSG portée
 *   à 10,6 % par la LFSS 2026 sur les revenus du capital).
 * - Les revenus fonciers et plus-values immobilières restent à 17,2 % de PS
 *   (CSG maintenue à 9,2 % pour ces revenus).
 * - Réintégration des amortissements LMNP dans la PV : LF 2025 (art. 84),
 *   cessions à compter du 15/02/2025 (art. 150 VB III du CGI).
 * - Surtaxe sur plus-values > 50 000 € : art. 1609 nonies G du CGI.
 */

/** PFU (flat tax) sur les dividendes : 12,8 % IR + 18,6 % PS (depuis le 01/01/2026) */
export const FLAT_TAX_RATE = 0.314

/** Prélèvements sociaux sur revenus fonciers et PV immobilières (CSG 9,2 % maintenue) */
export const SOCIAL_CHARGES_IMMO_RATE = 0.172

/** IR proportionnel sur les plus-values immobilières des particuliers */
export const PV_IR_RATE = 0.19

/** IS : taux réduit PME 15 % jusqu'à 42 500 €, 25 % au-delà */
export const IS_REDUCED_THRESHOLD = 42500
export const IS_REDUCED_RATE = 0.15
export const IS_STANDARD_RATE = 0.25

/** Micro-foncier : abattement 30 %, plafond de recettes 15 000 € */
export const MICRO_FONCIER_ABATTEMENT = 0.3
export const MICRO_FONCIER_CAP = 15000

/** Micro-BIC location meublée longue durée : abattement 50 %, plafond 77 700 € */
export const MICRO_BIC_ABATTEMENT = 0.5
export const MICRO_BIC_CAP = 77700

/** Déficit foncier : imputation sur le revenu global plafonnée (art. 156 CGI) */
export const DEFICIT_FONCIER_GLOBAL_CAP = 10700

/** Report des déficits (fonciers et BIC non professionnels) : 10 ans */
export const DEFICIT_CARRYFORWARD_YEARS = 10

/**
 * IS à deux tranches : 15 % jusqu'à 42 500 € de bénéfice, 25 % au-delà
 * (taux PME, sociétés avec CA < 10 M€ et capital détenu à 75 % par des personnes physiques)
 */
export function computeIS(taxable: number): number {
  if (taxable <= 0) return 0
  const tranche1 = Math.min(taxable, IS_REDUCED_THRESHOLD) * IS_REDUCED_RATE
  const tranche2 = Math.max(0, taxable - IS_REDUCED_THRESHOLD) * IS_STANDARD_RATE
  return tranche1 + tranche2
}

/**
 * IS marginal dû sur un gain exceptionnel (ex. plus-value de cession) qui s'ajoute
 * au résultat courant de l'exercice. La tranche à 15 % ne peut être consommée
 * qu'une seule fois par exercice : on calcule donc IS(total) − IS(courant).
 */
export function computeMarginalIS(currentTaxable: number, additionalGain: number): number {
  if (additionalGain <= 0) return 0
  const base = Math.max(0, currentTaxable)
  return computeIS(base + additionalGain) - computeIS(base)
}

/**
 * Surtaxe sur les plus-values immobilières imposables supérieures à 50 000 €
 * (art. 1609 nonies G du CGI), avec les mécanismes de lissage légaux.
 * S'applique à la PV nette imposable à l'IR (après abattements pour durée de détention).
 */
export function computeSurtaxePV(pv: number): number {
  if (pv <= 50000) return 0
  let surtaxe: number
  if (pv <= 60000) surtaxe = 0.02 * pv - (60000 - pv) * (1 / 20)
  else if (pv <= 100000) surtaxe = 0.02 * pv
  else if (pv <= 110000) surtaxe = 0.03 * pv - (110000 - pv) * (1 / 10)
  else if (pv <= 150000) surtaxe = 0.03 * pv
  else if (pv <= 160000) surtaxe = 0.04 * pv - (160000 - pv) * (15 / 100)
  else if (pv <= 200000) surtaxe = 0.04 * pv
  else if (pv <= 210000) surtaxe = 0.05 * pv - (210000 - pv) * (20 / 100)
  else if (pv <= 250000) surtaxe = 0.05 * pv
  else if (pv <= 260000) surtaxe = 0.06 * pv - (260000 - pv) * (25 / 100)
  else surtaxe = 0.06 * pv
  return Math.max(0, surtaxe)
}

/**
 * Plus-value immobilière des particuliers (art. 150 U et suivants du CGI).
 * S'applique au LMNP, réel foncier, SCI IR, micro-foncier, micro-BIC, bailleur privé.
 *
 * Règles :
 * - PV brute = Prix de vente − Prix d'acquisition corrigé
 * - Depuis la LF 2025 (cessions à compter du 15/02/2025), le prix d'acquisition
 *   est MINORÉ des amortissements admis en déduction en LMNP (art. 150 VB III),
 *   hors exceptions (résidences étudiantes/seniors/EHPAD). Les amortissements
 *   restés en réserve (jamais déduits, art. 39 C) ne sont pas réintégrés.
 * - IR 19 % : abattement 6 %/an de la 6e à la 21e année, 4 % la 22e → exonération à 22 ans
 * - PS 17,2 % : abattement 1,65 %/an de la 6e à la 21e, 1,60 % la 22e,
 *   9 %/an de la 23e à la 30e → exonération à 30 ans
 * - Surtaxe progressive (2 % à 6 %) si PV nette imposable IR > 50 000 €
 */
export function computePVParticuliers(
  resalePrice: number,
  acquisitionCost: number,
  holdingYears: number,
  amortizationDeducted = 0,
): number {
  const correctedAcquisition = acquisitionCost - Math.max(0, amortizationDeducted)
  const pvBrute = Math.max(0, resalePrice - correctedAcquisition)
  if (pvBrute <= 0) return 0

  // Abattement IR
  let abattementIR = 0
  if (holdingYears > 22) {
    abattementIR = 1
  } else if (holdingYears >= 6) {
    const yearsAbove5 = holdingYears - 5
    if (yearsAbove5 <= 16) abattementIR = yearsAbove5 * 0.06
    else abattementIR = 16 * 0.06 + 0.04
  }
  const baseIR = pvBrute * (1 - abattementIR)
  const taxIR = baseIR * PV_IR_RATE

  // Abattement prélèvements sociaux
  let abattementPS = 0
  if (holdingYears > 30) {
    abattementPS = 1
  } else if (holdingYears >= 6) {
    const yearsAbove5 = holdingYears - 5
    if (yearsAbove5 <= 16) abattementPS = yearsAbove5 * 0.0165
    else if (yearsAbove5 === 17) abattementPS = 16 * 0.0165 + 0.016
    else abattementPS = 16 * 0.0165 + 0.016 + (yearsAbove5 - 17) * 0.09
  }
  const basePS = pvBrute * (1 - abattementPS)
  const taxPS = basePS * SOCIAL_CHARGES_IMMO_RATE

  return taxIR + taxPS + computeSurtaxePV(baseIR)
}
