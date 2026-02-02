'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface BarChartWrapperProps<T extends Record<string, unknown>> {
  data: T[]
  dataKey: keyof T & string
  xAxisKey: keyof T & string
  color?: string
  height?: number
}

export default function BarChartWrapper<T extends Record<string, unknown>>({
  data,
  dataKey,
  xAxisKey,
  color = '#3b82f6',
  height = 300,
}: BarChartWrapperProps<T>) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xAxisKey} />
        <YAxis />
        <Tooltip />
        <Bar dataKey={dataKey} fill={color} />
      </BarChart>
    </ResponsiveContainer>
  )
}