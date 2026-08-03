-- Add a 'past_customer' value to customer_status so the office can
-- distinguish "this person used to do business with us" from a still-
-- active customer or a fully cold lead. The four existing values
-- remain (inquiry, prospect, customer, inactive); past_customer slots
-- between customer and inactive in the lifecycle.

ALTER TYPE customer_status ADD VALUE IF NOT EXISTS 'past_customer';
