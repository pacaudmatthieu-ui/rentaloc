export const VAT_RATE_MARGE = 0.2
export const VAT_RATE_AGENCE = 0.2
export const VAT_RATE_TRAVAUX = 0.1

export function computeTvaSurMarge(totalRevente: number, totalCost: number): number {
  const margeBrute = totalRevente - totalCost
  if (margeBrute <= 0) return 0
  return margeBrute * (VAT_RATE_MARGE / (1 + VAT_RATE_MARGE))
}

export function computeTvaDeductible(
  renovationBudget: number,
  agencyFees: number,
): number {
  const tvaTravaux = renovationBudget * (VAT_RATE_TRAVAUX / (1 + VAT_RATE_TRAVAUX))
  const tvaAgence = agencyFees * (VAT_RATE_AGENCE / (1 + VAT_RATE_AGENCE))
  return tvaTravaux + tvaAgence
}

export function computeAResterPayer(
  tvaSurMarge: number,
  tvaDeductible: number,
): number {
  return tvaSurMarge - tvaDeductible
}

export function computeTvaSurTotal(totalRevente: number): number {
  return totalRevente * (VAT_RATE_MARGE / (1 + VAT_RATE_MARGE))
}

export function computeResteTvaTotal(
  tvaSurTotal: number,
  tvaDeductibleTotal: number,
): number {
  return Math.max(0, tvaSurTotal - tvaDeductibleTotal)
}
