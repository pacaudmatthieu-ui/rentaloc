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

export type ComparisonIRRDataPoint = {
  year: number
  [simulationName: string]: number | string | undefined
}

export type ComparisonIRRChartProps = {
  data: ComparisonIRRDataPoint[]
  simulationNames: string[]
  simulationKeys: string[] // Keys used in data object (e.g., simulation IDs or names)
  colors: string[]
  percentFormatter: Intl.NumberFormat
  yearLabel: string
  irrLabel: string
}

const CHART_HEIGHT = 380

export function ComparisonIRRChart({
  data,
  simulationNames,
  simulationKeys,
  colors,
  percentFormatter,
  yearLabel,
  irrLabel,
}: ComparisonIRRChartProps) {
  if (data.length === 0 || simulationNames.length === 0 || simulationKeys.length === 0) return null
  
  // Ensure simulationKeys has the same length as simulationNames
  if (simulationKeys.length !== simulationNames.length) {
    console.warn('ComparisonIRRChart: simulationKeys and simulationNames length mismatch')
    return null
  }

  const chartStyle = {
    margin: { top: 16, right: 50, bottom: 16, left: 8 },
    gridStroke: 'rgba(148,163,184,0.3)',
    axisStroke: 'rgba(148,163,184,0.4)',
    tickFill: '#9ca3af',
    tickFontSize: 11,
  }

  return (
    <>
      <h4 className="loan-chart-title">{irrLabel}</h4>
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
            formatter={(value: number | undefined) => percentFormatter.format((value ?? 0) / 100)}
            labelFormatter={(label) => `${yearLabel} ${label}`}
            contentStyle={{
              background: '#0f172a',
              border: '1px solid rgba(148, 163, 184, 0.5)',
              borderRadius: '8px',
              fontSize: '0.8rem',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
          {simulationNames.map((name, index) => (
            <Line
              key={simulationKeys[index] || name}
              dataKey={simulationKeys[index] || name}
              type="monotone"
              stroke={colors[index % colors.length]}
              strokeWidth={2}
              dot={{ fill: colors[index % colors.length], r: 3 }}
              name={name}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </>
  )
}
