// Integration Types for HazardOS

export type IntegrationType = 'quickbooks' | 'stripe';

export type SyncStatus = 'success' | 'partial' | 'failed';
export type SyncDirection = 'push' | 'pull' | 'both';

export interface OrganizationIntegration {
  id: string;
  organization_id: string;
  integration_type: IntegrationType;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  external_id: string | null;
  is_active: boolean;
  last_sync_at: string | null;
  last_error: string | null;
  settings: QuickBooksSettings | Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface IntegrationSyncLog {
  id: string;
  organization_id: string;
  integration_type: IntegrationType;
  sync_type: string;
  direction: SyncDirection;
  status: SyncStatus;
  records_processed: number;
  records_succeeded: number;
  records_failed: number;
  errors: SyncError[];
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
}

export interface SyncError {
  entity_id: string;
  entity_type: string;
  error: string;
  timestamp: string;
}

export interface QuickBooksSettings {
  auto_sync_customers: boolean;
  auto_sync_invoices: boolean;
  default_income_account_id?: string;
  default_ar_account_id?: string;
}

export interface QuickBooksConnectionStatus {
  is_connected: boolean;
  company_name?: string;
  realm_id?: string;
  last_sync_at?: string;
  token_expires_at?: string;
}

export interface QuickBooksCompanyInfo {
  CompanyName: string;
  LegalName?: string;
  CompanyAddr?: {
    Line1?: string;
    City?: string;
    CountrySubDivisionCode?: string;
    PostalCode?: string;
  };
}
