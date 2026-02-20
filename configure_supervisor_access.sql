    -- =============================================================================
    -- CONFIGURACIÓN DE PERMISOS PARA SUPERVISORES Y COORDINADORES
    -- =============================================================================

    -- 0. ASEGURAR ROLES EN TABLA ROLES (Si existe)
    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles') THEN
            INSERT INTO public.roles (name) VALUES ('COORDINADOR'), ('SUPERVISOR') 
            ON CONFLICT (name) DO NOTHING;
        END IF;
    EXCEPTION WHEN OTHERS THEN NULL; -- Ignorar si la tabla no tiene restricción unique o estructura diferente
    END $$;

    -- 1. ASEGURAR COLUMNAS Y CLAVES FORÁNEAS EN VACATION_REQUESTS
    -- Usamos 'validated_by' que ya existe en el código frontend, pero aseguramos la FK
    DO $$
    BEGIN
        -- Agregar columna validated_by si no existe (aunque parece que ya existe)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vacation_requests' AND column_name = 'validated_by') THEN
            ALTER TABLE public.vacation_requests ADD COLUMN validated_by uuid REFERENCES public.employees(id);
        END IF;

        -- Agregar columna validated_at si no existe
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vacation_requests' AND column_name = 'validated_at') THEN
            ALTER TABLE public.vacation_requests ADD COLUMN validated_at timestamp with time zone;
        END IF;

        -- Asegurar Constraint FK para poder hacer Joins en Supabase
    -- PASO PREVIO CRÍTICO: Limpiar IDs huérfanos que no existen en employees
    -- Esto evita el error 23503 si se eliminaron empleados que habían validado solicitudes
    UPDATE public.vacation_requests
    SET validated_by = NULL
    WHERE validated_by IS NOT NULL 
    AND validated_by NOT IN (SELECT id FROM public.employees);

    -- Intentamos borrarla primero para evitar errores de duplicado si ya existe con otro nombre
    BEGIN
        ALTER TABLE public.vacation_requests DROP CONSTRAINT IF EXISTS vacation_requests_validated_by_fkey;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    ALTER TABLE public.vacation_requests 
    ADD CONSTRAINT vacation_requests_validated_by_fkey 
    FOREIGN KEY (validated_by) REFERENCES public.employees(id);
END $$;

-- 2. CONFIGURAR PERMISOS EN ROLE_MODULES
-- PASO PREVIO: Asegurar que los módulos existan en app_modules
DO $$
BEGIN
    -- Intentar insertar usando 'module_key' si existe, o 'id' si es TEXT, o 'key'
    -- Como no sabemos la columna exacta, probamos las más comunes una por una
    
    -- CASO 1: Si la columna se llama 'module_key'
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_modules' AND column_name = 'module_key') THEN
        INSERT INTO public.app_modules (module_key, name, description) VALUES
        ('dashboard', 'Dashboard', 'Vista principal y estadísticas'), -- ANTES: 'inicio'
        ('attendance', 'Asistencia', 'Gestión de marcas y validaciones'), -- ANTES: 'asistencia'
        ('requests', 'Solicitudes', 'Gestión de permisos y licencias'), -- ANTES: 'solicitudes'
        ('vacations', 'Vacaciones', 'Gestión de vacaciones y kardex'), -- IGUAL
        ('calendar', 'Calendario', 'Vista mensual de eventos') -- ANTES: 'calendario'
        ON CONFLICT DO NOTHING;
        
    -- CASO 2: Si la columna se llama 'id' y es de texto
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_modules' AND column_name = 'id' AND data_type = 'text') THEN
        INSERT INTO public.app_modules (id, name, description) VALUES
        ('dashboard', 'Dashboard', 'Vista principal y estadísticas'),
        ('attendance', 'Asistencia', 'Gestión de marcas y validaciones'),
        ('requests', 'Solicitudes', 'Gestión de permisos y licencias'),
        ('vacations', 'Vacaciones', 'Gestión de vacaciones y kardex'),
        ('calendar', 'Calendario', 'Vista mensual de eventos')
        ON CONFLICT DO NOTHING;
        
    -- CASO 3: Si la columna se llama 'key' (Intentado antes, pero por si acaso)
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_modules' AND column_name = 'key') THEN
        INSERT INTO public.app_modules (key, name, description) VALUES
        ('dashboard', 'Dashboard', 'Vista principal y estadísticas'),
        ('attendance', 'Asistencia', 'Gestión de marcas y validaciones'),
        ('requests', 'Solicitudes', 'Gestión de permisos y licencias'),
        ('vacations', 'Vacaciones', 'Gestión de vacaciones y kardex'),
        ('calendar', 'Calendario', 'Vista mensual de eventos')
        ON CONFLICT DO NOTHING;
    END IF;
EXCEPTION 
    WHEN OTHERS THEN 
        RAISE NOTICE 'No se pudo insertar en app_modules: %', SQLERRM;
END $$;

-- =============================================================================
-- 3. DETECCIÓN Y ASIGNACIÓN AUTOMÁTICA DE ROLES "COMPUESTOS"
-- =============================================================================
-- El objetivo es encontrar TODOS los cargos que contengan 'COORDINADOR' o 'SUPERVISOR'
-- (ej. 'COORDINADOR DE OPERACIONES', 'SUPERVISOR DE RUTA') y darles acceso.
DO $$
DECLARE
    r RECORD;
    v_role_name text;
