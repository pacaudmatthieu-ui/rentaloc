import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { IRRTooltipContent } from './IRRTooltipContent'
import type { IRRChartPoint } from './types'

export type LoanChartPoint = {
  year: number
  principal: number
  interest: number
  ltv: number
}

export type { IRRChartPoint } from './types'

export type LoanChartsSectionProps = {
  data: LoanChartPoint[]
  currencyFormatter: Intl.NumberFormat
  percentFormatter: Intl.NumberFormat
  principalLabel: string
  interestLabel: string
  ltvLabel: string
  yearLabel: string
  irrData?: IRRChartPoint[]
  irrLabel?: string
}

const CHART_HEIGHT = 380

export function LoanChartsSection({
  data,
  currencyFormatter,
  percentFormatter,
  principalLabel,
  interestLabel,
  ltvLabel,
  yearLabel,
  irrData,
  irrLabel,
}: LoanChartsSectionProps) {
  if (data.length === 0) return null

  const chartStyle = {
    margin: { top: 16, right: 50, bottom: 16, left: 8 },
    gridStroke: 'rgba(148,163,184,0.3)',
    axisStroke: 'rgba(148,163,184,0.4)',
    tickFill: '#9ca3af',
    tickFontSize: 11,
  }

  const getLabel = (dataKey: string) => {
    if (dataKey === 'principal') return principalLabel
    if (dataKey === 'interest') return interestLabel
    return ltvLabel
  }

  const formatValue = (value: number | undefined, dataKey: string | undefined) => {
    if (value == null) return ''
    if (dataKey === 'ltv') return percentFormatter.format(value / 100)
    return currencyFormatter.format(value)
  }

  return (
    <div className="loan-charts-section">
      <div className="loan-chart-card loan-chart-card-single">
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <LineChart data={data} margin={chartStyle.margin}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.gridStroke} />
            <XAxis
              dataKey="year"
              tick={{ fill: chartStyle.tickFill, fontSize: chartStyle.tickFontSize }}
              tickLine={{ stroke: chartStyle.axisStroke }}
              axisLine={{ stroke: chartStyle.axisStroke }}
            />
            <YAxis
              yAxisId="left"
              orientation="left"
              tick={{ fill: chartStyle.tickFill, fontSize: chartStyle.tickFontSize }}
              tickLine={{ stroke: chartStyle.axisStroke }}
              axisLine={{ stroke: chartStyle.axisStroke }}
              tickFormatter={(v) => currencyFormatter.format(v)}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: chartStyle.tickFill, fontSize: chartStyle.tickFontSize }}
              tickLine={{ stroke: chartStyle.axisStroke }}
              axisLine={{ stroke: chartStyle.axisStroke }}
              tickFormatter={(v) => percentFormatter.format(v / 100)}
            />
            <Tooltip
              formatter={(value: number | undefined, _name: unknown, item: unknown) => {
                const payload = item as { dataKey?: string } | undefined
                const dataKey = payload?.dataKey ?? 'principal'
                return [formatValue(value, dataKey), getLabel(dataKey)]
              }}
              labelFormatter={(label) => `${yearLabel} ${label}`}
              contentStyle={{
                background: '#0f172a',
                border: '1px solid rgba(148, 163, 184, 0.5)',
                borderRadius: '8px',
                fontSize: '0.8rem',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
            <Line
              yAxisId="left"
              dataKey="principal"
              type="monotone"
              stroke="#38bdf8"
              strokeWidth={2}
              dot={{ fill: '#0ea5e9', r: 3 }}
              name={principalLabel}
            />
            <Line
              yAxisId="left"
              dataKey="interest"
              type="monotone"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ fill: '#fbbf24', r: 3 }}
              name={interestLabel}
            />
            <Line
              yAxisId="right"
              dataKey="ltv"
              type="monotone"
              stroke="#34d399"
              strokeWidth={2}
              dot={{ fill: '#10b981', r: 3 }}
              name={ltvLabel}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {irrData && irrData.length > 0 && irrLabel && (
        <div className="loan-chart-card loan-chart-card-single loan-chart-card-irr">
          <h4 className="loan-chart-title">{irrLabel}</h4>
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <LineChart data={irrData} margin={chartStyle.margin}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.gridStroke} />
              <XAxis
                dataKey="year"
                tick={{ fill: chartStyle.tickFill, fontSize: chartStyle.tickFontSize }}
                tickLine={{ stroke: chartStyle.axisStroke }}
                axisLine={{ stroke: chartStyle.axisStroke }}
              />
              <YAxis
                tick={{ fill: chartStyle.tickFill, fontSize: chartStyle.tickFontSize }}
                tickLine={{ stroke: chartStyle.axisStroke }}
                axisLine={{ stroke: chartStyle.axisStroke }}
                tickFormatter={(v) => percentFormatter.format(v / 100)}
              />
              <Tooltip
                content={(props) => (
                  <IRRTooltipContent
                    {...props}
                    currencyFormatter={currencyFormatter}
                    percentFormatter={percentFormatter}
                    yearLabel={yearLabel}
                    allData={irrData}
                  />
                )}
                contentStyle={{
                  background: '#0f172a',
                  border: '1px solid rgba(148, 163, 184, 0.5)',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  padding: '0.75rem',
                  zIndex: 100000,
                }}
                wrapperStyle={{
                  zIndex: 100000,
                  transform: 'translateY(-50%)', // Center vertically on cursor
                }}
                allowEscapeViewBox={{ x: true, y: true }}
              />
              <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
              <Line
                dataKey="irr"
                type="monotone"
                stroke="#a78bfa"
                strokeWidth={2}
                dot={{ fill: '#8b5cf6', r: 3 }}
                name={irrLabel}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
