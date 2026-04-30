-- SMS brand prefix
--
-- Optional short string prepended to outbound SMS bodies so customers
-- recognize who's texting them. The send route prepends "[<prefix>] "
-- to the body unless the user-typed body already starts with the
-- prefix (case-insensitive). 24 chars caps the lost segment budget at
-- about 16% of a single 160-char SMS — beyond that the message starts
-- to feel like prefix-and-nothing-else.

ALTER TABLE organization_sms_settings
  ADD COLUMN IF NOT EXISTS sms_brand_prefix TEXT;

ALTER TABLE organization_sms_settings
  DROP CONSTRAINT IF EXISTS organization_sms_settings_brand_prefix_len;

ALTER TABLE organization_sms_settings
  ADD CONSTRAINT organization_sms_settings_brand_prefix_len
  CHECK (sms_brand_prefix IS NULL OR char_length(sms_brand_prefix) <= 24);
