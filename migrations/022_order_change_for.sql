-- Migration 022: Add change_for field to orders table
-- This field stores the amount the customer wants change for when paying with cash
-- Run this migration on the production database via Master Admin SQL Migration panel

-- Add change_for column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS change_for NUMERIC(10,2);

-- Add comment for documentation
COMMENT ON COLUMN orders.change_for IS 'Troco para quanto - valor que o cliente quer troco (apenas para pagamento em dinheiro)';
