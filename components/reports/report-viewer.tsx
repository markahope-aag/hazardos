'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Download, RefreshCw, Save, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import type { ReportType, ReportConfig, ReportColumn, DateRangeType, ChartType } from '@/types/reporting'
import { dateRangePresets } from '@/types/reporting'

interface ReportViewerProps {
  reportType: ReportType
  initialConfig: ReportConfig
  initialData: Record<string, unknown>[]
  columns: ReportColumn[]
}

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

function formatValue(value: unknown, format?: string): string {
  if (value == null) return '-'

  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
      }).format(Number(value))
    case 'percent':
      return `${Number(value).toFixed(1)}%`
    case 'number':
      return new Intl.NumberFormat('en-US').format(Number(value))
    case 'date':
      return new Date(String(value)).toLocaleDateString()
    default:
      return String(value)
  }
}

export function ReportViewer({
  reportType,
  initialConfig,
  initialData,
  columns,
}: ReportViewerProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [config, setConfig] = useState(initialConfig)
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [chartType, setChartType] = useState<ChartType>('bar')

  const visibleColumns = columns.filter(col => col.visible)

  async function runReport() {
    setLoading(true)
    try {
      const response = await fetch(`/api/reports/${reportType}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })

      if (!response.ok) throw new Error('Failed to run report')

      const result = await response.json()
      setData(result.data)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to run report',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleExport(format: 'xlsx' | 'csv') {
    setExporting(true)
    try {
      const response = await fetch('/api/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          title: `${reportType}_report`,
          data,
          columns: visibleColumns,
        }),
      })

      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${reportType}_report_${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast({
        title: 'Export complete',
        description: `Report exported as ${format.toUpperCase()}`,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export report',
        variant: 'destructive',
      })
    } finally {
      setExporting(false)
    }
  }

  function handleDateRangeChange(value: DateRangeType) {
    setConfig(prev => ({
      ...prev,
      date_range: { type: value },
    }))
  }

  // Prepare chart data
  const chartData = data.slice(0, 10).map(row => ({
    name: String(row[visibleColumns[0]?.field] || ''),
    value: Number(row[visibleColumns[visibleColumns.length - 2]?.field] || 0),
  }))

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <Select
              value={config.date_range.type}
              onValueChange={handleDateRangeChange}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent>
                {dateRangePresets.map(preset => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={chartType}
              onValueChange={(v) => setChartType(v as ChartType)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Chart type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bar">Bar Chart</SelectItem>
                <SelectItem value="line">Line Chart</SelectItem>
                <SelectItem value="pie">Pie Chart</SelectItem>
                <SelectItem value="none">No Chart</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex-1" />

            <Button variant="outline" onClick={runReport} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>

            <Button
              variant="outline"
              onClick={() => handleExport('xlsx')}
              disabled={exporting || data.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Excel
            </Button>

            <Button
              variant="outline"
              onClick={() => handleExport('csv')}
              disabled={exporting || data.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      {chartType !== 'none' && data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Visualization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#4F46E5" />
                  </BarChart>
                ) : chartType === 'line' ? (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#4F46E5" />
                  </LineChart>
                ) : (
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {chartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Data ({data.length} rows)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No data available for the selected filters
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {visibleColumns.map(col => (
                      <TableHead key={col.field}>{col.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row, idx) => (
                    <TableRow key={idx}>
                      {visibleColumns.map(col => (
                        <TableCell key={col.field}>
                          {formatValue(row[col.field], col.format)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
