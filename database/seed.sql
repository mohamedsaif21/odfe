-- ODFE Seed Data
-- Sample data for development and testing

-- Note: In production, this data is loaded via Odoo XML data files.
-- This SQL file is for direct database seeding when needed.

-- Insert default payment methods
INSERT INTO odfe_payment_method (name, code, type, sequence, is_default, active, create_date, write_date)
VALUES
    ('Cash', 'CASH', 'cash', 10, true, true, NOW(), NOW()),
    ('Credit Card', 'CARD', 'card', 20, false, true, NOW(), NOW()),
    ('Debit Card', 'DEBIT', 'card', 30, false, true, NOW(), NOW()),
    ('Google Pay', 'GPAY', 'upi', 40, false, true, NOW(), NOW()),
    ('PhonePe', 'PHONEPE', 'upi', 50, false, true, NOW(), NOW()),
    ('Paytm', 'PAYTM', 'upi', 60, false, true, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- Insert default product categories
INSERT INTO odfe_product_category (name, sequence, pos_visible, active, create_date, write_date)
VALUES
    ('Starters', 10, true, true, NOW(), NOW()),
    ('Main Course', 20, true, true, NOW(), NOW()),
    ('Desserts', 30, true, true, NOW(), NOW()),
    ('Beverages', 40, true, true, NOW(), NOW()),
    ('Sides', 50, true, true, NOW(), NOW()),
    ('Combo Meals', 60, true, true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Insert default tax rates
INSERT INTO odfe_product_tax (name, amount, percentage, type, applicable_on, active, create_date, write_date)
VALUES
    ('No Tax', 0, 0, 'percentage', 'all', true, NOW(), NOW()),
    ('GST 5%', 5, 5, 'percentage', 'food', true, NOW(), NOW()),
    ('GST 12%', 12, 12, 'percentage', 'food', true, NOW(), NOW()),
    ('GST 18%', 18, 18, 'percentage', 'beverage', true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Insert default floor
INSERT INTO odfe_floor_floor (name, sequence, active, create_date, write_date)
VALUES ('Main Floor', 10, true, NOW(), NOW())
ON CONFLICT DO NOTHING;
