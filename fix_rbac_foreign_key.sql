-- Script de corrección DEFINITIVA para error de clave foránea en RBAC
-- Este script asegura que la tabla app_modules exista y tenga los módulos requeridos
-- antes de asignar permisos.

-- 1. Crear tabla 'app_modules' si no existe (Tabla Maestra de Módulos)
CREATE TABLE IF NOT EXISTS public.app_modules (
    module_key TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS en app_modules (lectura pública para autenticados)
ALTER TABLE public.app_modules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Public read app_modules" ON public.app_modules;
    CREATE POLICY "Public read app_modules" ON public.app_modules FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 2. Insertar TODOS los módulos requeridos
-- Usamos ON CONFLICT para evitar errores si ya existen
INSERT INTO public.app_modules (module_key, name, description)
VALUES 
    ('dashboard', 'Dashboard Principal', 'Vista general y estadísticas'),
    ('vacations', 'Gestión de Vacaciones', 'Solicitud y aprobación de vacaciones'),
    ('requests', 'Solicitudes', 'Otras solicitudes de RRHH'),
    ('attendance', 'Control de Asistencia', 'Monitor de asistencia y marcaciones'),
    ('employees', 'Mi Equipo / Colaboradores', 'Directorio de empleados'),
    ('settings', 'Configuración', 'Ajustes del sistema')
ON CONFLICT (module_key) 
DO UPDATE SET name = EXCLUDED.name;

-- 3. Crear tabla 'role_modules' si no existe (Tabla de Permisos)
CREATE TABLE IF NOT EXISTS public.role_modules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role_name TEXT NOT NULL,
    module_key TEXT NOT NULL REFERENCES public.app_modules(module_key) ON DELETE CASCADE,
    can_read BOOLEAN DEFAULT false,
    can_write BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(role_name, module_key)
);

-- Habilitar RLS en role_modules
ALTER TABLE public.role_modules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Public read role_modules" ON public.role_modules;
    CREATE POLICY "Public read role_modules" ON public.role_modules FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 4. Asignar Permisos para JEFES (Operaciones, Gente, Comercial, Finanzas)
INSERT INTO public.role_modules (role_name, module_key, can_read, can_write, can_delete)
VALUES 
    ('JEFE', 'dashboard', true, false, false),
    ('JEFE', 'vacations', true, true, false),
    ('JEFE', 'requests', true, true, false),
    ('JEFE', 'attendance', true, false, false),
    ('JEFE', 'employees', true, false, false)
ON CONFLICT (role_name, module_key) 
DO UPDATE SET can_read = EXCLUDED.can_read, can_write = EXCLUDED.can_write;

-- 5. Asignar Permisos para GERENTES (Incluyendo Gerente General)
INSERT INTO public.role_modules (role_name, module_key, can_read, can_write, can_delete)
VALUES 
    ('GERENTE', 'dashboard', true, false, false),
    ('GERENTE', 'vacations', true, true, false),
    ('GERENTE', 'requests', true, true, false),
    ('GERENTE', 'attendance', true, false, false),
    ('GERENTE', 'employees', true, false, false)
ON CONFLICT (role_name, module_key) 
DO UPDATE SET can_read = EXCLUDED.can_read, can_write = EXCLUDED.can_write;

-- 6. Asignar Permisos para COORDINADORES
INSERT INTO public.role_modules (role_name, module_key, can_read, can_write, can_delete)
VALUES 
    ('COORDINADOR', 'dashboard', true, false, false),
    ('COORDINADOR', 'vacations', true, true, false),
    ('COORDINADOR', 'requests', true, true, false),
    ('COORDINADOR', 'attendance', true, false, false),
    ('COORDINADOR', 'employees', true, false, false)
ON CONFLICT (role_name, module_key) 
DO UPDATE SET can_read = EXCLUDED.can_read, can_write = EXCLUDED.can_write;

-- 7. Asignar Permisos para SUPERVISORES
INSERT INTO public.role_modules (role_name, module_key, can_read, can_write, can_delete)
VALUES 
    ('SUPERVISOR', 'dashboard', true, false, false),
    ('SUPERVISOR', 'vacations', true, true, false),
    ('SUPERVISOR', 'requests', true, true, false),
    ('SUPERVISOR', 'attendance', true, false, false),
    ('SUPERVISOR', 'employees', true, false, false)
ON CONFLICT (role_name, module_key) 
DO UPDATE SET can_read = EXCLUDED.can_read, can_write = EXCLUDED.can_write;

-- 8. Asignar Permisos para ANALISTAS
INSERT INTO public.role_modules (role_name, module_key, can_read, can_write, can_delete)
VALUES 
    ('ANALISTA', 'dashboard', true, false, false),
    ('ANALISTA', 'vacations', true, true, false),
    ('ANALISTA', 'requests', true, true, false),
    ('ANALISTA', 'attendance', true, false, false),
    ('ANALISTA', 'employees', true, false, false)
ON CONFLICT (role_name, module_key) 
DO UPDATE SET can_read = EXCLUDED.can_read, can_write = EXCLUDED.can_write;

-- 9. Verificar inserción
SELECT * FROM public.app_modules;
