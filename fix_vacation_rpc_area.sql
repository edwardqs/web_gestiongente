-- =============================================================================
-- CORRECCIÓN CRÍTICA: RPC DE VACACIONES (KARDEX) - LOGICA DE ÁREAS ROBUSTA
-- =============================================================================
-- PROBLEMA: Incompatibilidad entre migraciones de job_position_id vs position name.
-- SOLUCIÓN: Implementar estrategia híbrida (ID primero, luego Nombre) tanto para
-- detectar el contexto del usuario como para filtrar los empleados.
-- =============================================================================

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
    v_user_sede text;
    v_user_area_id bigint;
    v_user_business_unit text;
    v_is_admin boolean;
BEGIN
    -- 0. Contexto de Seguridad (Detectar quién llama a la función - HÍBRIDO)
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

    -- LÓGICA DE ADMIN ESTRICTA Y JERÁRQUICA
    v_is_admin := FALSE;

    -- NIVEL 0: SUPER USUARIO DE SISTEMA
    IF auth.email() = 'admin@pauser.com' THEN
        v_is_admin := TRUE;

    -- NIVEL 1: ADMINS GLOBALES REALES
    ELSIF v_user_role IN ('ADMIN', 'SUPER ADMIN', 'JEFE_RRHH', 'GERENTE GENERAL', 'SISTEMAS') THEN
        v_is_admin := TRUE;
        
    -- NIVEL 1.1: CARGOS GLOBALES (Excepciones por Cargo)
    ELSIF (v_user_position ILIKE '%JEFE DE GENTE%' OR v_user_position ILIKE '%ANALISTA DE GENTE%') THEN
        v_is_admin := TRUE;

    -- NIVEL 1.2: PART TIME ADM. CENTRAL
    ELSIF (v_user_position ILIKE '%PART TIME%' AND v_user_sede = 'ADM. CENTRAL' AND v_user_business_unit LIKE 'ADMINISTRACI%') THEN
        v_is_admin := TRUE;

    -- NIVEL 2: RESTRICCIÓN PARA JEFES ADMINISTRATIVOS (Legacy, tal vez ya no necesario si usamos reglas arriba)
    ELSIF (v_user_position LIKE '%ADMINISTRACI%' OR v_user_position LIKE '%FINANZAS%') THEN
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
        LEFT JOIN public.job_positions jp ON (
            e.job_position_id = jp.id 
            OR (e.job_position_id IS NULL AND e.position = jp.name)
        )
        WHERE e.is_active = true
        AND e.entry_date IS NOT NULL
        
        -- Filtros de UI (Sede y Búsqueda)
        AND (p_sede IS NULL OR e.sede = p_sede)
        AND (p_search IS NULL OR e.full_name ILIKE '%' || p_search || '%' OR e.dni ILIKE '%' || p_search || '%')
        
        -- LÓGICA DE SEGURIDAD
        AND (
            -- CASO 1: ADMIN -> Usa los filtros que quiera
            (v_is_admin AND (p_business_unit IS NULL OR e.business_unit = p_business_unit))
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

                    -- Prioridad 2: Fallback a Unidad de Negocio (Legacy)
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
    )
    SELECT 
        vc.id as employee_id,
        vc.dni,
        vc.full_name,
        vc.position,
        vc.sede,
        vc.business_unit,
        vc.entry_date,
        ROUND(((CURRENT_DATE - vc.entry_date)::numeric / 365.25), 1) as years_service,
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
