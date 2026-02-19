-- SCRIPT DE DIAGNÓSTICO DE ROLES Y PERMISOS
-- Ejecuta esto para ver exactamente cómo el sistema ve al usuario actual

DO $$
DECLARE
    v_email text := 'soshiro@pauser.com'; -- Reemplazar con el email real del usuario si es posible, o usar auth.email() en contexto real
    v_user_role text;
    v_user_position text;
    v_is_admin boolean;
BEGIN
    -- Simular la consulta del RPC
    SELECT 
        e.role, 
        e.position
    INTO 
        v_user_role, 
        v_user_position
    FROM public.employees e
    WHERE e.email = v_email OR e.full_name ILIKE '%OSHIRO%'; -- Búsqueda flexible para encontrar al usuario

    RAISE NOTICE '--- DIAGNÓSTICO DE PERMISOS ---';
    RAISE NOTICE 'Rol en DB: %', v_user_role;
    RAISE NOTICE 'Cargo en DB: %', v_user_position;

    -- Probar la lógica de Admin actual
    v_is_admin := (
        COALESCE(v_user_role, '') IN (
            'ADMIN', 
            'SUPER ADMIN', 
            'JEFE_RRHH', 
            'GERENTE GENERAL',
            'ANALISTA DE GENTE Y GESTION',
            'ANALISTA DE GENTE Y GESTIÓN',
            'JEFE DE GENTE Y GESTION',
            'JEFE DE GENTE Y GESTIÓN'
        )
    );

    RAISE NOTICE '¿Es detectado como Admin Global? %', v_is_admin;
    
    IF v_is_admin THEN
        RAISE NOTICE 'ERROR: El usuario está cayendo en la lista blanca de Admins.';
    ELSE
        RAISE NOTICE 'CORRECTO: El usuario NO es Admin. Si ve datos globales, el fallo está en la lógica OR del filtro.';
    END IF;

END $$;
