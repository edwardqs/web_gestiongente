-- =============================================================================
-- SCRIPT DE DIAGNÓSTICO DE PERMISOS (ADMIN vs JEFE)
-- =============================================================================
-- Instrucciones:
-- 1. Reemplaza 'correo@ejemplo.com' con el correo del usuario que tiene problemas.
-- 2. Ejecuta este script en el Editor SQL de Supabase.
-- 3. Comparte el resultado (JSON) para depurar.
-- =============================================================================

DO $$
DECLARE
    -- CAMBIA ESTE CORREO POR EL DEL USUARIO A INVESTIGAR
    v_test_email text := 'admin@pauser.com'; 
    
    v_user_role text;
    v_user_position text;
    v_user_area_id bigint;
    v_user_business_unit text;
    v_is_admin boolean;
    v_logic_path text;
BEGIN
    -- 1. Obtener datos crudos
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
    WHERE e.email = v_test_email;

    -- 2. Normalizar
    v_user_role := UPPER(TRIM(COALESCE(v_user_role, '')));
    v_user_position := UPPER(TRIM(COALESCE(v_user_position, '')));

    -- 3. Simular Lógica Jerárquica
    
    -- NIVEL 0: SUPER USUARIO DE SISTEMA
    IF v_test_email = 'admin@pauser.com' THEN
        v_is_admin := TRUE;
        v_logic_path := 'NIVEL 0: Super Usuario de Sistema (admin@pauser.com)';

    -- NIVEL 1: ADMINS GLOBALES REALES
    ELSIF v_user_role IN ('ADMIN', 'SUPER ADMIN', 'JEFE_RRHH', 'GERENTE GENERAL', 'SISTEMAS') THEN
        v_is_admin := TRUE;
        v_logic_path := 'NIVEL 1: Rol Admin Global (' || v_user_role || ')';
        
    -- NIVEL 1.1: CARGOS GLOBALES
    ELSIF (v_user_position LIKE '%JEFE DE GENTE%' OR v_user_position LIKE '%ANALISTA DE GENTE%') THEN
        v_is_admin := TRUE;
        v_logic_path := 'NIVEL 1.1: Cargo Global Excepción (' || v_user_position || ')';

    -- NIVEL 2: RESTRICCIÓN PARA JEFES ADMINISTRATIVOS
    ELSIF (v_user_position LIKE '%ADMINISTRACI%' OR v_user_position LIKE '%FINANZAS%') THEN
        v_is_admin := FALSE;
        v_logic_path := 'NIVEL 2: Restricción Jefe Finanzas/Admin (' || v_user_position || ')';
        
    ELSE
        v_is_admin := FALSE;
        v_logic_path := 'NIVEL 3: Fallback (No es Admin Global)';
    END IF;

    -- 4. Mostrar Resultados
    RAISE NOTICE '---------------------------------------------------';
    RAISE NOTICE 'DIAGNÓSTICO PARA: %', v_test_email;
    RAISE NOTICE 'Rol Detectado: %', v_user_role;
    RAISE NOTICE 'Cargo Detectado: %', v_user_position;
    RAISE NOTICE 'Área ID: %', v_user_area_id;
    RAISE NOTICE 'Unidad Negocio: %', v_user_business_unit;
    RAISE NOTICE '---------------------------------------------------';
    RAISE NOTICE 'RESULTADO FINAL ES_ADMIN: %', v_is_admin;
    RAISE NOTICE 'CAMINO LÓGICO: %', v_logic_path;
    RAISE NOTICE '---------------------------------------------------';
END $$;
