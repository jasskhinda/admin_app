-- Check if rejected_by_driver_id column exists and add it if missing
DO $$
BEGIN
    -- Check if column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'trips' 
        AND column_name = 'rejected_by_driver_id'
        AND table_schema = 'public'
    ) THEN
        -- Add the column if it doesn't exist
        ALTER TABLE trips ADD COLUMN rejected_by_driver_id UUID REFERENCES auth.users(id);
        RAISE NOTICE 'Column rejected_by_driver_id added to trips table';
    ELSE
        RAISE NOTICE 'Column rejected_by_driver_id already exists';
    END IF;

    -- Add index for better query performance if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE tablename = 'trips' 
        AND indexname = 'idx_trips_rejected_by_driver_id'
    ) THEN
        CREATE INDEX idx_trips_rejected_by_driver_id 
        ON trips(rejected_by_driver_id) 
        WHERE rejected_by_driver_id IS NOT NULL;
        RAISE NOTICE 'Index idx_trips_rejected_by_driver_id created';
    ELSE
        RAISE NOTICE 'Index idx_trips_rejected_by_driver_id already exists';
    END IF;
END $$;