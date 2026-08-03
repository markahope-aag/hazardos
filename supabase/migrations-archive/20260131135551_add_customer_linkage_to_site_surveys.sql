-- Add customer linkage to site_surveys table
-- This links site surveys to customers for better relationship tracking

-- Add customer_id column to site_surveys
ALTER TABLE site_surveys 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_site_surveys_customer_id ON site_surveys(customer_id);

-- Add comment to document the relationship
COMMENT ON COLUMN site_surveys.customer_id IS 'Links site survey to a customer record - can be null for legacy surveys';