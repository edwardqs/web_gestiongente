-- ==============================================================================
-- FIX: REGLAS DE ACCESO PARA JEFES POR ÁREA Y DASHBOARD
-- FECHA: 19/02/2026
-- ==============================================================================

-- 1. FIX: get_employees_by_user_area
-- Objetivo: Asegurar que JEFES solo vean empleados de su ÁREA,
--           excepto GENTE Y GESTIÓN / GERENCIA que ven todo.

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
    v_user_area_id bigint;
    v_user_business_unit text;
BEGIN
    -- Obtener email del usuario autenticado
    v_user_email := auth.email();
    
    -- Obtener rol, cargo, area_id y business_unit del usuario actual
    SELECT 
        e.role, 
        e.position,
        jp.area_id,
        e.business_unit
    INTO 
        v_user_role, 
        v_user_position,
        v_user_area_id,
        v_user_business_unit
    FROM public.employees e
    LEFT JOIN public.job_positions jp ON e.position = jp.name
    WHERE e.email = v_user_email;

    -- Normalizar textos para comparación segura
    v_user_role := UPPER(COALESCE(v_user_role, ''));
    v_user_position := UPPER(COALESCE(v_user_position, ''));

    -- LÓGICA DE FILTRADO

    -- CASO 1: VIPS (ACCESO TOTAL)
    -- Admin, Super Admin, Jefe RRHH, Jefe Gente y Gestión, Gerentes
    IF v_user_role IN ('ADMIN', 'SUPER ADMIN', 'JEFE_RRHH') 
       OR v_user_position LIKE '%GERENTE%' 
       OR v_user_position LIKE '%JEFE DE GENTE%'
       OR v_user_position LIKE '%JEFE DE RRHH%' THEN
        RETURN QUERY 
        SELECT 
            e.id, e.full_name, e.dni, e.email, e.position, e.sede, e.business_unit, e.profile_picture_url, e.role, e.is_active,
            e.entry_date, e.employee_type, e.phone, e.address, e.birth_date,
            a.name as area_name
        FROM public.employees e
        LEFT JOIN public.job_positions jp ON e.position = jp.name
        LEFT JOIN public.areas a ON jp.area_id = a.id
        ORDER BY e.full_name;
        
    -- CASO 2: JEFES CON ÁREA ASIGNADA -> SOLO SU ÁREA
    ELSIF v_user_role = 'JEFE' AND v_user_area_id IS NOT NULL THEN
        RETURN QUERY 
        SELECT 
            e.id, e.full_name, e.dni, e.email, e.position, e.sede, e.business_unit, e.profile_picture_url, e.role, e.is_active,
            e.entry_date, e.employee_type, e.phone, e.address, e.birth_date,
            a.name as area_name
        FROM public.employees e
        LEFT JOIN public.job_positions jp ON e.position = jp.name
        LEFT JOIN public.areas a ON jp.area_id = a.id
        WHERE 
            jp.area_id = v_user_area_id -- Solo empleados que coincidan con el area_id del jefe
        ORDER BY e.full_name;

    -- CASO 3: JEFES O USUARIOS SIN ÁREA PERO CON BUSINESS UNIT (FALLBACK)
    ELSIF v_user_business_unit IS NOT NULL THEN
        RETURN QUERY 
        SELECT 
            e.id, e.full_name, e.dni, e.email, e.position, e.sede, e.business_unit, e.profile_picture_url, e.role, e.is_active,
            e.entry_date, e.employee_type, e.phone, e.address, e.birth_date,
            a.name as area_name
        FROM public.employees e
        LEFT JOIN public.job_positions jp ON e.position = jp.name
        LEFT JOIN public.areas a ON jp.area_id = a.id
        WHERE 
            e.business_unit = v_user_business_unit
        ORDER BY e.full_name;
        
    -- CASO 4: SIN ACCESO O PERFIL INCOMPLETO -> Solo propio perfil
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


-- 2. FIX: get_main_dashboard_stats
-- Objetivo: Que las estadísticas del Dashboard respeten también el ÁREA del usuario.

