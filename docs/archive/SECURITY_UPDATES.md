# Security Updates & Dependency Management

This document provides comprehensive guidance on managing security updates and dependencies for the HazardOS application.

## Quick Start

### Daily Security Check
```bash
npm run security:helper:check
```

### Weekly Security Audit
```bash
npm run security:helper:audit
```

### Apply Security Fixes
```bash
npm run security:helper:fix
```

## Automated Systems

### 1. Dependabot (GitHub)

**Schedule**: Every Monday at 9:00 AM CT

**What it does**:
- Scans for vulnerable dependencies
- Creates PRs for security updates
- Groups related packages to reduce noise
- Automatically assigns to team members

**Configuration**: `.github/dependabot.yml`

### 2. Security Workflow (GitHub Actions)

**Triggers**:
- Every push/PR (basic checks)
- Weekly schedule (comprehensive audit)
- Manual dispatch (on-demand)

**What it does**:
- Runs `npm audit` for vulnerabilities
- Scans for hardcoded secrets
- Checks license compliance
- Creates automated security update PRs
- Generates security reports

**Configuration**: `.github/workflows/security.yml`

## Manual Update Process

### 1. Assessment Phase

First, assess the current security state:

```bash
# Comprehensive security audit
npm run security:helper:audit

# Quick vulnerability check
npm run security:audit

# Check for outdated packages
npm run deps:check
```

### 2. Categorize Updates

#### Critical Security Updates (Immediate Action)
- CVE vulnerabilities with CVSS > 7.0
- Known exploits in the wild
- Authentication/authorization bypasses

```bash
# Apply immediately
npm run security:fix
npm run test:run  # Verify nothing breaks
```

#### Important Security Updates (Within 1 Week)
- Medium-risk vulnerabilities
- Dependency chain vulnerabilities
- Outdated security-related packages

```bash
# Schedule during maintenance window
npm run deps:update-patch
npm run security:helper:check
```

#### General Updates (Monthly)
- Feature updates to dependencies
- Performance improvements
- New dependency versions

```bash
# Plan and test thoroughly
npm run deps:update-minor
npm run check-all  # Full test suite
```

### 3. Update Strategies

#### Patch Updates (Safest)
```bash
npm run deps:update-patch
```
- Only bug fixes and security patches
- Very low risk of breaking changes
- Recommended for production

#### Minor Updates (Moderate Risk)
```bash
npm run deps:update-minor
```
- New features, no breaking changes
- May introduce new bugs
- Requires testing

#### Major Updates (High Risk)
```bash
npm run deps:update-major
```
- Potentially breaking changes
- Requires thorough testing and planning
- Often needs code changes

### 4. Testing After Updates

Always run the full test suite after updates:

```bash
npm run check-all
```

This includes:
- TypeScript type checking
- ESLint code quality
- Vitest unit tests
- Production build verification

## Security Override Management

### Current Overrides

The application uses PNPM overrides to force secure versions:

```json
{
  "pnpm": {
    "overrides": {
      "axios": ">=1.13.5",      // XSS vulnerability fix
      "tar": ">=7.5.8",         // Path traversal fix
      "minimatch": ">=9.0.6",   // ReDoS vulnerability fix
      "ajv": ">=8.18.0",        // Prototype pollution fix
      "qs": ">=6.14.2"          // DoS vulnerability fix
    }
  }
}
```

### Override Review Process

**Monthly**: Check if overrides are still needed
```bash
npm run security:helper:audit
```

**When to Remove Overrides**:
- Direct dependencies are updated to secure versions
- Transitive dependencies no longer vulnerable
- Package is no longer used

**Documentation**: Each override should be documented with:
- CVE number or vulnerability description  
- Date added
- Planned removal date

## Vulnerability Response

### 1. Detection

Vulnerabilities can be detected through:
- Automated Dependabot alerts
- Weekly security workflow
- Manual `npm audit` runs
- Security advisory subscriptions

### 2. Assessment Criteria

| Severity | CVSS Score | Response Time | Action Required |
|----------|------------|---------------|-----------------|
| Critical | 9.0-10.0   | 24 hours     | Emergency patch |
| High     | 7.0-8.9    | 72 hours     | Urgent update   |
| Medium   | 4.0-6.9    | 1 week       | Regular update  |
| Low      | 0.1-3.9    | 1 month      | Planned update  |

### 3. Response Actions

#### Critical/High Vulnerabilities
1. **Immediate Assessment**
   ```bash
   npm audit --audit-level=high
   npm run security:helper:audit
   ```

2. **Apply Fix**
   ```bash
   npm audit fix
   # OR manually update specific packages
   npm install package@secure-version
   ```

