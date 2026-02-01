import { createClient } from '@/lib/supabase/server';
import type { QuickBooksConnectionStatus, QuickBooksCompanyInfo } from '@/types/integrations';

const QBO_BASE_URL = process.env.QBO_ENVIRONMENT === 'production'
  ? 'https://quickbooks.api.intuit.com'
  : 'https://sandbox-quickbooks.api.intuit.com';

const QBO_AUTH_URL = 'https://appcenter.intuit.com/connect/oauth2';
const QBO_TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';

export class QuickBooksService {
  // ========== OAUTH ==========

  static getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: process.env.QBO_CLIENT_ID || '',
      response_type: 'code',
      scope: 'com.intuit.quickbooks.accounting openid profile email',
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/quickbooks/callback`,
      state,
    });

    return `${QBO_AUTH_URL}?${params.toString()}`;
  }

  static async exchangeCodeForTokens(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    const response = await fetch(QBO_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(
          `${process.env.QBO_CLIENT_ID}:${process.env.QBO_CLIENT_SECRET}`
        ).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/quickbooks/callback`,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    return response.json();
  }

  static async refreshTokens(refreshToken: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    const response = await fetch(QBO_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(
          `${process.env.QBO_CLIENT_ID}:${process.env.QBO_CLIENT_SECRET}`
        ).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    return response.json();
  }

  // ========== TOKEN MANAGEMENT ==========

  static async storeTokens(
    organizationId: string,
    tokens: { access_token: string; refresh_token: string; expires_in: number },
    realmId: string
  ): Promise<void> {
    const supabase = await createClient();
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await supabase
      .from('organization_integrations')
      .upsert({
        organization_id: organizationId,
        integration_type: 'quickbooks',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt.toISOString(),
        external_id: realmId,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'organization_id,integration_type',
      });
  }

  static async getValidTokens(organizationId: string): Promise<{
    access_token: string;
    realmId: string;
  } | null> {
    const supabase = await createClient();

    const { data: integration } = await supabase
      .from('organization_integrations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('integration_type', 'quickbooks')
      .eq('is_active', true)
      .single();

    if (!integration) return null;

    // Check if token needs refresh (5 min buffer)
    const expiresAt = new Date(integration.token_expires_at);
    const needsRefresh = expiresAt < new Date(Date.now() + 5 * 60 * 1000);

    if (needsRefresh) {
      try {
        const newTokens = await this.refreshTokens(integration.refresh_token);
        await this.storeTokens(organizationId, newTokens, integration.external_id);
        return {
          access_token: newTokens.access_token,
          realmId: integration.external_id,
        };
      } catch {
        // Mark as disconnected
        await this.disconnect(organizationId);
        return null;
      }
    }

    return {
      access_token: integration.access_token,
      realmId: integration.external_id,
    };
  }

  static async getConnectionStatus(organizationId: string): Promise<QuickBooksConnectionStatus> {
    const supabase = await createClient();

    const { data: integration } = await supabase
      .from('organization_integrations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('integration_type', 'quickbooks')
      .single();

    if (!integration || !integration.is_active) {
      return { is_connected: false };
    }

    // Try to get company info
    try {
      const tokens = await this.getValidTokens(organizationId);
      if (tokens) {
        const companyInfo = await this.getCompanyInfo(organizationId);
        return {
          is_connected: true,
          company_name: companyInfo?.CompanyName,
          realm_id: integration.external_id,
          last_sync_at: integration.last_sync_at,
        };
      }
    } catch {
      // Token invalid
    }

    return { is_connected: false };
  }

  static async disconnect(organizationId: string): Promise<void> {
    const supabase = await createClient();

    await supabase
      .from('organization_integrations')
      .update({
        is_active: false,
        access_token: null,
        refresh_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId)
      .eq('integration_type', 'quickbooks');
  }

  // ========== API REQUESTS ==========

  static async makeRequest(
    organizationId: string,
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const tokens = await this.getValidTokens(organizationId);
    if (!tokens) throw new Error('QuickBooks not connected');

    const url = `${QBO_BASE_URL}/v3/company/${tokens.realmId}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`QuickBooks API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  static async getCompanyInfo(organizationId: string): Promise<QuickBooksCompanyInfo | null> {
    const tokens = await this.getValidTokens(organizationId);
    if (!tokens) return null;

    const result = await this.makeRequest(
      organizationId,
      `/companyinfo/${tokens.realmId}?minorversion=65`
    );

    return result.CompanyInfo as QuickBooksCompanyInfo;
  }

  // ========== CUSTOMER SYNC ==========

  static async syncCustomerToQBO(organizationId: string, customerId: string): Promise<string> {
    const supabase = await createClient();

    const { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (!customer) throw new Error('Customer not found');

    const displayName = customer.company_name ||
      `${customer.first_name || ''} ${customer.last_name || ''}`.trim();

    const qbCustomer: Record<string, unknown> = {
      DisplayName: displayName.substring(0, 100), // QB limit
      GivenName: customer.first_name?.substring(0, 25),
      FamilyName: customer.last_name?.substring(0, 25),
      CompanyName: customer.company_name?.substring(0, 100),
    };

    if (customer.email) {
      qbCustomer.PrimaryEmailAddr = { Address: customer.email };
    }

    if (customer.phone) {
      qbCustomer.PrimaryPhone = { FreeFormNumber: customer.phone };
    }

    if (customer.address_line1) {
      qbCustomer.BillAddr = {
        Line1: customer.address_line1,
        City: customer.city,
        CountrySubDivisionCode: customer.state,
        PostalCode: customer.zip,
      };
    }

    let result: Record<string, unknown>;

    if (customer.qb_customer_id) {
      // Update existing customer
      const existing = await this.makeRequest(
        organizationId,
        `/customer/${customer.qb_customer_id}?minorversion=65`
      );

      result = await this.makeRequest(
        organizationId,
        '/customer?minorversion=65',
        'POST',
        {
          ...qbCustomer,
          Id: customer.qb_customer_id,
          SyncToken: (existing.Customer as Record<string, unknown>).SyncToken,
          sparse: true,
        }
      );
    } else {
      // Create new customer
      result = await this.makeRequest(
        organizationId,
        '/customer?minorversion=65',
        'POST',
        qbCustomer
      );
    }

    const qbId = (result.Customer as Record<string, unknown>).Id as string;

    // Update local record
    await supabase
      .from('customers')
      .update({
        qb_customer_id: qbId,
        qb_synced_at: new Date().toISOString(),
        qb_sync_error: null,
      })
      .eq('id', customerId);

    return qbId;
  }

  // ========== INVOICE SYNC ==========

  static async syncInvoiceToQBO(organizationId: string, invoiceId: string): Promise<string> {
    const supabase = await createClient();

    const { data: invoice } = await supabase
      .from('invoices')
      .select(`
        *,
        customer:customers(*),
        line_items:invoice_line_items(*)
      `)
      .eq('id', invoiceId)
      .single();

    if (!invoice) throw new Error('Invoice not found');

    // Ensure customer is synced first
    let qbCustomerId = invoice.customer?.qb_customer_id;
    if (!qbCustomerId) {
      qbCustomerId = await this.syncCustomerToQBO(organizationId, invoice.customer_id);
    }

    interface LineItem {
      description: string;
      line_total: number;
      quantity: number;
      unit_price: number;
    }

    const qbInvoice: Record<string, unknown> = {
      CustomerRef: { value: qbCustomerId },
      TxnDate: invoice.invoice_date,
      DueDate: invoice.due_date,
      DocNumber: invoice.invoice_number,
      Line: (invoice.line_items as LineItem[]).map((item: LineItem, index: number) => ({
        LineNum: index + 1,
        Description: item.description,
        Amount: item.line_total,
        DetailType: 'SalesItemLineDetail',
        SalesItemLineDetail: {
          Qty: item.quantity,
          UnitPrice: item.unit_price,
          ItemRef: { value: '1', name: 'Services' }, // Default service item
        },
      })),
    };

    if (invoice.notes) {
      qbInvoice.CustomerMemo = { value: invoice.notes };
    }

    let result: Record<string, unknown>;

    if (invoice.qb_invoice_id) {
      // Update existing
      const existing = await this.makeRequest(
        organizationId,
        `/invoice/${invoice.qb_invoice_id}?minorversion=65`
      );

      result = await this.makeRequest(
        organizationId,
        '/invoice?minorversion=65',
        'POST',
        {
          ...qbInvoice,
          Id: invoice.qb_invoice_id,
          SyncToken: (existing.Invoice as Record<string, unknown>).SyncToken,
        }
      );
    } else {
      // Create new
      result = await this.makeRequest(
        organizationId,
        '/invoice?minorversion=65',
        'POST',
        qbInvoice
      );
    }

    const qbId = (result.Invoice as Record<string, unknown>).Id as string;

    // Update local record
    await supabase
      .from('invoices')
      .update({
        qb_invoice_id: qbId,
        qb_synced_at: new Date().toISOString(),
      })
      .eq('id', invoiceId);

    return qbId;
  }

  // ========== PAYMENT SYNC ==========

  static async syncPaymentToQBO(organizationId: string, paymentId: string): Promise<string> {
    const supabase = await createClient();

    const { data: payment } = await supabase
      .from('payments')
      .select(`
        *,
        invoice:invoices(
          *,
          customer:customers(qb_customer_id)
        )
      `)
      .eq('id', paymentId)
      .single();

    if (!payment) throw new Error('Payment not found');

    interface Invoice {
      qb_invoice_id: string;
      customer: {
        qb_customer_id: string;
      };
    }

    const invoiceData = payment.invoice as Invoice;

    if (!invoiceData?.qb_invoice_id) {
      throw new Error('Invoice must be synced to QuickBooks first');
    }

    const qbPayment: Record<string, unknown> = {
      CustomerRef: { value: invoiceData.customer.qb_customer_id },
      TotalAmt: payment.amount,
      TxnDate: payment.payment_date,
      Line: [{
        Amount: payment.amount,
        LinkedTxn: [{
          TxnId: invoiceData.qb_invoice_id,
          TxnType: 'Invoice',
        }],
      }],
    };

    if (payment.reference_number) {
      qbPayment.PaymentRefNum = payment.reference_number;
    }

    let result: Record<string, unknown>;

    if (payment.qb_payment_id) {
      // Update existing
      const existing = await this.makeRequest(
        organizationId,
        `/payment/${payment.qb_payment_id}?minorversion=65`
      );

      result = await this.makeRequest(
        organizationId,
        '/payment?minorversion=65',
        'POST',
        {
          ...qbPayment,
          Id: payment.qb_payment_id,
          SyncToken: (existing.Payment as Record<string, unknown>).SyncToken,
        }
      );
    } else {
      // Create new
      result = await this.makeRequest(
        organizationId,
        '/payment?minorversion=65',
        'POST',
        qbPayment
      );
    }

    const qbId = (result.Payment as Record<string, unknown>).Id as string;

    // Update local record
    await supabase
      .from('payments')
      .update({
        qb_payment_id: qbId,
        qb_synced_at: new Date().toISOString(),
      })
      .eq('id', paymentId);

    return qbId;
  }

  // ========== SYNC LOGGING ==========

  static async logSync(
    organizationId: string,
    syncType: string,
    direction: 'push' | 'pull',
    results: {
      processed: number;
      succeeded: number;
      failed: number;
      errors: Array<{ entity_id: string; entity_type: string; error: string }>;
    }
  ): Promise<void> {
    const supabase = await createClient();

    await supabase.from('integration_sync_log').insert({
      organization_id: organizationId,
      integration_type: 'quickbooks',
      sync_type: syncType,
      direction,
      status: results.failed === 0 ? 'success' : results.succeeded > 0 ? 'partial' : 'failed',
      records_processed: results.processed,
      records_succeeded: results.succeeded,
      records_failed: results.failed,
      errors: results.errors,
      completed_at: new Date().toISOString(),
    });

    // Update last sync time
    await supabase
      .from('organization_integrations')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('organization_id', organizationId)
      .eq('integration_type', 'quickbooks');
  }
}
