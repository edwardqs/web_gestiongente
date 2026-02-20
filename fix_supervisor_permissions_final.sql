-- =============================================================================
-- REPARACIÓN DEFINITIVA DE PERMISOS (SUPERVISOR/COORDINADOR)
-- =============================================================================

-- 1. Asegurar módulos (con claves en INGLÉS)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_modules') THEN
        -- Insertar claves correctas (inglés) para que coincidan con el Frontend
        INSERT INTO public.app_modules (key, name, description) VALUES
        ('dashboard', 'Dashboard', 'Vista principal'),
        ('attendance', 'Asistencia', 'Gestión de marcas'),
        ('requests', 'Solicitudes', 'Gestión de permisos'),
        ('vacations', 'Vacaciones', 'Gestión de vacaciones'),
        ('calendar', 'Calendario', 'Vista de eventos')
        ON CONFLICT DO NOTHING;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 2. ASIGNACIÓN MASIVA DE PERMISOS
-- Recorremos tanto la columna 'position' como 'role' de la tabla employees
-- para atrapar variaciones como "SUPERVISOR DE OPERACIONES" vs "SUPERVISOR_OPERACIONES"
DO $$
DECLARE
    r RECORD;
    v_role_name text;
BEGIN
    -- Unimos roles y cargos en una sola lista única
    FOR r IN 
        SELECT DISTINCT UPPER(TRIM(val)) as role_key
        FROM (
            SELECT position as val FROM public.employees WHERE position IS NOT NULL
            UNION
            SELECT role as val FROM public.employees WHERE role IS NOT NULL
        ) t
        WHERE val ILIKE '%COORDINADOR%' OR val ILIKE '%SUPERVISOR%'
    LOOP
        v_role_name := r.role_key;
        
        -- 1. Registrar en tabla roles (si existe la tabla)
        BEGIN
            INSERT INTO public.roles (name) VALUES (v_role_name) ON CONFLICT (name) DO NOTHING;
        EXCEPTION WHEN OTHERS THEN NULL; END;

        -- 2. Limpiar permisos viejos para este rol
        DELETE FROM public.role_modules WHERE role_name = v_role_name;
        
        -- 3. Insertar permisos CORRECTOS (Claves en INGLÉS)
        -- Lectura en todo, Escritura en Asistencia/Solicitudes/Vacaciones
        INSERT INTO public.role_modules (role_name, module_key, can_read, can_write, can_delete) VALUES
        (v_role_name, 'dashboard', true, false, false),
        (v_role_name, 'attendance', true, true, false),
        (v_role_name, 'requests', true, true, false),
        (v_role_name, 'vacations', true, true, false),
        (v_role_name, 'calendar', true, false, false);
        
        RAISE NOTICE 'Permisos corregidos para: %', v_role_name;
    END LOOP;
END $$;

-- 3. VALIDACIÓN MANUAL EXPLICITA (Por si acaso)
-- Forzamos la inserción para el rol específico del error reportado
INSERT INTO public.role_modules (role_name, module_key, can_read, can_write, can_delete)
VALUES 
('SUPERVISOR_OPERACIONES', 'dashboard', true, false, false),
('SUPERVISOR_OPERACIONES', 'attendance', true, true, false),
('SUPERVISOR_OPERACIONES', 'requests', true, true, false),
('SUPERVISOR_OPERACIONES', 'vacations', true, true, false),
('SUPERVISOR_OPERACIONES', 'calendar', true, false, false)
ON CONFLICT (role_name, module_key) 
DO UPDATE SET can_read = EXCLUDED.can_read, can_write = EXCLUDED.can_write;
