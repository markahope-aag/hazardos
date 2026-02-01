# HazardOS Documentation

**Complete documentation for the HazardOS environmental remediation management platform.**

## 📚 Documentation Index

### 🚀 Getting Started
- **[Main README](../README.md)** - Project overview, quick start, and setup instructions
- **[Application Status](./APP-STATUS%20013126.md)** - Current feature status and technical details
- **[Migration Guide](./MIGRATION-GUIDE.md)** - Database setup and migration instructions

### 📋 Product & Requirements
- **[Project Overview](./HazardOS-Project-Overview.md)** - Vision, business model, and strategic goals
- **[Product Requirements Document (PRD)](./HazardOS-PRD.md)** - Detailed feature specifications
- **[Site Assessment Requirements](./HazardOS-Site-Assessment-Requirements.md)** - Field assessment specifications
- **[Site Survey UI Specification](./hazardos-site-survey-ui-spec.md)** - Mobile form design and UX

### 🏗️ Technical Architecture
- **[Multi-Tenant Setup](./MULTI_TENANT_SETUP.md)** - Architecture and configuration guide
- **[Database Setup Checklist](./DATABASE-SETUP-CHECKLIST.md)** - Step-by-step database verification
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

## 📖 Quick Navigation

### For Developers
1. **Start Here**: [Main README](../README.md) → [Application Status](./APP-STATUS%20013126.md)
2. **Database Setup**: [Migration Guide](./MIGRATION-GUIDE.md) → [Database Checklist](./DATABASE-SETUP-CHECKLIST.md)
3. **Architecture**: [Multi-Tenant Setup](./MULTI_TENANT_SETUP.md)

### For Product/Business
1. **Vision & Goals**: [Project Overview](./HazardOS-Project-Overview.md)
2. **Features**: [Product Requirements Document](./HazardOS-PRD.md)
3. **Current Status**: [Application Status](./APP-STATUS%20013126.md)

### For UI/UX
1. **Mobile Forms**: [Site Survey UI Specification](./hazardos-site-survey-ui-spec.md)
2. **Field Requirements**: [Site Assessment Requirements](./HazardOS-Site-Assessment-Requirements.md)

## 🎯 Current Project Status

**Status**: Production Ready ✅  
**Last Updated**: January 31, 2026

### ✅ Completed Core Features
- Multi-tenant authentication and authorization
- Site Survey management (mobile-optimized forms)
- Customer Management with full CRM functionality
- Photo/video upload with compression
- PDF proposal generation
- Database migrations and verification tools
- PWA support with offline capability
- Scheduling system for site surveys
- Comprehensive pricing tables for estimates

### 🚧 In Development
- Mobile survey wizard with photo categorization
- User registration and invitation system
- Estimate builder interface using pricing tables
- Job scheduling calendar interface
- Advanced reporting and analytics

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