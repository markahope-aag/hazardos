# HazardOS Documentation

**Complete documentation for the HazardOS environmental remediation management platform.**

## 📚 Documentation Index

### 🚀 Getting Started
- **[Main README](../README.md)** - Project overview, quick start, and setup instructions
- **[Development Guide](./DEVELOPMENT.md)** - Complete developer setup and workflow guide
- **[Application Status](./APP-STATUS%20013126.md)** - Current feature status and technical details

### 📋 Product & Requirements
- **[Project Overview](./HazardOS-Project-Overview.md)** - Vision, business model, and strategic goals
- **[Project Summary](./PROJECT-SUMMARY.md)** - Quick project summary and status
- **[Product Requirements Document (PRD)](./HazardOS-PRD.md)** - Detailed feature specifications
- **[Site Assessment Requirements](./HazardOS-Site-Assessment-Requirements.md)** - Field assessment specifications
- **[Site Survey UI Specification](./hazardos-site-survey-ui-spec.md)** - Mobile form design and UX

### 🏗️ Technical Architecture
- **[Architecture Guide](./architecture.md)** - Complete system architecture documentation (NEW)
- **[Multi-Tenant Setup](./MULTI_TENANT_SETUP.md)** - Multi-tenancy architecture and configuration
- **[Database Setup Checklist](./DATABASE-SETUP-CHECKLIST.md)** - Step-by-step database verification
- **[Migration Guide](./MIGRATION-GUIDE.md)** - Database setup and migration instructions
- **[Site Survey Terminology Update](./SITE-SURVEY-TERMINOLOGY-UPDATE.md)** - Migration from "Assessments" to "Site Surveys"

### ✨ Features Documentation
- **[Features Guide](./FEATURES.md)** - Complete feature documentation (NEW)
  - Job Completion System
  - Customer Feedback System
  - Analytics & Variance Tracking
  - QuickBooks Integration
  - Activity Logging
  - Site Survey Mobile Wizard
  - Pricing Management
  - And more...

### 🗄️ Database
- **[Database Migrations](./database/README.md)** - SQL migration files and documentation
- **[Migration Guide](./MIGRATION-GUIDE.md)** - How to run database migrations
- **[Structure Verification](./database/11-site-survey-structure-verification.sql)** - Database health check queries

### 👥 Customer Management & User Guide
- **[Customer Management Guide](./CUSTOMER-MANAGEMENT.md)** - Complete CRM functionality documentation
- **[User Guide](./USER-GUIDE.md)** - End-user documentation for HazardOS (NEW)
  - Getting started and first-time setup
  - Dashboard overview
  - Managing customers
  - Creating and managing site surveys
  - Proposals and estimates
  - Job scheduling and management
  - Invoicing
  - Customer portal usage
  - Mobile features and PWA
  - Tips and best practices

### 🔌 API Documentation
- **[API Reference](./API-REFERENCE.md)** - Complete REST API documentation with examples
  - Customers API
  - Jobs API (NEW)
  - Analytics API (NEW)
  - Feedback API (NEW)
  - Integrations API (NEW)
  - Proposals API
  - And more...

### 🧪 Testing & Quality
- **[Testing Guide](./TESTING.md)** - Comprehensive testing documentation (NEW)
  - Testing philosophy and approach
  - Unit, integration, and E2E testing
  - Writing and running tests
  - Mocking strategies
  - Test coverage goals
  - CI/CD integration
- **[Testing Summary](./TESTING-SUMMARY.md)** - Test coverage and strategy
- **[Codebase Audit Report](./CODEBASE-AUDIT-REPORT.md)** - Comprehensive code quality audit

### 🔒 Security
- **[Security Guide](./SECURITY.md)** - Comprehensive security documentation (NEW)
  - Security architecture and principles
  - Authentication and authorization
  - Data protection and encryption
  - Rate limiting implementation
  - Secure error handling
  - Input validation and sanitization
  - OWASP considerations
  - Security best practices
  - Incident response procedures

### 📅 Planning & Roadmap
- **[Strategic Roadmap](./ROADMAP.md)** - Quarterly goals, KPIs, resource planning, risk mitigation (Q1 2026 - 2027)
- **[Project Status](./PROJECT-STATUS.md)** - Detailed feature tracker with priorities, status, and completion percentages
- **[Changelog](./CHANGELOG.md)** - Version history and release notes

### 🚀 Deployment & Operations
- **[MarketSharp Migration Guide](./MarketSharp%20Migration%20Guide.md)** - Step-by-step data migration from MarketSharp CRM
  - Pre-migration checklist and data audit
  - Export instructions and field mapping
  - TypeScript migration script
  - Validation and cutover procedures

### 📊 Status & Reports
- **[Documentation Update Summary](./DOCUMENTATION-UPDATE-SUMMARY.md)** - Recent documentation changes
- **[Hazardos Architecture Decisions](./Hazardos%20Architecture%20Decisions.md)** - Architectural decision records
- **[Marketsharp Comparison](./Marketsharp%20Comparison.md)** - Competitive analysis

