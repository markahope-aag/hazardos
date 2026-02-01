#!/usr/bin/env node

const fs = require('fs')

// Files that need fixing
const files = [
  'app/api/settings/pricing/disposal-fees/route.ts',
  'app/api/settings/pricing/travel-rates/route.ts', 
  'app/api/settings/pricing/labor-rates/route.ts',
  'app/api/settings/pricing/material-costs/route.ts',
  'app/api/jobs/from-proposal/route.ts'
]

files.forEach(filePath => {
  console.log(`Fixing ${filePath}...`)
  
  let content = fs.readFileSync(filePath, 'utf8')
  
  // Add import if not present
  if (!content.includes('createSecureErrorResponse')) {
    // Find the last import line
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
    }
  }
  
  // Replace error.message patterns
  content = content.replace(
    /return NextResponse\.json\(\{\s*error:\s*error\.message\s*\},\s*\{\s*status:\s*\d+\s*\}\)/g,
    'return createSecureErrorResponse(error)'
  )
  
  // Replace error instanceof Error patterns
  content = content.replace(
    /\{\s*error:\s*error instanceof Error \? error\.message : '[^']+'\s*\}/g,
    'createSecureErrorResponse(error)'
  )
  
  fs.writeFileSync(filePath, content)
  console.log(`✅ Fixed ${filePath}`)
})

console.log('\n🎉 All remaining error handling issues fixed!')