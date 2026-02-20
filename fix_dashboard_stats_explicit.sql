-- ==============================================================================
-- FIX: DASHBOARD STATS - LOGICA EXPLICITA CON OVERRIDE PARA ASOLANO
-- FECHA: 20/02/2026
-- CAMBIO: Forzamos modo 'AREA_SEDE' si el usuario es asolano@pauserdistribuciones.com
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
    
    -- Variable de control de filtrado (Debug)
    v_filter_mode text := 'NONE'; -- Valores: ADMIN, AREA_SEDE, AREA_GLOBAL, UNIT_SEDE, UNIT_GLOBAL, NONE
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

    -- 1. DETERMINAR MODO DE FILTRADO (Lógica Prioritaria)
    v_is_admin := FALSE;
    
    -- 1.1 ADMIN Check
    IF auth.email() = 'admin@pauser.com' THEN
        v_is_admin := TRUE;
    ELSIF v_user_role IN ('ADMIN', 'SUPER ADMIN', 'JEFE_RRHH', 'GERENTE GENERAL', 'SISTEMAS') THEN
        v_is_admin := TRUE;
    ELSIF (v_user_position ILIKE '%JEFE DE GENTE%' OR v_user_position ILIKE '%ANALISTA DE GENTE%') THEN
        v_is_admin := TRUE;
    ELSIF (v_user_position ILIKE '%PART TIME%' AND v_user_sede = 'ADM. CENTRAL' AND v_user_business_unit LIKE 'ADMINISTRACI%') THEN
        v_is_admin := TRUE;
    END IF;

    IF v_is_admin THEN
        v_filter_mode := 'ADMIN';
    ELSE
        -- ==============================================================================
        -- FIX TEMPORAL: Forzar modo correcto para usuario específico
        -- ==============================================================================
        IF auth.email() = 'asolano@pauserdistribuciones.com' THEN
             v_filter_mode := 'AREA_SEDE';
        
        -- Lógica General
        ELSIF v_user_area_id IS NOT NULL THEN
            -- PRIORIDAD 1: SUPERVISORES / COORDINADORES / ANALISTAS (Area + Sede)
            IF (v_user_role ILIKE '%SUPERVISOR%' OR v_user_role ILIKE '%COORDINADOR%' OR v_user_role ILIKE '%ANALISTA%' 
                OR v_user_position ILIKE '%SUPERVISOR%' OR v_user_position ILIKE '%COORDINADOR%' OR v_user_position ILIKE '%ANALISTA%') THEN
                v_filter_mode := 'AREA_SEDE';
            
            -- PRIORIDAD 2: JEFES / GERENTES (Area Global)
            ELSIF (v_user_role ILIKE '%JEFE%' OR v_user_position ILIKE '%JEFE%' OR v_user_role ILIKE '%GERENTE%') THEN
                v_filter_mode := 'AREA_GLOBAL';
            
            ELSE
                v_filter_mode := 'NONE'; -- Tiene area pero no rol de liderazgo reconocido
            END IF;

        ELSIF v_user_business_unit IS NOT NULL THEN
            -- Fallback a Business Unit
             IF (v_user_role ILIKE '%SUPERVISOR%' OR v_user_role ILIKE '%COORDINADOR%' OR v_user_role ILIKE '%ANALISTA%'
                OR v_user_position ILIKE '%SUPERVISOR%' OR v_user_position ILIKE '%COORDINADOR%' OR v_user_position ILIKE '%ANALISTA%') THEN
                v_filter_mode := 'UNIT_SEDE';
            
            ELSIF (v_user_role ILIKE '%JEFE%' OR v_user_position ILIKE '%JEFE%' OR v_user_role ILIKE '%GERENTE%') THEN
                v_filter_mode := 'UNIT_GLOBAL';
            
            ELSE
                v_filter_mode := 'NONE';
            END IF;
        ELSE
            v_filter_mode := 'NONE'; -- Sin area ni unidad
        END IF;
    END IF;

    -- 2. CALCULAR ESTADÍSTICAS USANDO v_filter_mode

    -- 2.1 Total Empleados Activos
    SELECT COUNT(*) INTO v_total_employees
    FROM public.employees e
    LEFT JOIN public.job_positions jp ON (
        e.job_position_id = jp.id 
        OR (e.job_position_id IS NULL AND e.position = jp.name)
    )
    WHERE e.is_active = true
    AND (p_sede IS NULL OR e.sede = p_sede)
    AND (p_business_unit IS NULL OR e.business_unit = p_business_unit)
    AND (
        CASE v_filter_mode
            WHEN 'ADMIN' THEN TRUE
            WHEN 'AREA_SEDE' THEN jp.area_id = v_user_area_id AND e.sede = v_user_sede
            WHEN 'AREA_GLOBAL' THEN jp.area_id = v_user_area_id
            WHEN 'UNIT_SEDE' THEN e.business_unit = v_user_business_unit AND e.sede = v_user_sede
            WHEN 'UNIT_GLOBAL' THEN e.business_unit = v_user_business_unit
            ELSE FALSE
        END
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
        CASE v_filter_mode
            WHEN 'ADMIN' THEN TRUE
            WHEN 'AREA_SEDE' THEN jp.area_id = v_user_area_id AND e.sede = v_user_sede
            WHEN 'AREA_GLOBAL' THEN jp.area_id = v_user_area_id
            WHEN 'UNIT_SEDE' THEN e.business_unit = v_user_business_unit AND e.sede = v_user_sede
            WHEN 'UNIT_GLOBAL' THEN e.business_unit = v_user_business_unit
            ELSE FALSE
        END
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
        CASE v_filter_mode
            WHEN 'ADMIN' THEN TRUE
            WHEN 'AREA_SEDE' THEN jp.area_id = v_user_area_id AND e.sede = v_user_sede
            WHEN 'AREA_GLOBAL' THEN jp.area_id = v_user_area_id
            WHEN 'UNIT_SEDE' THEN e.business_unit = v_user_business_unit AND e.sede = v_user_sede
            WHEN 'UNIT_GLOBAL' THEN e.business_unit = v_user_business_unit
            ELSE FALSE
        END
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
        CASE v_filter_mode
            WHEN 'ADMIN' THEN TRUE
            WHEN 'AREA_SEDE' THEN jp.area_id = v_user_area_id AND e.sede = v_user_sede
            WHEN 'AREA_GLOBAL' THEN jp.area_id = v_user_area_id
            WHEN 'UNIT_SEDE' THEN e.business_unit = v_user_business_unit AND e.sede = v_user_sede
            WHEN 'UNIT_GLOBAL' THEN e.business_unit = v_user_business_unit
            ELSE FALSE
        END
    );

    RETURN json_build_object(
        'total_employees', v_total_employees,
        'attendance_today', v_attendance_today,
        'pending_requests', v_pending_requests,
        'lateness_month', v_lateness_month,
        'debug_info', json_build_object(
            'mode', v_filter_mode,
            'role', v_user_role,
            'position', v_user_position,
            'sede', v_user_sede,
            'area_id', v_user_area_id,
            'override', CASE WHEN auth.email() = 'asolano@pauserdistribuciones.com' THEN TRUE ELSE FALSE END
        )
    );
END;
$$;
