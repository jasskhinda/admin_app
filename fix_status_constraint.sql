-- Fix the trips_status_check constraint to allow 'awaiting_driver_acceptance' status
-- This constraint is currently preventing the new driver acceptance workflow from working

-- First, let's check the current constraint
-- \d+ trips

-- Drop the existing constraint
ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_status_check;

-- Add the updated constraint with the new status
ALTER TABLE trips ADD CONSTRAINT trips_status_check 
  CHECK (status IN (
    'pending', 
    'upcoming', 
    'awaiting_driver_acceptance',  -- Add the new status
    'in_progress', 
    'completed', 
    'cancelled',
    'rejected'  -- Also add rejected status for when drivers reject trips
  ));

-- Verify the constraint was updated
\d+ trips