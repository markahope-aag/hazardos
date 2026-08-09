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

interface LineChartWrapperProps<T extends Record<string, unknown>> {
  data: T[]
  dataKey: keyof T & string
  xAxisKey: keyof T & string
  color?: string
  height?: number
}

/**
 * recharts 3.10 narrowed `dataKey` to a mapped type that only admits keys whose
 * value is assignable to the series' value type. A `keyof T & string` is always
 * one of those keys, but TypeScript cannot prove it while `T` is an unresolved
 * generic, so it rejects the whole union.
 *
 * The assertion is confined to this boundary rather than loosening the props:
 * callers keep `keyof T` autocomplete, which is the reason these wrappers exist.
 */
const asDataKey = (key: string) => key as never

export default function LineChartWrapper<T extends Record<string, unknown>>({
  data,
  dataKey,
  xAxisKey,
  color = '#3b82f6',
  height = 300,
}: LineChartWrapperProps<T>) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={asDataKey(xAxisKey)} />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey={asDataKey(dataKey)} stroke={color} strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  )
}