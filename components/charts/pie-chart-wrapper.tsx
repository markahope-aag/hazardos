'use client'

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts'

interface PieChartWrapperProps<T extends Record<string, unknown>> {
  data: T[]
  dataKey: keyof T & string
  nameKey: keyof T & string
  colors?: string[]
  height?: number
  showLegend?: boolean
}

const DEFAULT_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // yellow
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
]

export default function PieChartWrapper<T extends Record<string, unknown>>({
  data,
  dataKey,
  nameKey,
  colors = DEFAULT_COLORS,
  height = 300,
  showLegend = true,
}: PieChartWrapperProps<T>) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={80}
          fill="#8884d8"
          dataKey={dataKey}
          nameKey={nameKey}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip />
        {showLegend && <Legend />}
      </PieChart>
    </ResponsiveContainer>
  )
}