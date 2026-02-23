-- ==============================================================================
-- DEBUG: INSPECCIONAR TABLA ATTENDANCE
-- FECHA: 20/02/2026
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.debug_latest_attendance(limit_count int DEFAULT 5)
RETURNS TABLE (
    id bigint,
    created_at timestamptz,
    work_date date,
    record_type text,
    employee_id uuid,
    employee_name text,
    employee_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.created_at,
        a.work_date,
        a.record_type,
        a.employee_id,
        e.full_name,
        e.email
    FROM public.attendance a
    LEFT JOIN public.employees e ON a.employee_id = e.id
    ORDER BY a.created_at DESC
    LIMIT limit_count;
END;
$$;
