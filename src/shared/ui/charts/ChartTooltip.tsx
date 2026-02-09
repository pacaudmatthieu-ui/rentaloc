import type { YearlyChartPoint } from '../../types/chart'

export type ChartTooltipStrings = {
  revenue: string
  charges: string
  cashflow: string
  propertyTax: string
  copro: string
  management: string
  maintenance: string
  insurance: string
  other: string
  loan: string
  depreciation: string
  carryforward: string
  tax: string
}

interface ChartTooltipContentProps {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: YearlyChartPoint }>
  label?: string | number
  currencyFormatter: Intl.NumberFormat
  tooltipStrings: ChartTooltipStrings
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  currencyFormatter,
  tooltipStrings,
}: ChartTooltipContentProps) {
  if (!active || !payload?.length || !label) return null

  const point = payload[0]?.payload
  if (!point) return null

  const b = point.chargesBreakdown

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">Year {String(label)}</div>
      <div className="chart-tooltip-row">
        <span>{tooltipStrings.revenue}</span>
        <span>{currencyFormatter.format(point.revenue)}</span>
      </div>
      <div className="chart-tooltip-section">
        <div className="chart-tooltip-row chart-tooltip-total">
          <span>{tooltipStrings.charges}</span>
          <span>{currencyFormatter.format(Math.abs(point.charges))}</span>
        </div>
        <div className="chart-tooltip-breakdown">
          {b.propertyTax > 0 && (
            <div className="chart-tooltip-row">
              <span>{tooltipStrings.propertyTax}</span>
              <span>{currencyFormatter.format(b.propertyTax)}</span>
            </div>
          )}
          {b.copro > 0 && (
            <div className="chart-tooltip-row">
              <span>{tooltipStrings.copro}</span>
              <span>{currencyFormatter.format(b.copro)}</span>
            </div>
          )}
          {b.management > 0 && (
            <div className="chart-tooltip-row">
              <span>{tooltipStrings.management}</span>
              <span>{currencyFormatter.format(b.management)}</span>
            </div>
          )}
          {b.maintenance > 0 && (
            <div className="chart-tooltip-row">
              <span>{tooltipStrings.maintenance}</span>
              <span>{currencyFormatter.format(b.maintenance)}</span>
            </div>
          )}
          {b.insurance > 0 && (
            <div className="chart-tooltip-row">
              <span>{tooltipStrings.insurance}</span>
              <span>{currencyFormatter.format(b.insurance)}</span>
            </div>
          )}
          {b.other > 0 && (
            <div className="chart-tooltip-row">
              <span>{tooltipStrings.other}</span>
              <span>{currencyFormatter.format(b.other)}</span>
            </div>
          )}
          <div className="chart-tooltip-row">
            <span>{tooltipStrings.loan}</span>
            <span>{currencyFormatter.format(b.loanAndInsurance)}</span>
          </div>
          {b.depreciation > 0 && (
            <div className="chart-tooltip-row chart-tooltip-depreciation">
              <span>{tooltipStrings.depreciation}</span>
              <span>{currencyFormatter.format(b.depreciation)}</span>
            </div>
          )}
          {b.carryforwardUsed > 0 && (
            <div className="chart-tooltip-row chart-tooltip-carryforward">
              <span>{tooltipStrings.carryforward}</span>
              <span>{currencyFormatter.format(b.carryforwardUsed)}</span>
            </div>
          )}
          {b.tax > 0 && (
            <div className="chart-tooltip-row">
              <span>{tooltipStrings.tax}</span>
              <span>{currencyFormatter.format(b.tax)}</span>
            </div>
          )}
        </div>
      </div>
      <div className="chart-tooltip-row">
        <span>{tooltipStrings.cashflow}</span>
        <span>{currencyFormatter.format(point.cashflow)}</span>
      </div>
    </div>
  )
}
