-- Script de corrección de permisos RBAC para Jefes y Gerentes (V2 - Con fix de FK)
-- 1. Asegurar que los módulos existan en la tabla maestra 'app_modules'
-- Nota: Asumimos que la tabla tiene columnas 'module_key' y 'name'. 
-- Si falla por columnas faltantes, avisar para ajustar.

INSERT INTO public.app_modules (module_key, name)
VALUES 
    ('dashboard', 'Dashboard Principal'),
    ('vacations', 'Gestión de Vacaciones'),
    ('requests', 'Solicitudes'),
    ('attendance', 'Control de Asistencia')
ON CONFLICT (module_key) DO NOTHING;

-- 2. Insertar permisos para el rol 'JEFE'
INSERT INTO public.role_modules (role_name, module_key, can_read, can_write, can_delete)
VALUES 
    ('JEFE', 'dashboard', true, false, false),
    ('JEFE', 'vacations', true, true, false),
    ('JEFE', 'requests', true, true, false),
    ('JEFE', 'attendance', true, false, false)
ON CONFLICT (role_name, module_key) 
DO UPDATE SET can_read = EXCLUDED.can_read, can_write = EXCLUDED.can_write;

-- 3. Insertar permisos para el rol 'GERENTE'
INSERT INTO public.role_modules (role_name, module_key, can_read, can_write, can_delete)
VALUES 
    ('GERENTE', 'dashboard', true, false, false),
    ('GERENTE', 'vacations', true, true, false),
    ('GERENTE', 'requests', true, true, false),
    ('GERENTE', 'attendance', true, false, false)
ON CONFLICT (role_name, module_key) 
DO UPDATE SET can_read = EXCLUDED.can_read, can_write = EXCLUDED.can_write;

-- 4. Insertar permisos para el rol 'COORDINADOR'
INSERT INTO public.role_modules (role_name, module_key, can_read, can_write, can_delete)
VALUES 
    ('COORDINADOR', 'dashboard', true, false, false),
    ('COORDINADOR', 'vacations', true, true, false),
    ('COORDINADOR', 'requests', true, true, false),
    ('COORDINADOR', 'attendance', true, false, false)
ON CONFLICT (role_name, module_key) 
DO UPDATE SET can_read = EXCLUDED.can_read, can_write = EXCLUDED.can_write;

-- 5. Insertar permisos para el rol 'SUPERVISOR'
INSERT INTO public.role_modules (role_name, module_key, can_read, can_write, can_delete)
VALUES 
    ('SUPERVISOR', 'dashboard', true, false, false),
    ('SUPERVISOR', 'vacations', true, true, false),
    ('SUPERVISOR', 'requests', true, true, false),
    ('SUPERVISOR', 'attendance', true, false, false)
ON CONFLICT (role_name, module_key) 
DO UPDATE SET can_read = EXCLUDED.can_read, can_write = EXCLUDED.can_write;
