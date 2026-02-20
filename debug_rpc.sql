
-- Debug function to check user context interpretation
CREATE OR REPLACE FUNCTION debug_dashboard_security(p_email text)
RETURNS json
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
    v_count integer;
    v_match_type text := 'NONE';
    v_logic_path text := '';
BEGIN
    -- Contexto
    SELECT 
        e.role, e.position, e.sede, jp.area_id, e.business_unit
    INTO 
        v_user_role, v_user_position, v_user_sede, v_user_area_id, v_user_business_unit
    FROM public.employees e
    LEFT JOIN public.job_positions jp ON (e.job_position_id = jp.id OR (e.job_position_id IS NULL AND e.position = jp.name))
    WHERE e.email = p_email;

    -- Normalizar
    v_user_role := UPPER(TRIM(COALESCE(v_user_role, '')));
    v_user_position := UPPER(TRIM(COALESCE(v_user_position, '')));
    v_user_sede := UPPER(TRIM(COALESCE(v_user_sede, '')));
    v_user_business_unit := UPPER(TRIM(COALESCE(v_user_business_unit, '')));

    -- Admin check
    v_is_admin := FALSE;
    IF p_email = 'admin@pauser.com' THEN v_is_admin := TRUE;
    ELSIF v_user_role IN ('ADMIN', 'SUPER ADMIN', 'JEFE_RRHH', 'GERENTE GENERAL', 'SISTEMAS') THEN v_is_admin := TRUE;
    ELSIF (v_user_position ILIKE '%JEFE DE GENTE%' OR v_user_position ILIKE '%ANALISTA DE GENTE%') THEN v_is_admin := TRUE;
    END IF;

    -- Logic Trace
    IF v_is_admin THEN
        v_logic_path := 'ADMIN';
    ELSE
        IF v_user_area_id IS NOT NULL THEN
            v_logic_path := 'AREA_ID_PATH';
            IF (v_user_role LIKE '%JEFE%' OR v_user_position LIKE '%JEFE%' OR v_user_role LIKE '%GERENTE%') THEN
                v_match_type := 'JEFE_AREA_ALL_SEDES';
            ELSIF (v_user_role IN ('SUPERVISOR', 'COORDINADOR', 'ANALISTA') OR v_user_position LIKE '%SUPERVISOR%' OR v_user_position LIKE '%COORDINADOR%' OR v_user_position LIKE '%ANALISTA%') THEN
                v_match_type := 'SUPERVISOR_AREA_SINGLE_SEDE';
            ELSE
                v_match_type := 'NO_ROLE_MATCH_IN_AREA';
            END IF;
        ELSIF v_user_business_unit IS NOT NULL THEN
            v_logic_path := 'BUSINESS_UNIT_PATH';
             IF (v_user_role LIKE '%JEFE%' OR v_user_position LIKE '%JEFE%' OR v_user_role LIKE '%GERENTE%') THEN
                v_match_type := 'JEFE_UNIT_ALL_SEDES';
            ELSIF (v_user_role IN ('SUPERVISOR', 'COORDINADOR', 'ANALISTA') OR v_user_position LIKE '%SUPERVISOR%' OR v_user_position LIKE '%COORDINADOR%' OR v_user_position LIKE '%ANALISTA%') THEN
                v_match_type := 'SUPERVISOR_UNIT_SINGLE_SEDE';
            ELSE
                v_match_type := 'NO_ROLE_MATCH_IN_UNIT';
            END IF;
        ELSE
            v_logic_path := 'NO_CONTEXT';
        END IF;
    END IF;

    -- Count Simulation
    SELECT COUNT(*) INTO v_count
    FROM public.employees e
    LEFT JOIN public.job_positions jp ON (e.job_position_id = jp.id OR (e.job_position_id IS NULL AND e.position = jp.name))
    WHERE e.is_active = true
    AND (
        v_is_admin
        OR 
        (NOT v_is_admin AND (
            CASE 
                WHEN v_user_area_id IS NOT NULL THEN
                    CASE
                        WHEN (v_user_role LIKE '%JEFE%' OR v_user_position LIKE '%JEFE%' OR v_user_role LIKE '%GERENTE%') THEN
                            jp.area_id = v_user_area_id
                        WHEN (v_user_role IN ('SUPERVISOR', 'COORDINADOR', 'ANALISTA') OR v_user_position LIKE '%SUPERVISOR%' OR v_user_position LIKE '%COORDINADOR%' OR v_user_position LIKE '%ANALISTA%') THEN
                            jp.area_id = v_user_area_id AND e.sede = v_user_sede
                        ELSE FALSE
                    END
                WHEN v_user_business_unit IS NOT NULL THEN
                    CASE
                        WHEN (v_user_role LIKE '%JEFE%' OR v_user_position LIKE '%JEFE%' OR v_user_role LIKE '%GERENTE%') THEN
                            e.business_unit = v_user_business_unit
                        WHEN (v_user_role IN ('SUPERVISOR', 'COORDINADOR', 'ANALISTA') OR v_user_position LIKE '%SUPERVISOR%' OR v_user_position LIKE '%COORDINADOR%' OR v_user_position LIKE '%ANALISTA%') THEN
                            e.business_unit = v_user_business_unit AND e.sede = v_user_sede
                        ELSE FALSE
                    END
                ELSE FALSE
            END
        ))
    );

    RETURN json_build_object(
        'role', v_user_role,
        'position', v_user_position,
        'sede', v_user_sede,
        'area_id', v_user_area_id,
        'is_admin', v_is_admin,
        'logic_path', v_logic_path,
        'match_type', v_match_type,
        'count_result', v_count
    );
END;
$$;
