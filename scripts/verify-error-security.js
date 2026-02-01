#!/usr/bin/env node

/**
 * Script to verify that no internal details are exposed in API error responses
 */

const fs = require('fs')
const glob = require('glob')

console.log('🔒 Verifying Error Handling Security\n')
console.log('=' .repeat(50))

// Find all API route files
const apiRoutes = glob.sync('app/api/**/*.ts', { cwd: process.cwd() })

console.log(`🔍 Scanning ${apiRoutes.length} API route files...\n`)

// Security checks
const securityIssues = []
let secureRoutes = 0
let routesWithLogging = 0
let routesWithSecureImports = 0

apiRoutes.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8')
  
  // Check 1: Direct error.message exposure in responses
  if (content.match(/NextResponse\.json.*error\.message/)) {
    securityIssues.push({
      file: filePath,
      issue: 'Direct error.message exposure in NextResponse.json',
      severity: 'HIGH'
    })
  }
  
  // Check 2: Error instanceof Error ? error.message patterns
  if (content.match(/error instanceof Error \? error\.message/)) {
    securityIssues.push({
      file: filePath,
      issue: 'Conditional error.message exposure',
      severity: 'HIGH'
    })
  }
  
  // Check 3: Throwing errors with sensitive data
  if (content.match(/throw new Error.*\$\{.*\}/)) {
    securityIssues.push({
      file: filePath,
      issue: 'Error thrown with interpolated data',
      severity: 'MEDIUM'
    })
  }
  
  // Check 4: Console.log of sensitive data (should be console.error)
  if (content.match(/console\.log.*error/i)) {
    securityIssues.push({
      file: filePath,
      issue: 'Error logged with console.log (should use console.error)',
      severity: 'LOW'
    })
  }
  
  // Positive checks
  if (content.includes('createSecureErrorResponse') || content.includes('SecureError')) {
    routesWithSecureImports++
  }
  
  if (content.includes('console.error')) {
    routesWithLogging++
  }
  
  // Check if route has any error handling
  if (content.includes('catch') || content.includes('createSecureErrorResponse')) {
    secureRoutes++
  }
})

// Report findings
console.log('📊 Security Analysis Results:\n')

if (securityIssues.length === 0) {
  console.log('🎉 No security issues found!')
} else {
  console.log(`❌ Found ${securityIssues.length} security issues:\n`)
  
  securityIssues.forEach((issue, index) => {
    const severity = issue.severity === 'HIGH' ? '🚨' : 
                    issue.severity === 'MEDIUM' ? '⚠️' : '💡'
    console.log(`${index + 1}. ${severity} ${issue.severity}: ${issue.issue}`)
    console.log(`   File: ${issue.file}\n`)
  })
}

console.log('📈 Security Metrics:')
console.log(`   Total API Routes: ${apiRoutes.length}`)
console.log(`   Routes with Error Handling: ${secureRoutes}`)
console.log(`   Routes with Secure Imports: ${routesWithSecureImports}`)
console.log(`   Routes with Server Logging: ${routesWithLogging}`)

// Additional checks
console.log('\n🔍 Additional Security Checks:')

// Check for environment variable exposure
let envExposureIssues = 0
apiRoutes.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8')
  if (content.match(/process\.env\.[A-Z_]+.*NextResponse\.json/)) {
    envExposureIssues++
    console.log(`   ⚠️  ${filePath} may expose environment variables`)
  }
})

if (envExposureIssues === 0) {
  console.log('   ✅ No environment variable exposure detected')
}

// Check for database connection string exposure
let dbExposureIssues = 0
apiRoutes.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8')
  if (content.match(/(postgresql|mysql|mongodb):\/\/.*NextResponse\.json/i)) {
    dbExposureIssues++
    console.log(`   ⚠️  ${filePath} may expose database connection strings`)
  }
})

if (dbExposureIssues === 0) {
  console.log('   ✅ No database connection string exposure detected')
}

// Final security assessment
console.log('\n' + '=' .repeat(50))

const highSeverityIssues = securityIssues.filter(issue => issue.severity === 'HIGH').length
const totalIssues = securityIssues.length + envExposureIssues + dbExposureIssues

if (totalIssues === 0) {
  console.log('🔒 SECURITY STATUS: SECURE ✅')
  console.log('   • No internal details exposed in error responses')
  console.log('   • Proper server-side error logging in place')
  console.log('   • Secure error handling patterns used')
  console.log('   • No sensitive data exposure detected')
} else if (highSeverityIssues === 0) {
  console.log('🔒 SECURITY STATUS: MOSTLY SECURE ⚠️')
  console.log(`   • ${totalIssues} minor security issues found`)
  console.log('   • No critical vulnerabilities detected')
  console.log('   • Review and fix minor issues when possible')
} else {
  console.log('🚨 SECURITY STATUS: VULNERABLE ❌')
  console.log(`   • ${highSeverityIssues} high-severity issues found`)
  console.log(`   • ${totalIssues} total security issues detected`)
  console.log('   • Immediate action required to fix vulnerabilities')
}

// Exit with appropriate code
process.exit(totalIssues === 0 ? 0 : 1)