BEGIN
    -- Iteramos sobre todos los cargos ÚNICOS que existen en la tabla employees
    -- que contengan la palabra clave y que NO sean ya un rol existente.
    FOR r IN 
        SELECT DISTINCT position 
        FROM public.employees 
        WHERE position IS NOT NULL 
        AND (position ILIKE '%COORDINADOR%' OR position ILIKE '%SUPERVISOR%')
    LOOP
        v_role_name := UPPER(TRIM(r.position));
        
        -- 1. Insertar en tabla roles si no existe
        -- (Asumiendo que la tabla roles se usa para listar roles válidos)
        BEGIN
            INSERT INTO public.roles (name) VALUES (v_role_name) ON CONFLICT (name) DO NOTHING;
        EXCEPTION WHEN OTHERS THEN NULL; END;

        -- 2. Asignar permisos en role_modules
        -- Primero limpiamos para evitar duplicados
        DELETE FROM public.role_modules WHERE role_name = v_role_name;
        
        -- Permisos: Lectura en todo, Escritura en Asistencia/Solicitudes/Vacaciones
        -- IMPORTANTE: Usar las claves en INGLÉS que espera el frontend (Sidebar.jsx / ProtectedRoute.jsx)
        INSERT INTO public.role_modules (role_name, module_key, can_read, can_write, can_delete) VALUES
        (v_role_name, 'dashboard', true, false, false),
        (v_role_name, 'attendance', true, true, false),
        (v_role_name, 'requests', true, true, false),
        (v_role_name, 'vacations', true, true, false),
        (v_role_name, 'calendar', true, false, false);
        
        RAISE NOTICE 'Permisos asignados al cargo: %', v_role_name;
    END LOOP;
END $$;

    -- 3. TRIGGER DE SEGURIDAD PARA APROBACIONES (SEDE/UNIDAD)
    -- Este trigger asegura que un Supervisor/Coordinador solo apruebe solicitudes de su jurisdicción
    CREATE OR REPLACE FUNCTION public.check_vacation_approval_permissions()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
        v_user_role text;
        v_user_sede text;
        v_user_business_unit text;
        v_user_position text;
        v_req_employee_sede text;
        v_req_employee_business_unit text;
        v_approver_id uuid;
    BEGIN
        -- Solo nos importa si cambia el estado a APROBADO o RECHAZADO
        IF (OLD.status = 'PENDIENTE' AND NEW.status IN ('APROBADO', 'RECHAZADO')) THEN
            
            -- Obtener ID del usuario que hace la acción (desde auth.uid() o NEW.validated_by)
            v_approver_id := COALESCE(NEW.validated_by, auth.uid());
            
            -- Si es el sistema o super admin (por email), permitir
            IF (SELECT email FROM auth.users WHERE id = auth.uid()) = 'admin@pauser.com' THEN
                RETURN NEW;
            END IF;

            -- Obtener datos del aprobador
            SELECT role, sede, business_unit, position 
            INTO v_user_role, v_user_sede, v_user_business_unit, v_user_position
            FROM public.employees 
            WHERE id = v_approver_id;

            -- Normalizar para evitar errores de mayúsculas
            v_user_role := UPPER(TRIM(COALESCE(v_user_role, '')));
            v_user_position := UPPER(TRIM(COALESCE(v_user_position, '')));

            -- 1. Si es ADMIN Global, permitir todo
            IF v_user_role IN ('ADMIN', 'SUPER ADMIN', 'JEFE_RRHH', 'GERENTE GENERAL', 'SISTEMAS') 
            OR v_user_position LIKE '%JEFE DE GENTE%' 
            OR v_user_position LIKE '%ANALISTA DE GENTE%' THEN
                RETURN NEW;
            END IF;

            -- 2. Si es Coordinador/Supervisor, validar Sede y Unidad
            IF v_user_role IN ('COORDINADOR', 'SUPERVISOR') 
            OR v_user_position LIKE '%COORDINADOR%' 
            OR v_user_position LIKE '%SUPERVISOR%' THEN
                
                -- Obtener datos del empleado solicitante
                SELECT sede, business_unit 
                INTO v_req_employee_sede, v_req_employee_business_unit
                FROM public.employees 
                WHERE id = NEW.employee_id;
                
                -- Validar Sede (Estricto)
                IF v_user_sede IS DISTINCT FROM v_req_employee_sede THEN
                    RAISE EXCEPTION 'No tienes permiso para aprobar solicitudes de otra Sede (Tú: %, Empleado: %)', v_user_sede, v_req_employee_sede;
                END IF;

                -- Validar Unidad de Negocio (Estricto para Supervisores/Coordinadores)
                -- Nota: Si el supervisor tiene business_unit NULL, asumimos que ve toda la sede? 
                -- Por seguridad, requerimos coincidencia si ambos tienen valor.
                IF v_user_business_unit IS NOT NULL AND v_req_employee_business_unit IS NOT NULL 
                AND v_user_business_unit <> v_req_employee_business_unit THEN
                    RAISE EXCEPTION 'No tienes permiso para aprobar solicitudes de otra Unidad de Negocio';
                END IF;
                
                RETURN NEW;
            END IF;

            -- Si no cae en ninguno de los anteriores, por defecto denegar si no tiene rol explícito
            -- (Aunque RLS podría haberlo filtrado antes, esto es doble seguridad)
            -- RAISE EXCEPTION 'No tienes permisos para aprobar solicitudes.';
        END IF;

        RETURN NEW;
    END;
    $$;

    DROP TRIGGER IF EXISTS tr_check_approval_perms ON public.vacation_requests;
    CREATE TRIGGER tr_check_approval_perms
    BEFORE UPDATE ON public.vacation_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.check_vacation_approval_permissions();
