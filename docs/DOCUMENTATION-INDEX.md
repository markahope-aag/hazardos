# HazardOS Documentation Index

**Complete index of all documentation with status and purpose**

> **Last Updated**: May 3, 2026  
> **Total documents**: 80+ Markdown files under `docs/` (plus SQL and template trees)  
> **Status**: Maintained — verify runtime behavior with **OpenAPI** (`/docs/api`), **tests**, and **migrations** alongside prose

---

## 📚 Documentation Categories

### 🚀 Getting Started (Essential)
| Document | Purpose | Status | Last Updated |
|----------|---------|--------|--------------|
| [Main README](../README.md) | Project overview, quick start | ✅ Current | Apr 7, 2026 |
| [Development Guide](./DEVELOPMENT.md) | Complete dev setup | ✅ Current | Apr 7, 2026 |
| [Migration Guide](./MIGRATION-GUIDE.md) | Database setup | ✅ Current | Jan 31, 2026 |
| [Testing Strategy Guide](./TESTING-STRATEGY-GUIDE.md) | Comprehensive testing documentation | ✅ Current | Apr 7, 2026 |

### 📋 Product & Business (Strategic)
| Document | Purpose | Status | Last Updated |
|----------|---------|--------|--------------|
| [Project Overview](./HazardOS-Project-Overview.md) | Vision, business model | ✅ Current | Jan 31, 2026 |
| [Product Requirements (PRD)](./HazardOS-PRD.md) | Feature specifications | ✅ Current | - |
| [Features Documentation](./FEATURES.md) | Complete feature reference | ✅ Current | Feb 2, 2026 |
| [Business Logic](./BUSINESS-LOGIC.md) | Complex workflows | ✅ Current | Apr 19, 2026 |
| [User Guide](./USER-GUIDE.md) | End-user documentation | ✅ Current | - |
| [Customer Management](./CUSTOMER-MANAGEMENT.md) | CRM functionality | ✅ Current | - |

### 🏗️ Technical Architecture (Core)
| Document | Purpose | Status | Last Updated |
|----------|---------|--------|--------------|
| [Architecture Guide](./architecture.md) | System architecture | ✅ Current | Apr 7, 2026 |
| [API Reference](./API-REFERENCE.md) | REST API narrative + examples (use with `/docs/api`) | ✅ Current | May 3, 2026 |
| [API Documentation Update Plan](./API-DOCUMENTATION-UPDATE-PLAN.md) | API docs improvement plan | ✅ Current | Feb 25, 2026 |
| [API Documentation Progress Report](./API-DOCUMENTATION-PROGRESS-REPORT.md) | Progress summary and achievements | ✅ Current | Feb 25, 2026 |
| [API Documentation Completion Report](./API-DOCUMENTATION-COMPLETION-REPORT.md) | Final completion report | ✅ Current | Feb 25, 2026 |
| [Quick API Reference](./QUICK-API-REFERENCE.md) | Fast API reference | ✅ Current | Feb 2, 2026 |
| [Security Documentation](./SECURITY.md) | Security architecture | ✅ Current | Feb 1, 2026 |
| [Security Audit Findings](./SECURITY-AUDIT-FINDINGS.md) | Security vulnerabilities and fixes | ✅ Current | Apr 7, 2026 |
| [Performance Optimization Guide](./PERFORMANCE-OPTIMIZATION-GUIDE.md) | Performance improvements | ✅ Current | Apr 7, 2026 |
| [Multi-Tenant Setup](./MULTI_TENANT_SETUP.md) | Architecture config | ✅ Current | - |
| [Deployment Guide](./DEPLOYMENT.md) | Production deployment | ✅ Current | Feb 2, 2026 |

