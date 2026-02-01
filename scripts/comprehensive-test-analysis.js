const fs = require('fs');
const path = require('path');

// Comprehensive test coverage analysis
function analyzeTestCoverage() {
  const results = {
    summary: {
      totalTestFiles: 0,
      totalTests: 0,
      apiRoutesCovered: 0,
      totalApiRoutes: 0,
      componentsCovered: 0,
      servicesCovered: 0,
      hooksCovered: 0,
      middlewareCovered: 0,
      integrationTests: 0,
      performanceTests: 0
    },
    categories: {
      api: { files: [], testCount: 0 },
      components: { files: [], testCount: 0 },
      services: { files: [], testCount: 0 },
      hooks: { files: [], testCount: 0 },
      middleware: { files: [], testCount: 0 },
      validations: { files: [], testCount: 0 },
      lib: { files: [], testCount: 0 },
      integration: { files: [], testCount: 0 },
      performance: { files: [], testCount: 0 }
    },
    newTests: [],
    coverageGaps: [],
    recommendations: []
  };

  // Get all test files
  const testFiles = getAllTestFiles('./test');
  results.summary.totalTestFiles = testFiles.length;

  // Analyze each test file
  testFiles.forEach(testFile => {
    const content = fs.readFileSync(testFile, 'utf8');
    const testCount = countTests(content);
    const category = categorizeTestFile(testFile);
    
    const fileInfo = {
      path: testFile,
      testCount,
      category,
      size: fs.statSync(testFile).size,
      lastModified: fs.statSync(testFile).mtime
    };

    results.summary.totalTests += testCount;
    
    if (results.categories[category]) {
      results.categories[category].files.push(fileInfo);
      results.categories[category].testCount += testCount;
    }

    // Count specific categories
    if (category === 'api') results.summary.apiRoutesCovered++;
    if (category === 'components') results.summary.componentsCovered++;
    if (category === 'services') results.summary.servicesCovered++;
    if (category === 'hooks') results.summary.hooksCovered++;
    if (category === 'middleware') results.summary.middlewareCovered++;
    if (category === 'integration') results.summary.integrationTests++;
    if (category === 'performance') results.summary.performanceTests++;
  });

  // Count total API routes
  const apiRoutes = getAllFiles('./app/api', ['.ts'], ['node_modules', '.next']);
  results.summary.totalApiRoutes = apiRoutes.filter(f => f.endsWith('route.ts')).length;

  // Calculate coverage percentages
  results.summary.apiCoveragePercent = results.summary.totalApiRoutes > 0 
    ? Math.round((results.summary.apiRoutesCovered / results.summary.totalApiRoutes) * 100) 
    : 0;

  // Identify recent additions (new tests)
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  results.newTests = testFiles
    .filter(file => fs.statSync(file).mtime > oneWeekAgo)
    .map(file => ({
      path: file,
      category: categorizeTestFile(file),
      testCount: countTests(fs.readFileSync(file, 'utf8')),
      created: fs.statSync(file).mtime
    }))
    .sort((a, b) => b.created - a.created);

  // Generate recommendations
  results.recommendations = generateRecommendations(results);

  return results;
}

function getAllTestFiles(dir) {
  const files = [];
  
  function traverse(currentDir) {
    try {
      const items = fs.readdirSync(currentDir);
      
      items.forEach(item => {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          traverse(fullPath);
        } else if (item.endsWith('.test.ts') || item.endsWith('.test.tsx')) {
          files.push(fullPath.replace(/\\/g, '/'));
        }
      });
    } catch (error) {
      // Skip inaccessible directories
    }
  }
  
  traverse(dir);
  return files;
}

function getAllFiles(dir, extensions, exclude = []) {
  const files = [];
  
  function traverse(currentDir) {
    if (exclude.some(ex => currentDir.includes(ex))) return;
    
    try {
      const items = fs.readdirSync(currentDir);
      
      items.forEach(item => {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          traverse(fullPath);
        } else if (extensions.some(ext => item.endsWith(ext))) {
          files.push(fullPath.replace(/\\/g, '/'));
        }
      });
    } catch (error) {
      // Skip inaccessible directories
    }
  }
  
  traverse(dir);
  return files;
}

