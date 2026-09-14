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
}: LoanChartsSectionProps) {
  if (data.length === 0) return null

  const chartStyle = {
    margin: { top: 16, right: 50, bottom: 16, left: 8 },
    gridStroke: 'rgba(64, 63, 61, 0.15)',
    axisStroke: 'rgba(148,163,184,0.4)',
    tickFill: '#6C6A64',
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
                background: '#FFFFFF',
                border: '1px solid #E3D9C2',
                borderRadius: '8px',
                fontSize: '0.8rem',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
            <Line
              yAxisId="left"
              dataKey="principal"
              type="monotone"
              stroke="#3F5354"
              strokeWidth={2}
              dot={{ fill: '#3F5354', r: 3 }}
              name={principalLabel}
            />
            <Line
              yAxisId="left"
              dataKey="interest"
              type="monotone"
              stroke="#BD9C67"
              strokeWidth={2}
              dot={{ fill: '#BD9C67', r: 3 }}
              name={interestLabel}
            />
            <Line
              yAxisId="right"
              dataKey="ltv"
              type="monotone"
              stroke="#6F9A7E"
              strokeWidth={2}
              dot={{ fill: '#6F9A7E', r: 3 }}
              name={ltvLabel}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}


/**
 * Graphique « TRI par durée de détention » — section indépendante,
 * affichée sous le Projet de revente avec le bilan de revente.
 */
export function IRRChartSection({
  data,
  currencyFormatter,
  percentFormatter,
  yearLabel,
  irrLabel,
}: {
  data: IRRChartPoint[]
  currencyFormatter: Intl.NumberFormat
  percentFormatter: Intl.NumberFormat
  yearLabel: string
  irrLabel: string
}) {
  if (data.length === 0) return null
  const chartStyle = {
    margin: { top: 16, right: 50, bottom: 16, left: 8 },
    gridStroke: 'rgba(64, 63, 61, 0.15)',
    axisStroke: 'rgba(64, 63, 61, 0.25)',
    tickFill: '#6C6A64',
    tickFontSize: 11,
  }
  return (
    <div className="loan-chart-card loan-chart-card-single loan-chart-card-irr">
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
              />
            )}
            contentStyle={{
              background: '#FFFFFF',
              border: '1px solid #E3D9C2',
              borderRadius: '8px',
              fontSize: '0.8rem',
              padding: '0.75rem',
              zIndex: 100000,
            }}
            wrapperStyle={{
              zIndex: 100000,
              transform: 'translateY(-50%)',
            }}
            allowEscapeViewBox={{ x: true, y: true }}
          />
          <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
          <Line
            dataKey="irr"
            type="monotone"
            stroke="#BD9C67"
            strokeWidth={2}
            dot={{ fill: '#BD9C67', r: 3 }}
            name={irrLabel}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
