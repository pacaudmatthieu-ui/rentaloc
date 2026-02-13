import type { IRRChartPoint } from './types'

export type IRRTooltipContentProps = {
  active?: boolean
  payload?: ReadonlyArray<{
    value?: number
    payload?: IRRChartPoint
  }>
  label?: string | number
  currencyFormatter: Intl.NumberFormat
  percentFormatter: Intl.NumberFormat
  yearLabel: string
}

export function IRRTooltipContent({
  active,
  payload,
  label,
  currencyFormatter,
  percentFormatter,
  yearLabel,
}: IRRTooltipContentProps) {
  if (!active || !payload || !payload[0] || !payload[0].payload) {
    return null
  }

  const data = payload[0].payload as IRRChartPoint
  const details = data.details

  // If no details, show simple display
  if (!details) {
    return (
      <div className="chart-tooltip">
        <div className="chart-tooltip-title">
          {yearLabel} {label}
        </div>
        <div className="chart-tooltip-row">
          <span>TRI</span>
          <span>{percentFormatter.format((data.irr ?? 0) / 100)}</span>
        </div>
      </div>
    )
  }

  // Show calculation details for all years: investment, annual cashflows, and sale
  return (
    <div className="chart-tooltip irr-tooltip">
      <div className="chart-tooltip-title">
        {yearLabel} {label} - TRI: {percentFormatter.format((data.irr ?? 0) / 100)}
      </div>
      
      <div className="chart-tooltip-section">
        <div className="chart-tooltip-row">
          <span>Investissement initial</span>
          <span>{currencyFormatter.format(details.initialInvestment)}</span>
        </div>
      </div>

      {details.annualCashflows.length > 0 && (
        <div className="chart-tooltip-section">
          <div className="chart-tooltip-title" style={{ fontSize: '0.75rem', marginTop: '0.5rem', marginBottom: '0.25rem' }}>
            Flux annuels
          </div>
          {details.annualCashflows.map((cf, index) => (
            <div key={index} className="chart-tooltip-row">
              <span>Année {cf.year}</span>
              <span>{currencyFormatter.format(cf.cashflow)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="chart-tooltip-section">
        <div className="chart-tooltip-title" style={{ fontSize: '0.75rem', marginTop: '0.5rem', marginBottom: '0.25rem' }}>
          Revente
        </div>
        <div className="chart-tooltip-row">
          <span>Prix de vente</span>
          <span>{currencyFormatter.format(details.saleProceeds)}</span>
        </div>
        <div className="chart-tooltip-row">
          <span>Taxes de vente</span>
          <span>{currencyFormatter.format(-details.saleTax)}</span>
        </div>
        <div className="chart-tooltip-row">
          <span>Solde crédit</span>
          <span>{currencyFormatter.format(-details.loanBalance)}</span>
        </div>
        <div className="chart-tooltip-row chart-tooltip-total">
          <span>Proceeds net</span>
          <span>{currencyFormatter.format(details.saleProceeds - details.saleTax - details.loanBalance)}</span>
        </div>
      </div>
    </div>
  )
}
