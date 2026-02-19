-- Script de RE-ESTRUCTURACIÓN TOTAL de permisos RBAC (V2)
-- Este script ELIMINA y RECREA las tablas de permisos para asegurar la estructura correcta.
-- SOLUCIONA: Error "column module_key does not exist" y errores de FK.

-- 1. Limpieza Total (Eliminar tablas antiguas o mal formadas)
DROP TABLE IF EXISTS public.role_modules CASCADE;
DROP TABLE IF EXISTS public.app_modules CASCADE;

-- 2. Crear Tabla Maestra de Módulos (Correcta)
CREATE TABLE public.app_modules (
    module_key TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS en app_modules
ALTER TABLE public.app_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read app_modules" ON public.app_modules FOR SELECT TO authenticated USING (true);

-- 3. Insertar Módulos del Sistema
INSERT INTO public.app_modules (module_key, name, description)
VALUES 
    ('dashboard', 'Dashboard Principal', 'Vista general y estadísticas'),
    ('vacations', 'Gestión de Vacaciones', 'Solicitud y aprobación de vacaciones'),
    ('requests', 'Solicitudes', 'Otras solicitudes de RRHH'),
    ('attendance', 'Control de Asistencia', 'Monitor de asistencia y marcaciones'),
    ('employees', 'Mi Equipo / Colaboradores', 'Directorio de empleados'),
    ('settings', 'Configuración', 'Ajustes del sistema');

-- 4. Crear Tabla de Permisos por Rol
CREATE TABLE public.role_modules (
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
CREATE POLICY "Public read role_modules" ON public.role_modules FOR SELECT TO authenticated USING (true);

-- 5. ASIGNACIÓN DE PERMISOS (RBAC)

-- A. JEFES (Gente, Operaciones, Comercial, Finanzas, etc.)
INSERT INTO public.role_modules (role_name, module_key, can_read, can_write, can_delete)
VALUES 
    ('JEFE', 'dashboard', true, false, false),
    ('JEFE', 'vacations', true, true, false),
    ('JEFE', 'requests', true, true, false),
    ('JEFE', 'attendance', true, false, false),
    ('JEFE', 'employees', true, false, false);

-- B. GERENTES (Incluyendo Gerente General)
INSERT INTO public.role_modules (role_name, module_key, can_read, can_write, can_delete)
VALUES 
    ('GERENTE', 'dashboard', true, false, false),
    ('GERENTE', 'vacations', true, true, false),
    ('GERENTE', 'requests', true, true, false),
    ('GERENTE', 'attendance', true, false, false),
    ('GERENTE', 'employees', true, false, false);

-- C. COORDINADORES
INSERT INTO public.role_modules (role_name, module_key, can_read, can_write, can_delete)
VALUES 
    ('COORDINADOR', 'dashboard', true, false, false),
    ('COORDINADOR', 'vacations', true, true, false),
    ('COORDINADOR', 'requests', true, true, false),
    ('COORDINADOR', 'attendance', true, false, false),
    ('COORDINADOR', 'employees', true, false, false);

-- D. SUPERVISORES
INSERT INTO public.role_modules (role_name, module_key, can_read, can_write, can_delete)
VALUES 
    ('SUPERVISOR', 'dashboard', true, false, false),
    ('SUPERVISOR', 'vacations', true, true, false),
    ('SUPERVISOR', 'requests', true, true, false),
    ('SUPERVISOR', 'attendance', true, false, false),
    ('SUPERVISOR', 'employees', true, false, false);

-- E. ANALISTAS
INSERT INTO public.role_modules (role_name, module_key, can_read, can_write, can_delete)
VALUES 
    ('ANALISTA', 'dashboard', true, false, false),
    ('ANALISTA', 'vacations', true, true, false),
    ('ANALISTA', 'requests', true, true, false),
    ('ANALISTA', 'attendance', true, false, false),
    ('ANALISTA', 'employees', true, false, false);

-- 6. Verificación final
SELECT * FROM public.app_modules;
