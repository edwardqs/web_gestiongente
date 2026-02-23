-- ==============================================================================
-- RPC: OBTENER EMPLEADOS UNIFICADO (V2)
-- FECHA: 20/02/2026
-- LOGICA:
-- 1. HR/Admin/Gerente General -> TODO
-- 2. Jefes -> Su AREA (Global)
-- 3. Supervisores/Coordinadores -> Su AREA + SEDE (Local)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_my_employees_v2()
RETURNS SETOF public.employees
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_role text;
    v_user_position text;
    v_user_sede text;
    v_user_area_id bigint;
    v_is_hr_admin boolean;
BEGIN
    -- 1. Obtener contexto del usuario actual
    SELECT 
        e.role, 
        e.position,
        e.sede,
        jp.area_id
    INTO 
        v_user_role, 
        v_user_position,
        v_user_sede,
        v_user_area_id
    FROM public.employees e
    LEFT JOIN public.job_positions jp ON (
        e.job_position_id = jp.id 
        OR (e.job_position_id IS NULL AND e.position = jp.name)
    )
    WHERE lower(e.email) = lower(auth.email());

    -- Normalización
    v_user_role := UPPER(COALESCE(v_user_role, ''));
    v_user_position := UPPER(COALESCE(v_user_position, ''));

    -- 2. Determinar si es HR/Admin (Acceso Total)
    v_is_hr_admin := (
        v_user_role IN ('ADMIN', 'SUPER ADMIN', 'JEFE_RRHH') OR
        v_user_position LIKE '%JEFE DE GENTE%' OR
        v_user_position LIKE '%ANALISTA DE GENTE%' OR
        v_user_position LIKE '%GERENTE GENERAL%'
    );

    IF v_is_hr_admin THEN
        RETURN QUERY SELECT * FROM public.employees ORDER BY full_name;
        RETURN;
    END IF;

    -- 3. Jefes (Acceso Global por Área)
    IF (v_user_role LIKE '%JEFE%' OR v_user_position LIKE '%JEFE%' OR v_user_role LIKE '%GERENTE%') THEN
        IF v_user_area_id IS NOT NULL THEN
            RETURN QUERY 
            SELECT e.* 
            FROM public.employees e
            LEFT JOIN public.job_positions jp ON e.job_position_id = jp.id
            WHERE jp.area_id = v_user_area_id
            ORDER BY e.full_name;
            RETURN;
        END IF;
    END IF;

    -- 4. Supervisores/Coordinadores (Acceso Local por Área y Sede)
    IF v_user_area_id IS NOT NULL THEN
        RETURN QUERY 
        SELECT e.* 
        FROM public.employees e
        LEFT JOIN public.job_positions jp ON e.job_position_id = jp.id
        WHERE jp.area_id = v_user_area_id
        AND e.sede = v_user_sede
        ORDER BY e.full_name;
        RETURN;
    END IF;

    -- 5. Fallback: Solo su propia info
    RETURN QUERY SELECT * FROM public.employees WHERE lower(email) = lower(auth.email());
END;
$$;