CREATE OR REPLACE FUNCTION public.get_main_dashboard_stats(
    p_sede text DEFAULT NULL,
    p_business_unit text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_email text;
    v_user_role text;
    v_user_position text;
    v_user_area_id bigint;
    
    v_total_employees int;
    v_attendance_today int;
    v_pending_requests int;
    v_lateness_month int;
BEGIN
    -- Contexto del usuario
    v_user_email := auth.email();
    
    SELECT e.role, e.position, jp.area_id
    INTO v_user_role, v_user_position, v_user_area_id
    FROM public.employees e
    LEFT JOIN public.job_positions jp ON e.position = jp.name
    WHERE e.email = v_user_email;

    v_user_role := UPPER(COALESCE(v_user_role, ''));
    v_user_position := UPPER(COALESCE(v_user_position, ''));

    -- LÓGICA DE CONTEO

    -- CASO 1: VIPs (Ven Todo, filtrado opcional por params)
    IF v_user_role IN ('ADMIN', 'SUPER ADMIN', 'JEFE_RRHH') 
       OR v_user_position LIKE '%GERENTE%' 
       OR v_user_position LIKE '%JEFE DE GENTE%' 
       OR v_user_position LIKE '%JEFE DE RRHH%' THEN
       
        -- 1. Total Empleados
        SELECT COUNT(*) INTO v_total_employees
        FROM public.employees e
        WHERE is_active = true
        AND (p_sede IS NULL OR e.sede = p_sede)
        AND (p_business_unit IS NULL OR e.business_unit = p_business_unit);

        -- 2. Asistencias Hoy
        SELECT COUNT(*) INTO v_attendance_today
        FROM public.attendance a
        JOIN public.employees e ON a.employee_id = e.id
        WHERE a.work_date = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::date
        AND (p_sede IS NULL OR e.sede = p_sede)
        AND (p_business_unit IS NULL OR e.business_unit = p_business_unit);

        -- 3. Solicitudes Pendientes
        SELECT COUNT(*) INTO v_pending_requests
        FROM public.vacation_requests vr
        JOIN public.employees e ON vr.employee_id = e.id
        WHERE vr.status = 'PENDIENTE'
        AND (p_sede IS NULL OR e.sede = p_sede)
        AND (p_business_unit IS NULL OR e.business_unit = p_business_unit);
        
        -- 4. Tardanzas
        SELECT COUNT(*) INTO v_lateness_month
        FROM public.attendance a
        JOIN public.employees e ON a.employee_id = e.id
        WHERE a.is_late = true
        AND date_trunc('month', a.work_date) = date_trunc('month', (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::date)
        AND (p_sede IS NULL OR e.sede = p_sede)
        AND (p_business_unit IS NULL OR e.business_unit = p_business_unit);

    -- CASO 2: JEFES CON ÁREA (Restringido a su área + filtros opcionales)
    ELSIF v_user_role = 'JEFE' AND v_user_area_id IS NOT NULL THEN
    
        -- 1. Total Empleados (Join con job_positions para filtrar por area_id)
        SELECT COUNT(*) INTO v_total_employees
        FROM public.employees e
        LEFT JOIN public.job_positions jp ON e.position = jp.name
        WHERE e.is_active = true
        AND jp.area_id = v_user_area_id -- KEY FILTER
        AND (p_sede IS NULL OR e.sede = p_sede)
        AND (p_business_unit IS NULL OR e.business_unit = p_business_unit);

        -- 2. Asistencias Hoy
        SELECT COUNT(*) INTO v_attendance_today
        FROM public.attendance a
        JOIN public.employees e ON a.employee_id = e.id
        LEFT JOIN public.job_positions jp ON e.position = jp.name
        WHERE a.work_date = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::date
        AND jp.area_id = v_user_area_id -- KEY FILTER
        AND (p_sede IS NULL OR e.sede = p_sede)
        AND (p_business_unit IS NULL OR e.business_unit = p_business_unit);

        -- 3. Solicitudes Pendientes
        SELECT COUNT(*) INTO v_pending_requests
        FROM public.vacation_requests vr
        JOIN public.employees e ON vr.employee_id = e.id
        LEFT JOIN public.job_positions jp ON e.position = jp.name
        WHERE vr.status = 'PENDIENTE'
        AND jp.area_id = v_user_area_id -- KEY FILTER
        AND (p_sede IS NULL OR e.sede = p_sede)
        AND (p_business_unit IS NULL OR e.business_unit = p_business_unit);
        
        -- 4. Tardanzas
        SELECT COUNT(*) INTO v_lateness_month
        FROM public.attendance a
        JOIN public.employees e ON a.employee_id = e.id
        LEFT JOIN public.job_positions jp ON e.position = jp.name
        WHERE a.is_late = true
        AND date_trunc('month', a.work_date) = date_trunc('month', (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::date)
        AND jp.area_id = v_user_area_id -- KEY FILTER
        AND (p_sede IS NULL OR e.sede = p_sede)
        AND (p_business_unit IS NULL OR e.business_unit = p_business_unit);

    -- CASO 3: OTROS (Fallback a Business Unit si se quiere mostrar algo, o ceros)
    ELSE
        -- 1. Total Empleados
        SELECT COUNT(*) INTO v_total_employees
        FROM public.employees e
        WHERE is_active = true
        AND (p_sede IS NULL OR e.sede = p_sede)
        AND (p_business_unit IS NULL OR e.business_unit = p_business_unit); 

        -- 2. Asistencias Hoy
        SELECT COUNT(*) INTO v_attendance_today
        FROM public.attendance a
        JOIN public.employees e ON a.employee_id = e.id
        WHERE a.work_date = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::date
        AND (p_sede IS NULL OR e.sede = p_sede)
        AND (p_business_unit IS NULL OR e.business_unit = p_business_unit);
        
        -- Vacaciones y Tardanzas en 0 para no saturar si no es jefe
        v_pending_requests := 0; 
        v_lateness_month := 0;
    END IF;

    RETURN json_build_object(
        'total_employees', v_total_employees,
        'attendance_today', v_attendance_today,
        'pending_requests', v_pending_requests,
        'lateness_month', v_lateness_month
    );
END;
$$;