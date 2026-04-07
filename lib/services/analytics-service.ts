// Stub: analytics-service is tested via mocks in test/lib/services/analytics-service.test.ts
// This file exists only to satisfy Vite import resolution.
export const AnalyticsService = {
  track: async () => ({ success: false, error: 'Not implemented' }),
  trackBatch: async () => ({ success: false }),
  trackPerformance: async () => ({ success: false }),
  getPerformanceAggregates: async () => ({ success: false }),
  trackWebVitals: async () => ({ success: false }),
  trackError: async () => ({ success: false }),
  getErrorGroups: async () => ({ success: false }),
  updateErrorStatus: async () => ({ success: false }),
  getEvents: async () => ({ success: false }),
  generateReport: async () => ({ success: false }),
  exportData: async () => ({ success: false }),
  cleanupOldData: async () => ({ success: false }),
  deleteUserData: async () => ({ success: false }),
}
