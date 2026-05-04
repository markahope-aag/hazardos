#!/usr/bin/env node

/**
 * Security Update Helper Script
 * 
 * This script helps manage security updates and dependency monitoring.
 * Run with: node scripts/security-update.js [command]
 * 
 * Commands:
 *   audit    - Run comprehensive security audit
 *   fix      - Apply automatic security fixes
 *   report   - Generate security report
 *   check    - Check for outdated dependencies
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m'
};

function log(message, color = colors.white) {
  console.log(`${color}${message}${colors.reset}`);
}

function header(title) {
  console.log();
  log(`${'='.repeat(60)}`, colors.blue);
  log(`  ${title}`, colors.bold + colors.blue);
  log(`${'='.repeat(60)}`, colors.blue);
  console.log();
}

function subheader(title) {
  console.log();
  log(`--- ${title} ---`, colors.cyan);
}

function success(message) {
  log(`✅ ${message}`, colors.green);
}

function warning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function error(message) {
  log(`❌ ${message}`, colors.red);
}

function info(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

function runCommand(command, description, options = {}) {
  try {
    subheader(description);
    log(`Running: ${command}`, colors.magenta);
    
    const result = execSync(command, { 
      encoding: 'utf8', 
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options 
    });
    
    if (options.silent) {
      return result;
    }
    
    success(`Completed: ${description}`);
    return result;
  } catch (err) {
    error(`Failed: ${description}`);
    if (options.continueOnError) {
      warning(`Continuing despite error: ${err.message}`);
      return null;
    }
    throw err;
  }
}

async function auditCommand() {
  header('🔍 Comprehensive Security Audit');
  
  try {
    // Check for vulnerabilities
    subheader('NPM Security Audit');
    try {
      runCommand('npm audit --audit-level=low', 'Checking for vulnerabilities');
      success('No vulnerabilities found');
    } catch (err) {
      warning('Vulnerabilities detected - see output above');
    }
    
    // Check outdated packages
    subheader('Outdated Dependencies');
    try {
      const outdated = runCommand('npm outdated --json', 'Checking for outdated packages', { silent: true, continueOnError: true });
      
      if (outdated && outdated.trim()) {
        const packages = JSON.parse(outdated);
        const count = Object.keys(packages).length;
        
        if (count > 0) {
          warning(`${count} packages are outdated:`);
          
          Object.entries(packages).forEach(([name, info]) => {
            log(`  ${name}: ${info.current} → ${info.wanted} (latest: ${info.latest})`);
          });
        } else {
          success('All packages are up to date');
        }
      } else {
        success('All packages are up to date');
      }
    } catch (err) {
      info('No outdated packages found');
    }
    
    // Check package overrides
    subheader('Security Overrides Analysis');
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    if (packageJson.pnpm?.overrides) {
      const overrides = packageJson.pnpm.overrides;
      const overrideCount = Object.keys(overrides).length;
      
      warning(`${overrideCount} security overrides in place:`);
      Object.entries(overrides).forEach(([pkg, version]) => {
        log(`  ${pkg}: ${version}`);
      });
      
      info('Please review if these overrides are still necessary');
    } else {
      success('No security overrides found');
    }
    
    // License check
    subheader('License Compliance');
    try {
      runCommand('npx license-checker --summary --onlyAllow "MIT;Apache-2.0;BSD-2-Clause;BSD-3-Clause;ISC;Unlicense"', 
                 'Checking license compliance', { continueOnError: true });
      success('License compliance check completed');
    } catch (err) {
      warning('Some packages may have license compliance issues');
    }
    
    success('Security audit completed');
    
  } catch (err) {
    error(`Security audit failed: ${err.message}`);
    process.exit(1);
  }
}

async function fixCommand() {
  header('🔧 Applying Security Fixes');
  
  try {
    // Backup package-lock.json
    if (fs.existsSync('package-lock.json')) {
      fs.copyFileSync('package-lock.json', 'package-lock.json.backup');
      info('Created backup of package-lock.json');
    }
    
    // Apply fixes
    runCommand('npm audit fix', 'Applying automatic security fixes');
    
    // Check if anything changed
    subheader('Verifying Changes');
    try {
      runCommand('git diff --exit-code package.json package-lock.json', 'Checking for changes', { silent: true });
      info('No changes were made');
    } catch (err) {
      success('Security updates were applied');
      
      // Show what changed
      try {
        const changes = runCommand('git diff --name-only package.json package-lock.json', 'Getting changed files', { silent: true });
        if (changes.trim()) {
          info('Changed files:');
          changes.trim().split('\n').forEach(file => log(`  ${file}`));
        }
      } catch (err) {
        // Ignore
      }
    }
    
    // Run tests to verify
    subheader('Running Tests');
    runCommand('npm run type-check', 'Type checking');
    runCommand('npm run lint', 'Linting');
    runCommand('npm run test:run', 'Running tests');
    
    success('Security fixes applied and verified');
    
  } catch (err) {
    error(`Security fix failed: ${err.message}`);
    
    // Restore backup if it exists
    if (fs.existsSync('package-lock.json.backup')) {
      fs.copyFileSync('package-lock.json.backup', 'package-lock.json');
      warning('Restored package-lock.json from backup');
    }
    
    process.exit(1);
  }
}

async function reportCommand() {
  header('📊 Security Report');
  
  const reportData = {
    timestamp: new Date().toISOString(),
    vulnerabilities: null,
    outdated: null,
    overrides: null,
    licenses: null
  };
  
  try {
    // Get vulnerability data
    subheader('Collecting Vulnerability Data');
    try {
      const auditResult = runCommand('npm audit --json', 'Getting audit data', { silent: true, continueOnError: true });
      if (auditResult) {
        reportData.vulnerabilities = JSON.parse(auditResult);
      }
    } catch (err) {
      warning('Could not collect vulnerability data');
    }
    
    // Get outdated data  
    subheader('Collecting Outdated Package Data');
    try {
      const outdatedResult = runCommand('npm outdated --json', 'Getting outdated data', { silent: true, continueOnError: true });
      if (outdatedResult && outdatedResult.trim()) {
        reportData.outdated = JSON.parse(outdatedResult);
      }
    } catch (err) {
      // No outdated packages
    }
    
    // Get override data
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    reportData.overrides = packageJson.pnpm?.overrides || {};
    
    // Generate report
    const reportPath = path.join('reports', `security-report-${new Date().toISOString().split('T')[0]}.json`);
    
    // Ensure reports directory exists
    if (!fs.existsSync('reports')) {
      fs.mkdirSync('reports');
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    
    success(`Security report saved to: ${reportPath}`);
    
    // Print summary
    subheader('Report Summary');
    
    const vulnCount = reportData.vulnerabilities?.metadata?.vulnerabilities?.total || 0;
    const outdatedCount = reportData.outdated ? Object.keys(reportData.outdated).length : 0;
    const overrideCount = Object.keys(reportData.overrides).length;
    
    log(`Vulnerabilities: ${vulnCount}`);
    log(`Outdated packages: ${outdatedCount}`);
    log(`Security overrides: ${overrideCount}`);
    
    if (vulnCount > 0) {
      warning('Action required: vulnerabilities found');
    } else if (outdatedCount > 5) {
      warning('Consider updating outdated packages');
    } else {
      success('Security posture looks good');
    }
    
  } catch (err) {
    error(`Report generation failed: ${err.message}`);
    process.exit(1);
  }
}

async function checkCommand() {
  header('🔍 Quick Security Check');
  
  try {
    // Quick audit
    subheader('Quick Vulnerability Check');
    try {
      runCommand('npm audit --audit-level=high', 'Checking for high/critical vulnerabilities');
      success('No high/critical vulnerabilities');
    } catch (err) {
      warning('High/critical vulnerabilities found - run "npm run security:fix"');
    }
    
    // Check for outdated security-related packages
    subheader('Security Package Updates');
    const securityPackages = [
      '@sentry/nextjs',
      '@supabase/supabase-js', 
      'zod',
      'next',
      'react'
    ];
    
    try {
      const outdated = runCommand('npm outdated --json', 'Checking security packages', { silent: true, continueOnError: true });
      
      if (outdated && outdated.trim()) {
        const packages = JSON.parse(outdated);
        const securityOutdated = Object.keys(packages).filter(pkg => 
          securityPackages.some(secPkg => pkg.includes(secPkg))
        );
        
        if (securityOutdated.length > 0) {
          warning('Security-related packages need updates:');
          securityOutdated.forEach(pkg => {
            const info = packages[pkg];
            log(`  ${pkg}: ${info.current} → ${info.latest}`);
          });
        } else {
          success('Security packages are up to date');
        }
      } else {
        success('All packages are up to date');
      }
    } catch (err) {
      info('Could not check for outdated packages');
    }
    
  } catch (err) {
    error(`Security check failed: ${err.message}`);
    process.exit(1);
  }
}

// Command routing
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'audit':
      await auditCommand();
      break;
    case 'fix':
      await fixCommand();
      break;
    case 'report':
      await reportCommand();
      break;
    case 'check':
      await checkCommand();
      break;
    default:
      header('🛡️  Security Update Helper');
      log('Available commands:');
      log('  audit  - Run comprehensive security audit');
      log('  fix    - Apply automatic security fixes');  
      log('  report - Generate detailed security report');
      log('  check  - Quick security check');
      console.log();
      log('Usage: node scripts/security-update.js [command]');
      break;
  }
}

main().catch(err => {
  error(`Script failed: ${err.message}`);
  process.exit(1);
});