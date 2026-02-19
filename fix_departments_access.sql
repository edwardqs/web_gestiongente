-- Script para corregir acceso a Departamentos y Módulo de Empleados
-- OBJETIVO: Que los Jefes (Gente, Operaciones, etc.) puedan ver:
-- 1. El menú "Dptos / Sedes" (departments) completo, sin filtrado por su propia sede.
-- 2. El menú "Mi Equipo" (employees) si es necesario.

-- 1. Asegurar que los módulos existan
INSERT INTO public.app_modules (module_key, name, description)
VALUES 
    ('departments', 'Departamentos y Sedes', 'Acceso a visualización por sedes'),
    ('employees', 'Mi Equipo', 'Directorio de empleados')
ON CONFLICT (module_key) DO NOTHING;

-- 2. Otorgar permisos de LECTURA a los roles operativos/jefaturas para 'departments'
-- Esto habilitará que vean el menú "Dptos / Sedes" en el Sidebar.
INSERT INTO public.role_modules (role_name, module_key, can_read, can_write, can_delete)
VALUES 
    ('JEFE', 'departments', true, false, false),
    ('GERENTE', 'departments', true, false, false),
    ('COORDINADOR', 'departments', true, false, false),
    ('SUPERVISOR', 'departments', true, false, false),
    ('ANALISTA', 'departments', true, false, false)
ON CONFLICT (role_name, module_key) 
DO UPDATE SET can_read = true;

-- 3. IMPORTANTE: Los permisos de 'employees' ya estaban dados en el script anterior,
-- pero los reforzamos por si acaso.
INSERT INTO public.role_modules (role_name, module_key, can_read, can_write, can_delete)
VALUES 
    ('JEFE', 'employees', true, false, false),
    ('GERENTE', 'employees', true, false, false),
    ('COORDINADOR', 'employees', true, false, false),
    ('SUPERVISOR', 'employees', true, false, false),
    ('ANALISTA', 'employees', true, false, false)
ON CONFLICT (role_name, module_key) 
DO UPDATE SET can_read = true;
