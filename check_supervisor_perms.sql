-- =============================================================================
-- DIAGNÓSTICO DE PERMISOS PARA SUPERVISOR_OPERACIONES
-- =============================================================================

DO $$
DECLARE
    v_role_name text := 'SUPERVISOR_OPERACIONES';
    v_exists_role boolean;
    v_count_perms integer;
BEGIN
    -- 1. Verificar si el rol existe en la tabla roles
    SELECT EXISTS (SELECT 1 FROM public.roles WHERE name = v_role_name) INTO v_exists_role;
    
    RAISE NOTICE 'Rol % existe en tabla roles: %', v_role_name, v_exists_role;

    -- 2. Verificar permisos en role_modules
    SELECT COUNT(*) INTO v_count_perms 
    FROM public.role_modules 
    WHERE role_name = v_role_name;
    
    RAISE NOTICE 'Permisos encontrados para %: %', v_role_name, v_count_perms;
    
    -- 3. Listar permisos específicos
    IF v_count_perms > 0 THEN
        FOR v_count_perms IN SELECT count(*) FROM public.role_modules WHERE role_name = v_role_name LOOP
             RAISE NOTICE 'Detalle de permisos:';
        END LOOP;
    END IF;
END $$;

-- 4. CONSULTA DIRECTA (Para ver el resultado en la salida de Supabase)
SELECT * FROM public.role_modules WHERE role_name = 'SUPERVISOR_OPERACIONES';
