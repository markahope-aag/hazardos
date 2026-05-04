# Security Policy

## Dependency Security Management

This document outlines our approach to managing security vulnerabilities in dependencies and maintaining a secure supply chain.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Automated Security Updates

### Dependabot Configuration

We use GitHub Dependabot to automatically monitor and update dependencies:

- **Schedule**: Weekly updates every Monday at 9:00 AM CT
- **Scope**: NPM packages, GitHub Actions, and Docker images
- **Grouping**: Related packages are grouped to reduce PR noise
- **Priority**: Security updates are prioritized over feature updates

### Security Workflow

Our automated security workflow runs:

- **On every push/PR**: Basic security audit and secret detection
- **Weekly**: Comprehensive vulnerability scan and automated fixes
- **On-demand**: Manual trigger for immediate security updates

## Manual Security Management

### Daily Commands

```bash
# Quick security check
npm run security:check

# View current vulnerabilities  
npm run security:audit

# Apply automatic fixes
npm run security:fix

# Check for outdated packages
npm run deps:check
```

### Update Strategies

#### Patch Updates (Recommended)
```bash
npm run deps:update-patch
```
- Applies bug fixes and security patches
- Low risk of breaking changes
- Run weekly or as needed

#### Minor Updates (Moderate Risk)
```bash  
npm run deps:update-minor
```
- Adds new features and improvements
- May require testing
- Run monthly after review

#### Major Updates (High Risk)
```bash
npm run deps:update-major
```
- Breaking changes possible
- Requires thorough testing
- Plan carefully, run quarterly

## Security Override Policy

### Current Overrides

The following security overrides are in place in `package.json`:

```json
"pnpm": {
  "overrides": {
    "axios": ">=1.13.5",
    "tar": ">=7.5.8", 
    "minimatch": ">=9.0.6",
    "ajv": ">=8.18.0",
    "qs": ">=6.14.2"
  }
}
```

### Override Review Process

1. **Monthly Review**: Check if overrides are still necessary
2. **Documentation**: Each override should have a reason documented
3. **Removal**: Remove overrides when dependencies are naturally updated
4. **Testing**: Verify overrides don't break functionality

## Vulnerability Response Process

### 1. Detection
- Automated scanning via Dependabot and security workflow
- Manual audits using `npm audit`
- Security advisory monitoring

### 2. Assessment
- **Critical/High**: Immediate action required (within 24 hours)
- **Medium**: Action required within 1 week
- **Low**: Action required within 1 month

### 3. Response Actions

#### Immediate Actions (Critical/High)
1. Apply `npm audit fix` if available
2. Test thoroughly in development environment
3. Deploy to staging for validation
4. Emergency deploy to production if needed
5. Create incident report

#### Standard Actions (Medium/Low)
1. Schedule update during next maintenance window
2. Group with other dependency updates
3. Follow normal PR review process
4. Include in next release cycle

### 4. Documentation
- Document all security updates in changelog
- Update override policies as needed
- Report findings to team

## Secret Management

### Detection
Our security workflow automatically scans for:

- API keys (OpenAI, Stripe, Resend, AWS)
- JWT tokens
- Generic Base64 secrets
- Hard-coded credentials

### Prevention
- Use environment variables for all secrets
- Add secrets to `.env.local` (gitignored)
- Use Vercel Environment Variables for production
- Regular secret rotation

### Response
If secrets are detected in code:
1. **Immediate**: Rotate the compromised secret
2. **Code**: Remove from codebase and use environment variables
3. **History**: Consider rewriting Git history if recently committed
4. **Monitor**: Watch for unauthorized usage

## License Compliance

### Approved Licenses
- MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause
- ISC, Unlicense, WTFPL
- CC0-1.0, 0BSD

### Restricted Licenses
- GPL-2.0, GPL-3.0 (viral copyleft)
- AGPL-1.0, AGPL-3.0 (network copyleft)
- LGPL-2.1, LGPL-3.0 (library copyleft)

### License Review
Run `npm run security:licenses` to check current license compliance.

## Supply Chain Security

### Best Practices
1. **Pin Dependencies**: Use exact versions for production
2. **Verify Integrity**: Check package checksums
3. **Monitor Sources**: Watch for typosquatting
4. **Regular Audits**: Weekly automated + monthly manual review
5. **Minimal Dependencies**: Only add what's necessary

### Package Vetting Process
Before adding new dependencies:

1. **Security**: Check for known vulnerabilities
2. **Maintenance**: Verify active maintenance and updates
3. **Popularity**: Consider download count and community usage
4. **License**: Ensure license compliance
5. **Size**: Evaluate bundle size impact
6. **Alternatives**: Consider if functionality exists in current stack

## Monitoring and Alerting

### Automated Monitoring
- GitHub Security Advisories
- Dependabot alerts
- Weekly security workflow reports
- CI/CD security gate failures

### Manual Monitoring
- Monthly security review meeting
- Quarterly dependency audit
- Annual security policy review

## Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** open a public issue
2. Email security concerns to: [security-contact-email]
3. Include detailed information about the vulnerability
4. Allow time for assessment and fix before public disclosure

## Emergency Contacts

- **Primary Security Contact**: [primary-contact]
- **Backup Contact**: [backup-contact]
- **Escalation**: [escalation-contact]

## References

- [OWASP Dependency Check](https://owasp.org/www-project-dependency-check/)
- [GitHub Security Best Practices](https://docs.github.com/en/code-security)
- [NPM Security Best Practices](https://docs.npmjs.com/security)
- [Snyk Security Research](https://snyk.io/research/)