function countTests(content) {
  const itMatches = (content.match(/\bit\(/g) || []).length;
  const testMatches = (content.match(/\btest\(/g) || []).length;
  return itMatches + testMatches;
}

function categorizeTestFile(filePath) {
  if (filePath.includes('/api/')) return 'api';
  if (filePath.includes('/components/')) return 'components';
  if (filePath.includes('/services/')) return 'services';
  if (filePath.includes('/hooks/')) return 'hooks';
  if (filePath.includes('/middleware/')) return 'middleware';
  if (filePath.includes('/validations/')) return 'validations';
  if (filePath.includes('/lib/')) return 'lib';
  if (filePath.includes('/integration/')) return 'integration';
  if (filePath.includes('/performance/')) return 'performance';
  return 'other';
}

function generateRecommendations(results) {
  const recommendations = [];
  
  // API Coverage recommendation
  if (results.summary.apiCoveragePercent < 70) {
    recommendations.push({
      priority: results.summary.apiCoveragePercent < 30 ? 'CRITICAL' : 'HIGH',
      category: 'API_COVERAGE',
      title: `API Route Coverage: ${results.summary.apiCoveragePercent}%`,
      description: `${results.summary.apiRoutesCovered}/${results.summary.totalApiRoutes} API routes have tests`,
      action: 'Add tests for remaining API endpoints',
      impact: 'High risk of production bugs in untested routes'
    });
  }

  // Component testing recommendation
  if (results.summary.componentsCovered < 10) {
    recommendations.push({
      priority: 'HIGH',
      category: 'COMPONENTS',
      title: 'Limited Component Testing',
      description: `Only ${results.summary.componentsCovered} components have tests`,
      action: 'Add unit tests for critical UI components',
      impact: 'User interface bugs and poor user experience'
    });
  }

  // Integration testing recommendation
  if (results.summary.integrationTests < 5) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'INTEGRATION',
      title: 'Limited Integration Testing',
      description: `Only ${results.summary.integrationTests} integration tests found`,
      action: 'Add end-to-end workflow tests',
      impact: 'Integration failures between components'
    });
  }

  return recommendations;
}

// Generate detailed report
function generateReport(results) {
  const report = `
# HazardOS Comprehensive Test Coverage Analysis
**Generated:** ${new Date().toISOString()}

## Executive Summary

### Test Statistics
- **Total Test Files:** ${results.summary.totalTestFiles}
- **Total Tests:** ${results.summary.totalTests}
- **API Route Coverage:** ${results.summary.apiCoveragePercent}% (${results.summary.apiRoutesCovered}/${results.summary.totalApiRoutes})
- **Component Tests:** ${results.summary.componentsCovered}
- **Service Tests:** ${results.summary.servicesCovered}
- **Integration Tests:** ${results.summary.integrationTests}
- **Performance Tests:** ${results.summary.performanceTests}

## Coverage by Category

### API Routes (${results.categories.api.testCount} tests)
**Coverage:** ${results.summary.apiCoveragePercent}% (${results.summary.apiRoutesCovered}/${results.summary.totalApiRoutes} routes)

**Test Files:**
${results.categories.api.files.map(f => `- ${f.path} (${f.testCount} tests)`).join('\n')}

### Components (${results.categories.components.testCount} tests)
**Files Tested:** ${results.summary.componentsCovered}

**Test Files:**
${results.categories.components.files.map(f => `- ${f.path} (${f.testCount} tests)`).join('\n')}

### Services (${results.categories.services.testCount} tests)
**Files Tested:** ${results.summary.servicesCovered}

**Test Files:**
${results.categories.services.files.map(f => `- ${f.path} (${f.testCount} tests)`).join('\n')}

### Validations (${results.categories.validations.testCount} tests)
**Test Files:**
${results.categories.validations.files.map(f => `- ${f.path} (${f.testCount} tests)`).join('\n')}

### Utilities & Libraries (${results.categories.lib.testCount} tests)
**Test Files:**
${results.categories.lib.files.map(f => `- ${f.path} (${f.testCount} tests)`).join('\n')}

### Hooks (${results.categories.hooks.testCount} tests)
**Test Files:**
${results.categories.hooks.files.map(f => `- ${f.path} (${f.testCount} tests)`).join('\n')}

### Middleware (${results.categories.middleware.testCount} tests)
**Test Files:**
${results.categories.middleware.files.map(f => `- ${f.path} (${f.testCount} tests)`).join('\n')}

### Integration Tests (${results.categories.integration.testCount} tests)
**Test Files:**
${results.categories.integration.files.map(f => `- ${f.path} (${f.testCount} tests)`).join('\n')}

### Performance Tests (${results.categories.performance.testCount} tests)
**Test Files:**
${results.categories.performance.files.map(f => `- ${f.path} (${f.testCount} tests)`).join('\n')}

## Recent Test Additions (Last 7 Days)

${results.newTests.length > 0 ? 
  results.newTests.map(test => `- **${test.path}** (${test.category}) - ${test.testCount} tests - Added: ${test.created.toISOString().split('T')[0]}`).join('\n') 
  : 'No new tests added in the last 7 days'}

## Recommendations

${results.recommendations.map(rec => `
### ${rec.title} (${rec.priority})
**Category:** ${rec.category}
**Description:** ${rec.description}
**Action:** ${rec.action}
**Impact:** ${rec.impact}
`).join('')}

## Test Quality Metrics

### Distribution by Category
${Object.entries(results.categories).map(([category, data]) => 
  `- **${category.toUpperCase()}:** ${data.testCount} tests (${data.files.length} files)`
).join('\n')}

### Average Tests per File
${Object.entries(results.categories).map(([category, data]) => 
  `- **${category.toUpperCase()}:** ${data.files.length > 0 ? Math.round(data.testCount / data.files.length) : 0} tests/file`
).join('\n')}

## Next Steps

### Immediate Actions
1. **Review failing tests** - Address any test failures
2. **Focus on critical gaps** - Prioritize untested API routes
3. **Maintain test quality** - Ensure new features include tests

### Short-term Goals (2-4 weeks)
1. **Increase API coverage** to 80%+
2. **Add component tests** for critical UI elements
3. **Expand integration tests** for key workflows

### Long-term Goals (1-3 months)
1. **Achieve 85%+ overall coverage**
2. **Implement automated coverage reporting**
3. **Add performance benchmarks**
4. **Set up E2E testing pipeline**

---
**Report Status:** ✅ Complete
**Next Analysis:** Recommended weekly
`;

  return report;
}

