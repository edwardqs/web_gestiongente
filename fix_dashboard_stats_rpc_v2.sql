-- ==============================================================================
-- FIX: DASHBOARD STATS - PRIORIDAD A SUPERVISORES
-- FECHA: 20/02/2026
-- CAMBIO: Se invierte el orden de evaluación para que SUPERVISOR tenga prioridad
-- y se añaden roles explícitos.
-- ==============================================================================

DROP FUNCTION IF EXISTS public.get_dashboard_stats(text, text);

CREATE OR REPLACE FUNCTION public.get_dashboard_stats(
    p_sede text DEFAULT NULL,
    p_business_unit text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_employees integer;
    v_attendance_today integer;
    v_pending_requests integer;
    v_lateness_month integer;
    
    -- Contexto de seguridad
    v_user_role text;
    v_user_position text;
    v_user_sede text;
    v_user_area_id bigint;
    v_user_business_unit text;
    v_is_admin boolean;
BEGIN
    -- 0. OBTENER CONTEXTO DEL USUARIO
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
    WHERE e.email = auth.email();

    -- Normalización
    v_user_role := UPPER(TRIM(COALESCE(v_user_role, '')));
    v_user_position := UPPER(TRIM(COALESCE(v_user_position, '')));
    v_user_sede := UPPER(TRIM(COALESCE(v_user_sede, '')));
    v_user_business_unit := UPPER(TRIM(COALESCE(v_user_business_unit, '')));

    -- 1. DETERMINAR SI ES ADMIN
    v_is_admin := FALSE;
    IF auth.email() = 'admin@pauser.com' THEN
        v_is_admin := TRUE;
    ELSIF v_user_role IN ('ADMIN', 'SUPER ADMIN', 'JEFE_RRHH', 'GERENTE GENERAL', 'SISTEMAS') THEN
        v_is_admin := TRUE;
    ELSIF (v_user_position ILIKE '%JEFE DE GENTE%' OR v_user_position ILIKE '%ANALISTA DE GENTE%') THEN
        v_is_admin := TRUE;
    ELSIF (v_user_position ILIKE '%PART TIME%' AND v_user_sede = 'ADM. CENTRAL' AND v_user_business_unit LIKE 'ADMINISTRACI%') THEN
        v_is_admin := TRUE;
    END IF;

    -- 2. CALCULAR ESTADÍSTICAS CON FILTROS DE SEGURIDAD

    -- 2.1 Total Empleados Activos
    SELECT COUNT(*) INTO v_total_employees
    FROM public.employees e
    LEFT JOIN public.job_positions jp ON (
        e.job_position_id = jp.id 
        OR (e.job_position_id IS NULL AND e.position = jp.name)
    )
    WHERE e.is_active = true
    -- Filtros de UI
    AND (p_sede IS NULL OR e.sede = p_sede)
    AND (p_business_unit IS NULL OR e.business_unit = p_business_unit)
    -- LÓGICA DE SEGURIDAD
    AND (
        v_is_admin
        OR 
        (NOT v_is_admin AND (
            CASE 
                WHEN v_user_area_id IS NOT NULL THEN
                    CASE
                        -- PRIORIDAD 1: SUPERVISORES / COORDINADORES / ANALISTAS (Ven SOLO SU SEDE)
                        WHEN (v_user_role ILIKE '%SUPERVISOR%' OR v_user_role ILIKE '%COORDINADOR%' OR v_user_role ILIKE '%ANALISTA%' 
                           OR v_user_position ILIKE '%SUPERVISOR%' OR v_user_position ILIKE '%COORDINADOR%' OR v_user_position ILIKE '%ANALISTA%') THEN
                            jp.area_id = v_user_area_id AND e.sede = v_user_sede
                        
                        -- PRIORIDAD 2: JEFES / GERENTES (Ven TODAS las sedes)
                        WHEN (v_user_role ILIKE '%JEFE%' OR v_user_position ILIKE '%JEFE%' OR v_user_role ILIKE '%GERENTE%') THEN
                            jp.area_id = v_user_area_id
                        
                        ELSE FALSE
                    END
                WHEN v_user_business_unit IS NOT NULL THEN
                    CASE
                        -- PRIORIDAD 1: SUPERVISORES
                        WHEN (v_user_role ILIKE '%SUPERVISOR%' OR v_user_role ILIKE '%COORDINADOR%' OR v_user_role ILIKE '%ANALISTA%'
                           OR v_user_position ILIKE '%SUPERVISOR%' OR v_user_position ILIKE '%COORDINADOR%' OR v_user_position ILIKE '%ANALISTA%') THEN
                            e.business_unit = v_user_business_unit AND e.sede = v_user_sede
                        
                        -- PRIORIDAD 2: JEFES
                        WHEN (v_user_role ILIKE '%JEFE%' OR v_user_position ILIKE '%JEFE%' OR v_user_role ILIKE '%GERENTE%') THEN
                            e.business_unit = v_user_business_unit
                        
                        ELSE FALSE
                    END
                ELSE FALSE
            END
        ))
    );

    -- 2.2 Asistencias de Hoy
    SELECT COUNT(*) INTO v_attendance_today
    FROM public.attendance a
    JOIN public.employees e ON a.employee_id = e.id
    LEFT JOIN public.job_positions jp ON (
        e.job_position_id = jp.id 
        OR (e.job_position_id IS NULL AND e.position = jp.name)
    )
    WHERE a.work_date = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::date
    AND a.record_type = 'ASISTENCIA'
    AND (p_sede IS NULL OR e.sede = p_sede)
    AND (p_business_unit IS NULL OR e.business_unit = p_business_unit)
    AND (
        v_is_admin
        OR 
        (NOT v_is_admin AND (
            CASE 
                WHEN v_user_area_id IS NOT NULL THEN
                    CASE
                        WHEN (v_user_role ILIKE '%SUPERVISOR%' OR v_user_role ILIKE '%COORDINADOR%' OR v_user_role ILIKE '%ANALISTA%' 
                           OR v_user_position ILIKE '%SUPERVISOR%' OR v_user_position ILIKE '%COORDINADOR%' OR v_user_position ILIKE '%ANALISTA%') THEN
                            jp.area_id = v_user_area_id AND e.sede = v_user_sede
                        WHEN (v_user_role ILIKE '%JEFE%' OR v_user_position ILIKE '%JEFE%' OR v_user_role ILIKE '%GERENTE%') THEN
                            jp.area_id = v_user_area_id
                        ELSE FALSE
                    END
                WHEN v_user_business_unit IS NOT NULL THEN
                    CASE
                        WHEN (v_user_role ILIKE '%SUPERVISOR%' OR v_user_role ILIKE '%COORDINADOR%' OR v_user_role ILIKE '%ANALISTA%'
                           OR v_user_position ILIKE '%SUPERVISOR%' OR v_user_position ILIKE '%COORDINADOR%' OR v_user_position ILIKE '%ANALISTA%') THEN
                            e.business_unit = v_user_business_unit AND e.sede = v_user_sede
                        WHEN (v_user_role ILIKE '%JEFE%' OR v_user_position ILIKE '%JEFE%' OR v_user_role ILIKE '%GERENTE%') THEN
                            e.business_unit = v_user_business_unit
                        ELSE FALSE
                    END
                ELSE FALSE
            END
        ))
    );

    -- 2.3 Solicitudes Pendientes
    SELECT COUNT(*) INTO v_pending_requests
    FROM public.vacation_requests vr
    JOIN public.employees e ON vr.employee_id = e.id
    LEFT JOIN public.job_positions jp ON (
        e.job_position_id = jp.id 
        OR (e.job_position_id IS NULL AND e.position = jp.name)
    )
    WHERE vr.status = 'PENDIENTE'
    AND (p_sede IS NULL OR e.sede = p_sede)
    AND (p_business_unit IS NULL OR e.business_unit = p_business_unit)
    AND (
        v_is_admin
        OR 
        (NOT v_is_admin AND (
            CASE 
                WHEN v_user_area_id IS NOT NULL THEN
                    CASE
                        WHEN (v_user_role ILIKE '%SUPERVISOR%' OR v_user_role ILIKE '%COORDINADOR%' OR v_user_role ILIKE '%ANALISTA%' 
                           OR v_user_position ILIKE '%SUPERVISOR%' OR v_user_position ILIKE '%COORDINADOR%' OR v_user_position ILIKE '%ANALISTA%') THEN
                            jp.area_id = v_user_area_id AND e.sede = v_user_sede
                        WHEN (v_user_role ILIKE '%JEFE%' OR v_user_position ILIKE '%JEFE%' OR v_user_role ILIKE '%GERENTE%') THEN
                            jp.area_id = v_user_area_id
                        ELSE FALSE
                    END
                WHEN v_user_business_unit IS NOT NULL THEN
                    CASE
                        WHEN (v_user_role ILIKE '%SUPERVISOR%' OR v_user_role ILIKE '%COORDINADOR%' OR v_user_role ILIKE '%ANALISTA%'
                           OR v_user_position ILIKE '%SUPERVISOR%' OR v_user_position ILIKE '%COORDINADOR%' OR v_user_position ILIKE '%ANALISTA%') THEN
                            e.business_unit = v_user_business_unit AND e.sede = v_user_sede
                        WHEN (v_user_role ILIKE '%JEFE%' OR v_user_position ILIKE '%JEFE%' OR v_user_role ILIKE '%GERENTE%') THEN
                            e.business_unit = v_user_business_unit
                        ELSE FALSE
                    END
                ELSE FALSE
            END
        ))
    );

    -- 2.4 Tardanzas del Mes Actual
    SELECT COUNT(*) INTO v_lateness_month
    FROM public.attendance a
    JOIN public.employees e ON a.employee_id = e.id
    LEFT JOIN public.job_positions jp ON (
        e.job_position_id = jp.id 
        OR (e.job_position_id IS NULL AND e.position = jp.name)
    )
    WHERE a.is_late = true
    AND date_trunc('month', a.work_date) = date_trunc('month', (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::date)
    AND (p_sede IS NULL OR e.sede = p_sede)
    AND (p_business_unit IS NULL OR e.business_unit = p_business_unit)
    AND (
        v_is_admin
        OR 
        (NOT v_is_admin AND (
            CASE 
                WHEN v_user_area_id IS NOT NULL THEN
                    CASE
                        WHEN (v_user_role ILIKE '%SUPERVISOR%' OR v_user_role ILIKE '%COORDINADOR%' OR v_user_role ILIKE '%ANALISTA%' 
                           OR v_user_position ILIKE '%SUPERVISOR%' OR v_user_position ILIKE '%COORDINADOR%' OR v_user_position ILIKE '%ANALISTA%') THEN
                            jp.area_id = v_user_area_id AND e.sede = v_user_sede
                        WHEN (v_user_role ILIKE '%JEFE%' OR v_user_position ILIKE '%JEFE%' OR v_user_role ILIKE '%GERENTE%') THEN
                            jp.area_id = v_user_area_id
                        ELSE FALSE
                    END
                WHEN v_user_business_unit IS NOT NULL THEN
                    CASE
                        WHEN (v_user_role ILIKE '%SUPERVISOR%' OR v_user_role ILIKE '%COORDINADOR%' OR v_user_role ILIKE '%ANALISTA%'
                           OR v_user_position ILIKE '%SUPERVISOR%' OR v_user_position ILIKE '%COORDINADOR%' OR v_user_position ILIKE '%ANALISTA%') THEN
                            e.business_unit = v_user_business_unit AND e.sede = v_user_sede
                        WHEN (v_user_role ILIKE '%JEFE%' OR v_user_position ILIKE '%JEFE%' OR v_user_role ILIKE '%GERENTE%') THEN
                            e.business_unit = v_user_business_unit
                        ELSE FALSE
                    END
                ELSE FALSE
            END
        ))
    );

    RETURN json_build_object(
        'total_employees', v_total_employees,
        'attendance_today', v_attendance_today,
        'pending_requests', v_pending_requests,
        'lateness_month', v_lateness_month
    );
END;
$$;
