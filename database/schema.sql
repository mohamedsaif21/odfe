-- ODFE Database Schema
-- PostgreSQL 16

-- Core tables for the ODFE Restaurant POS system
-- Note: Most tables are created by Odoo ORM automatically.
-- This file provides additional indexes, constraints, and functions.

-- Extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Index for fast order lookups by state and date
CREATE INDEX IF NOT EXISTS idx_odfe_order_state_date
    ON odfe_pos_order (state, ordered_at DESC);

-- Index for table status queries
CREATE INDEX IF NOT EXISTS idx_odfe_table_floor_state
    ON odfe_floor_table (floor_id, state);

-- Index for product search
CREATE INDEX IF NOT EXISTS idx_odfe_product_search
    ON odfe_product_product USING gin (name gin_trgm_ops);

-- Index for coupon validation
CREATE INDEX IF NOT EXISTS idx_odfe_coupon_code_active
    ON odfe_coupon_coupon (code, active)
    WHERE active = true;

-- Index for session queries
CREATE INDEX IF NOT EXISTS idx_odfe_session_user_state
    ON odfe_pos_session (user_id, state);

-- Index for real-time order sync
CREATE INDEX IF NOT EXISTS idx_odfe_order_sync
    ON odfe_pos_order (write_date DESC)
    WHERE state NOT IN ('cancelled', 'draft');

-- Function to generate order sequence
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.pos_reference := 'ODFE-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEW.id::text, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate order reference on insert
DROP TRIGGER IF EXISTS trg_order_number ON odfe_pos_order;
CREATE TRIGGER trg_order_number
    BEFORE INSERT ON odfe_pos_order
    FOR EACH ROW
    WHEN (NEW.pos_reference IS NULL)
    EXECUTE FUNCTION generate_order_number();
