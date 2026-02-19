-- ==============================================================================
-- MIGRACIÓN: IDENTIFICACIÓN DE JEFES, ACCESO WEB Y FILTRADO POR ÁREAS
-- ==============================================================================

-- 1. ASEGURAR ROLES DE JEFATURA CON ACCESO WEB
-- Creamos o actualizamos los roles clave para que tengan acceso web
INSERT INTO public.roles (name, web_access, mobile_access) VALUES
('GERENTE', true, true),
('JEFE', true, true),
('COORDINADOR', true, true),
('SUPERVISOR', true, true),
('ENCARGADO', true, true)
ON CONFLICT (name) DO UPDATE 
SET web_access = true, mobile_access = true;

-- 2. ASIGNAR ROLES A EMPLEADOS SEGÚN SU CARGO (POSITION)
-- Actualizamos employees.role_id y employees.role (texto legacy)
-- Buscamos coincidencias en el nombre del cargo

-- 2.1 GERENTES
UPDATE public.employees
SET role_id = (SELECT id FROM public.roles WHERE name = 'GERENTE'),
    role = 'GERENTE'
WHERE position ILIKE '%GERENTE%' 
  AND role NOT IN ('ADMIN', 'SUPER ADMIN'); -- Respetamos admins existentes

-- 2.2 JEFES (Excluyendo Jefes de RRHH si ya tienen rol especial, pero asegurando acceso)
UPDATE public.employees
SET role_id = (SELECT id FROM public.roles WHERE name = 'JEFE'),
    role = 'JEFE'
WHERE position ILIKE '%JEFE%' 
  AND position NOT ILIKE '%RRHH%' -- RRHH suele tener su propio rol
  AND position NOT ILIKE '%GENTE%' 
  AND role NOT IN ('ADMIN', 'SUPER ADMIN', 'JEFE_RRHH');

-- 2.3 COORDINADORES
UPDATE public.employees
SET role_id = (SELECT id FROM public.roles WHERE name = 'COORDINADOR'),
    role = 'COORDINADOR'
WHERE position ILIKE '%COORDINADOR%' 
  AND role NOT IN ('ADMIN', 'SUPER ADMIN');

-- 2.4 SUPERVISORES
UPDATE public.employees
SET role_id = (SELECT id FROM public.roles WHERE name = 'SUPERVISOR'),
    role = 'SUPERVISOR'
WHERE position ILIKE '%SUPERVISOR%' 
  AND role NOT IN ('ADMIN', 'SUPER ADMIN');

-- 2.5 ENCARGADOS
UPDATE public.employees
SET role_id = (SELECT id FROM public.roles WHERE name = 'ENCARGADO'),
    role = 'ENCARGADO'
WHERE position ILIKE '%ENCARGADO%' 
  AND role NOT IN ('ADMIN', 'SUPER ADMIN');


-- 3. FUNCIÓN RPC PARA OBTENER EMPLEADOS FILTRADOS POR ÁREA
-- Esta función será usada por el frontend para listar empleados
-- Si eres Admin/RRHH -> Ves todo
-- Si eres Jefe/Gerente/Etc -> Ves solo los empleados de tu misma ÁREA (basado en job_positions.area_id)

CREATE OR REPLACE FUNCTION public.get_employees_by_user_area()
RETURNS TABLE (
    id uuid,
    full_name text,
    dni text,
    email text,
    "position" text,
    sede text,
    business_unit text,
    profile_picture_url text,
    role text,
    is_active boolean,
    entry_date date,          -- Requerido por el frontend
    employee_type text,       -- Requerido por el frontend
    phone text,
    address text,
    birth_date date,
    area_name text -- Extra: Devolvemos el nombre del área para referencia
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_email text;
    v_user_role text;
    v_user_area_id bigint;
BEGIN
    -- Obtener email del usuario autenticado
    v_user_email := auth.email();
    
    -- Obtener rol y area_id del usuario actual
    -- Hacemos JOIN con job_positions para sacar el area_id del cargo del usuario
    SELECT 
        e.role, 
        jp.area_id 
    INTO 
        v_user_role, 
        v_user_area_id
    FROM public.employees e
    LEFT JOIN public.job_positions jp ON e.position = jp.name
    WHERE e.email = v_user_email;

    -- LÓGICA DE FILTRADO
    
    -- CASO 1: ADMIN, SUPER ADMIN, RRHH, GERENTES, JEFE DE GENTE -> Ven TODO
    IF v_user_role IN ('ADMIN', 'SUPER ADMIN', 'JEFE_RRHH', 'ANALISTA_RRHH', 'ANALISTA DE GENTE Y GESTION', 'GERENTE', 'JEFE DE GENTE Y GESTIÓN') 
       OR v_user_role ILIKE '%ADMIN%' 
       OR v_user_role ILIKE '%GERENTE%'
       OR v_user_role ILIKE '%JEFE DE GENTE%' THEN
        RETURN QUERY 
        SELECT 
            e.id, e.full_name, e.dni, e.email, e.position, e.sede, e.business_unit, e.profile_picture_url, e.role, e.is_active,
            e.entry_date, e.employee_type, e.phone, e.address, e.birth_date,
            a.name as area_name
        FROM public.employees e
        LEFT JOIN public.job_positions jp ON e.position = jp.name
        LEFT JOIN public.areas a ON jp.area_id = a.id
        ORDER BY e.full_name;
        
    -- CASO 2: TIENE ÁREA ASIGNADA -> Ve solo su área
    ELSIF v_user_area_id IS NOT NULL THEN
        RETURN QUERY 
        SELECT 
            e.id, e.full_name, e.dni, e.email, e.position, e.sede, e.business_unit, e.profile_picture_url, e.role, e.is_active,
            e.entry_date, e.employee_type, e.phone, e.address, e.birth_date,
            a.name as area_name
        FROM public.employees e
        LEFT JOIN public.job_positions jp ON e.position = jp.name
        LEFT JOIN public.areas a ON jp.area_id = a.id
        WHERE jp.area_id = v_user_area_id
        ORDER BY e.full_name;
        
    -- CASO 3: NO TIENE ÁREA NI ROL ADMIN -> Ve solo su propio perfil (o nada)
    ELSE
        RETURN QUERY 
        SELECT 
            e.id, e.full_name, e.dni, e.email, e.position, e.sede, e.business_unit, e.profile_picture_url, e.role, e.is_active,
            e.entry_date, e.employee_type, e.phone, e.address, e.birth_date,
            'Sin Área'::text as area_name
        FROM public.employees e
        WHERE e.email = v_user_email;
    END IF;
END;
$$;