### 📊 Project Management & Audit (Status)
| Document | Purpose | Status | Last Updated |
|----------|---------|--------|--------------|
| [Comprehensive Codebase Audit (May 2026)](./CODEBASE-AUDIT-2026-05-03.md) | Security, quality, CI, coverage, UX | ✅ Current | May 3, 2026 |
| [Comprehensive Codebase Audit (Apr 2026)](./CODEBASE-AUDIT-2026-04-07.md) | Earlier scorecard & findings | 📎 Reference | Apr 7, 2026 |
| [Application Status](./APP-STATUS%20020226.md) | Current feature status | ✅ Current | Feb 2, 2026 |
| [Documentation Review Summary](./DOCUMENTATION-REVIEW-SUMMARY-APR-2026.md) | April 2026 comprehensive documentation audit and updates | ✅ Current | Apr 19, 2026 |
| [Current Status Report](./CURRENT-STATUS-FEB-2026.md) | Comprehensive status report | ✅ Current | Feb 2, 2026 |
| [Project Status](./PROJECT-STATUS.md) | Development roadmap | ✅ Current | Feb 1, 2026 |
| [Changelog](./CHANGELOG.md) | Version history | ✅ Current | Apr 19, 2026 |
| [Roadmap](./ROADMAP.md) | Future planning | ✅ Current | Jan 31, 2026 |

### 🔧 Implementation Guides (Specialized)
| Document | Purpose | Status | Last Updated |
|----------|---------|--------|--------------|
| [Database Setup Checklist](./DATABASE-SETUP-CHECKLIST.md) | DB verification | ✅ Current | - |
| [Site Survey UI Spec](./hazardos-site-survey-ui-spec.md) | Mobile form design | ✅ Current | - |
| [Site Assessment Requirements](./HazardOS-Site-Assessment-Requirements.md) | Field requirements | ✅ Current | - |
| [Email & SMS Guide](./EMAIL-SMS-GUIDE.md) | Communication setup | ✅ Current | - |
| [Site Survey Terminology Update](./SITE-SURVEY-TERMINOLOGY-UPDATE.md) | Migration notes | ✅ Current | - |

### 📈 Business Analysis (Reference)
| Document | Purpose | Status | Last Updated |
|----------|---------|--------|--------------|
| [MarketSharp Migration Guide](./MarketSharp%20Migration%20Guide.md) | Competitor analysis | ✅ Current | - |
| [Marketsharp Comparison](./Marketsharp%20Comparison.md) | Feature comparison | ✅ Current | - |
| [Hazardos Architecture Decisions](./Hazardos%20Architecture%20Decisions.md) | Design decisions | ✅ Current | - |

### 🗄️ Database (Legacy + Current)
| Document | Purpose | Status | Last Updated |
|----------|---------|--------|--------------|
| [Database README](./database/README.md) | Legacy migration docs | 📚 Legacy | - |
| Various SQL files | Historical reference | 📚 Legacy | - |

---

## 📖 Documentation Quality Standards

### ✅ Current Documentation Standards
- **Comprehensive**: All major features documented
- **Up-to-date**: Reflects current codebase state (v0.2.2)
- **Well-organized**: Clear categorization and navigation
- **Cross-referenced**: Documents link to related content
- **Status indicators**: Clear status and update dates
- **Multiple formats**: Quick reference + detailed guides

### Documentation metrics (honest scope)
- **Feature prose**: Most major product areas have a guide; new surfaces should add or extend **FEATURES**, **USER-GUIDE**, or a scoped doc as they ship.
- **HTTP API**: **~190+** `app/api/**/route.ts` modules — treat **`GET /api/openapi`** and **`/docs/api`** as authoritative; Markdown API references are supporting material.
- **Tests**: **400+** test files; **`npm run test:coverage`** enforces Vitest thresholds on `app/`, `components/`, `lib/`, `types/` (see [Testing](./TESTING.md)).
- **Security / performance / architecture**: Audit and ADR-style docs are snapshots from their **dated** reviews — re-read before relying on vulnerability counts or metrics.

---

## 🎯 Documentation Maintenance

### Regular Updates Required
- **Monthly**: Application Status, Project Status
- **Per Release**: Changelog, Features, API Reference
- **Per Major Feature**: Architecture, Business Logic
- **As Needed**: Development Guide, Deployment Guide

### Quality Checklist
- [ ] All new features documented
- [ ] API changes reflected in documentation
- [ ] Breaking changes noted in changelog
- [ ] Migration guides updated for schema changes
- [ ] Cross-references updated
- [ ] Status dates current

---

## 🔍 Quick Reference by Use Case

### New Developer Onboarding
1. [Main README](../README.md) - Project overview
2. [Development Guide](./DEVELOPMENT.md) - Setup instructions
3. [Architecture Guide](./architecture.md) - System understanding
4. [Testing Guide](./TESTING.md) - Testing practices

