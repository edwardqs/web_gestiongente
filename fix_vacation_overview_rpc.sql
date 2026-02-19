-- =============================================================================
-- CORRECCIÓN CRÍTICA: RPC DE VACACIONES (KARDEX)
-- =============================================================================
-- 1. Agrega el parámetro `p_business_unit` que faltaba y causaba errores.
-- 2. Implementa la lógica de seguridad estricta por ÁREA para Jefes.
--    (Igual que en Asistencias y Dashboard Principal)
-- =============================================================================

DROP FUNCTION IF EXISTS public.get_vacation_overview(text, text);
DROP FUNCTION IF EXISTS public.get_vacation_overview(text, text, text);

CREATE OR REPLACE FUNCTION public.get_vacation_overview(
    p_sede text DEFAULT NULL,
    p_search text DEFAULT NULL,
    p_business_unit text DEFAULT NULL
)
RETURNS TABLE (
    employee_id uuid,
    dni text,
    full_name text,
    "position" text,
    sede text,
    business_unit text,
    entry_date date,
    years_of_service numeric,
    earned_days numeric,
    legacy_taken numeric,
    app_taken numeric,
    balance numeric,
    status text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_role text;
    v_user_position text;
    v_user_area_id bigint;
    v_user_business_unit text;
    v_is_admin boolean;
BEGIN
    -- 0. Contexto de Seguridad (Detectar quién llama a la función)
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
    WHERE e.email = auth.email();

    -- Normalización
    v_user_role := UPPER(TRIM(COALESCE(v_user_role, '')));
    v_user_position := UPPER(TRIM(COALESCE(v_user_position, '')));

    -- LÓGICA DE ADMIN ESTRICTA Y JERÁRQUICA
    
    -- NIVEL 0: SUPER USUARIO DE SISTEMA
    IF auth.email() = 'admin@pauser.com' THEN
        v_is_admin := TRUE;

    -- NIVEL 1: ADMINS GLOBALES REALES (Prioridad Máxima)
    ELSIF v_user_role IN ('ADMIN', 'SUPER ADMIN', 'JEFE_RRHH', 'GERENTE GENERAL', 'SISTEMAS') THEN
        v_is_admin := TRUE;
        
    -- NIVEL 1.1: CARGOS GLOBALES (Excepciones por Cargo)
    ELSIF (v_user_position LIKE '%JEFE DE GENTE%' OR v_user_position LIKE '%ANALISTA DE GENTE%') THEN
        v_is_admin := TRUE;

    -- NIVEL 2: RESTRICCIÓN PARA JEFES ADMINISTRATIVOS
    ELSIF (v_user_position LIKE '%ADMINISTRACI%' OR v_user_position LIKE '%FINANZAS%') THEN
        v_is_admin := FALSE;
        
    -- NIVEL 3: OTROS ROLES (Fallback)
    ELSE
        v_is_admin := FALSE;
    END IF;

    RETURN QUERY
    WITH vacation_calculations AS (
        SELECT 
            e.id,
            e.dni,
            e.full_name,
            e.position,
            e.sede,
            e.business_unit,
            e.entry_date,
            e.legacy_vacation_days_taken,
            
            -- Antigüedad
            ROUND(((CURRENT_DATE - e.entry_date)::numeric / 365.25), 1) as years_service,
            
            -- Días Ganados
            ROUND(((CURRENT_DATE - e.entry_date)::numeric / 360.0 * 30.0), 2) as earned,
            
            -- Días Usados (App)
            COALESCE(
                (SELECT SUM(vr.total_days) 
                 FROM public.vacation_requests vr 
                 WHERE vr.employee_id = e.id 
                 AND vr.status = 'APROBADO'), 
                0
            ) as app_used
            
        FROM public.employees e
        LEFT JOIN public.job_positions jp ON e.position = jp.name
        WHERE e.is_active = true
        AND e.entry_date IS NOT NULL
        
        -- Filtros de UI (Sede y Búsqueda)
        AND (p_sede IS NULL OR e.sede = p_sede)
        AND (p_search IS NULL OR e.full_name ILIKE '%' || p_search || '%' OR e.dni ILIKE '%' || p_search || '%')
        
        -- LÓGICA DE SEGURIDAD (CRUCIAL)
        AND (
            -- CASO 1: ADMIN -> Usa los filtros que quiera (incluyendo p_business_unit si lo envía)
            (v_is_admin AND (p_business_unit IS NULL OR e.business_unit = p_business_unit))
            OR 
            -- CASO 2: NO ADMIN (JEFE) -> Se ignora p_business_unit y se fuerza su ÁREA
            (NOT v_is_admin AND (
                CASE 
                    -- Prioridad 1: Coincidencia por ID de Área (Trae a todos los del área)
                    WHEN v_user_area_id IS NOT NULL THEN jp.area_id = v_user_area_id
                    -- Prioridad 2: Fallback a Unidad de Negocio (Legacy)
                    WHEN v_user_business_unit IS NOT NULL THEN e.business_unit = v_user_business_unit
                    -- Si no tiene nada, no ve nada
                    ELSE FALSE
                END
            ))
        )
    )
    SELECT 
        vc.id as employee_id,
        vc.dni,
        vc.full_name,
        vc.position,
        vc.sede,
        vc.business_unit,
        vc.entry_date,
        vc.years_service,
        vc.earned as earned_days,
        COALESCE(vc.legacy_vacation_days_taken, 0) as legacy_taken,
        vc.app_used as app_taken,
        
        -- Saldo
        (vc.earned - (COALESCE(vc.legacy_vacation_days_taken, 0) + vc.app_used)) as balance,
        
        -- Semáforo
        CASE 
            WHEN (vc.earned - (COALESCE(vc.legacy_vacation_days_taken, 0) + vc.app_used)) >= 30 THEN 'danger' 
            WHEN (vc.earned - (COALESCE(vc.legacy_vacation_days_taken, 0) + vc.app_used)) >= 15 THEN 'warning' 
            ELSE 'safe'
        END as status
    FROM vacation_calculations vc
    ORDER BY balance DESC;
END;
$$;
