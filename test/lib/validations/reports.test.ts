import { describe, it, expect } from 'vitest'
import { 
  reportTypeSchema,
  dateRangeTypeSchema,
  chartTypeSchema,
  filterOperatorSchema,
  columnFormatSchema,
  groupIntervalSchema,
  dateRangeSchema,
  reportFilterSchema,
  reportColumnSchema,
  reportGroupingSchema,
  reportConfigSchema,
  createReportSchema,
  updateReportSchema as _updateReportSchema,
  runReportSchema as _runReportSchema,
  exportFormatSchema,
  exportReportSchema
} from '@/lib/validations/reports'

describe('reports validations', () => {
  describe('reportTypeSchema', () => {
    const validTypes = ['sales', 'jobs', 'leads', 'revenue', 'custom']

    it('should validate all valid report types', () => {
      for (const type of validTypes) {
        const result = reportTypeSchema.safeParse(type)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe(type)
        }
      }
    })

    it('should reject invalid report type', () => {
      const result = reportTypeSchema.safeParse('invalid_type')
      expect(result.success).toBe(false)
    })
  })

  describe('dateRangeTypeSchema', () => {
    const validTypes = [
      'today', 'yesterday', 'last_7_days', 'last_30_days',
      'this_month', 'last_month', 'this_quarter', 'this_year', 'custom'
    ]

    it('should validate all valid date range types', () => {
      for (const type of validTypes) {
        const result = dateRangeTypeSchema.safeParse(type)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe(type)
        }
      }
    })

    it('should reject invalid date range type', () => {
      const result = dateRangeTypeSchema.safeParse('invalid_range')
      expect(result.success).toBe(false)
    })
  })

  describe('chartTypeSchema', () => {
    const validTypes = ['bar', 'line', 'pie', 'area', 'none']

    it('should validate all valid chart types', () => {
      for (const type of validTypes) {
        const result = chartTypeSchema.safeParse(type)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe(type)
        }
      }
    })

    it('should reject invalid chart type', () => {
      const result = chartTypeSchema.safeParse('scatter')
      expect(result.success).toBe(false)
    })
  })

  describe('filterOperatorSchema', () => {
    const validOperators = [
      'equals', 'not_equals', 'contains', 'gt', 'gte', 'lt', 'lte', 'in'
    ]

    it('should validate all valid filter operators', () => {
      for (const operator of validOperators) {
        const result = filterOperatorSchema.safeParse(operator)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe(operator)
        }
      }
    })

    it('should reject invalid filter operator', () => {
      const result = filterOperatorSchema.safeParse('regex')
      expect(result.success).toBe(false)
    })
  })

  describe('columnFormatSchema', () => {
    const validFormats = ['currency', 'percent', 'number', 'date', 'text']

    it('should validate all valid column formats', () => {
      for (const format of validFormats) {
        const result = columnFormatSchema.safeParse(format)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe(format)
        }
      }
    })

    it('should reject invalid column format', () => {
      const result = columnFormatSchema.safeParse('boolean')
      expect(result.success).toBe(false)
    })
  })

  describe('groupIntervalSchema', () => {
    const validIntervals = ['day', 'week', 'month', 'quarter', 'year']

    it('should validate all valid group intervals', () => {
      for (const interval of validIntervals) {
        const result = groupIntervalSchema.safeParse(interval)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe(interval)
        }
      }
    })

    it('should reject invalid group interval', () => {
      const result = groupIntervalSchema.safeParse('hour')
      expect(result.success).toBe(false)
    })
  })

  describe('dateRangeSchema', () => {
    it('should validate predefined date range', () => {
      const validData = {
        type: 'last_30_days'
      }
      
      const result = dateRangeSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.type).toBe('last_30_days')
      }
    })

    it('should validate custom date range', () => {
      const validData = {
        type: 'custom',
        start: '2024-01-01',
        end: '2024-01-31'
      }
      
      const result = dateRangeSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.type).toBe('custom')
        expect(result.data.start).toBe('2024-01-01')
        expect(result.data.end).toBe('2024-01-31')
      }
    })
  })

  describe('reportFilterSchema', () => {
    it('should validate report filter', () => {
      const validData = {
        field: 'status',
        operator: 'equals',
        value: 'completed'
      }
      
      const result = reportFilterSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.field).toBe('status')
        expect(result.data.operator).toBe('equals')
        expect(result.data.value).toBe('completed')
      }
    })

    it('should validate filter with array value', () => {
      const validData = {
        field: 'category',
        operator: 'in',
        value: ['residential', 'commercial']
      }
      
      const result = reportFilterSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.value).toEqual(['residential', 'commercial'])
      }
    })

    it('should validate filter with numeric value', () => {
      const validData = {
        field: 'amount',
        operator: 'gt',
        value: 1000
      }
      
      const result = reportFilterSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.value).toBe(1000)
      }
    })
  })

  describe('reportColumnSchema', () => {
    it('should validate report column', () => {
      const validData = {
        field: 'customer_name',
        label: 'Customer Name',
        visible: true,
        format: 'text'
      }
      
      const result = reportColumnSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.field).toBe('customer_name')
        expect(result.data.label).toBe('Customer Name')
        expect(result.data.visible).toBe(true)
        expect(result.data.format).toBe('text')
      }
    })

    it('should validate column without format', () => {
      const validData = {
        field: 'id',
        label: 'ID',
        visible: false
      }
      
      const result = reportColumnSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.format).toBeUndefined()
      }
    })
  })

  describe('reportGroupingSchema', () => {
    it('should validate grouping with interval', () => {
      const validData = {
        field: 'created_at',
        interval: 'month'
      }
      
      const result = reportGroupingSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.field).toBe('created_at')
        expect(result.data.interval).toBe('month')
      }
    })

    it('should validate grouping without interval', () => {
      const validData = {
        field: 'status'
      }
      
      const result = reportGroupingSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.field).toBe('status')
        expect(result.data.interval).toBeUndefined()
      }
    })
  })

  describe('reportConfigSchema', () => {
    it('should validate complete report config', () => {
      const validData = {
        date_range: {
          type: 'last_30_days'
        },
        filters: [
          {
            field: 'status',
            operator: 'equals',
            value: 'completed'
          }
        ],
        grouping: {
          field: 'created_at',
          interval: 'week'
        },
        metrics: ['count', 'sum_amount'],
        columns: [
          {
            field: 'customer_name',
            label: 'Customer',
            visible: true,
            format: 'text'
          }
        ],
        chart_type: 'bar',
        sort_by: 'created_at',
        sort_order: 'desc'
      }
      
      const result = reportConfigSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.date_range.type).toBe('last_30_days')
        expect(result.data.filters).toHaveLength(1)
        expect(result.data.grouping?.field).toBe('created_at')
        expect(result.data.metrics).toEqual(['count', 'sum_amount'])
        expect(result.data.columns).toHaveLength(1)
        expect(result.data.chart_type).toBe('bar')
        expect(result.data.sort_by).toBe('created_at')
        expect(result.data.sort_order).toBe('desc')
      }
    })

    it('should validate minimal report config', () => {
      const validData = {
        date_range: {
          type: 'today'
        },
        filters: [],
        metrics: ['count'],
        columns: [],
        chart_type: 'none'
      }
      
      const result = reportConfigSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('createReportSchema', () => {
    it('should validate report creation', () => {
      const validData = {
        name: 'Sales Report',
        description: 'Monthly sales performance report',
        report_type: 'sales',
        config: {
          date_range: { type: 'this_month' },
          filters: [],
          metrics: ['revenue'],
          columns: [],
          chart_type: 'line'
        },
        is_shared: true
      }
      
      const result = createReportSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Sales Report')
        expect(result.data.is_shared).toBe(true)
      }
    })

    it('should default is_shared to false', () => {
      const validData = {
        name: 'Private Report',
        report_type: 'jobs',
        config: {
          date_range: { type: 'today' },
          filters: [],
          metrics: ['count'],
          columns: [],
          chart_type: 'none'
        }
      }
      
      const result = createReportSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.is_shared).toBe(false)
      }
    })
  })

  describe('exportFormatSchema', () => {
    const validFormats = ['xlsx', 'csv', 'pdf']

    it('should validate all valid export formats', () => {
      for (const format of validFormats) {
        const result = exportFormatSchema.safeParse(format)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe(format)
        }
      }
    })

    it('should reject invalid export format', () => {
      const result = exportFormatSchema.safeParse('json')
      expect(result.success).toBe(false)
    })
  })

  describe('exportReportSchema', () => {
    it('should validate report export', () => {
      const validData = {
        format: 'xlsx',
        title: 'Monthly Sales Report',
        data: [
          { customer: 'John Doe', amount: 1000 },
          { customer: 'Jane Smith', amount: 1500 }
        ],
        columns: [
          { field: 'customer', label: 'Customer', visible: true, format: 'text' },
          { field: 'amount', label: 'Amount', visible: true, format: 'currency' }
        ],
        report_id: '123e4567-e89b-12d3-a456-426614174000'
      }
      
      const result = exportReportSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.format).toBe('xlsx')
        expect(result.data.title).toBe('Monthly Sales Report')
        expect(result.data.data).toHaveLength(2)
        expect(result.data.columns).toHaveLength(2)
      }
    })

    it('should validate minimal export', () => {
      const validData = {
        format: 'csv',
        data: [],
        columns: []
      }
      
      const result = exportReportSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })
})