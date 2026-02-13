export type ChargesBreakdown = {
  propertyTax: number
  copro: number
  management: number
  maintenance: number
  insurance: number
  other: number
  loanAndInsurance: number
  depreciation: number
  carryforwardUsed: number
  tax: number
  saleTax?: number
  /** IS sur plus-value (année revente, quand PFU appliqué) */
  corporateTaxOnGain?: number
  /** Flat tax PFU (année revente, quand option activée) */
  flatTax?: number
}

export type YearlyChartPoint = {
  year: string
  revenue: number
  charges: number
  cashflow: number
  chargesBreakdown: ChargesBreakdown
  resalePrice?: number
}
