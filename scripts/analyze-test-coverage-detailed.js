const fs = require('fs');
const path = require('path');

// Comprehensive test coverage analysis
function analyzeTestCoverage() {
  const results = {
    summary: {
      totalFiles: 0,
      testedFiles: 0,
      coveragePercentage: 0,
      testFiles: 0,
      totalTests: 0,
      passingTests: 0,
      failingTests: 0
    },
    categories: {
      api: { total: 0, tested: 0, files: [] },
      components: { total: 0, tested: 0, files: [] },
      lib: { total: 0, tested: 0, files: [] },
      types: { total: 0, tested: 0, files: [] },
      hooks: { total: 0, tested: 0, files: [] },
      services: { total: 0, tested: 0, files: [] },
      utils: { total: 0, tested: 0, files: [] },
      validations: { total: 0, tested: 0, files: [] }
    },
    testFiles: [],
    untestedFiles: [],
    criticalGaps: [],
    recommendations: []
  };

  // Get all source files
  const sourceFiles = getAllFiles('.', ['.ts', '.tsx'], [
    'node_modules', '.next', 'dist', 'build', 'coverage', 'test', '__tests__'
  ]);

  // Get all test files
  const testFiles = getAllFiles('./test', ['.test.ts', '.test.tsx', '.spec.ts', '.spec.tsx']);

  results.summary.totalFiles = sourceFiles.length;
  results.summary.testFiles = testFiles.length;

  // Categorize source files
  sourceFiles.forEach(file => {
    const category = categorizeFile(file);
    if (category && results.categories[category]) {
      results.categories[category].total++;
      results.categories[category].files.push({
        path: file,
        tested: false,
        testFile: null
      });
    }
  });

  // Analyze test files and match to source files
  testFiles.forEach(testFile => {
    const content = fs.readFileSync(testFile, 'utf8');
    const testCount = (content.match(/it\(|test\(/g) || []).length;
    const describeCount = (content.match(/describe\(/g) || []).length;
    
    results.testFiles.push({
      path: testFile,
      testCount,
      describeCount,
      size: fs.statSync(testFile).size
    });

    results.summary.totalTests += testCount;

    // Try to match test file to source file
    const sourceFile = findSourceFileForTest(testFile, sourceFiles);
    if (sourceFile) {
      const category = categorizeFile(sourceFile);
      if (category && results.categories[category]) {
        const fileEntry = results.categories[category].files.find(f => f.path === sourceFile);
        if (fileEntry) {
          fileEntry.tested = true;
          fileEntry.testFile = testFile;
          results.categories[category].tested++;
          results.summary.testedFiles++;
        }
      }
    }
  });

  // Calculate coverage percentages
  results.summary.coveragePercentage = results.summary.totalFiles > 0 
    ? Math.round((results.summary.testedFiles / results.summary.totalFiles) * 100) 
    : 0;

  Object.keys(results.categories).forEach(category => {
    const cat = results.categories[category];
    cat.coverage = cat.total > 0 ? Math.round((cat.tested / cat.total) * 100) : 0;
  });

  // Find untested files
  Object.keys(results.categories).forEach(category => {
    const cat = results.categories[category];
    cat.files.forEach(file => {
      if (!file.tested) {
        results.untestedFiles.push({
          path: file.path,
          category,
          priority: getPriority(file.path, category)
        });
      }
    });
  });

  // Identify critical gaps
  results.criticalGaps = identifyCriticalGaps(results);

  // Generate recommendations
  results.recommendations = generateRecommendations(results);

  return results;
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

function categorizeFile(filePath) {
  if (filePath.includes('/api/')) return 'api';
  if (filePath.includes('/components/')) return 'components';
  if (filePath.includes('/lib/services/')) return 'services';
  if (filePath.includes('/lib/utils/')) return 'utils';
  if (filePath.includes('/lib/hooks/')) return 'hooks';
  if (filePath.includes('/lib/validations/')) return 'validations';
  if (filePath.includes('/lib/')) return 'lib';
  if (filePath.includes('/types/')) return 'types';
  return null;
}

function findSourceFileForTest(testFile, sourceFiles) {
  // Remove test extensions and path
  const baseName = testFile
    .replace(/\.test\.(ts|tsx)$/, '')
    .replace(/\.spec\.(ts|tsx)$/, '')
    .replace('./test/', '');

  // Try exact match first
  let sourceFile = sourceFiles.find(f => f.includes(baseName));
  
  if (!sourceFile) {
    // Try partial matches
    const fileName = path.basename(baseName);
    sourceFile = sourceFiles.find(f => path.basename(f, path.extname(f)) === fileName);
  }

  return sourceFile;
}

function getPriority(filePath, category) {
  // High priority files
  if (filePath.includes('/api/') && (
    filePath.includes('route.ts') || 
    filePath.includes('customers') ||
    filePath.includes('jobs') ||
    filePath.includes('estimates') ||
    filePath.includes('invoices')
  )) return 'HIGH';

  if (category === 'services' || category === 'utils') return 'HIGH';

  if (filePath.includes('/components/') && (
    filePath.includes('form') ||
    filePath.includes('auth') ||
    filePath.includes('payment')
  )) return 'HIGH';

  // Medium priority
  if (category === 'api' || category === 'components') return 'MEDIUM';

  // Low priority
  return 'LOW';
}

function identifyCriticalGaps(results) {
  const gaps = [];

  // API routes with no tests
  const untestedApiRoutes = results.untestedFiles.filter(f => f.category === 'api');
  if (untestedApiRoutes.length > 0) {
    gaps.push({
      type: 'API_COVERAGE',
      severity: 'CRITICAL',
      description: `${untestedApiRoutes.length} API routes have no tests`,
      files: untestedApiRoutes.slice(0, 10).map(f => f.path),
      impact: 'High risk of production bugs, security vulnerabilities'
    });
  }

  // Business logic services
  const untestedServices = results.untestedFiles.filter(f => f.category === 'services');
  if (untestedServices.length > 0) {
    gaps.push({
      type: 'BUSINESS_LOGIC',
      severity: 'HIGH',
      description: `${untestedServices.length} service files have no tests`,
      files: untestedServices.map(f => f.path),
      impact: 'Business logic errors, calculation mistakes'
    });
  }

  // Critical components
  const criticalComponents = results.untestedFiles.filter(f => 
    f.category === 'components' && (
      f.path.includes('form') ||
      f.path.includes('auth') ||
      f.path.includes('payment') ||
      f.path.includes('survey')
    )
  );
  if (criticalComponents.length > 0) {
    gaps.push({
      type: 'UI_COMPONENTS',
      severity: 'MEDIUM',
      description: `${criticalComponents.length} critical UI components have no tests`,
      files: criticalComponents.map(f => f.path),
      impact: 'User experience issues, form validation failures'
    });
  }

  return gaps;
}

function generateRecommendations(results) {
  const recommendations = [];

  // Overall coverage recommendation
  if (results.summary.coveragePercentage < 30) {
    recommendations.push({
      priority: 'CRITICAL',
      category: 'OVERALL',
      title: 'Extremely Low Test Coverage',
      description: `Current coverage is ${results.summary.coveragePercentage}%. Industry standard is 80%+.`,
      action: 'Implement comprehensive testing strategy immediately',
      effort: 'HIGH'
    });
  } else if (results.summary.coveragePercentage < 70) {
    recommendations.push({
      priority: 'HIGH',
      category: 'OVERALL',
      title: 'Low Test Coverage',
      description: `Current coverage is ${results.summary.coveragePercentage}%. Target should be 80%+.`,
      action: 'Prioritize testing for critical paths',
      effort: 'MEDIUM'
    });
  }

  // API testing recommendation
  if (results.categories.api.coverage < 50) {
    recommendations.push({
      priority: 'CRITICAL',
      category: 'API',
      title: 'API Routes Need Testing',
      description: `Only ${results.categories.api.coverage}% of API routes are tested.`,
      action: 'Add integration tests for all API endpoints',
      effort: 'HIGH'
    });
  }

  // Component testing recommendation
  if (results.categories.components.coverage < 60) {
    recommendations.push({
      priority: 'HIGH',
      category: 'COMPONENTS',
      title: 'UI Components Need Testing',
      description: `Only ${results.categories.components.coverage}% of components are tested.`,
      action: 'Add unit tests for critical UI components',
      effort: 'MEDIUM'
    });
  }

  // Business logic recommendation
  if (results.categories.services.coverage < 80) {
    recommendations.push({
      priority: 'HIGH',
      category: 'SERVICES',
      title: 'Business Logic Needs Testing',
      description: `Only ${results.categories.services.coverage}% of services are tested.`,
      action: 'Add comprehensive unit tests for all business logic',
      effort: 'MEDIUM'
    });
  }

  return recommendations;
}

// Generate detailed report
function generateReport(results) {
  const report = `
# HazardOS Test Coverage Report
Generated: ${new Date().toISOString()}

## Executive Summary
- **Total Files**: ${results.summary.totalFiles}
- **Tested Files**: ${results.summary.testedFiles}
- **Overall Coverage**: ${results.summary.coveragePercentage}%
- **Test Files**: ${results.summary.testFiles}
- **Total Tests**: ${results.summary.totalTests}

## Coverage by Category

${Object.entries(results.categories).map(([category, data]) => `
### ${category.toUpperCase()}
- **Files**: ${data.total}
- **Tested**: ${data.tested}
- **Coverage**: ${data.coverage}%
- **Status**: ${data.coverage >= 80 ? '✅ Good' : data.coverage >= 50 ? '⚠️ Needs Improvement' : '❌ Critical'}
`).join('')}

## Critical Gaps

${results.criticalGaps.map(gap => `
### ${gap.type} (${gap.severity})
**Description**: ${gap.description}
**Impact**: ${gap.impact}
**Files**: ${gap.files.length > 5 ? gap.files.slice(0, 5).join(', ') + ` (+${gap.files.length - 5} more)` : gap.files.join(', ')}
`).join('')}

## Top Priority Untested Files

${results.untestedFiles
  .filter(f => f.priority === 'HIGH')
  .slice(0, 20)
  .map(f => `- **${f.path}** (${f.category})`)
  .join('\n')}

## Recommendations

${results.recommendations.map(rec => `
### ${rec.title} (${rec.priority})
**Category**: ${rec.category}
**Description**: ${rec.description}
**Action**: ${rec.action}
**Effort**: ${rec.effort}
`).join('')}

## Test File Analysis

${results.testFiles.map(test => `
- **${test.path}**: ${test.testCount} tests, ${test.describeCount} suites
`).join('')}

## Next Steps

1. **Immediate (Week 1)**:
   - Add tests for critical API routes (customers, jobs, estimates, invoices)
   - Test authentication and authorization flows
   - Add tests for payment processing

2. **Short Term (Weeks 2-4)**:
   - Test all remaining API routes
   - Add component tests for forms and critical UI
   - Test business logic services

3. **Medium Term (Weeks 5-8)**:
   - Add integration tests
   - Test error handling and edge cases
   - Add performance tests

4. **Long Term (Ongoing)**:
   - Maintain 80%+ coverage
   - Add E2E tests for critical user journeys
   - Set up automated coverage reporting

## Coverage Targets

| Category | Current | Target | Priority |
|----------|---------|--------|----------|
${Object.entries(results.categories).map(([category, data]) => 
  `| ${category} | ${data.coverage}% | 80% | ${data.coverage < 50 ? 'HIGH' : data.coverage < 70 ? 'MEDIUM' : 'LOW'} |`
).join('\n')}
`;

  return report;
}

// Run analysis
console.log('🔍 Analyzing test coverage...\n');
const results = analyzeTestCoverage();
const report = generateReport(results);

// Write report to file
fs.writeFileSync('./TEST-COVERAGE-DETAILED-REPORT.md', report);

console.log('📊 Test Coverage Analysis Complete!');
console.log(`📁 Overall Coverage: ${results.summary.coveragePercentage}%`);
console.log(`📝 Total Tests: ${results.summary.totalTests}`);
console.log(`🔴 Critical Gaps: ${results.criticalGaps.length}`);
console.log(`📋 Report saved to: TEST-COVERAGE-DETAILED-REPORT.md`);

// Output summary to console
console.log('\n📈 COVERAGE BY CATEGORY:');
Object.entries(results.categories).forEach(([category, data]) => {
  const status = data.coverage >= 80 ? '✅' : data.coverage >= 50 ? '⚠️' : '❌';
  console.log(`${status} ${category.toUpperCase()}: ${data.coverage}% (${data.tested}/${data.total})`);
});

console.log('\n🚨 TOP CRITICAL GAPS:');
results.criticalGaps.slice(0, 3).forEach(gap => {
  console.log(`- ${gap.type}: ${gap.description}`);
});

console.log('\n💡 TOP RECOMMENDATIONS:');
results.recommendations.slice(0, 3).forEach(rec => {
  console.log(`- ${rec.priority}: ${rec.title}`);
});