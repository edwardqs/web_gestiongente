-- 1. Insertar (o actualizar) los cargos como roles con sus permisos predeterminados
-- Se asume un permiso base (ej: Solo App Móvil para operativos, Web+App para administrativos)
-- Usamos ON CONFLICT para no duplicar si ya existen

INSERT INTO public.roles (name, web_access, mobile_access) VALUES
('ANALISTA DE GENTE Y GESTION', true, false), -- Administrativo
('ANALISTA DE OPERACIONES', true, false),     -- Administrativo
('ANALISTA DE RRHH', true, false),            -- Administrativo
('ANALISTA DE SEGURIDAD Y SALUD EN EL TRABAJO', true, false), -- Administrativo
('AUXILIAR DE ALMACÉN', false, true),         -- Operativo
('AUXILIAR DE DESPACHO', false, true),        -- Operativo
('CAJERO', true, false),                      -- Administrativo/Operativo (Acceso web para cuadre?)
('CHOFER', false, true),                      -- Operativo
('COMPAGINADOR', false, true),                -- Operativo
('CONFERENTE', false, true),                  -- Operativo
('COORDINADOR DE OPERACIONES', true, true),   -- Mando Medio
('JEFE DE AREA DE GENTE Y GESTION', true, true), -- Jefatura
('MANIOBRISTA', false, true),                 -- Operativo
('MONTACARGUISTA', false, true),              -- Operativo
('SUPERVISOR DE RUTA', true, true)            -- Mando Medio
ON CONFLICT (name) DO UPDATE 
SET web_access = EXCLUDED.web_access, 
    mobile_access = EXCLUDED.mobile_access;

-- 2. Migrar usuarios existentes: Vincular usuarios a sus nuevos roles basándose en su cargo actual
-- Asumiendo que la tabla employees tiene un campo 'position' o 'cargo' con el nombre del cargo
UPDATE public.employees
SET role_id = r.id
FROM public.roles r
WHERE public.employees.position = r.name;

-- 3. Verificación (Opcional)
-- SELECT e.full_name, e.position, r.name as role_assigned 
-- FROM public.employees e 
-- LEFT JOIN public.roles r ON e.role_id = r.id;
