-- ==============================================================================
-- FIX: RLS ROBUSTO Y CASE-INSENSITIVE
-- FECHA: 20/02/2026
-- CAMBIO: Usar LOWER() para comparar emails y asegurar que get_my_role funcione
-- ==============================================================================

-- 1. Mejorar get_my_role para ser case-insensitive
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.employees WHERE LOWER(email) = LOWER(auth.email());
$$;

-- 2. Mejorar get_my_position para ser case-insensitive
CREATE OR REPLACE FUNCTION public.get_my_position()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT position FROM public.employees WHERE LOWER(email) = LOWER(auth.email());
$$;

-- 3. Re-aplicar políticas de EMPLOYEES con la nueva función
DROP POLICY IF EXISTS "RRHH view all employees" ON public.employees;

CREATE POLICY "RRHH view all employees"
ON public.employees
FOR SELECT
TO authenticated
USING (
    LOWER(email) = LOWER(auth.email()) -- Siempre ver su propio perfil
    OR
    get_my_role() IN ('JEFE_RRHH', 'ADMIN', 'SUPER ADMIN')
    OR
    get_my_position() ILIKE '%JEFE DE GENTE%'
    OR
    get_my_position() ILIKE '%ANALISTA DE GENTE%'
);

-- 4. Re-aplicar políticas de ATTENDANCE
DROP POLICY IF EXISTS "RRHH view all attendance" ON public.attendance;

CREATE POLICY "RRHH view all attendance"
ON public.attendance
FOR SELECT
TO authenticated
USING (
    get_my_role() IN ('JEFE_RRHH', 'ADMIN', 'SUPER ADMIN')
    OR
    get_my_position() ILIKE '%JEFE DE GENTE%'
    OR
    get_my_position() ILIKE '%ANALISTA DE GENTE%'
    OR
    employee_id IN (SELECT id FROM public.employees WHERE LOWER(email) = LOWER(auth.email()))
);

-- 5. Re-aplicar políticas de VACATION_REQUESTS
DROP POLICY IF EXISTS "RRHH view all requests" ON public.vacation_requests;

CREATE POLICY "RRHH view all requests"
ON public.vacation_requests
FOR SELECT
TO authenticated
USING (
    get_my_role() IN ('JEFE_RRHH', 'ADMIN', 'SUPER ADMIN')
    OR
    get_my_position() ILIKE '%JEFE DE GENTE%'
    OR
    get_my_position() ILIKE '%ANALISTA DE GENTE%'
    OR
    employee_id IN (SELECT id FROM public.employees WHERE LOWER(email) = LOWER(auth.email()))
);