// Run analysis
console.log('🔍 Running comprehensive test coverage analysis...\n');
const results = analyzeTestCoverage();
const report = generateReport(results);

// Write report to file
fs.writeFileSync('./COMPREHENSIVE-TEST-COVERAGE-ANALYSIS.md', report);

// Output summary to console
console.log('📊 COMPREHENSIVE TEST COVERAGE ANALYSIS');
console.log('=' .repeat(50));
console.log(`📁 Total Test Files: ${results.summary.totalTestFiles}`);
console.log(`🧪 Total Tests: ${results.summary.totalTests}`);
console.log(`🔗 API Coverage: ${results.summary.apiCoveragePercent}% (${results.summary.apiRoutesCovered}/${results.summary.totalApiRoutes})`);
console.log(`🎨 Component Tests: ${results.summary.componentsCovered}`);
console.log(`⚙️  Service Tests: ${results.summary.servicesCovered}`);
console.log(`🔄 Integration Tests: ${results.summary.integrationTests}`);
console.log(`⚡ Performance Tests: ${results.summary.performanceTests}`);

console.log('\n📈 TESTS BY CATEGORY:');
Object.entries(results.categories).forEach(([category, data]) => {
  if (data.testCount > 0) {
    console.log(`${category.toUpperCase().padEnd(12)}: ${data.testCount.toString().padStart(4)} tests (${data.files.length} files)`);
  }
});

console.log('\n🆕 RECENT ADDITIONS:');
if (results.newTests.length > 0) {
  results.newTests.slice(0, 10).forEach(test => {
    console.log(`- ${test.path} (${test.testCount} tests)`);
  });
  if (results.newTests.length > 10) {
    console.log(`... and ${results.newTests.length - 10} more`);
  }
} else {
  console.log('No new tests detected in the last 7 days');
}

console.log('\n💡 TOP RECOMMENDATIONS:');
results.recommendations.slice(0, 3).forEach(rec => {
  console.log(`- ${rec.priority}: ${rec.title}`);
});

console.log(`\n📋 Full report saved to: COMPREHENSIVE-TEST-COVERAGE-ANALYSIS.md`);
console.log('✅ Analysis complete!');