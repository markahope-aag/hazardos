# HazardOS Documentation

**Complete documentation for the HazardOS environmental remediation management platform.**

## 📚 Documentation Index

### 🚀 Getting Started
- **[Main README](../README.md)** - Project overview, quick start, and setup instructions
- **[Application Status](./APP-STATUS%20020226.md)** - Current feature status and technical details
- **[Migration Guide](./MIGRATION-GUIDE.md)** - Database setup and migration instructions

### 📋 Product & Requirements
- **[Project Overview](./HazardOS-Project-Overview.md)** - Vision, business model, and strategic goals
- **[Product Requirements Document (PRD)](./HazardOS-PRD.md)** - Detailed feature specifications
- **[Site Assessment Requirements](./HazardOS-Site-Assessment-Requirements.md)** - Field assessment specifications
- **[Site Survey UI Specification](./hazardos-site-survey-ui-spec.md)** - Mobile form design and UX

### 🏗️ Technical Architecture
- **[Architecture Guide](./architecture.md)** - System architecture and design decisions
- **[Multi-Tenant Setup](./MULTI_TENANT_SETUP.md)** - Architecture and configuration guide
- **[Database Setup Checklist](./DATABASE-SETUP-CHECKLIST.md)** - Step-by-step database verification
- **[Deployment Guide](./DEPLOYMENT.md)** - Complete production deployment guide
- **[Site Survey Terminology Update](./SITE-SURVEY-TERMINOLOGY-UPDATE.md)** - Migration from "Assessments" to "Site Surveys"
- **[Email & SMS Guide](./EMAIL-SMS-GUIDE.md)** - Email audit and SMS implementation guide (Resend + Twilio)

### 🗄️ Database
- **[Database Migrations](./database/README.md)** - SQL migration files and documentation (legacy)
- **[Migration Guide](./MIGRATION-GUIDE.md)** - How to run database migrations
- **[Structure Verification](./database/11-site-survey-structure-verification.sql)** - Database health check queries

### 👥 Customer Management
- **[Customer Management Guide](./CUSTOMER-MANAGEMENT.md)** - Complete CRM functionality documentation

### 🔌 API Documentation
- **[API Reference](./API-REFERENCE.md)** - Complete REST API documentation with examples
- **[Quick API Reference](./QUICK-API-REFERENCE.md)** - Fast reference for all API endpoints

### 🧪 Testing & Quality
- **[Testing Guide](./TESTING.md)** - Comprehensive testing documentation
- **[Test Coverage Report](./TEST-COVERAGE-REPORT.md)** - Initial coverage analysis and testing roadmap
- **[Updated Test Coverage Report](./TEST-COVERAGE-REPORT-UPDATED.md)** - ✨ **Latest coverage analysis with major improvements**

## 📖 Quick Navigation

### For Developers
1. **Start Here**: [Main README](../README.md) → [Application Status](./APP-STATUS%20020226.md)
2. **Database Setup**: [Migration Guide](./MIGRATION-GUIDE.md) → [Database Checklist](./DATABASE-SETUP-CHECKLIST.md)
3. **Architecture**: [Multi-Tenant Setup](./MULTI_TENANT_SETUP.md)

### For Product/Business
1. **Vision & Goals**: [Project Overview](./HazardOS-Project-Overview.md)
2. **Features**: [Product Requirements Document](./HazardOS-PRD.md)
3. **Current Status**: [Application Status](./APP-STATUS%20020226.md)

### For UI/UX
1. **Mobile Forms**: [Site Survey UI Specification](./hazardos-site-survey-ui-spec.md)
2. **Field Requirements**: [Site Assessment Requirements](./HazardOS-Site-Assessment-Requirements.md)

## 🎯 Current Project Status

**Status**: Production Ready ✅  
**Last Updated**: February 2, 2026

### ✅ Completed Core Features
- **Multi-tenant SaaS Platform** with Stripe billing, feature gating, and onboarding
- **Complete CRM System** with customer management and multiple contacts per customer
- **Mobile Site Survey System** with offline support, photo upload, and GPS tagging
- **Estimate & Proposal System** with automated calculations and PDF generation
- **Job Management & Scheduling** with calendar interface and crew assignment
- **Job Completion System** with time tracking, material usage, and variance analysis
- **Invoice Management** with QuickBooks integration and payment tracking
- **Customer Feedback System** with NPS scoring, testimonials, and review requests
- **SMS Communications** with Twilio integration, templates, and TCPA compliance
- **Advanced Reporting** with Excel/CSV export and saved reports
- **Sales Pipeline Management** with Kanban board and opportunity tracking
- **Commission Tracking** with automated calculations and approval workflows
- **Two-Level Approval System** for estimates and proposals based on thresholds
- **Win/Loss Analysis** with competitor intelligence and loss reason tracking
- **Activity Logging** with comprehensive audit trail and manual note/call logging
- **PWA Support** with offline functionality and mobile optimization
- **Comprehensive Testing** with 1,800+ test cases and structured logging

### 🚧 In Development
- Component testing suite expansion (current: ~8%, target: 70%)
- E2E test workflows for critical user journeys
- Logger integration across remaining services
- Mobile native apps (iOS/Android)
- Advanced AI features for estimate accuracy and photo analysis

## 🔄 Documentation Maintenance

### How to Update Documentation

1. **Feature Changes**: Update [Application Status](./APP-STATUS%20020226.md) when features are completed
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
- **Feature Questions**: Refer to [PRD](./HazardOS-PRD.md) and [Application Status](./APP-STATUS%20020226.md)
- **Contact**: mark.hope@asymmetric.pro

---

**HazardOS Documentation** - Keeping the project knowledge organized and accessible. 📚✨