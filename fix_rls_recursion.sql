-- ==============================================================================
-- FIX: RLS RECURSION ERROR
-- FECHA: 20/02/2026
-- CAMBIO: Solucionar el problema de recursividad en políticas RLS usando funciones SECURITY DEFINER
-- ==============================================================================

-- 1. Función auxiliar segura para obtener el rol del usuario actual
-- Al ser SECURITY DEFINER, se ejecuta con permisos de superusuario y evita la recursión de RLS
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.employees WHERE email = auth.email();
$$;

-- 2. Función auxiliar segura para obtener la posición del usuario actual
CREATE OR REPLACE FUNCTION public.get_my_position()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT position FROM public.employees WHERE email = auth.email();
$$;

-- 3. Corregir Políticas de ATTENDANCE usando las funciones seguras
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
    employee_id IN (SELECT id FROM public.employees WHERE email = auth.email()) -- Ver sus propios registros
);

-- 4. Corregir Políticas de VACATION_REQUESTS
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
    employee_id IN (SELECT id FROM public.employees WHERE email = auth.email())
);

-- 5. Corregir Políticas de EMPLOYEES
-- Esta es la más crítica para evitar el error de "Perfil no encontrado"
DROP POLICY IF EXISTS "RRHH view all employees" ON public.employees;

CREATE POLICY "RRHH view all employees"
ON public.employees
FOR SELECT
TO authenticated
USING (
    email = auth.email() -- Siempre ver su propio perfil (rompe la recursión base)
    OR
    get_my_role() IN ('JEFE_RRHH', 'ADMIN', 'SUPER ADMIN')
    OR
    get_my_position() ILIKE '%JEFE DE GENTE%'
);
