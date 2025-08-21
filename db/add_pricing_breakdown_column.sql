-- Add pricing breakdown storage column to trips table
-- This will store the detailed pricing breakdown as JSON to ensure consistency
-- between booking page and trip details page

DO $$ 
BEGIN
    -- Add pricing_breakdown_data column to store the detailed breakdown as JSON
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'pricing_breakdown_data') THEN
        ALTER TABLE trips ADD COLUMN pricing_breakdown_data JSONB;
        COMMENT ON COLUMN trips.pricing_breakdown_data IS 'Detailed pricing breakdown from booking (JSON) - locked from booking page';
        RAISE NOTICE '✅ Added pricing_breakdown_data column';
    ELSE
        RAISE NOTICE 'ℹ️ pricing_breakdown_data column already exists';
    END IF;
    
    -- Add pricing_breakdown_total column for quick total access
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'pricing_breakdown_total') THEN
        ALTER TABLE trips ADD COLUMN pricing_breakdown_total DECIMAL(10,2);
        COMMENT ON COLUMN trips.pricing_breakdown_total IS 'Total amount from pricing breakdown for quick access';
        RAISE NOTICE '✅ Added pricing_breakdown_total column';
    ELSE
        RAISE NOTICE 'ℹ️ pricing_breakdown_total column already exists';
    END IF;
    
    -- Add pricing_breakdown_locked_at column for tracking when breakdown was saved
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'pricing_breakdown_locked_at') THEN
        ALTER TABLE trips ADD COLUMN pricing_breakdown_locked_at TIMESTAMPTZ;
        COMMENT ON COLUMN trips.pricing_breakdown_locked_at IS 'When the pricing breakdown was locked during booking';
        RAISE NOTICE '✅ Added pricing_breakdown_locked_at column';
    ELSE
        RAISE NOTICE 'ℹ️ pricing_breakdown_locked_at column already exists';
    END IF;
    
END $$;

-- Show confirmation
SELECT 
    'Pricing breakdown storage setup complete!' as status,
    'This ensures consistent pricing display across booking and trip details' as purpose;
