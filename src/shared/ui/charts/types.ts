export type IRRChartPoint = {
  year: number
  irr: number
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
