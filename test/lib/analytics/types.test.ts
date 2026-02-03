import { describe, it, expect } from 'vitest'
import type {
  TrackingEvent,
  FormSubmissionEvent,
  UserActionEvent,
  FeatureUsageEvent,
  ErrorEvent,
  PerformanceMetric,
  WebVitalsMetric,
  ApiPerformanceData,
  DatabaseQueryData,
  AnalyticsConfig
} from '@/lib/analytics/types'

describe('analytics types', () => {
  describe('TrackingEvent', () => {
    it('should accept valid tracking event', () => {
      const event: TrackingEvent = {
        name: 'page_view',
        properties: {
          page: '/dashboard',
          user_id: 'user123',
          session_duration: 1500,
          is_mobile: true,
          referrer: null
        },
        timestamp: Date.now()
      }
      
      expect(event.name).toBe('page_view')
      expect(event.properties?.page).toBe('/dashboard')
      expect(event.properties?.user_id).toBe('user123')
      expect(event.properties?.session_duration).toBe(1500)
      expect(event.properties?.is_mobile).toBe(true)
      expect(event.properties?.referrer).toBeNull()
      expect(typeof event.timestamp).toBe('number')
    })

    it('should accept minimal tracking event', () => {
      const event: TrackingEvent = {
        name: 'button_click'
      }
      
      expect(event.name).toBe('button_click')
      expect(event.properties).toBeUndefined()
      expect(event.timestamp).toBeUndefined()
    })
  })

  describe('FormSubmissionEvent', () => {
    it('should accept valid form submission event', () => {
      const event: FormSubmissionEvent = {
        formType: 'customer',
        formName: 'create-customer-form',
        success: true,
        duration: 2500,
        fieldCount: 8
      }
      
      expect(event.formType).toBe('customer')
      expect(event.formName).toBe('create-customer-form')
      expect(event.success).toBe(true)
      expect(event.duration).toBe(2500)
      expect(event.fieldCount).toBe(8)
    })

    it('should accept form submission with error', () => {
      const event: FormSubmissionEvent = {
        formType: 'estimate',
        formName: 'estimate-form',
        success: false,
        errorType: 'validation_error'
      }
      
      expect(event.success).toBe(false)
      expect(event.errorType).toBe('validation_error')
    })

    it('should validate form types', () => {
      const validFormTypes = [
        'estimate', 'proposal', 'invoice', 'customer', 
        'job', 'contact', 'settings', 'other'
      ]
      
      validFormTypes.forEach(formType => {
        const event: FormSubmissionEvent = {
          formType: formType as any,
          formName: 'test-form',
          success: true
        }
        
        expect(event.formType).toBe(formType)
      })
    })
  })

  describe('UserActionEvent', () => {
    it('should accept valid user action event', () => {
      const event: UserActionEvent = {
        action: 'create_customer',
        entityType: 'customer',
        entityId: 'cust_123',
        metadata: {
          source: 'dashboard',
          method: 'form',
          duration: 1200
        }
      }
      
      expect(event.action).toBe('create_customer')
      expect(event.entityType).toBe('customer')
      expect(event.entityId).toBe('cust_123')
      expect(event.metadata?.source).toBe('dashboard')
    })

    it('should validate action types', () => {
      const validActions = [
        'create_customer', 'update_customer', 'delete_customer',
        'create_job', 'schedule_job', 'complete_job',
        'create_estimate', 'send_estimate',
        'create_proposal', 'send_proposal',
        'create_invoice', 'send_invoice', 'payment_received',
        'upload_document', 'generate_report', 'export_data', 'import_data',
        'user_login', 'user_logout', 'settings_update', 'other'
      ]
      
      validActions.forEach(action => {
        const event: UserActionEvent = {
          action: action as any
        }
        
        expect(event.action).toBe(action)
      })
    })
  })

  describe('FeatureUsageEvent', () => {
    it('should accept valid feature usage event', () => {
      const event: FeatureUsageEvent = {
        feature: 'ai_estimate_generator',
        action: 'use',
        success: true,
        duration: 3500,
        metadata: {
          estimate_type: 'asbestos',
          complexity: 'medium',
          tokens_used: 150
        }
      }
      
      expect(event.feature).toBe('ai_estimate_generator')
      expect(event.action).toBe('use')
      expect(event.success).toBe(true)
      expect(event.duration).toBe(3500)
      expect(event.metadata?.estimate_type).toBe('asbestos')
    })

    it('should validate feature types', () => {
      const validFeatures = [
        'ai_assistant', 'ai_estimate_generator', 'ai_proposal_writer', 'ai_report_generator',
        'quickbooks_sync', 'google_calendar_sync', 'outlook_sync',
        'email_integration', 'sms_notifications', 'portal_access',
        'mobile_app', 'offline_mode', 'bulk_actions',
        'advanced_search', 'custom_reports', 'api_access', 'other'
      ]
      
      validFeatures.forEach(feature => {
        const event: FeatureUsageEvent = {
          feature: feature as any,
          action: 'view'
        }
        
        expect(event.feature).toBe(feature)
      })
    })

    it('should validate action types', () => {
      const validActions = ['view', 'use', 'configure', 'enable', 'disable']
      
      validActions.forEach(action => {
        const event: FeatureUsageEvent = {
          feature: 'ai_assistant',
          action: action as any
        }
        
        expect(event.action).toBe(action)
      })
    })
  })

  describe('ErrorEvent', () => {
    it('should accept valid error event', () => {
      const event: ErrorEvent = {
        errorType: 'api',
        errorMessage: 'Failed to create customer',
        errorCode: 'VALIDATION_FAILED',
        component: 'CustomerForm',
        action: 'create_customer',
        userId: 'user_123',
        stackTrace: 'Error: Validation failed\n    at CustomerService.create',
        metadata: {
          endpoint: '/api/customers',
          status_code: 400,
          request_id: 'req_456'
        }
      }
      
      expect(event.errorType).toBe('api')
      expect(event.errorMessage).toBe('Failed to create customer')
      expect(event.errorCode).toBe('VALIDATION_FAILED')
      expect(event.component).toBe('CustomerForm')
      expect(event.stackTrace).toContain('CustomerService.create')
    })

    it('should validate error types', () => {
      const validErrorTypes = [
        'api', 'validation', 'auth', 'network', 
        'database', 'integration', 'unknown'
      ]
      
      validErrorTypes.forEach(errorType => {
        const event: ErrorEvent = {
          errorType: errorType as any,
          errorMessage: 'Test error'
        }
        
        expect(event.errorType).toBe(errorType)
      })
    })
  })

  describe('PerformanceMetric', () => {
    it('should accept valid performance metric', () => {
      const metric: PerformanceMetric = {
        name: 'api_response_time',
        value: 250,
        unit: 'ms',
        category: 'api',
        metadata: {
          endpoint: '/api/customers',
          method: 'GET',
          status_code: 200
        }
      }
      
      expect(metric.name).toBe('api_response_time')
      expect(metric.value).toBe(250)
      expect(metric.unit).toBe('ms')
      expect(metric.category).toBe('api')
    })

    it('should validate units', () => {
      const validUnits = ['ms', 's', 'bytes', 'count', 'percent']
      
      validUnits.forEach(unit => {
        const metric: PerformanceMetric = {
          name: 'test_metric',
          value: 100,
          unit: unit as any,
          category: 'custom'
        }
        
        expect(metric.unit).toBe(unit)
      })
    })

    it('should validate categories', () => {
      const validCategories = ['api', 'database', 'render', 'network', 'custom']
      
      validCategories.forEach(category => {
        const metric: PerformanceMetric = {
          name: 'test_metric',
          value: 100,
          unit: 'ms',
          category: category as any
        }
        
        expect(metric.category).toBe(category)
      })
    })
  })

  describe('WebVitalsMetric', () => {
    it('should accept valid web vitals metric', () => {
      const metric: WebVitalsMetric = {
        id: 'v3-1234567890',
        name: 'LCP',
        value: 1200,
        rating: 'good',
        delta: 50,
        navigationType: 'navigate'
      }
      
      expect(metric.id).toBe('v3-1234567890')
      expect(metric.name).toBe('LCP')
      expect(metric.value).toBe(1200)
      expect(metric.rating).toBe('good')
      expect(metric.delta).toBe(50)
    })

    it('should validate web vitals names', () => {
      const validNames = ['LCP', 'FID', 'CLS', 'TTFB', 'INP', 'FCP']
      
      validNames.forEach(name => {
        const metric: WebVitalsMetric = {
          id: 'test-id',
          name: name as any,
          value: 100,
          rating: 'good',
          delta: 10,
          navigationType: 'navigate'
        }
        
        expect(metric.name).toBe(name)
      })
    })

    it('should validate ratings', () => {
      const validRatings = ['good', 'needs-improvement', 'poor']
      
      validRatings.forEach(rating => {
        const metric: WebVitalsMetric = {
          id: 'test-id',
          name: 'LCP',
          value: 100,
          rating: rating as any,
          delta: 10,
          navigationType: 'navigate'
        }
        
        expect(metric.rating).toBe(rating)
      })
    })
  })

  describe('ApiPerformanceData', () => {
    it('should accept valid API performance data', () => {
      const data: ApiPerformanceData = {
        endpoint: '/api/customers',
        method: 'POST',
        statusCode: 201,
        duration: 350,
        success: true
      }
      
      expect(data.endpoint).toBe('/api/customers')
      expect(data.method).toBe('POST')
      expect(data.statusCode).toBe(201)
      expect(data.duration).toBe(350)
      expect(data.success).toBe(true)
    })

    it('should accept API performance data with error', () => {
      const data: ApiPerformanceData = {
        endpoint: '/api/jobs',
        method: 'GET',
        statusCode: 500,
        duration: 5000,
        success: false,
        errorMessage: 'Internal server error'
      }
      
      expect(data.success).toBe(false)
      expect(data.errorMessage).toBe('Internal server error')
    })

    it('should validate HTTP methods', () => {
      const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
      
      validMethods.forEach(method => {
        const data: ApiPerformanceData = {
          endpoint: '/api/test',
          method: method as any,
          statusCode: 200,
          duration: 100,
          success: true
        }
        
        expect(data.method).toBe(method)
      })
    })
  })

  describe('DatabaseQueryData', () => {
    it('should accept valid database query data', () => {
      const data: DatabaseQueryData = {
        operation: 'select',
        table: 'customers',
        duration: 25,
        rowCount: 150,
        success: true
      }
      
      expect(data.operation).toBe('select')
      expect(data.table).toBe('customers')
      expect(data.duration).toBe(25)
      expect(data.rowCount).toBe(150)
      expect(data.success).toBe(true)
    })

    it('should validate database operations', () => {
      const validOperations = ['select', 'insert', 'update', 'delete', 'upsert']
      
      validOperations.forEach(operation => {
        const data: DatabaseQueryData = {
          operation: operation as any,
          table: 'test_table',
          duration: 10,
          success: true
        }
        
        expect(data.operation).toBe(operation)
      })
    })
  })

  describe('AnalyticsConfig', () => {
    it('should accept valid analytics config', () => {
      const config: AnalyticsConfig = {
        enabled: true,
        debug: false,
        sampleRate: 0.1,
        respectDoNotTrack: true,
        excludePaths: ['/health', '/metrics', '/api/internal']
      }
      
      expect(config.enabled).toBe(true)
      expect(config.debug).toBe(false)
      expect(config.sampleRate).toBe(0.1)
      expect(config.respectDoNotTrack).toBe(true)
      expect(config.excludePaths).toHaveLength(3)
    })

    it('should accept minimal config', () => {
      const config: AnalyticsConfig = {
        enabled: false,
        debug: true,
        sampleRate: 1.0,
        respectDoNotTrack: false,
        excludePaths: []
      }
      
      expect(config.excludePaths).toHaveLength(0)
    })
  })

  describe('type compatibility', () => {
    it('should allow event composition', () => {
      function trackEvent(event: TrackingEvent): void {
        expect(event.name).toBeDefined()
      }
      
      const formEvent: FormSubmissionEvent = {
        formType: 'customer',
        formName: 'test-form',
        success: true
      }
      
      // Should be able to use FormSubmissionEvent data in TrackingEvent
      trackEvent({
        name: 'form_submission',
        properties: {
          form_type: formEvent.formType,
          success: formEvent.success
        }
      })
    })

    it('should support metric aggregation', () => {
      const metrics: PerformanceMetric[] = [
        {
          name: 'api_latency',
          value: 100,
          unit: 'ms',
          category: 'api'
        },
        {
          name: 'db_query_time',
          value: 50,
          unit: 'ms',
          category: 'database'
        }
      ]
      
      const totalLatency = metrics.reduce((sum, metric) => sum + metric.value, 0)
      expect(totalLatency).toBe(150)
    })
  })
})