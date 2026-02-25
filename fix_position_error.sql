
-- FIX: Error "column location_id of relation org_structure does not exist"
-- This error occurs because there is a legacy trigger on 'job_positions' table
-- that tries to insert into 'org_structure' using old column names.

-- We will drop the problematic trigger.

DO $$
DECLARE
    trg_name TEXT;
BEGIN
    -- 1. Find triggers on job_positions
    FOR trg_name IN 
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'job_positions'
    LOOP
        -- 2. Drop the trigger
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.job_positions', trg_name);
        RAISE NOTICE 'Dropped trigger: %', trg_name;
    END LOOP;
END $$;
