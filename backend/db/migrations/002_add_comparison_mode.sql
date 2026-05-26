-- Migration 002: Add Comparison Mode to Problems
-- Ensures parity between the Problem Creator UI and the PostgreSQL schema

ALTER TABLE problems 
ADD COLUMN IF NOT EXISTS comparison_mode VARCHAR(32) DEFAULT 'exact';

-- Update any existing problems to have a default value
UPDATE problems SET comparison_mode = 'exact' WHERE comparison_mode IS NULL;
