# Proposal Templates

Standardized proposal templates for environmental remediation estimates. Each template is composed of modular sections that are assembled at generation time based on the hazard type and job details.

## Template Architecture

Every proposal is assembled from these sections in order:

1. **Header** — Company branding, submitted to, contact info, date, job location
2. **Scope Statement** — What is being removed/remediated (varies by hazard type)
3. **Proposal Summary** — Duration, line items, base bid, total price
4. **Regulatory Fees** — DHS/DNR filing fees, notification waiting periods (asbestos only)
5. **Notes & Disclaimers** — Job-type-specific notes and customer responsibilities
6. **Work Practices** — Hazard-specific procedures and safety measures
7. **Special Sections** — Template-specific content (rebates, optional add-ons, etc.)
8. **License & Insurance** — Asbestos license link, inclusion statement
9. **Terms & Conditions** — Payment terms, lien rights, insurance, cancellation policy
10. **Signatures** — Authorized signature + customer acceptance

## Available Templates

| Template | Hazard Type | Key Use Case |
|----------|------------|-------------|
| `encapsulation` | Asbestos (TSI) | Encapsulating rather than removing pipe insulation |
| `transite-siding` | Asbestos (exterior) | Removing asbestos-containing exterior siding |
| `lead-removal` | Lead | Lead-safe renovation and demolition |
| `mold-remediation` | Mold | Mold cleanup and prevention |
| `floor-tile` | Asbestos (flooring) | Floor tile and mastic removal |
| `miscellaneous-asbestos` | Asbestos (general) | General asbestos abatement |
| `tsi` | Asbestos (pipe/boiler) | Thermal system insulation removal |
| `vermiculite` | Asbestos (attic) | Vermiculite/Zonolite attic insulation removal |

## Variable Placeholders

Templates use `{{variable}}` placeholders that are filled from opportunity/job data:

- `{{company_name}}` — Remediation company name
- `{{submitted_to}}` — Customer/contact name
- `{{contact_info}}` — Customer phone/email
- `{{date}}` — Proposal date
- `{{job_location}}` — Service address
- `{{duration}}` — Estimated project duration
- `{{total_price}}` — Total proposal amount
- `{{base_bid}}` — Base bid amount
- `{{line_items}}` — Itemized scope of work
- `{{notes}}` — Job-specific notes
- `{{payment_terms_days}}` — 15 or 30 days
- `{{authorized_name}}` — Signatory name