## 📖 Quick Navigation

### For Developers
1. **Start Here**: [Main README](../README.md) → [Development Guide](./DEVELOPMENT.md)
2. **Architecture**: [Architecture Guide](./architecture.md) → [Multi-Tenant Setup](./MULTI_TENANT_SETUP.md)
3. **Database**: [Migration Guide](./MIGRATION-GUIDE.md) → [Database Checklist](./DATABASE-SETUP-CHECKLIST.md)
4. **Features**: [Features Guide](./FEATURES.md) → [API Reference](./API-REFERENCE.md)
5. **Testing**: [Testing Guide](./TESTING.md)
6. **Security**: [Security Guide](./SECURITY.md)

### For Product/Business
1. **Overview**: [Project Summary](./PROJECT-SUMMARY.md) → [Project Overview](./HazardOS-Project-Overview.md)
2. **Planning**: [Strategic Roadmap](./ROADMAP.md) → [Project Status](./PROJECT-STATUS.md)
3. **Features**: [Features Guide](./FEATURES.md) → [Product Requirements Document](./HazardOS-PRD.md)
4. **Current Status**: [Application Status](./APP-STATUS%20013126.md)
5. **Competitive Analysis**: [Marketsharp Comparison](./Marketsharp%20Comparison.md)

### For UI/UX
1. **Mobile Experience**: [Site Survey UI Specification](./hazardos-site-survey-ui-spec.md)
2. **Field Requirements**: [Site Assessment Requirements](./HazardOS-Site-Assessment-Requirements.md)
3. **Features**: [Features Guide](./FEATURES.md)

### For End Users
1. **Getting Started**: [User Guide](./USER-GUIDE.md) - Complete guide for using HazardOS
2. **Customer Management**: [Customer Management Guide](./CUSTOMER-MANAGEMENT.md)
3. **Features Overview**: [Features Guide](./FEATURES.md)

### For Operations/Deployment
1. **Data Migration**: [MarketSharp Migration Guide](./MarketSharp%20Migration%20Guide.md)
2. **Database**: [Migration Guide](./MIGRATION-GUIDE.md) → [Database Checklist](./DATABASE-SETUP-CHECKLIST.md)
3. **Security**: [Security Guide](./SECURITY.md)

## 🎯 Current Project Status

**Status**: 🚀 CLIENT LAUNCH READY
**Last Updated**: February 2, 2026
**Progress**: 112/153 features (73%) | Phases 1-4 Complete

### ✅ Completed Core Features (Phases 1-4)
- **Authentication & Multi-Tenancy**: Full RLS-based multi-tenant architecture
- **Customer Management**: Complete CRM with lead tracking and multiple contacts
- **Site Survey Management**: Mobile-optimized forms with offline support
- **Estimates & Proposals**: Auto-calculation, PDF generation, e-signature
- **Job Management**: Full lifecycle with calendar, crew assignment, change orders
- **Job Completion System**: Time entries, material usage, photos, checklists
- **Invoicing & Payments**: Generation, delivery, partial payments, QuickBooks sync
- **Customer Feedback**: Automated post-job surveys with NPS scoring
- **Notifications**: In-app, email, and push notifications
- **Activity Logging**: Manual note/call logging + auto-log system events
- **Analytics**: Variance tracking and reporting
- **QuickBooks Integration**: Two-way sync for customers and invoices
- **Security**: Rate limiting, CSRF protection, secure error handling
- **Performance**: React.memo, bundle optimization

### 🚧 Next Phase (Platform Layer)
- Stripe billing integration
- Public signup and onboarding
- Feature gating by plan
- Platform admin dashboard
- Advanced reporting

## 🔄 Documentation Maintenance

### How to Update Documentation

1. **Feature Changes**: Update [Application Status](./APP-STATUS%20013126.md) when features are completed
2. **Database Changes**: Add migrations to `database/` folder and update [Migration Guide](./MIGRATION-GUIDE.md)
3. **Architecture Changes**: Update [Multi-Tenant Setup](./MULTI_TENANT_SETUP.md) and related docs
4. **New Features**: Update [PRD](./HazardOS-PRD.md) and create specific implementation docs

### Documentation Standards

- **Use clear headings** and table of contents for long documents
- **Include status indicators** (✅ Complete, 🚧 In Progress, 📋 Planned)
- **Link between related documents** to create a cohesive documentation web
- **Update dates** when making significant changes
- **Include code examples** and screenshots where helpful

## 📞 Support

- **Technical Issues**: Check [Database Checklist](./DATABASE-SETUP-CHECKLIST.md) first
- **Feature Questions**: Refer to [PRD](./HazardOS-PRD.md) and [Application Status](./APP-STATUS%20013126.md)
- **Contact**: mark.hope@asymmetric.pro

---

**HazardOS Documentation** - Keeping the project knowledge organized and accessible. 📚✨