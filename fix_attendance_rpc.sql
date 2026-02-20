-- ==============================================================================
-- FIX: REPORTE DE ASISTENCIA DIARIA CON JOIN HÍBRIDO Y SEGURIDAD REFORZADA
-- FECHA: 20/02/2026
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_daily_attendance_report(
    p_date date,
    p_sede text DEFAULT NULL, -- Filter by Sede (if provided)
    p_business_unit text DEFAULT NULL, -- Filter by Business Unit
    p_search text DEFAULT NULL, -- Search by Name/DNI
    p_status text DEFAULT NULL, -- Filter by Status: 'present', 'absent', 'late', 'on_time'
    p_page int DEFAULT 1,
    p_limit int DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    v_offset int;
    v_total int;
    v_result jsonb;
    
    -- Contexto de seguridad
    v_user_role text;
    v_user_position text;
    v_user_sede text;
    v_user_area_id bigint;
    v_user_business_unit text;
    v_is_admin boolean;
BEGIN
    v_offset := (p_page - 1) * p_limit;

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

    -- 2. QUERY CON FILTROS DE SEGURIDAD
    WITH base_data AS (
        SELECT 
            e.id as employee_id,
            e.full_name,
            e.dni,
            COALESCE(jp.name, e.position) as position,
            e.sede,
            e.business_unit,
            e.profile_picture_url,
            a.id as attendance_id,
            a.check_in,
            a.check_out,
            a.is_late,
            a.record_type,
            a.validated,
            a.location_in,
            a.absence_reason,
            -- Computed Status
            CASE 
                WHEN a.id IS NOT NULL THEN 
                    CASE 
                        WHEN a.record_type = 'ASISTENCIA' AND a.is_late THEN 'late'
                        WHEN a.record_type = 'ASISTENCIA' AND NOT a.is_late THEN 'on_time'
                        ELSE 'present' 
                    END
                ELSE 'absent' 
            END as computed_status
        FROM employees e
        -- JOIN HÍBRIDO
        LEFT JOIN public.job_positions jp ON (
            e.job_position_id = jp.id 
            OR (e.job_position_id IS NULL AND e.position = jp.name)
        )
        LEFT JOIN attendance a ON e.id = a.employee_id AND a.work_date = p_date
        WHERE 
            e.is_active = true -- Only active employees
            
            -- Filtros de UI
            AND (p_sede IS NULL OR e.sede = p_sede)
            AND (p_business_unit IS NULL OR e.business_unit = p_business_unit)
            AND (
                p_search IS NULL OR 
                e.full_name ILIKE '%' || p_search || '%' OR 
                e.dni ILIKE '%' || p_search || '%'
            )

            -- LÓGICA DE SEGURIDAD
            AND (
                -- CASO 1: ADMIN -> Ve todo (respetando filtros de UI)
                v_is_admin
                OR 
                -- CASO 2: NO ADMIN
                (NOT v_is_admin AND (
                    CASE 
                        -- Prioridad 1: Por Área
                        WHEN v_user_area_id IS NOT NULL THEN
                            CASE
                                -- JEFES / GERENTES: Ven su área en TODAS las sedes
                                WHEN (v_user_role = 'JEFE' OR v_user_role ILIKE '%JEFE%' OR v_user_position ILIKE '%JEFE%' OR v_user_role ILIKE '%GERENTE%') THEN
                                    jp.area_id = v_user_area_id
                                
                                -- SUPERVISORES / COORDINADORES / ANALISTAS: Ven su área SOLO en su Sede
                                WHEN (v_user_role IN ('SUPERVISOR', 'COORDINADOR', 'ANALISTA') OR v_user_position ILIKE '%SUPERVISOR%' OR v_user_position ILIKE '%COORDINADOR%' OR v_user_position ILIKE '%ANALISTA%') THEN
                                    jp.area_id = v_user_area_id AND e.sede = v_user_sede
                                
                                ELSE FALSE
                            END

                        -- Prioridad 2: Fallback a Unidad de Negocio
                        WHEN v_user_business_unit IS NOT NULL THEN
                            CASE
                                -- JEFES / GERENTES: Ven su unidad en TODAS las sedes
                                WHEN (v_user_role = 'JEFE' OR v_user_role ILIKE '%JEFE%' OR v_user_position ILIKE '%JEFE%' OR v_user_role ILIKE '%GERENTE%') THEN
                                    e.business_unit = v_user_business_unit
                                
                                -- SUPERVISORES / COORDINADORES / ANALISTAS: Ven su unidad SOLO en su Sede
                                WHEN (v_user_role IN ('SUPERVISOR', 'COORDINADOR', 'ANALISTA') OR v_user_position ILIKE '%SUPERVISOR%' OR v_user_position ILIKE '%COORDINADOR%' OR v_user_position ILIKE '%ANALISTA%') THEN
                                    e.business_unit = v_user_business_unit AND e.sede = v_user_sede
                                
                                ELSE FALSE
                            END
                        
                        ELSE FALSE
                    END
                ))
            )
    ),
    filtered_data AS (
        SELECT * FROM base_data
        WHERE 
            -- Apply Status Filter
            p_status IS NULL 
            OR (p_status = 'all')
            OR (p_status = 'present' AND attendance_id IS NOT NULL)
            OR (p_status = 'absent' AND attendance_id IS NULL)
            OR (p_status = 'late' AND is_late = true)
            OR (p_status = 'on_time' AND is_late = false AND attendance_id IS NOT NULL)
    )
    SELECT 
        jsonb_build_object(
            'data', COALESCE(jsonb_agg(sub), '[]'::jsonb),
            'total', (SELECT COUNT(*) FROM filtered_data)
        ) INTO v_result
    FROM (
        SELECT * FROM filtered_data
        ORDER BY full_name ASC
        LIMIT p_limit OFFSET v_offset
    ) sub;

    RETURN v_result;
END;
$$;
