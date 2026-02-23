-- ==============================================================================
-- FIX: RLS POLICIES PARA JEFE DE GENTE Y GESTION (RRHH)
-- FECHA: 20/02/2026
-- CAMBIO: Garantizar acceso de lectura a tablas críticas para roles de RRHH
-- ==============================================================================

-- 1. Política para ATTENDANCE
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policy 
        WHERE polname = 'RRHH view all attendance' 
        AND polrelid = 'public.attendance'::regclass
    ) THEN
        CREATE POLICY "RRHH view all attendance"
        ON public.attendance
        FOR SELECT
        TO authenticated
        USING (
            (SELECT role FROM public.employees WHERE email = auth.email()) IN ('JEFE_RRHH', 'ADMIN', 'SUPER ADMIN')
            OR
            (SELECT position FROM public.employees WHERE email = auth.email()) ILIKE '%JEFE DE GENTE%'
            OR
            (SELECT position FROM public.employees WHERE email = auth.email()) ILIKE '%ANALISTA DE GENTE%'
        );
    END IF;
END
$$;

-- 2. Política para VACATION_REQUESTS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policy 
        WHERE polname = 'RRHH view all requests' 
        AND polrelid = 'public.vacation_requests'::regclass
    ) THEN
        CREATE POLICY "RRHH view all requests"
        ON public.vacation_requests
        FOR SELECT
        TO authenticated
        USING (
            (SELECT role FROM public.employees WHERE email = auth.email()) IN ('JEFE_RRHH', 'ADMIN', 'SUPER ADMIN')
            OR
            (SELECT position FROM public.employees WHERE email = auth.email()) ILIKE '%JEFE DE GENTE%'
            OR
            (SELECT position FROM public.employees WHERE email = auth.email()) ILIKE '%ANALISTA DE GENTE%'
        );
    END IF;
END
$$;

-- 3. Política para EMPLOYEES (Para poder hacer Joins)
-- Generalmente ya existe "Enable read access for authenticated users", pero reforzamos
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policy 
        WHERE polname = 'RRHH view all employees' 
        AND polrelid = 'public.employees'::regclass
    ) THEN
        CREATE POLICY "RRHH view all employees"
        ON public.employees
        FOR SELECT
        TO authenticated
        USING (
            (SELECT role FROM public.employees WHERE email = auth.email()) IN ('JEFE_RRHH', 'ADMIN', 'SUPER ADMIN')
            OR
            (SELECT position FROM public.employees WHERE email = auth.email()) ILIKE '%JEFE DE GENTE%'
        );
    END IF;
END
$$;
