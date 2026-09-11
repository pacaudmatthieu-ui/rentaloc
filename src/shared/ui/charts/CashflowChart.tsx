import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartTooltipContent, type ChartTooltipStrings } from './ChartTooltip'
import type { YearlyChartPoint } from '../../types/chart'

export type CashflowChartProps = {
  data: YearlyChartPoint[]
  currencyFormatter: Intl.NumberFormat
  revenueLabel: string
  chargesLabel: string
  cashflowLabel: string
  tooltipStrings: ChartTooltipStrings
}

export function CashflowChart({
  data,
  currencyFormatter,
  revenueLabel,
  chargesLabel,
  cashflowLabel,
  tooltipStrings,
}: CashflowChartProps) {
  if (data.length === 0) return null

  return (
    <ResponsiveContainer width="100%" height={420}>
      <ComposedChart
        data={data}
        margin={{ top: 20, right: 20, bottom: 20, left: 10 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(64, 63, 61, 0.15)" />
        <XAxis
          dataKey="year"
          tick={{ fill: '#6C6A64', fontSize: 11 }}
          tickLine={{ stroke: 'rgba(148,163,184,0.4)' }}
          axisLine={{ stroke: 'rgba(148,163,184,0.4)' }}
        />
        <YAxis
          tick={{ fill: '#6C6A64', fontSize: 11 }}
          tickLine={{ stroke: 'rgba(148,163,184,0.4)' }}
          axisLine={{ stroke: 'rgba(148,163,184,0.4)' }}
          tickFormatter={(v) => currencyFormatter.format(v)}
        />
        <Tooltip
          content={(props) => (
            <ChartTooltipContent
              {...props}
              currencyFormatter={currencyFormatter}
              tooltipStrings={tooltipStrings}
            />
          )}
          cursor={{ fill: 'rgba(64, 63, 61, 0.06)' }}
        />
        <Legend
          wrapperStyle={{ fontSize: '0.75rem' }}
          formatter={(value) =>
            value === 'revenue'
              ? revenueLabel
              : value === 'charges'
                ? chargesLabel
                : cashflowLabel
          }
        />
        <Bar
          dataKey="revenue"
          fill="#6F9A7E"
          name="revenue"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="charges"
          fill="#B0503A"
          name="charges"
          radius={[0, 0, 4, 4]}
        />
        <Line
          type="monotone"
          dataKey="cashflow"
          stroke="#BD9C67"
          strokeWidth={2}
          dot={{ fill: '#BD9C67', r: 4 }}
          name="cashflow"
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
