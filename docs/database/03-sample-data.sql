-- Sample data for HazardOS development and testing
-- Run this AFTER creating schema and RLS policies

-- Insert sample organization
INSERT INTO organizations (id, name, address, city, state, zip, phone, email, license_number) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Acme Environmental Services', '123 Industrial Blvd', 'Denver', 'CO', '80202', '(303) 555-0123', 'info@acmeenvironmental.com', 'CO-ENV-2024-001');

-- Insert sample equipment catalog
INSERT INTO equipment_catalog (organization_id, name, category, daily_rate, description) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'HEPA Air Scrubber - Large', 'Air Filtration', 125.00, '2000 CFM HEPA air filtration unit'),
('550e8400-e29b-41d4-a716-446655440000', 'HEPA Air Scrubber - Small', 'Air Filtration', 75.00, '1000 CFM HEPA air filtration unit'),
('550e8400-e29b-41d4-a716-446655440000', 'Negative Air Machine', 'Air Filtration', 95.00, 'Portable negative air machine with HEPA filtration'),
('550e8400-e29b-41d4-a716-446655440000', 'Dehumidifier - Commercial', 'Climate Control', 85.00, 'Commercial grade dehumidifier for containment areas'),
('550e8400-e29b-41d4-a716-446655440000', 'Generator - 5000W', 'Power', 65.00, '5000 watt portable generator'),
('550e8400-e29b-41d4-a716-446655440000', 'Containment Poles', 'Containment', 15.00, 'Adjustable containment poles (set of 10)'),
('550e8400-e29b-41d4-a716-446655440000', 'HEPA Vacuum - Backpack', 'Cleaning', 45.00, 'HEPA filtered backpack vacuum'),
('550e8400-e29b-41d4-a716-446655440000', 'Wet/Dry HEPA Vacuum', 'Cleaning', 55.00, 'Wet/dry HEPA vacuum for debris removal');

-- Insert sample materials catalog
INSERT INTO materials_catalog (organization_id, name, category, unit, unit_cost, description) VALUES
('550e8400-e29b-41d4-a716-446655440000', '6mil Poly Sheeting', 'Containment', 'sqft', 0.15, 'Clear 6mil polyethylene sheeting'),
('550e8400-e29b-41d4-a716-446655440000', 'Duct Tape - 2 inch', 'Containment', 'roll', 8.50, 'Professional grade duct tape'),
('550e8400-e29b-41d4-a716-446655440000', 'Tyvek Suits - XL', 'PPE', 'each', 12.00, 'Disposable Tyvek protective suits'),
('550e8400-e29b-41d4-a716-446655440000', 'N100 Respirator Cartridges', 'PPE', 'pair', 25.00, 'P100 filter cartridges for half-face respirators'),
('550e8400-e29b-41d4-a716-446655440000', 'Nitrile Gloves - Box', 'PPE', 'box', 18.00, 'Disposable nitrile gloves (100 count)'),
('550e8400-e29b-41d4-a716-446655440000', 'Asbestos Disposal Bags', 'Disposal', 'each', 4.50, '6mil labeled asbestos disposal bags'),
('550e8400-e29b-41d4-a716-446655440000', 'HEPA Filter - 24x24x12', 'Filtration', 'each', 85.00, 'Replacement HEPA filter for air scrubbers'),
('550e8400-e29b-41d4-a716-446655440000', 'Spray Adhesive', 'Encapsulation', 'gallon', 45.00, 'Fiber encapsulation spray adhesive'),
('550e8400-e29b-41d4-a716-446655440000', 'Amended Water', 'Wetting', 'gallon', 2.50, 'Surfactant amended water for dust suppression'),
('550e8400-e29b-41d4-a716-446655440000', 'Warning Signs - Asbestos', 'Safety', 'each', 3.25, 'OSHA compliant asbestos warning signs');

-- Note: Sample assessments, estimates, and jobs should be created through the application
-- to ensure proper user associations and RLS compliance.

-- You can create test users through Supabase Auth dashboard, then they will automatically
-- get profiles created via the trigger we set up.