3. **Test Thoroughly**
   ```bash
   npm run check-all
   ```

4. **Deploy Emergency Update**
   - Create hotfix branch
   - Apply minimal fix
   - Fast-track through testing
   - Deploy immediately

5. **Document**
   - Update security log
   - Notify team
   - Create post-incident review

#### Medium/Low Vulnerabilities
1. **Plan Update**
   - Add to next sprint/release
   - Group with other dependency updates
   - Schedule testing time

2. **Apply During Maintenance**
   ```bash
   npm run security:helper:fix
   npm run check-all
   ```

3. **Regular Deployment**
   - Follow normal PR process
   - Include in next release

## Secret Management

### Detection

The security workflow automatically scans for:
- API keys (OpenAI, Stripe, Resend, AWS)
- JWT tokens  
- Database credentials
- Generic high-entropy strings

### Prevention Best Practices

1. **Environment Variables**: Always use `.env.local` for secrets
2. **Vercel Environment Variables**: Set in dashboard for production
3. **Git Hooks**: Consider pre-commit hooks for secret scanning
4. **Regular Rotation**: Rotate secrets periodically

### If Secrets Are Found

1. **Immediate**: Rotate the compromised secret
2. **Code**: Remove from codebase, use environment variables
3. **History**: Consider rewriting git history if recent
4. **Monitor**: Watch for unauthorized usage

## License Compliance

### Approved Licenses
- MIT, Apache-2.0, BSD variants
- ISC, Unlicense  
- CC0-1.0, 0BSD

### Restricted Licenses  
- GPL variants (viral copyleft)
- AGPL variants (network copyleft)
- LGPL variants (library copyleft)

### License Checking
```bash
npm run security:licenses
```

## Monitoring & Reporting

### Automated Monitoring
- GitHub Security Advisories
- Dependabot weekly summaries  
- CI/CD security gate failures
- Workflow email notifications

### Manual Reporting
```bash
# Generate comprehensive security report
npm run security:helper:report
```

Reports are saved to `reports/` directory and include:
- Current vulnerabilities
- Outdated packages
- Security overrides
- License compliance status

### Regular Reviews

**Weekly**: Check Dependabot PRs and merge safe updates
**Monthly**: Security team review of all updates and overrides  
**Quarterly**: Comprehensive security audit and policy review

## Emergency Procedures

### Security Incident Response

1. **Assess Scope**
   ```bash
   npm audit --audit-level=critical
   npm run security:helper:audit
   ```

2. **Contain Issue**
   - Block affected routes if needed
   - Rotate secrets if compromised
   - Scale down if under attack

3. **Apply Fix**  
   ```bash
   npm run security:helper:fix
   npm run check-all
   ```

4. **Verify Fix**
   - Test in staging environment
   - Verify vulnerability is resolved
   - Check for regression issues

5. **Deploy**
   - Emergency deployment process
   - Monitor application health  
   - Verify fix in production

6. **Document**
   - Incident timeline
   - Root cause analysis
   - Prevention measures

### Emergency Contacts

- **Security Team**: [security-email]
- **On-Call Developer**: [oncall-contact]  
- **Infrastructure Team**: [infra-contact]

## Tools & Resources

### Package Management Tools
- `npm audit` - Built-in vulnerability scanner
- `npx npm-check-updates` - Dependency update manager
- `license-checker` - License compliance checker

### Security Resources
- [GitHub Security Advisories](https://github.com/advisories)
- [NPM Security Advisories](https://npmjs.com/advisories)
- [Snyk Vulnerability Database](https://snyk.io/vuln)
- [OWASP Dependency Check](https://owasp.org/www-project-dependency-check/)

### Automation Tools
- GitHub Dependabot
- Snyk (optional premium)
- WhiteSource/Mend (enterprise)
- Sonatype Nexus (enterprise)

## FAQ

**Q: How often should I run security updates?**
A: Run `npm run security:helper:check` daily, comprehensive audits weekly, and apply critical fixes immediately.

**Q: What if `npm audit fix` breaks the application?**
A: The security helper script creates backups. Restore with the backup and manually update specific packages with testing.

**Q: Should I update all dependencies at once?**  
A: No, group related packages and update incrementally. Use the Dependabot grouping to manage this automatically.

**Q: How do I know if a dependency is safe to update?**
A: Check the changelog, run tests, and start with patch updates. The security workflow will help identify risky updates.

**Q: What if there's no fix available for a vulnerability?**
A: Consider alternative packages, implement workarounds, or add the vulnerability to your risk register with compensating controls.