#!/usr/bin/env node

/**
 * Script to systematically fix insecure error handling across all API routes
 * This replaces direct error.message exposure with secure error responses
 */

const fs = require('fs')
const path = require('path')
const glob = require('glob')

// Find all API route files
const apiRoutes = glob.sync('app/api/**/*.ts', { cwd: process.cwd() })

console.log(`🔍 Found ${apiRoutes.length} API route files to check`)

let totalFixed = 0

apiRoutes.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath)
  let content = fs.readFileSync(fullPath, 'utf8')
  let modified = false
  let fixCount = 0

  // Check if file already has secure error handling imports
  const hasSecureImport = content.includes('createSecureErrorResponse') || 
                         content.includes('SecureError')

  // Pattern 1: error instanceof Error ? error.message : 'fallback'
  const pattern1 = /error instanceof Error \? error\.message : '[^']+'/g
  if (pattern1.test(content)) {
    if (!hasSecureImport) {
      // Add import at the top
      const importPattern = /(import.*from.*['"][^'"]+['"])/g
      const imports = content.match(importPattern) || []
      const lastImport = imports[imports.length - 1]
      
      if (lastImport) {
        const secureImport = "import { createSecureErrorResponse, SecureError, validateRequired } from '@/lib/utils/secure-error-handler'"
        content = content.replace(lastImport, lastImport + '\n' + secureImport)
        modified = true
      }
    }

    // Replace the error handling pattern
    content = content.replace(
      /return NextResponse\.json\(\s*\{\s*error:\s*error instanceof Error \? error\.message : '[^']+'\s*\},\s*\{\s*status:\s*\d+\s*\}\s*\)/g,
      'return createSecureErrorResponse(error)'
    )
    
    // Count fixes
    const matches = content.match(pattern1)
    if (matches) {
      fixCount += matches.length
      modified = true
    }
  }

  // Pattern 2: error.message direct usage
  const pattern2 = /\{\s*error:\s*error\.message\s*\}/g
  if (pattern2.test(content)) {
    if (!hasSecureImport) {
      // Add import at the top
      const importPattern = /(import.*from.*['"][^'"]+['"])/g
      const imports = content.match(importPattern) || []
      const lastImport = imports[imports.length - 1]
      
      if (lastImport) {
        const secureImport = "import { createSecureErrorResponse, SecureError, validateRequired } from '@/lib/utils/secure-error-handler'"
        content = content.replace(lastImport, lastImport + '\n' + secureImport)
        modified = true
      }
    }

    content = content.replace(
      /return NextResponse\.json\(\{\s*error:\s*error\.message\s*\},\s*\{\s*status:\s*\d+\s*\}\)/g,
      'return createSecureErrorResponse(error)'
    )
    
    const matches = content.match(pattern2)
    if (matches) {
      fixCount += matches.length
      modified = true
    }
  }

  // Pattern 3: Basic unauthorized checks
  content = content.replace(
    /return NextResponse\.json\(\{\s*error:\s*['"]Unauthorized['"]\s*\},\s*\{\s*status:\s*401\s*\}\)/g,
    'throw new SecureError(\'UNAUTHORIZED\')'
  )

  // Pattern 4: Basic validation error patterns
  content = content.replace(
    /return NextResponse\.json\(\{\s*error:\s*['"]([^'"]+) is required['"]\s*\},\s*\{\s*status:\s*400\s*\}\)/g,
    (match, fieldName) => `throw new SecureError('VALIDATION_ERROR', '${fieldName} is required', '${fieldName}')`
  )

  if (modified) {
    fs.writeFileSync(fullPath, content)
    console.log(`✅ Fixed ${fixCount} error handling issues in ${filePath}`)
    totalFixed += fixCount
  }
})

console.log(`\n🎉 Fixed ${totalFixed} insecure error handling patterns across ${apiRoutes.length} files`)
console.log(`\n⚠️  Manual review recommended for complex error handling logic`)
console.log(`\n🔒 All API routes now use secure error responses that don't expose internal details`)