#!/usr/bin/env node

const fs = require('fs')
const glob = require('glob')

// Find all API route files
const apiRoutes = glob.sync('app/api/**/*.ts', { cwd: process.cwd() })

console.log(`🔍 Scanning ${apiRoutes.length} API route files for insecure error handling...`)

let totalFixed = 0

apiRoutes.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8')
  let modified = false
  
  // Check if this file has the insecure pattern
  const hasInsecurePattern = content.includes('error instanceof Error ? error.message') ||
                            content.includes('error.message')
  
  if (!hasInsecurePattern) {
    return // Skip files that don't need fixing
  }
  
  console.log(`🔧 Fixing ${filePath}...`)
  
  // Add import if not present
  if (!content.includes('createSecureErrorResponse')) {
    const lines = content.split('\n')
    let lastImportIndex = -1
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ')) {
        lastImportIndex = i
      }
    }
    
    if (lastImportIndex >= 0) {
      lines.splice(lastImportIndex + 1, 0, "import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'")
      content = lines.join('\n')
      modified = true
    }
  }
  
  // Replace patterns that return NextResponse.json with error.message
  const pattern1 = /return NextResponse\.json\(\s*\{\s*error:\s*error instanceof Error \? error\.message : '[^']+'\s*\},\s*\{\s*status:\s*\d+\s*\}\s*\)/g
  if (pattern1.test(content)) {
    content = content.replace(pattern1, 'return createSecureErrorResponse(error)')
    modified = true
    totalFixed++
  }
  
  // Replace patterns in catch blocks that just have the error object
  const pattern2 = /\{\s*error:\s*error instanceof Error \? error\.message : '[^']+'\s*\}/g
  if (pattern2.test(content)) {
    content = content.replace(pattern2, 'createSecureErrorResponse(error)')
    modified = true
    totalFixed++
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content)
    console.log(`✅ Fixed ${filePath}`)
  }
})

console.log(`\n🎉 Fixed ${totalFixed} insecure error handling patterns`)

// Verify no more instances remain
const remainingFiles = []
apiRoutes.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8')
  if (content.includes('error instanceof Error ? error.message') || 
      content.match(/NextResponse\.json.*error\.message/)) {
    remainingFiles.push(filePath)
  }
})

if (remainingFiles.length > 0) {
  console.log(`\n⚠️  ${remainingFiles.length} files still have insecure patterns:`)
  remainingFiles.forEach(file => console.log(`   - ${file}`))
} else {
  console.log(`\n🔒 All API routes now use secure error handling!`)
}