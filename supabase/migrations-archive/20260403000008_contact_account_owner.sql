-- Add account_owner_id to contacts (customers) table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS account_owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_customers_account_owner ON customers(account_owner_id) WHERE account_owner_id IS NOT NULL;
