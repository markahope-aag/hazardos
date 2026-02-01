#!/usr/bin/env node

/**
 * Test Coverage Analysis Script
 * Analyzes current test coverage and identifies gaps
 */

const fs = require('fs')
const path = require('path')
const glob = require('glob')

console.log('📊 HazardOS Test Coverage Analysis\n')
console.log('=' .repeat(60))

// Find all API routes
const apiRoutes = glob.sync('app/api/**/route.ts', { cwd: process.cwd() })
const apiTests = glob.sync('test/api/**/*.test.ts', { cwd: process.cwd() })

console.log(`\n🔍 API COVERAGE ANALYSIS`)
console.log(`📁 Total API Routes: ${apiRoutes.length}`)
console.log(`🧪 API Test Files: ${apiTests.length}`)
console.log(`📉 Coverage Gap: ${apiRoutes.length - apiTests.length} untested routes`)

// Categorize API routes by domain
const routeCategories = {}
apiRoutes.forEach(route => {
  const parts = route.split('/')
  const domain = parts[2] // app/api/[domain]/...
  if (!routeCategories[domain]) {
    routeCategories[domain] = []
  }
  routeCategories[domain].push(route)
})

console.log(`\n📋 API ROUTES BY DOMAIN:`)
Object.entries(routeCategories).forEach(([domain, routes]) => {
  const hasTests = apiTests.some(test => test.includes(domain))
  const status = hasTests ? '✅' : '❌'
  console.log(`   ${status} ${domain}: ${routes.length} routes${hasTests ? ' (has tests)' : ' (NO TESTS)'}`)
})

// Find all components
const components = glob.sync('components/**/*.tsx', { cwd: process.cwd() })
const componentTests = glob.sync('test/components/**/*.test.tsx', { cwd: process.cwd() })

console.log(`\n🔍 COMPONENT COVERAGE ANALYSIS`)
console.log(`🧩 Total Components: ${components.length}`)
console.log(`🧪 Component Test Files: ${componentTests.length}`)
console.log(`📉 Coverage Gap: ${components.length - componentTests.length} untested components`)

// Find all hooks
const hooks = glob.sync('lib/hooks/**/*.ts', { cwd: process.cwd() })
const hookTests = glob.sync('test/hooks/**/*.test.tsx', { cwd: process.cwd() })

console.log(`\n🔍 HOOKS COVERAGE ANALYSIS`)
console.log(`🪝 Total Hooks: ${hooks.length}`)
console.log(`🧪 Hook Test Files: ${hookTests.length}`)
console.log(`📉 Coverage Gap: ${hooks.length - hookTests.length} untested hooks`)

// Find all services
const services = glob.sync('lib/services/**/*.ts', { cwd: process.cwd() })
const serviceTests = glob.sync('test/services/**/*.test.ts', { cwd: process.cwd() })

console.log(`\n🔍 SERVICES COVERAGE ANALYSIS`)
console.log(`⚙️  Total Services: ${services.length}`)
console.log(`🧪 Service Test Files: ${serviceTests.length}`)
console.log(`📉 Coverage Gap: ${services.length - serviceTests.length} untested services`)

// Critical untested areas
console.log(`\n🚨 CRITICAL UNTESTED AREAS:`)

const criticalAreas = [
  { name: 'Jobs API', routes: routeCategories.jobs || [], priority: 'HIGH' },
  { name: 'Invoices API', routes: routeCategories.invoices || [], priority: 'HIGH' },
  { name: 'Estimates API', routes: routeCategories.estimates || [], priority: 'HIGH' },
  { name: 'Proposals API', routes: routeCategories.proposals || [], priority: 'HIGH' },
  { name: 'Settings/Pricing API', routes: routeCategories.settings || [], priority: 'MEDIUM' },
  { name: 'Analytics API', routes: routeCategories.analytics || [], priority: 'MEDIUM' },
  { name: 'Integrations API', routes: routeCategories.integrations || [], priority: 'MEDIUM' },
  { name: 'Portal API', routes: routeCategories.portal || [], priority: 'LOW' }
]

criticalAreas.forEach(area => {
  const hasTests = apiTests.some(test => test.includes(area.name.toLowerCase().split(' ')[0]))
  const priority = area.priority === 'HIGH' ? '🚨' : area.priority === 'MEDIUM' ? '⚠️' : '💡'
  const status = hasTests ? '✅' : '❌'
  console.log(`   ${priority} ${status} ${area.name}: ${area.routes.length} routes (${area.priority} priority)`)
})

// Test quality analysis
console.log(`\n🔍 TEST QUALITY ANALYSIS:`)

let totalTestFiles = 0
let testStats = {
  unit: 0,
  integration: 0,
  performance: 0,
  validation: 0
}

// Count test files by type
const allTestFiles = glob.sync('test/**/*.test.{ts,tsx}', { cwd: process.cwd() })
totalTestFiles = allTestFiles.length

allTestFiles.forEach(testFile => {
  if (testFile.includes('/integration/')) testStats.integration++
  else if (testFile.includes('/performance/')) testStats.performance++
  else if (testFile.includes('/validations/')) testStats.validation++
  else testStats.unit++
})

console.log(`📊 Total Test Files: ${totalTestFiles}`)
console.log(`   🔧 Unit Tests: ${testStats.unit}`)
console.log(`   🔗 Integration Tests: ${testStats.integration}`)
console.log(`   ⚡ Performance Tests: ${testStats.performance}`)
console.log(`   ✅ Validation Tests: ${testStats.validation}`)

// Recommendations
console.log(`\n💡 RECOMMENDATIONS:`)
console.log(`\n🎯 IMMEDIATE PRIORITIES (HIGH):`)
console.log(`   1. Add comprehensive API tests for Jobs management`)
console.log(`   2. Add comprehensive API tests for Invoices management`)
console.log(`   3. Add comprehensive API tests for Estimates management`)
console.log(`   4. Add comprehensive API tests for Proposals management`)

console.log(`\n📈 MEDIUM PRIORITIES:`)
console.log(`   1. Add API tests for Settings/Pricing endpoints`)
console.log(`   2. Add API tests for Analytics endpoints`)
console.log(`   3. Add component tests for critical UI components`)
console.log(`   4. Add integration tests for complete workflows`)

console.log(`\n🔧 INFRASTRUCTURE:`)
console.log(`   1. Set up test coverage reporting`)
console.log(`   2. Add test coverage thresholds to CI/CD`)
console.log(`   3. Set up automated test generation`)
console.log(`   4. Add performance benchmarking`)

// Calculate overall coverage estimate
const estimatedCoverage = (totalTestFiles / (apiRoutes.length + components.length + hooks.length + services.length)) * 100

console.log(`\n📊 ESTIMATED OVERALL COVERAGE: ${estimatedCoverage.toFixed(1)}%`)

if (estimatedCoverage < 30) {
  console.log(`🚨 COVERAGE STATUS: CRITICAL - Immediate action required`)
} else if (estimatedCoverage < 60) {
  console.log(`⚠️  COVERAGE STATUS: LOW - Significant improvement needed`)
} else if (estimatedCoverage < 80) {
  console.log(`💡 COVERAGE STATUS: MODERATE - Good progress, continue improving`)
} else {
  console.log(`✅ COVERAGE STATUS: GOOD - Maintain and enhance`)
}

console.log(`\n${'=' .repeat(60)}`)
console.log(`🎯 TARGET: Achieve 80%+ test coverage across all critical paths`)
console.log(`📈 NEXT STEP: Start with HIGH priority API tests`)
console.log(`🔒 SECURITY: All new security features need comprehensive tests`)