
CREATE OR REPLACE FUNCTION public.debug_get_function_def(func_name text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    def text;
BEGIN
    SELECT pg_get_functiondef(oid) INTO def
    FROM pg_proc
    WHERE proname = func_name;
    
    RETURN def;
END;
$$;
