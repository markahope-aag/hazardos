'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface LineChartWrapperProps {
  data: any[]
  dataKey: string
  xAxisKey: string
  color?: string
  height?: number
}

export default function LineChartWrapper({
  data,
  dataKey,
  xAxisKey,
  color = '#3b82f6',
  height = 300,
}: LineChartWrapperProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xAxisKey} />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  )
}