-- ==============================================================================
-- FIX: REGLAS DE ACCESO ROBUSTAS (HYBRID JOIN ID/NAME)
-- FECHA: 20/02/2026
-- ==============================================================================

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
    entry_date date,
    employee_type text,
    phone text,
    address text,
    birth_date date,
    area_name text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_email text;
    v_user_role text;
    v_user_position text;
    v_user_sede text;
    v_user_area_id bigint;
    v_user_business_unit text;
BEGIN
    v_user_email := auth.email();
    
    -- 1. OBTENER CONTEXTO DEL USUARIO (Híbrido ID/Nombre)
    SELECT 
        e.role, 
        e.position,
        e.sede,
        jp.area_id,
        e.business_unit
    INTO 
        v_user_role, 
        v_user_position,
        v_user_sede,
        v_user_area_id,
        v_user_business_unit
    FROM public.employees e
    LEFT JOIN public.job_positions jp ON (
        e.job_position_id = jp.id 
        OR (e.job_position_id IS NULL AND e.position = jp.name)
    )
    WHERE e.email = v_user_email;

    -- Normalizar para comparaciones
    v_user_role := UPPER(TRIM(COALESCE(v_user_role, '')));
    v_user_position := UPPER(TRIM(COALESCE(v_user_position, '')));
    v_user_sede := UPPER(TRIM(COALESCE(v_user_sede, '')));
    v_user_business_unit := UPPER(TRIM(COALESCE(v_user_business_unit, '')));

    -- 2. LÓGICA DE FILTRADO
    
    -- CASO 1: ADMINS GLOBALES (Ven todo)
    -- Incluye: Admins, RRHH, Gerencia General, Sistemas, Y ahora ANALISTAS DE GENTE + PART TIME ADM. CENTRAL
    IF v_user_role IN ('ADMIN', 'SUPER ADMIN', 'JEFE_RRHH', 'ANALISTA_RRHH', 'GERENTE GENERAL', 'SISTEMAS') 
       OR v_user_role ILIKE '%ADMIN%' 
       OR v_user_role ILIKE '%GERENTE%'
       OR v_user_position ILIKE '%JEFE DE GENTE%'
       OR v_user_position ILIKE '%ANALISTA DE GENTE%' -- ACCESO TOTAL para todos los Analistas de Gente
       OR (v_user_position ILIKE '%PART TIME%' AND v_user_sede = 'ADM. CENTRAL' AND v_user_business_unit LIKE 'ADMINISTRACI%') -- ACCESO TOTAL para Part Time HQ
       THEN
        
        RETURN QUERY 
        SELECT 
            e.id, e.full_name, e.dni, e.email, e.position, e.sede, e.business_unit, e.profile_picture_url, e.role, e.is_active,
            e.entry_date, e.employee_type, e.phone, e.address, e.birth_date,
            a.name as area_name
        FROM public.employees e
        LEFT JOIN public.job_positions jp ON (
            e.job_position_id = jp.id 
            OR (e.job_position_id IS NULL AND e.position = jp.name)
        )
        LEFT JOIN public.areas a ON jp.area_id = a.id
        ORDER BY e.full_name;
        
    -- CASO 2: JEFES (Con Área Detectada) -> Ven TODAS las sedes de su área
    ELSIF v_user_area_id IS NOT NULL AND (
        v_user_role = 'JEFE' OR v_user_role ILIKE '%JEFE%' OR v_user_position ILIKE '%JEFE%'
    ) THEN
        RETURN QUERY 
        SELECT 
            e.id, e.full_name, e.dni, e.email, e.position, e.sede, e.business_unit, e.profile_picture_url, e.role, e.is_active,
            e.entry_date, e.employee_type, e.phone, e.address, e.birth_date,
            a.name as area_name
        FROM public.employees e
        LEFT JOIN public.job_positions jp ON (
            e.job_position_id = jp.id 
            OR (e.job_position_id IS NULL AND e.position = jp.name)
        )
        LEFT JOIN public.areas a ON jp.area_id = a.id
        WHERE 
            jp.area_id = v_user_area_id -- Mismo ID de Área (Todas las sedes)
        ORDER BY e.full_name;

    -- CASO 3: SUPERVISORES / COORDINADORES / ANALISTAS (Con Área Detectada) -> Ven SOLO SU SEDE de su área
    ELSIF v_user_area_id IS NOT NULL AND (
        v_user_role IN ('SUPERVISOR', 'COORDINADOR', 'ANALISTA') 
        OR v_user_role ILIKE '%SUPERVISOR%' 
        OR v_user_role ILIKE '%COORDINADOR%'
        OR v_user_role ILIKE '%ANALISTA%'
        OR v_user_position ILIKE '%SUPERVISOR%'
        OR v_user_position ILIKE '%COORDINADOR%'
        OR v_user_position ILIKE '%ANALISTA%'
    ) THEN
        RETURN QUERY 
        SELECT 
            e.id, e.full_name, e.dni, e.email, e.position, e.sede, e.business_unit, e.profile_picture_url, e.role, e.is_active,
            e.entry_date, e.employee_type, e.phone, e.address, e.birth_date,
            a.name as area_name
        FROM public.employees e
        LEFT JOIN public.job_positions jp ON (
            e.job_position_id = jp.id 
            OR (e.job_position_id IS NULL AND e.position = jp.name)
        )
        LEFT JOIN public.areas a ON jp.area_id = a.id
        WHERE 
            jp.area_id = v_user_area_id -- Mismo ID de Área
            AND e.sede = v_user_sede -- SOLO SU SEDE
        ORDER BY e.full_name;

    -- CASO 4: FALLBACK A BUSINESS UNIT (Si no se detectó Área)
    
    -- CASO 4.1: JEFES (Todas las sedes)
    ELSIF v_user_business_unit IS NOT NULL AND (
        v_user_role = 'JEFE' OR v_user_role ILIKE '%JEFE%' OR v_user_position ILIKE '%JEFE%'
    ) THEN
        RETURN QUERY 
        SELECT 
            e.id, e.full_name, e.dni, e.email, e.position, e.sede, e.business_unit, e.profile_picture_url, e.role, e.is_active,
            e.entry_date, e.employee_type, e.phone, e.address, e.birth_date,
            a.name as area_name
        FROM public.employees e
        LEFT JOIN public.job_positions jp ON (
            e.job_position_id = jp.id 
            OR (e.job_position_id IS NULL AND e.position = jp.name)
        )
        LEFT JOIN public.areas a ON jp.area_id = a.id
        WHERE 
            e.business_unit = v_user_business_unit
        ORDER BY e.full_name;

    -- CASO 4.2: SUPERVISORES / COORDINADORES / ANALISTAS (Solo su sede)
    ELSIF v_user_business_unit IS NOT NULL AND (
        v_user_role IN ('SUPERVISOR', 'COORDINADOR', 'ANALISTA') 
        OR v_user_role ILIKE '%SUPERVISOR%' 
        OR v_user_role ILIKE '%COORDINADOR%'
        OR v_user_role ILIKE '%ANALISTA%'
        OR v_user_position ILIKE '%SUPERVISOR%'
        OR v_user_position ILIKE '%COORDINADOR%'
        OR v_user_position ILIKE '%ANALISTA%'
    ) THEN
        RETURN QUERY 
        SELECT 
            e.id, e.full_name, e.dni, e.email, e.position, e.sede, e.business_unit, e.profile_picture_url, e.role, e.is_active,
            e.entry_date, e.employee_type, e.phone, e.address, e.birth_date,
            a.name as area_name
        FROM public.employees e
        LEFT JOIN public.job_positions jp ON (
            e.job_position_id = jp.id 
            OR (e.job_position_id IS NULL AND e.position = jp.name)
        )
        LEFT JOIN public.areas a ON jp.area_id = a.id
        WHERE 
            e.business_unit = v_user_business_unit
            AND e.sede = v_user_sede -- SOLO SU SEDE
        ORDER BY e.full_name;
        
    -- CASO 5: SIN ACCESO (Usuario normal solo se ve a sí mismo)
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
