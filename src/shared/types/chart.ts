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
}

export type YearlyChartPoint = {
  year: string
  revenue: number
  charges: number
  cashflow: number
  chargesBreakdown: ChargesBreakdown
}