### Feature Development
1. [Features Documentation](./FEATURES.md) - Current features
2. [Business Logic](./BUSINESS-LOGIC.md) - Complex workflows
3. [API Reference](./API-REFERENCE.md) - API details
4. [Testing Guide](./TESTING.md) - Testing requirements

### Production Deployment
1. [Deployment Guide](./DEPLOYMENT.md) - Deployment process
2. [Security Documentation](./SECURITY.md) - Security requirements
3. [Database Setup Checklist](./DATABASE-SETUP-CHECKLIST.md) - DB verification
4. [Migration Guide](./MIGRATION-GUIDE.md) - Database migrations

### Business Understanding
1. [Project Overview](./HazardOS-Project-Overview.md) - Vision and goals
2. [Product Requirements (PRD)](./HazardOS-PRD.md) - Feature specs
3. [User Guide](./USER-GUIDE.md) - End-user perspective
4. [Customer Management](./CUSTOMER-MANAGEMENT.md) - CRM features

### API Integration
1. [Quick API Reference](./QUICK-API-REFERENCE.md) - Fast reference
2. [API Reference](./API-REFERENCE.md) - Detailed documentation
3. [Security Documentation](./SECURITY.md) - Authentication
4. [Business Logic](./BUSINESS-LOGIC.md) - Data relationships

---

## 🚀 Documentation Roadmap (Updated Post-Audit)

### Completed ✅
- OpenAPI + Swagger UI (`/docs/api`, `/api/openapi`) as the live API contract
- Large Vitest suite (`test/api`, `test/pages`, components, services, RLS)
- Production deployment, security, and architecture guides (dated snapshots)
- User-facing **USER-GUIDE** and feature/business docs

### In progress 🚧
- Raising **instrumented** coverage toward Vitest thresholds and beyond (see [TESTING](./TESTING.md))
- Keeping Markdown API sections aligned with new routes (prefer OpenAPI diff)
- E2E coverage for critical journeys (where introduced)

### Planned 📋
- Video tutorials for key workflows
- Interactive API documentation
- Mobile app development guides
- Advanced integration examples
- Automated documentation generation from code
- Security training materials

---

## 📞 Documentation Support

### Feedback and Updates
- **Technical Issues**: mark.hope@asymmetric.pro
- **Documentation Gaps**: Create GitHub issue
- **Suggestions**: Contact development team

### Contributing to Documentation
1. Follow existing format and style
2. Include status and update dates
3. Cross-reference related documents
4. Test all code examples
5. Update this index when adding new docs

---

## 🎯 Post-Audit Documentation Summary

### Major Documentation Updates (April 7, 2026)
- ✅ **Architecture Guide**: Updated with Next.js 16 patterns, security considerations, and performance analysis
- ✅ **Security Documentation**: New comprehensive security audit findings with specific remediation steps
- ✅ **Performance Guide**: Detailed performance optimization guide with 52% LCP improvement roadmap
- ✅ **Testing Strategy**: Comprehensive testing strategy with coverage analysis and expansion plan
- ✅ **Development Guide**: Enhanced with security standards and audit findings
- ✅ **Main README**: Updated with current status, security alerts, and audit references

### Documentation quality assessment
- **Completeness**: Strong for onboarding, architecture, and core workflows; gaps appear first in **long-tail API** and **new dashboard** routes.
- **Currency**: Dated sections remain useful for context — confirm against **git** and **OpenAPI** before production decisions.
- **Accuracy**: Prefer **tests** and **generated specs** over static tables for counts and endpoint lists.
- **Usability**: Cross-links in this index and `docs/README.md` are the primary navigation aids.
- **Maintenance**: Update **CHANGELOG**, **TESTING**, and **API-REFERENCE** headers when you ship materially new behavior.

### Critical Documentation Additions
1. **Security Audit Findings** - Immediate action items for 23 vulnerabilities
2. **Performance Optimization Guide** - Specific improvements with expected impact
3. **Testing Strategy Guide** - Comprehensive testing expansion plan
4. **Enhanced Architecture Documentation** - Updated with audit insights

---

**Documentation status**: Living docs — validate against **code + OpenAPI + tests** when behavior matters  
**Next full index review**: August 1, 2026 (or on any major release)  
**Audit reference**: [Codebase audit 2026-05-03](./CODEBASE-AUDIT-2026-05-03.md) · [Earlier audit 2026-04-07](./CODEBASE-AUDIT-2026-04-07.md)