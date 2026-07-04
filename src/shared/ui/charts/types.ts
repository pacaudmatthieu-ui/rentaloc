export type IRRChartPoint = {
  year: number
  /** TRI en % — null si non calculable (apport nul, flux non conventionnels) */
  irr: number | null
  details?: {
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
