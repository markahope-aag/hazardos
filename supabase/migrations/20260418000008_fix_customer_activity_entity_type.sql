-- The initial auto-tracking migration used entity_type='contact' for the
-- customers table, which collides with the hand-placed Activity.* calls in
-- contacts-service.ts that use 'contact' for the customer_contacts table.
-- Rename so the two streams are distinguishable in the feed:
--   customers         → 'customer'  (the main contact/lead/customer record)
--   customer_contacts → 'contact'   (sub-contacts on a customer; unchanged)

DROP TRIGGER IF EXISTS trg_activity_customers ON customers;
CREATE TRIGGER trg_activity_customers
  AFTER INSERT OR UPDATE OR DELETE ON customers
  FOR EACH ROW EXECUTE FUNCTION log_entity_activity('customer');
